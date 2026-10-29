import pool from '../config/db.js';
import { emitUpdate } from '../config/socket.js';

let totalSlotsColEnsured = false;

/**
 * Ensures `job_postings.total_slots` column exists and backfills any NULL rows
 * from the original configured capacity (`GREATEST(slots_available, accepted_count)`).
 */
export async function ensureJobTotalSlotsSchema() {
  if (totalSlotsColEnsured) return;
  try {
    const [cols] = await pool.query('DESCRIBE job_postings');
    const colNames = cols.map((c) => c.Field);
    if (!colNames.includes('total_slots')) {
      await pool.query(
        'ALTER TABLE job_postings ADD COLUMN total_slots INT UNSIGNED NULL AFTER slots_available'
      );
    }

    await pool.query(`
      UPDATE job_postings jp
      LEFT JOIN (
        SELECT job_id, COUNT(*) AS accepted_cnt
        FROM job_applications
        WHERE status IN ('accepted', 'hired')
        GROUP BY job_id
      ) acc ON acc.job_id = jp.job_id
      SET
        jp.total_slots = GREATEST(COALESCE(jp.slots_available, 1), COALESCE(acc.accepted_cnt, 0), 1),
        jp.slots_available = GREATEST(
          0,
          GREATEST(COALESCE(jp.slots_available, 1), COALESCE(acc.accepted_cnt, 0), 1) - COALESCE(acc.accepted_cnt, 0)
        ),
        jp.status = CASE
          WHEN GREATEST(COALESCE(jp.slots_available, 1), COALESCE(acc.accepted_cnt, 0), 1) - COALESCE(acc.accepted_cnt, 0) <= 0
               AND jp.status = 'active'
          THEN 'closed'
          ELSE jp.status
        END
      WHERE jp.total_slots IS NULL
    `);

    totalSlotsColEnsured = true;
  } catch (err) {
    console.warn('[JobSlots] Schema ensure warning:', err.message);
  }
}

/**
 * Recalculates accepted/finalized applications for `jobId`, updates remaining `slots_available`,
 * and automatically deactivates (`status = 'closed'`) the posting when remaining slots reach 0.
 *
 * @param {number|string} jobId
 * @param {object} dbConn - MySQL pool or transaction connection
 * @param {object} options
 * @param {boolean} [options.emitRealtime=false] - Whether to emit `job_updated` immediately
 * @param {boolean} [options.reopenIfIncreasedFromFull=false] - Reopen to `active` if capacity was increased above accepted count
 */
export async function syncJobPostingSlots(jobId, dbConn = pool, options = {}) {
  const { emitRealtime = false, reopenIfIncreasedFromFull = false } = options;
  if (!jobId) return null;

  await ensureJobTotalSlotsSchema();

  const [jobRows] = await dbConn.query(
    'SELECT job_id, organization_id, title, slots_available, total_slots, status FROM job_postings WHERE job_id = ? LIMIT 1',
    [jobId]
  );
  if (jobRows.length === 0) return null;

  const job = jobRows[0];

  const [accRows] = await dbConn.query(
    "SELECT COUNT(*) AS accepted_count FROM job_applications WHERE job_id = ? AND status IN ('accepted', 'hired')",
    [jobId]
  );
  const acceptedCount = Number(accRows[0]?.accepted_count || 0);

  const totalSlots = Math.max(
    1,
    Number(job.total_slots || 0) || Math.max(Number(job.slots_available || 1), acceptedCount)
  );
  const remainingSlots = Math.max(0, totalSlots - acceptedCount);

  let nextStatus = job.status || 'active';
  let autoDeactivated = false;

  if (remainingSlots <= 0) {
    if (nextStatus !== 'closed') {
      autoDeactivated = true;
    }
    nextStatus = 'closed';
  } else if (reopenIfIncreasedFromFull && nextStatus === 'closed' && Number(job.slots_available || 0) === 0) {
    nextStatus = 'active';
  }

  await dbConn.query(
    `UPDATE job_postings
     SET total_slots = ?,
         slots_available = ?,
         status = ?,
         updated_at = NOW()
     WHERE job_id = ?`,
    [totalSlots, remainingSlots, nextStatus, jobId]
  );

  const result = {
    jobId: Number(job.job_id),
    organizationId: job.organization_id,
    title: job.title,
    totalSlots,
    acceptedCount,
    remainingSlots,
    status: nextStatus,
    autoDeactivated
  };

  if (emitRealtime) {
    emitUpdate('job_updated', {
      job_id: result.jobId,
      organization_id: result.organizationId,
      total_slots: result.totalSlots,
      slots_available: result.remainingSlots,
      accepted_count: result.acceptedCount,
      status: result.status,
      auto_deactivated: result.autoDeactivated
    });
  }

  return result;
}
