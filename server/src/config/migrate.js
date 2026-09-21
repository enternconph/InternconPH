import pool from './db.js';

export async function runMigrations() {
  try {
    console.log('[Migration] Checking and aligning database schema...');

    // 1. Create access_codes table if it does not exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS access_codes (
        code_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        code_hash VARCHAR(64) NOT NULL UNIQUE,
        recipient_type ENUM('institution_staff', 'student', 'workplace_mentor') NOT NULL,
        institution_id BIGINT UNSIGNED NULL,
        organization_id BIGINT UNSIGNED NULL,
        program_id BIGINT UNSIGNED NULL,
        target_identifier VARCHAR(100) NOT NULL,
        intended_position VARCHAR(50) NULL,
        intended_classification VARCHAR(50) NULL,
        intended_status VARCHAR(50) NULL,
        intended_email VARCHAR(150) NULL,
        assigned_permissions JSON NULL,
        created_by BIGINT UNSIGNED NOT NULL,
        is_used TINYINT(1) DEFAULT 0,
        used_by_user_id BIGINT UNSIGNED NULL,
        used_at DATETIME NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ac_lookup (code_hash, recipient_type, is_used)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    const [acCols] = await pool.query('DESCRIBE access_codes');
    const acColNames = acCols.map(c => c.Field);
    if (!acColNames.includes('intended_email')) {
      await pool.query("ALTER TABLE access_codes ADD COLUMN intended_email VARCHAR(150) NULL AFTER intended_status");
      console.log('[Migration] Added intended_email to access_codes');
    }
    if (!acColNames.includes('intended_department')) {
      await pool.query("ALTER TABLE access_codes ADD COLUMN intended_department VARCHAR(100) NULL AFTER intended_position");
      console.log('[Migration] Added intended_department to access_codes');
    }
    if (!acColNames.includes('assigned_staff_id')) {
      await pool.query('ALTER TABLE access_codes ADD COLUMN assigned_staff_id BIGINT UNSIGNED NULL AFTER program_id');
      await pool.query('CREATE INDEX idx_access_codes_staff ON access_codes(assigned_staff_id)').catch(() => {});
      console.log('[Migration] Added assigned_staff_id to access_codes');
    }
    console.log('[Migration] access_codes table ready.');

    // 2. Create entity_registrations table if it does not exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS entity_registrations (
        registration_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        entity_type ENUM('institution', 'hiring_organization', 'institution_staff', 'student', 'workplace_mentor') NOT NULL,
        entity_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
        reviewer_user_id BIGINT UNSIGNED NULL,
        reviewed_at DATETIME NULL,
        rejection_reason TEXT NULL,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Migration] entity_registrations table ready.');

    // 3. Align institution_staff columns
    const [cols] = await pool.query('DESCRIBE institution_staff');
    const colNames = cols.map(c => c.Field);

    if (!colNames.includes('staff_number')) {
      await pool.query('ALTER TABLE institution_staff ADD COLUMN staff_number VARCHAR(50) NULL AFTER employee_id');
      console.log('[Migration] Added staff_number to institution_staff');
    }
    if (!colNames.includes('first_name')) {
      await pool.query('ALTER TABLE institution_staff ADD COLUMN first_name VARCHAR(100) NULL AFTER staff_number');
      console.log('[Migration] Added first_name to institution_staff');
    }
    if (!colNames.includes('last_name')) {
      await pool.query('ALTER TABLE institution_staff ADD COLUMN last_name VARCHAR(100) NULL AFTER first_name');
      console.log('[Migration] Added last_name to institution_staff');
    }
    if (!colNames.includes('program_id')) {
      await pool.query('ALTER TABLE institution_staff ADD COLUMN program_id BIGINT UNSIGNED NULL AFTER institution_id');
      console.log('[Migration] Added program_id to institution_staff');
    }
    if (!colNames.includes('contact_number')) {
      await pool.query('ALTER TABLE institution_staff ADD COLUMN contact_number VARCHAR(50) NULL AFTER last_name');
      console.log('[Migration] Added contact_number to institution_staff');
    }
    if (!colNames.includes('permissions')) {
      await pool.query('ALTER TABLE institution_staff ADD COLUMN permissions JSON NULL AFTER contact_number');
      console.log('[Migration] Added permissions to institution_staff');
    }
    if (!colNames.includes('is_verified')) {
      await pool.query('ALTER TABLE institution_staff ADD COLUMN is_verified TINYINT(1) DEFAULT 0 AFTER is_active');
      console.log('[Migration] Added is_verified to institution_staff');
    }

    await pool.query("ALTER TABLE institution_staff MODIFY COLUMN position VARCHAR(50) NOT NULL DEFAULT 'ojt_supervisor'");

    // 4. Create institution_job_approvals
    await pool.query(`
      CREATE TABLE IF NOT EXISTS institution_job_approvals (
        approval_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        job_id BIGINT UNSIGNED NOT NULL,
        institution_id BIGINT UNSIGNED NOT NULL,
        approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        reviewed_by BIGINT UNSIGNED NULL,
        reviewed_at DATETIME NULL,
        rejection_reason TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_job_inst_app (job_id, institution_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Migration] institution_job_approvals table ready.');

    // 5. Create organization_staff table if missing (for workplace mentors)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organization_staff (
        org_staff_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL UNIQUE,
        organization_id BIGINT UNSIGNED NOT NULL,
        program_id BIGINT UNSIGNED NULL,
        staff_number VARCHAR(50) NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        position VARCHAR(50) NOT NULL DEFAULT 'workplace_mentor',
        department VARCHAR(100) NULL,
        contact_number VARCHAR(50) NULL,
        is_verified TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    const [osCols] = await pool.query('DESCRIBE organization_staff');
    const osColNames = osCols.map(c => c.Field);
    if (!osColNames.includes('program_id')) {
      await pool.query('ALTER TABLE organization_staff ADD COLUMN program_id BIGINT UNSIGNED NULL AFTER organization_id');
      console.log('[Migration] Added program_id to organization_staff');
    }
    console.log('[Migration] organization_staff table ready.');

    // 6. Align students table columns
    const [stuCols] = await pool.query('DESCRIBE students');
    const stuColNames = stuCols.map(c => c.Field);

    if (!stuColNames.includes('classification')) {
      await pool.query("ALTER TABLE students ADD COLUMN classification VARCHAR(50) NOT NULL DEFAULT 'regular' AFTER category_id");
      console.log('[Migration] Added classification to students');
    }
    if (!stuColNames.includes('ojt_status')) {
      await pool.query("ALTER TABLE students ADD COLUMN ojt_status VARCHAR(50) NOT NULL DEFAULT 'starting_ojt' AFTER classification");
      console.log('[Migration] Added ojt_status to students');
    }
    if (!stuColNames.includes('passcode_used')) {
      await pool.query('ALTER TABLE students ADD COLUMN passcode_used VARCHAR(64) NULL AFTER ojt_status');
      console.log('[Migration] Added passcode_used to students');
    }
    if (!stuColNames.includes('is_verified')) {
      await pool.query('ALTER TABLE students ADD COLUMN is_verified TINYINT(1) DEFAULT 0 AFTER completed_ojt_hours');
      console.log('[Migration] Added is_verified to students');
    }
    if (!stuColNames.includes('is_active')) {
      await pool.query('ALTER TABLE students ADD COLUMN is_active TINYINT(1) DEFAULT 1 AFTER is_verified');
      console.log('[Migration] Added is_active to students');
    }

    // 7. Purge any legacy rejected student records
    const [rejected] = await pool.query(
      `SELECT sr.registration_id, sr.student_id, s.user_id, s.student_number 
       FROM student_registrations sr 
       JOIN students s ON sr.student_id = s.student_id 
       WHERE sr.status = 'rejected'`
    );
    for (const r of rejected) {
      await pool.query('DELETE FROM student_registrations WHERE student_id = ?', [r.student_id]);
      await pool.query("DELETE FROM entity_registrations WHERE entity_type = 'student' AND entity_id = ?", [r.student_id]);
      await pool.query('DELETE FROM students WHERE student_id = ?', [r.student_id]);
      await pool.query('DELETE FROM users WHERE user_id = ? AND is_verified = 0', [r.user_id]);
    }

    // 8. Align job_postings table columns
    const [jobCols] = await pool.query('DESCRIBE job_postings');
    const jobColNames = jobCols.map(c => c.Field);

    if (!jobColNames.includes('posting_type')) {
      await pool.query("ALTER TABLE job_postings ADD COLUMN posting_type VARCHAR(50) NOT NULL DEFAULT 'ojt' AFTER description");
    }
    if (!jobColNames.includes('job_type')) {
      await pool.query("ALTER TABLE job_postings ADD COLUMN job_type VARCHAR(50) NOT NULL DEFAULT 'ojt' AFTER posting_type");
    }
    if (!jobColNames.includes('mentor_id')) {
      await pool.query('ALTER TABLE job_postings ADD COLUMN mentor_id BIGINT UNSIGNED NULL AFTER organization_id');
    }
    if (!jobColNames.includes('finish_time')) {
      await pool.query('ALTER TABLE job_postings ADD COLUMN finish_time VARCHAR(100) NULL AFTER location');
    }
    if (!jobColNames.includes('on_call_days')) {
      await pool.query('ALTER TABLE job_postings ADD COLUMN on_call_days INT UNSIGNED NULL AFTER finish_time');
    }
    if (!jobColNames.includes('salary_rate')) {
      await pool.query('ALTER TABLE job_postings ADD COLUMN salary_rate DECIMAL(10,2) NULL AFTER on_call_days');
    }
    if (!jobColNames.includes('salary_rate_type')) {
      await pool.query("ALTER TABLE job_postings ADD COLUMN salary_rate_type VARCHAR(50) DEFAULT 'daily' AFTER salary_rate");
    }
    if (!jobColNames.includes('target_audience')) {
      await pool.query("ALTER TABLE job_postings ADD COLUMN target_audience VARCHAR(50) DEFAULT 'ojt_students' AFTER salary_rate_type");
    }
    if (!jobColNames.includes('requirements')) {
      await pool.query('ALTER TABLE job_postings ADD COLUMN requirements TEXT NULL AFTER description');
    }
    if (!jobColNames.includes('deliverables')) {
      await pool.query('ALTER TABLE job_postings ADD COLUMN deliverables TEXT NULL AFTER requirements');
    }
    if (!jobColNames.includes('workplace_area')) {
      await pool.query('ALTER TABLE job_postings ADD COLUMN workplace_area VARCHAR(150) NULL AFTER location');
      console.log('[Migration] Added workplace_area to job_postings');
    }

    // 9. Align hiring_organizations
    const [hoCols] = await pool.query('DESCRIBE hiring_organizations');
    const hoColNames = hoCols.map(c => c.Field);
    if (!hoColNames.includes('business_structure')) {
      await pool.query("ALTER TABLE hiring_organizations ADD COLUMN business_structure VARCHAR(50) NOT NULL DEFAULT 'corporation' AFTER organization_name");
    }
    if (!hoColNames.includes('sec_dti_number')) {
      await pool.query("ALTER TABLE hiring_organizations ADD COLUMN sec_dti_number VARCHAR(100) NULL AFTER province");
    }
    if (!hoColNames.includes('bir_tin')) {
      await pool.query("ALTER TABLE hiring_organizations ADD COLUMN bir_tin VARCHAR(100) NULL AFTER sec_dti_number");
    }
    if (!hoColNames.includes('mayors_permit_number')) {
      await pool.query("ALTER TABLE hiring_organizations ADD COLUMN mayors_permit_number VARCHAR(100) NULL AFTER bir_tin");
    }

    // 10. Align organization_documents
    await pool.query("ALTER TABLE organization_documents MODIFY COLUMN document_type VARCHAR(100) NOT NULL");
    const [docCols] = await pool.query('DESCRIBE organization_documents');
    const docColNames = docCols.map(c => c.Field);
    if (!docColNames.includes('document_name')) {
      await pool.query("ALTER TABLE organization_documents ADD COLUMN document_name VARCHAR(255) NULL AFTER document_type");
    }
    if (!docColNames.includes('file_name')) {
      await pool.query("ALTER TABLE organization_documents ADD COLUMN file_name VARCHAR(255) NULL AFTER file_path");
    }

    // 11. Create ojt_attendance_logs table for Daily Clock-in / Clock-out & Mentor verification
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ojt_attendance_logs (
        attendance_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        ojt_id BIGINT UNSIGNED NOT NULL,
        student_id BIGINT UNSIGNED NOT NULL,
        mentor_id BIGINT UNSIGNED NULL,
        log_date DATE NOT NULL,
        time_in TIME NOT NULL,
        time_out TIME NULL,
        hours_rendered DECIMAL(5,2) DEFAULT 0.00,
        tasks_accomplished TEXT NULL,
        status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
        verified_by BIGINT UNSIGNED NULL,
        verified_at DATETIME NULL,
        rejection_notes TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_att_ojt (ojt_id),
        INDEX idx_att_student (student_id),
        INDEX idx_att_date (log_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Migration] ojt_attendance_logs table ready.');

    // 12. Create master_programs if missing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS master_programs (
        master_program_id INT AUTO_INCREMENT PRIMARY KEY,
        program_name VARCHAR(150) NOT NULL,
        program_code VARCHAR(30) NOT NULL,
        discipline VARCHAR(100) NOT NULL,
        default_ojt_hours INT UNSIGNED NOT NULL DEFAULT 486,
        description TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_master_prog (program_name, program_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 13. Populate CHED nationwide standard degree programs if table is empty
    const [[{ progCount }]] = await pool.query('SELECT COUNT(*) as progCount FROM master_programs');
    if (progCount === 0) {
      const standardPrograms = [
        ['BS Information Technology', 'BSIT', 'Information Technology & Computing', 486, 'Software engineering, database systems, networking, web & mobile computing.'],
        ['BS Computer Science', 'BSCS', 'Information Technology & Computing', 486, 'Algorithms, data science, artificial intelligence, systems software architecture.'],
        ['BS Information Systems', 'BSIS', 'Information Technology & Computing', 486, 'Enterprise architecture, business analytics, IT service management.'],
        ['BS Civil Engineering', 'BSCE', 'Engineering & Architecture', 600, 'Structural analysis, geotechnical engineering, hydraulics, project management.'],
        ['BS Mechanical Engineering', 'BSME', 'Engineering & Architecture', 600, 'Thermodynamics, machine design, power plant engineering, robotics.'],
        ['BS Electrical Engineering', 'BSEE', 'Engineering & Architecture', 600, 'Power systems, electronics, electrical installation, energy conversion.'],
        ['BS Nursing', 'BSN', 'Health & Medical Sciences', 600, 'Clinical rotations, medical-surgical nursing, community healthcare, emergency care.'],
        ['BS Business Administration (HR Management)', 'BSBA-HRM', 'Business & Management', 600, 'Talent acquisition, organizational behavior, employee relations, labor law compliance.'],
        ['BS Accountancy', 'BSA', 'Business & Management', 600, 'Financial accounting, auditing and assurance, Philippine tax laws, corporate finance.'],
        ['BS Hospitality Management', 'BSHM', 'Hospitality & Tourism', 600, 'Hotel operations, food and beverage service, culinary arts, front office systems.'],
        ['BS Tourism Management', 'BSTM', 'Hospitality & Tourism', 600, 'Travel agency management, tour guiding, airline ticketing, ecotourism development.']
      ];

      for (const prog of standardPrograms) {
        await pool.query(
          `INSERT INTO master_programs (program_name, program_code, discipline, default_ojt_hours, description)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE discipline = VALUES(discipline), default_ojt_hours = VALUES(default_ojt_hours), description = VALUES(description)`,
          prog
        );
      }
    }

    // 14. Seed roles if missing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        role_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        role_name ENUM('system_admin', 'institution', 'institution_staff', 'student', 'hiring_organization') NOT NULL UNIQUE,
        description VARCHAR(255) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    const defaultRoles = [
      ['system_admin', 'System Administrator'],
      ['institution', 'Higher Education Institution'],
      ['institution_staff', 'Institution Staff / Coordinator / Registrar'],
      ['student', 'Student / Trainee / Intern'],
      ['hiring_organization', 'Host Training Establishment / Company']
    ];
    for (const [roleName, desc] of defaultRoles) {
      await pool.query(
        'INSERT IGNORE INTO roles (role_name, description) VALUES (?, ?)',
        [roleName, desc]
      );
    }

    // 15. Seed student_categories if missing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_categories (
        category_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        category_name VARCHAR(100) NOT NULL UNIQUE,
        description VARCHAR(255) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    const defaultCategories = [
      ['Regular Student', 'Standard regular student undergoing OJT'],
      ['Returnee (Requires Registrar Verification)', 'Returning student requiring registrar verification'],
      ['Transferee (Requires Registrar Verification)', 'Transferee student requiring registrar verification']
    ];
    for (const [catName, desc] of defaultCategories) {
      await pool.query(
        `INSERT INTO student_categories (category_name, description) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE description = VALUES(description)`,
        [catName, desc]
      );
    }
    console.log('[Migration] student_categories seeded.');

    // 16. Seed student_statuses if missing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_statuses (
        status_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        status_name VARCHAR(50) NOT NULL UNIQUE,
        description VARCHAR(255) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    const defaultStatuses = [
      ['pending', 'Pending Verification / Approval'],
      ['active', 'Active Enrolled Student'],
      ['ongoing_ojt', 'Ongoing OJT Placement'],
      ['completed_ojt', 'Completed OJT Requirements'],
      ['graduated', 'Graduated Student']
    ];
    for (const [statName, desc] of defaultStatuses) {
      await pool.query(
        `INSERT INTO student_statuses (status_name, description) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE description = VALUES(description)`,
        [statName, desc]
      );
    }
    console.log('[Migration] student_statuses seeded.');

    // 17. Seed skill_categories & complaint_categories if missing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS skill_categories (
        category_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        category_name VARCHAR(100) NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    const skillCats = ['Technical Skills', 'Soft Skills', 'Design & Creative', 'Business & Management'];
    for (const sc of skillCats) {
      await pool.query('INSERT IGNORE INTO skill_categories (category_name) VALUES (?)', [sc]);
    }

    // 17b. Create missing skills tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS skills (
        skill_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        category_id INT UNSIGNED NULL,
        skill_name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES skill_categories(category_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_required_skills (
        job_id BIGINT UNSIGNED NOT NULL,
        skill_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (job_id, skill_id),
        FOREIGN KEY (skill_id) REFERENCES skills(skill_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_skills (
        student_id BIGINT UNSIGNED NOT NULL,
        skill_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (student_id, skill_id),
        FOREIGN KEY (skill_id) REFERENCES skills(skill_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS skill_demand_statistics (
        stat_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        skill_id BIGINT UNSIGNED NOT NULL,
        demand_count INT UNSIGNED DEFAULT 0,
        last_calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_skill_stat (skill_id),
        FOREIGN KEY (skill_id) REFERENCES skills(skill_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Seed some initial skills
    const [[{ catCount }]] = await pool.query('SELECT COUNT(*) as count FROM skill_categories');
    if (catCount > 0) {
      const basicSkills = [
        ['JavaScript', 1], ['React', 1], ['Node.js', 1], ['SQL', 1],
        ['Communication', 2], ['Leadership', 2], ['Problem Solving', 2],
        ['UI/UX Design', 3], ['Figma', 3],
        ['Project Management', 4], ['Data Analysis', 4]
      ];
      for (const [skillName, catId] of basicSkills) {
         await pool.query('INSERT IGNORE INTO skills (skill_name, category_id) VALUES (?, ?)', [skillName, catId]);
      }
      
      // Optionally seed some demand stats so the dashboard isn't completely empty
      await pool.query(`
        INSERT IGNORE INTO skill_demand_statistics (skill_id, demand_count)
        SELECT skill_id, FLOOR(RAND() * 50) + 1 FROM skills
      `);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS complaint_categories (
        category_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        category_name VARCHAR(100) NOT NULL UNIQUE,
        description VARCHAR(255) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    const complaintCats = [
      ['Workplace Harassment', 'Unsafe or inappropriate workplace conduct'],
      ['Safety & Working Conditions', 'Substandard health and occupational safety'],
      ['Excessive Hours / Exploitation', 'Hours exceeding CHED or MOA guidelines'],
      ['Allowance / Stipend Issues', 'Delayed or unpaid agreed allowance'],
      ['Other', 'General complaints and grievances'],
      // Conduct Categories
      ['General Misconduct / Unprofessional Behavior', 'Unprofessional conduct, behavioral infractions, or workplace disruption'],
      ['Chronic Absenteeism / Unauthorized Tardiness', 'Unexcused absences, chronic lateness, or schedule abandonment'],
      ['Safety Protocol Violation', 'Disregard of safety equipment, PPE, or operational health standards'],
      ['Company Property Damage / Negligence', 'Negligent handling or willful damage to organization property, hardware, or facilities'],
      ['Breach of NDA / Data Confidentiality', 'Unauthorized disclosure of proprietary data, intellectual property, or confidential client records'],
      ['Interpersonal Conflict / Harassment', 'Verbal hostility, bullying, or conflict with colleagues or supervisors'],
      ['Other Workplace Concern', 'General behavioral or workplace conduct matters'],
      // Accident & Injury Categories
      ['Workplace Accident & Physical Injury', 'Physical trauma, injury, or acute medical incident during work shift'],
      ['Slip, Trip or Fall Incident', 'Slips, trips, or falls within facility premises'],
      ['Machinery / Equipment Hazard', 'Injuries resulting from tools, machines, or laboratory apparatus'],
      ['Chemical / Hazardous Exposure', 'Exposure to chemicals, biohazards, fumes, or toxic substances'],
      ['Physical Strain / Ergonomic Injury', 'Acute musculoskeletal strain from heavy lifting or repetitive trauma'],
      ['Medical Emergency / Acute Physical Trauma', 'Sudden medical event, fainting, cardiac, or respiratory distress on duty'],
      ['Other Workplace Safety Incident', 'General workplace safety or physical hazard event']
    ];
    for (const [ccName, desc] of complaintCats) {
      await pool.query(
        `INSERT INTO complaint_categories (category_name, description) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE description = VALUES(description)`,
        [ccName, desc]
      );
    }

    // Align complaints table columns for conduct & accident reporting
    try {
      const [compCols] = await pool.query('DESCRIBE complaints');
      const compColNames = compCols.map(c => c.Field);
      if (!compColNames.includes('incident_category')) {
        await pool.query('ALTER TABLE complaints ADD COLUMN incident_category VARCHAR(150) NULL AFTER category_id');
        console.log('[Migration] Added incident_category to complaints');
      }
      if (!compColNames.includes('evidence_url')) {
        await pool.query('ALTER TABLE complaints ADD COLUMN evidence_url VARCHAR(500) NULL AFTER resolution_notes');
        console.log('[Migration] Added evidence_url to complaints');
      }
    } catch (err) {
      console.warn('[Migration] Complaints table check skipped:', err.message);
    }

    // 18. Align institutions table
    const [instCols] = await pool.query('DESCRIBE institutions');
    const instColNames = instCols.map(c => c.Field);
    if (!instColNames.includes('institution_type')) {
      await pool.query("ALTER TABLE institutions ADD COLUMN institution_type VARCHAR(50) NOT NULL DEFAULT 'university' AFTER institution_code");
      console.log('[Migration] Added institution_type to institutions');
    }
    if (!instColNames.includes('accreditation_number')) {
      await pool.query("ALTER TABLE institutions ADD COLUMN accreditation_number VARCHAR(100) NULL AFTER contact_phone");
      console.log('[Migration] Added accreditation_number to institutions');
    }
    if (!instColNames.includes('director_name')) {
      await pool.query("ALTER TABLE institutions ADD COLUMN director_name VARCHAR(150) NULL AFTER accreditation_number");
      console.log('[Migration] Added director_name to institutions');
    }
    if (!instColNames.includes('director_title')) {
      await pool.query("ALTER TABLE institutions ADD COLUMN director_title VARCHAR(150) NULL AFTER director_name");
      console.log('[Migration] Added director_title to institutions');
    }

    // 19. Align institution_documents table
    const [instDocCols] = await pool.query('DESCRIBE institution_documents');
    const instDocColNames = instDocCols.map(c => c.Field);
    if (!instDocColNames.includes('document_name')) {
      await pool.query("ALTER TABLE institution_documents ADD COLUMN document_name VARCHAR(255) NULL AFTER document_type");
      console.log('[Migration] Added document_name to institution_documents');
    }
    if (!instDocColNames.includes('file_name')) {
      await pool.query("ALTER TABLE institution_documents ADD COLUMN file_name VARCHAR(255) NULL AFTER file_path");
      console.log('[Migration] Added file_name to institution_documents');
    }
    await pool.query("ALTER TABLE institution_documents MODIFY COLUMN document_type VARCHAR(100) NOT NULL DEFAULT 'accreditation_certificate'");
    console.log('[Migration] institution_documents aligned.');

    // 20. Align institution_staff department column
    const [staffCols] = await pool.query('DESCRIBE institution_staff');
    const staffColNames = staffCols.map(c => c.Field);
    if (!staffColNames.includes('department')) {
      await pool.query("ALTER TABLE institution_staff ADD COLUMN department VARCHAR(150) NULL AFTER program_id");
      console.log('[Migration] Added department column to institution_staff');
    }
    // Backfill department from programs where applicable
    await pool.query(`
      UPDATE institution_staff ist
      JOIN programs p ON ist.program_id = p.program_id
      SET ist.department = p.department
      WHERE (ist.department IS NULL OR ist.department = '') AND p.department IS NOT NULL
    `);
    console.log('[Migration] Backfilled institution_staff department from programs.');

    // 21. Align portfolio_items and student_resumes for Career Portfolio & Credentials
    const [portCols] = await pool.query('DESCRIBE portfolio_items');
    const portColNames = portCols.map(c => c.Field);
    await pool.query("ALTER TABLE portfolio_items MODIFY COLUMN item_type VARCHAR(50) NOT NULL DEFAULT 'academic_portfolio'");
    if (!portColNames.includes('file_name')) {
      await pool.query("ALTER TABLE portfolio_items ADD COLUMN file_name VARCHAR(255) NULL AFTER file_path");
      console.log('[Migration] Added file_name to portfolio_items');
    }
    if (!portColNames.includes('file_size')) {
      await pool.query("ALTER TABLE portfolio_items ADD COLUMN file_size INT UNSIGNED NULL AFTER file_name");
      console.log('[Migration] Added file_size to portfolio_items');
    }
    if (!portColNames.includes('sub_category')) {
      await pool.query("ALTER TABLE portfolio_items ADD COLUMN sub_category VARCHAR(100) NULL AFTER item_type");
      console.log('[Migration] Added sub_category to portfolio_items');
    }

    const [resumeCols] = await pool.query('DESCRIBE student_resumes');
    const resumeColNames = resumeCols.map(c => c.Field);
    if (!resumeColNames.includes('file_name')) {
      await pool.query("ALTER TABLE student_resumes ADD COLUMN file_name VARCHAR(255) NULL AFTER file_path");
      console.log('[Migration] Added file_name to student_resumes');
    }
    if (!resumeColNames.includes('file_size')) {
      await pool.query("ALTER TABLE student_resumes ADD COLUMN file_size INT UNSIGNED NULL AFTER file_name");
      console.log('[Migration] Added file_size to student_resumes');
    }
    console.log('[Migration] portfolio_items and student_resumes aligned.');

    // 22. Align ojt_performance_records for competency score_details
    const [oprCols] = await pool.query('DESCRIBE ojt_performance_records');
    const oprColNames = oprCols.map(c => c.Field);
    if (!oprColNames.includes('score_details')) {
      await pool.query("ALTER TABLE ojt_performance_records ADD COLUMN score_details JSON NULL AFTER comments");
      console.log('[Migration] Added score_details JSON column to ojt_performance_records');
    }
    console.log('[Migration] ojt_performance_records aligned.');

    // 23. Align users for avatar_url, display_name and create user_preferences table
    const [userCols] = await pool.query('DESCRIBE users');
    const userColNames = userCols.map(c => c.Field);
    if (!userColNames.includes('avatar_url')) {
      await pool.query("ALTER TABLE users ADD COLUMN avatar_url TEXT NULL AFTER email");
      console.log('[Migration] Added avatar_url to users');
    }
    if (!userColNames.includes('display_name')) {
      await pool.query("ALTER TABLE users ADD COLUMN display_name VARCHAR(150) NULL AFTER avatar_url");
      console.log('[Migration] Added display_name to users');
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        preference_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL UNIQUE,
        theme VARCHAR(20) DEFAULT 'light',
        sound_enabled TINYINT(1) DEFAULT 1,
        email_notifications TINYINT(1) DEFAULT 1,
        sms_alerts TINYINT(1) DEFAULT 0,
        ojt_updates TINYINT(1) DEFAULT 1,
        grievance_alerts TINYINT(1) DEFAULT 1,
        marketing_emails TINYINT(1) DEFAULT 0,
        compact_view TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_user_pref_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Migration] user_preferences table aligned.');

    // 24. Performance Indexes for High-Traffic Queries
    await pool.query('CREATE INDEX idx_hiring_orgs_email ON hiring_organizations(contact_email)').catch(() => {});
    await pool.query('CREATE INDEX idx_institutions_email ON institutions(contact_email)').catch(() => {});
    await pool.query('CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id)').catch(() => {});
    await pool.query('CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at)').catch(() => {});
    await pool.query('CREATE INDEX idx_students_inst ON students(institution_id)').catch(() => {});
    await pool.query('CREATE INDEX idx_students_prog ON students(program_id)').catch(() => {});
    await pool.query('CREATE INDEX idx_ojt_org ON ojt_records(organization_id)').catch(() => {});
    await pool.query('CREATE INDEX idx_ojt_stu ON ojt_records(student_id)').catch(() => {});
    // Compound indexes for accelerated joins, sorting, and high-frequency filtering
    await pool.query('CREATE INDEX idx_inst_job_app_status ON institution_job_approvals(institution_id, approval_status)').catch(() => {});
    await pool.query('CREATE INDEX idx_jobpost_status_created ON job_postings(status, created_at)').catch(() => {});
    await pool.query('CREATE INDEX idx_jobapp_stu_status ON job_applications(student_id, status)').catch(() => {});
    await pool.query('CREATE INDEX idx_att_ojt_date ON ojt_attendance_logs(ojt_id, log_date)').catch(() => {});
    await pool.query('CREATE INDEX idx_notif_user_read ON notifications(user_id, is_read, created_at)').catch(() => {});
    console.log('[Migration] Performance and compound indexes verified.');

    // 25. Secure Session Management Table (user_sessions)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        session_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        session_token_hash VARCHAR(64) NOT NULL UNIQUE,
        user_id BIGINT UNSIGNED NOT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        absolute_expires_at DATETIME NOT NULL,
        revoked_at DATETIME NULL,
        revoked_reason VARCHAR(100) NULL,
        INDEX idx_session_hash_status (session_token_hash, revoked_at, expires_at),
        INDEX idx_session_user (user_id),
        INDEX idx_session_last_act (last_activity_at),
        CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Migration] user_sessions table aligned.');

    // 26. Persistent Upload Storage (stored_uploads) for Ephemeral Server Environments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stored_uploads (
        upload_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        file_path VARCHAR(255) NOT NULL UNIQUE,
        file_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NULL,
        file_size BIGINT UNSIGNED NOT NULL,
        file_data LONGBLOB NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_file_path (file_path),
        INDEX idx_file_name (file_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Migration] stored_uploads table aligned.');

    // 27. Ensure accident_reports has admin_read_at column for mark-as-read tracking
    try {
      const [arCols] = await pool.query('DESCRIBE accident_reports');
      const arColNames = arCols.map(c => c.Field);
      if (!arColNames.includes('admin_read_at')) {
        await pool.query('ALTER TABLE accident_reports ADD COLUMN admin_read_at DATETIME NULL DEFAULT NULL AFTER reported_by');
        console.log('[Migration] Added admin_read_at to accident_reports');
      }
    } catch (arErr) {
      console.warn('[Migration Warning] accident_reports check failed:', arErr.message);
    }
    console.log('[Migration] accident_reports table aligned.');

    console.log('[Migration] All schema alignments completed successfully!');
  } catch (error) {
    console.error('[Migration Error]', error);
  }
}
