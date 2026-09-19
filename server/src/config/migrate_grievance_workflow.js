import pool from './db.js';

async function runMigration() {
  console.log('[Migration] Starting database migration for Notification System & Incident/Grievance Workflow...');

  try {
    // 1. Update notifications table
    console.log('[Migration] Updating notifications table...');
    const [notifCols] = await pool.query('DESCRIBE notifications');
    const notifColNames = notifCols.map(c => c.Field);

    if (!notifColNames.includes('sender_id')) {
      await pool.query('ALTER TABLE notifications ADD COLUMN sender_id BIGINT UNSIGNED NULL AFTER user_id');
    }
    if (!notifColNames.includes('sender_name')) {
      await pool.query('ALTER TABLE notifications ADD COLUMN sender_name VARCHAR(150) NULL AFTER sender_id');
    }
    if (!notifColNames.includes('link')) {
      await pool.query('ALTER TABLE notifications ADD COLUMN link VARCHAR(255) NULL AFTER message');
    }
    if (!notifColNames.includes('related_type')) {
      await pool.query('ALTER TABLE notifications ADD COLUMN related_type VARCHAR(50) NULL AFTER link');
    }
    if (!notifColNames.includes('related_id')) {
      await pool.query('ALTER TABLE notifications ADD COLUMN related_id BIGINT UNSIGNED NULL AFTER related_type');
    }
    console.log('[Migration] notifications table updated successfully.');

    // 2. Update complaints table
    console.log('[Migration] Updating complaints table...');
    const [compCols] = await pool.query('DESCRIBE complaints');
    const compColNames = compCols.map(c => c.Field);

    if (!compColNames.includes('complainant_type')) {
      await pool.query("ALTER TABLE complaints ADD COLUMN complainant_type ENUM('student', 'organization') DEFAULT 'student' AFTER student_id");
    }
    if (!compColNames.includes('is_accident')) {
      await pool.query('ALTER TABLE complaints ADD COLUMN is_accident TINYINT(1) DEFAULT 0 AFTER description');
    }
    if (!compColNames.includes('forwarded_to_org')) {
      await pool.query('ALTER TABLE complaints ADD COLUMN forwarded_to_org TINYINT(1) DEFAULT 0 AFTER is_accident');
    }
    if (!compColNames.includes('forwarded_to_org_at')) {
      await pool.query('ALTER TABLE complaints ADD COLUMN forwarded_to_org_at DATETIME NULL AFTER forwarded_to_org');
    }
    if (!compColNames.includes('org_notice_summary')) {
      await pool.query('ALTER TABLE complaints ADD COLUMN org_notice_summary TEXT NULL AFTER forwarded_to_org_at');
    }
    if (!compColNames.includes('include_student_details')) {
      await pool.query('ALTER TABLE complaints ADD COLUMN include_student_details TINYINT(1) DEFAULT 0 AFTER org_notice_summary');
    }
    if (!compColNames.includes('warning_note_to_student')) {
      await pool.query('ALTER TABLE complaints ADD COLUMN warning_note_to_student TEXT NULL AFTER include_student_details');
    }
    if (!compColNames.includes('warning_sent_at')) {
      await pool.query('ALTER TABLE complaints ADD COLUMN warning_sent_at DATETIME NULL AFTER warning_note_to_student');
    }
    console.log('[Migration] complaints table updated successfully.');

    // 3. Create accident_reports table
    console.log('[Migration] Creating accident_reports table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accident_reports (
        accident_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        complaint_id BIGINT UNSIGNED NOT NULL,
        organization_id BIGINT UNSIGNED NOT NULL,
        student_id BIGINT UNSIGNED NOT NULL,
        incident_datetime DATETIME NOT NULL,
        location VARCHAR(255) NOT NULL,
        severity ENUM('minor', 'moderate', 'severe', 'critical', 'fatal') NOT NULL DEFAULT 'moderate',
        injury_description TEXT NOT NULL,
        medical_attention_given TEXT,
        witnesses TEXT,
        immediate_action_taken TEXT,
        preventive_measures TEXT,
        reported_by BIGINT UNSIGNED NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_complaint (complaint_id),
        INDEX idx_org (organization_id),
        INDEX idx_student (student_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await pool.query("ALTER TABLE accident_reports MODIFY COLUMN severity ENUM('minor', 'moderate', 'severe', 'critical', 'fatal') NOT NULL DEFAULT 'moderate'");
    console.log('[Migration] accident_reports table ready.');

    // 4. Create institution_reports table
    console.log('[Migration] Creating institution_reports table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS institution_reports (
        report_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        institution_id BIGINT UNSIGNED NOT NULL,
        organization_id BIGINT UNSIGNED NOT NULL,
        complaint_id BIGINT UNSIGNED NOT NULL,
        category_id INT UNSIGNED NOT NULL,
        title VARCHAR(200) NOT NULL,
        findings TEXT NOT NULL,
        recommendation TEXT NOT NULL,
        action_taken TEXT,
        reported_by BIGINT UNSIGNED NOT NULL,
        status ENUM('submitted', 'under_review', 'action_taken', 'closed') DEFAULT 'submitted',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_inst (institution_id),
        INDEX idx_org (organization_id),
        INDEX idx_complaint (complaint_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('[Migration] institution_reports table ready.');

    console.log('[Migration] All database migrations completed successfully.');
  } catch (err) {
    console.error('[Migration Error]:', err);
    process.exit(1);
  }

  process.exit(0);
}

runMigration();
