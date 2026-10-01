/**
 * cleanup_users.js
 * Deletes ALL users and their associated data EXCEPT admin1@g.com
 * Run with: node cleanup_users.js
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const KEEP_EMAIL = 'admin1@g.com';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'interncon_ph',
  waitForConnections: true,
  connectionLimit: 5,
});

async function cleanup() {
  const conn = await pool.getConnection();
  try {
    // 1. Resolve admin user_id
    const [[admin]] = await conn.query(
      'SELECT user_id, email FROM users WHERE email = ?',
      [KEEP_EMAIL]
    );
    if (!admin) {
      console.error(`ERROR: Admin user '${KEEP_EMAIL}' not found! Aborting.`);
      process.exit(1);
    }
    console.log(`Admin user found: user_id=${admin.user_id}, email=${admin.email}`);

    // Count users to be deleted (preview)
    const [[{ toDelete }]] = await conn.query(
      'SELECT COUNT(*) AS toDelete FROM users WHERE email != ?',
      [KEEP_EMAIL]
    );
    console.log(`Users to be deleted: ${toDelete}`);

    // Disable FK checks to avoid ordering issues
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    console.log('\nForeign key checks disabled.');

    await conn.beginTransaction();

    // ── 2. Delete rows in tables that reference users with ON DELETE RESTRICT ──
    // These must be removed before deleting the user rows.

    // complaint_reviews (reviewed_by -> users RESTRICT)
    const [cr] = await conn.query(
      'DELETE FROM complaint_reviews WHERE reviewed_by != ?',
      [admin.user_id]
    );
    console.log(`complaint_reviews deleted: ${cr.affectedRows}`);

    // job_posting_reviews (reviewed_by -> users RESTRICT)
    const [jpr] = await conn.query(
      'DELETE FROM job_posting_reviews WHERE reviewed_by != ?',
      [admin.user_id]
    );
    console.log(`job_posting_reviews deleted: ${jpr.affectedRows}`);

    // ojt_performance_records (evaluator_id -> users RESTRICT)
    const [opr] = await conn.query(
      'DELETE FROM ojt_performance_records WHERE evaluator_id != ?',
      [admin.user_id]
    );
    console.log(`ojt_performance_records deleted: ${opr.affectedRows}`);

    // organization_status_history (changed_by -> users RESTRICT)
    const [osh] = await conn.query(
      'DELETE FROM organization_status_history WHERE changed_by != ?',
      [admin.user_id]
    );
    console.log(`organization_status_history deleted: ${osh.affectedRows}`);

    // organization_suspensions (issued_by -> users RESTRICT)
    const [osus] = await conn.query(
      'DELETE FROM organization_suspensions WHERE issued_by != ?',
      [admin.user_id]
    );
    console.log(`organization_suspensions deleted: ${osus.affectedRows}`);

    // organization_warnings (issued_by -> users RESTRICT)
    const [owarn] = await conn.query(
      'DELETE FROM organization_warnings WHERE issued_by != ?',
      [admin.user_id]
    );
    console.log(`organization_warnings deleted: ${owarn.affectedRows}`);

    // ojt_deployment_offers (offered_by -> users RESTRICT)
    const [odo] = await conn.query(
      'DELETE FROM ojt_deployment_offers WHERE offered_by != ?',
      [admin.user_id]
    );
    console.log(`ojt_deployment_offers deleted: ${odo.affectedRows}`);

    // institution_registrations (submitted_by -> users RESTRICT)
    const [ir] = await conn.query(
      'DELETE FROM institution_registrations WHERE submitted_by != ?',
      [admin.user_id]
    );
    console.log(`institution_registrations deleted: ${ir.affectedRows}`);

    // organization_registrations (submitted_by -> users RESTRICT)
    const [or_] = await conn.query(
      'DELETE FROM organization_registrations WHERE submitted_by != ?',
      [admin.user_id]
    );
    console.log(`organization_registrations deleted: ${or_.affectedRows}`);

    // ── 3. Delete profile tables linked to non-admin users ──

    // institution_staff (CASCADE -> student_staff_assignments)
    const [is_] = await conn.query(
      'DELETE FROM institution_staff WHERE user_id != ?',
      [admin.user_id]
    );
    console.log(`institution_staff deleted: ${is_.affectedRows}`);

    // organization_staff / workplace_mentors
    const [os] = await conn.query(
      'DELETE FROM organization_staff WHERE user_id != ?',
      [admin.user_id]
    );
    console.log(`organization_staff deleted: ${os.affectedRows}`);

    // students — CASCADE covers: job_applications, complaints, ojt_records,
    //   student_documents, student_portfolios/portfolio_items, student_skills,
    //   student_resumes, student_achievements, student_registrations,
    //   student_skill_recommendations, student_staff_assignments,
    //   ojt_student_requirements, ojt_deployment_offers(student FK)
    const [st] = await conn.query(
      'DELETE FROM students WHERE user_id != ?',
      [admin.user_id]
    );
    console.log(`students (and cascaded data) deleted: ${st.affectedRows}`);

    // ── 4. Delete access_codes created by non-admin users ──
    const [ac] = await conn.query(
      'DELETE FROM access_codes WHERE created_by != ?',
      [admin.user_id]
    );
    console.log(`access_codes deleted: ${ac.affectedRows}`);

    // ── 5. Delete entity_registrations for non-admin users ──
    const [er] = await conn.query(
      'DELETE FROM entity_registrations WHERE user_id != ?',
      [admin.user_id]
    );
    console.log(`entity_registrations deleted: ${er.affectedRows}`);

    // ── 6. Delete notifications for non-admin users ──
    const [notif] = await conn.query(
      'DELETE FROM notifications WHERE user_id != ?',
      [admin.user_id]
    );
    console.log(`notifications deleted: ${notif.affectedRows}`);

    // ── 7. Delete orphaned institutions and hiring_organizations ──
    // (no remaining users reference them now)
    const [ho] = await conn.query('DELETE FROM hiring_organizations');
    console.log(`hiring_organizations deleted: ${ho.affectedRows}`);

    const [inst] = await conn.query('DELETE FROM institutions');
    console.log(`institutions deleted: ${inst.affectedRows}`);

    // ── 8. Finally delete all users except admin ──
    const [u] = await conn.query(
      'DELETE FROM users WHERE email != ?',
      [KEEP_EMAIL]
    );
    console.log(`\nusers deleted: ${u.affectedRows}`);

    await conn.commit();

    // Re-enable FK checks
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Foreign key checks re-enabled.');

    // ── 9. Verify ──
    const [[{ remaining }]] = await conn.query('SELECT COUNT(*) AS remaining FROM users');
    console.log(`\n✅ Done. Remaining users: ${remaining}`);
    const [remainingUsers] = await conn.query('SELECT user_id, email FROM users');
    console.table(remainingUsers);

  } catch (err) {
    await conn.rollback();
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.error('\n❌ Error — transaction rolled back:', err.message);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

cleanup();
