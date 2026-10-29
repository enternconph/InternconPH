import pool from '../config/db.js';

let schemaEnsurePromise = null;

/**
 * Self-healing schema alignment for OJT Attendance Logs, Daily Schedules,
 * Schedule Requests, and OJT Records.
 *
 * Ensures:
 *  - `ojt_attendance_logs.overtime_hours`, `regular_hours`, `hours_rendered` are `DECIMAL(8,2)`
 *    so multi-day unclosed Time-Out sessions never overflow `DECIMAL(4,2)` (> 99.99 hrs).
 *  - `ojt_daily_schedules.max_overtime_hours` is `DECIMAL(8,2)`, with nullable `ojt_id`/`organization_id` and `created_by`.
 *  - `student_schedule_requests` has nullable `ojt_id`/`organization_id`/`reason` and `mentor_notes`.
 *  - `ojt_records` has `scheduled_start_time` and `scheduled_finish_time` defaults.
 */
export async function ensureAttendanceSchemaAligned() {
  if (schemaEnsurePromise) return schemaEnsurePromise;

  schemaEnsurePromise = (async () => {
    try {
      // 1. Align ojt_attendance_logs columns & widen DECIMAL(4,2) -> DECIMAL(8,2)
      const [attCols] = await pool.query('DESCRIBE ojt_attendance_logs');
      const attMap = new Map(attCols.map((c) => [c.Field, String(c.Type || '').toLowerCase()]));

      if (!attMap.has('overtime_status')) {
        await pool.query(
          "ALTER TABLE ojt_attendance_logs ADD COLUMN overtime_status ENUM('none', 'pending_approval', 'approved', 'rejected') NOT NULL DEFAULT 'none' AFTER time_out_status"
        );
      }

      if (!attMap.has('overtime_hours')) {
        await pool.query(
          'ALTER TABLE ojt_attendance_logs ADD COLUMN overtime_hours DECIMAL(8,2) NOT NULL DEFAULT 0.00 AFTER overtime_status'
        );
      } else if (attMap.get('overtime_hours') !== 'decimal(8,2)') {
        await pool.query(
          'ALTER TABLE ojt_attendance_logs MODIFY COLUMN overtime_hours DECIMAL(8,2) NOT NULL DEFAULT 0.00'
        );
      }

      if (!attMap.has('regular_hours')) {
        await pool.query(
          'ALTER TABLE ojt_attendance_logs ADD COLUMN regular_hours DECIMAL(8,2) NOT NULL DEFAULT 0.00 AFTER overtime_hours'
        );
      } else if (attMap.get('regular_hours') !== 'decimal(8,2)') {
        await pool.query(
          'ALTER TABLE ojt_attendance_logs MODIFY COLUMN regular_hours DECIMAL(8,2) NOT NULL DEFAULT 0.00'
        );
      }

      if (attMap.has('hours_rendered') && attMap.get('hours_rendered') !== 'decimal(8,2)') {
        await pool.query(
          'ALTER TABLE ojt_attendance_logs MODIFY COLUMN hours_rendered DECIMAL(8,2) NULL DEFAULT 0.00'
        );
      }

      if (!attMap.has('overtime_approved_by')) {
        await pool.query(
          'ALTER TABLE ojt_attendance_logs ADD COLUMN overtime_approved_by BIGINT UNSIGNED NULL AFTER regular_hours'
        );
      }

      if (!attMap.has('overtime_approved_at')) {
        await pool.query(
          'ALTER TABLE ojt_attendance_logs ADD COLUMN overtime_approved_at DATETIME NULL AFTER overtime_approved_by'
        );
      }

      if (!attMap.has('scheduled_start_time')) {
        await pool.query(
          'ALTER TABLE ojt_attendance_logs ADD COLUMN scheduled_start_time TIME NULL AFTER overtime_approved_at'
        );
      }

      if (!attMap.has('scheduled_finish_time')) {
        await pool.query(
          'ALTER TABLE ojt_attendance_logs ADD COLUMN scheduled_finish_time TIME NULL AFTER scheduled_start_time'
        );
      }

      // 2. Align ojt_records default schedule columns
      const [ojtCols] = await pool.query('DESCRIBE ojt_records');
      const ojtColNames = new Set(ojtCols.map((c) => c.Field));

      if (!ojtColNames.has('scheduled_start_time')) {
        await pool.query(
          "ALTER TABLE ojt_records ADD COLUMN scheduled_start_time TIME NULL DEFAULT '08:00:00'"
        );
      }
      if (!ojtColNames.has('scheduled_finish_time')) {
        await pool.query(
          "ALTER TABLE ojt_records ADD COLUMN scheduled_finish_time TIME NULL DEFAULT '17:00:00'"
        );
      }

      // 3. Align ojt_daily_schedules
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ojt_daily_schedules (
          schedule_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          ojt_id BIGINT UNSIGNED NULL,
          student_id BIGINT UNSIGNED NOT NULL,
          organization_id BIGINT UNSIGNED NULL,
          mentor_id BIGINT UNSIGNED NULL,
          schedule_date DATE NOT NULL,
          start_time TIME NOT NULL DEFAULT '08:00:00',
          finish_time TIME NOT NULL DEFAULT '17:00:00',
          is_overtime_allowed TINYINT(1) NOT NULL DEFAULT 0,
          max_overtime_hours DECIMAL(8,2) NOT NULL DEFAULT 0.00,
          notes TEXT NULL,
          updated_by_user_id BIGINT UNSIGNED NULL,
          created_by BIGINT UNSIGNED NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_student_date (student_id, schedule_date),
          INDEX idx_ojt_date (ojt_id, schedule_date),
          INDEX idx_mentor (mentor_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      const [dsCols] = await pool.query('DESCRIBE ojt_daily_schedules');
      const dsMap = new Map(dsCols.map((c) => [c.Field, c]));

      if (dsMap.get('ojt_id')?.Null === 'NO') {
        await pool.query('ALTER TABLE ojt_daily_schedules MODIFY COLUMN ojt_id BIGINT UNSIGNED NULL');
      }
      if (dsMap.get('organization_id')?.Null === 'NO') {
        await pool.query('ALTER TABLE ojt_daily_schedules MODIFY COLUMN organization_id BIGINT UNSIGNED NULL');
      }
      if (
        dsMap.has('max_overtime_hours') &&
        String(dsMap.get('max_overtime_hours').Type || '').toLowerCase() !== 'decimal(8,2)'
      ) {
        await pool.query(
          'ALTER TABLE ojt_daily_schedules MODIFY COLUMN max_overtime_hours DECIMAL(8,2) NOT NULL DEFAULT 0.00'
        );
      }
      if (!dsMap.has('created_by')) {
        await pool.query('ALTER TABLE ojt_daily_schedules ADD COLUMN created_by BIGINT UNSIGNED NULL');
      }

      // 4. Align student_schedule_requests
      await pool.query(`
        CREATE TABLE IF NOT EXISTS student_schedule_requests (
          request_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          ojt_id BIGINT UNSIGNED NULL,
          student_id BIGINT UNSIGNED NOT NULL,
          organization_id BIGINT UNSIGNED NULL,
          mentor_id BIGINT UNSIGNED NULL,
          schedule_date DATE NOT NULL,
          requested_start_time TIME NOT NULL,
          requested_finish_time TIME NOT NULL,
          reason TEXT NULL,
          status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
          mentor_response_notes TEXT NULL,
          mentor_notes TEXT NULL,
          reviewed_by BIGINT UNSIGNED NULL,
          reviewed_at DATETIME NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_student_status (student_id, status),
          INDEX idx_mentor_status (mentor_id, status),
          INDEX idx_org_date (organization_id, schedule_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      const [srCols] = await pool.query('DESCRIBE student_schedule_requests');
      const srMap = new Map(srCols.map((c) => [c.Field, c]));

      if (srMap.get('ojt_id')?.Null === 'NO') {
        await pool.query('ALTER TABLE student_schedule_requests MODIFY COLUMN ojt_id BIGINT UNSIGNED NULL');
      }
      if (srMap.get('organization_id')?.Null === 'NO') {
        await pool.query('ALTER TABLE student_schedule_requests MODIFY COLUMN organization_id BIGINT UNSIGNED NULL');
      }
      if (srMap.get('reason')?.Null === 'NO') {
        await pool.query('ALTER TABLE student_schedule_requests MODIFY COLUMN reason TEXT NULL');
      }
      if (!srMap.has('mentor_notes')) {
        await pool.query('ALTER TABLE student_schedule_requests ADD COLUMN mentor_notes TEXT NULL AFTER mentor_response_notes');
      }
    } catch (err) {
      schemaEnsurePromise = null;
      console.warn('[AttendanceSchema] Schema alignment warning:', err.message);
    }
  })();

  return schemaEnsurePromise;
}

