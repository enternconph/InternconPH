import pool from './src/config/db.js';
import bcrypt from 'bcryptjs';

async function seedData() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const passHash = await bcrypt.hash('DemoPassword2026!', 10);
    const adminHash = await bcrypt.hash('AdminPassword2026!', 10);

    // 1. Ensure Admin Account
    await connection.query(
      `INSERT INTO users (role_id, email, password_hash, is_active, is_verified) 
       VALUES (1, 'admin@interncon.ph', ?, 1, 1)
       ON DUPLICATE KEY UPDATE password_hash = ?, is_active = 1, is_verified = 1`,
      [adminHash, adminHash]
    );

    // 2. Create Institution Account & Detail
    await connection.query(
      `INSERT INTO users (role_id, email, password_hash, is_active, is_verified)
       VALUES (2, 'institution@interncon.ph', ?, 1, 1)
       ON DUPLICATE KEY UPDATE password_hash = ?, is_active = 1, is_verified = 1`,
      [passHash, passHash]
    );
    const [[instUser]] = await connection.query("SELECT user_id FROM users WHERE email = 'institution@interncon.ph'");

    let instId;
    const [insts] = await connection.query("SELECT institution_id FROM institutions WHERE institution_code = 'PUP-MNL'");
    if (insts.length === 0) {
      const [res] = await connection.query(
        `INSERT INTO institutions (institution_name, institution_code, website, address, contact_email, contact_phone, status)
         VALUES ('Polytechnic University of the Philippines', 'PUP-MNL', 'https://pup.edu.ph', 'Sta. Mesa, Manila', 'institution@interncon.ph', '0287167832', 'approved')`
      );
      instId = res.insertId;
      await connection.query(
        `INSERT INTO institution_registrations (institution_id, submitted_by, status, reviewed_at)
         VALUES (?, ?, 'approved', CURRENT_TIMESTAMP)`,
        [instId, instUser.user_id]
      );
    } else {
      instId = insts[0].institution_id;
    }

    // 3. Create Programs for Institution
    await connection.query(
      `INSERT IGNORE INTO programs (institution_id, program_name, program_code, required_ojt_hours)
       VALUES 
       (?, 'Bachelor of Science in Information Technology', 'BSIT', 600),
       (?, 'Bachelor of Science in Computer Science', 'BSCS', 500),
       (?, 'Bachelor of Science in Business Administration', 'BSBA', 400)`,
      [instId, instId, instId]
    );
    const [progs] = await connection.query("SELECT program_id FROM programs WHERE institution_id = ? AND program_code = 'BSIT'", [instId]);
    const programId = progs[0].program_id;

    // 4. Create Student Account & Profile
    await connection.query(
      `INSERT INTO users (role_id, email, password_hash, is_active, is_verified)
       VALUES (4, 'student@interncon.ph', ?, 1, 1)
       ON DUPLICATE KEY UPDATE password_hash = ?, is_active = 1, is_verified = 1`,
      [passHash, passHash]
    );
    const [[stuUser]] = await connection.query("SELECT user_id FROM users WHERE email = 'student@interncon.ph'");

    let studentId;
    const [stus] = await connection.query("SELECT student_id FROM students WHERE user_id = ?", [stuUser.user_id]);
    if (stus.length === 0) {
      const [sRes] = await connection.query(
        `INSERT INTO students (user_id, institution_id, program_id, student_number, category_id, status_id, first_name, middle_name, last_name, contact_number, address, required_ojt_hours)
         VALUES (?, ?, ?, '2023-00123-MN-0', 1, 2, 'Juan', 'Dela', 'Cruz', '09171234567', 'Quezon City, Metro Manila', 600)`,
        [stuUser.user_id, instId, programId]
      );
      studentId = sRes.insertId;
      await connection.query(
        `INSERT INTO student_registrations (student_id, status, reviewed_at)
         VALUES (?, 'approved', CURRENT_TIMESTAMP)`,
        [studentId]
      );
    } else {
      studentId = stus[0].student_id;
    }

    // 5. Create Hiring Organization Account & Profile
    await connection.query(
      `INSERT INTO users (role_id, email, password_hash, is_active, is_verified)
       VALUES (5, 'org@interncon.ph', ?, 1, 1)
       ON DUPLICATE KEY UPDATE password_hash = ?, is_active = 1, is_verified = 1`,
      [passHash, passHash]
    );
    const [[orgUser]] = await connection.query("SELECT user_id FROM users WHERE email = 'org@interncon.ph'");

    let orgId;
    const [orgs] = await connection.query("SELECT organization_id FROM hiring_organizations WHERE contact_email = 'org@interncon.ph'");
    if (orgs.length === 0) {
      const [oRes] = await connection.query(
        `INSERT INTO hiring_organizations (organization_name, industry, website, address, contact_email, contact_phone, status)
         VALUES ('TechInnovate Philippines Inc.', 'Technology', 'https://techinnovate.ph', 'Bonifacio Global City, Taguig', 'org@interncon.ph', '0281234567', 'approved')`
      );
      orgId = oRes.insertId;
      await connection.query(
        `INSERT INTO organization_registrations (organization_id, submitted_by, status, reviewed_at)
         VALUES (?, ?, 'approved', CURRENT_TIMESTAMP)`,
        [orgId, orgUser.user_id]
      );
    } else {
      orgId = orgs[0].organization_id;
    }

    // 6. Create Job Postings
    const [jobs] = await connection.query("SELECT job_id FROM job_postings WHERE organization_id = ?", [orgId]);
    let jobId;
    if (jobs.length === 0) {
      const [jRes] = await connection.query(
        `INSERT INTO job_postings (organization_id, title, description, requirements, location, work_setup, slots_available, status)
         VALUES 
         (?, 'Frontend Developer Intern (React/JS)', 'Build modern responsive React user interfaces for fintech applications.', 'Knowledge of React, HTML, CSS, JavaScript', 'BGC, Taguig City', 'hybrid', 3, 'open'),
         (?, 'Backend Node.js API Developer Trainee', 'Assist senior engineers in building RESTful API microservices in Express and MySQL.', 'Basic Node.js, Express, MySQL knowledge', 'Remote / Work From Home', 'remote', 2, 'open'),
         (?, 'UI/UX Design & Research Intern', 'Design user flows, wireframes, and high-fidelity Figma prototypes.', 'Figma proficiency, portfolio samples', 'Makati City', 'onsite', 2, 'open')`,
        [orgId, orgId, orgId]
      );
      jobId = jRes.insertId;
    } else {
      jobId = jobs[0].job_id;
    }

    // 7. Create Applications
    const [apps] = await connection.query("SELECT application_id FROM job_applications WHERE student_id = ? AND job_id = ?", [studentId, jobId]);
    let appId;
    if (apps.length === 0) {
      const [aRes] = await connection.query(
        `INSERT INTO job_applications (job_id, student_id, status, cover_letter, applied_at)
         VALUES (?, ?, 'offered', 'Eager to contribute frontend skills to TechInnovate Philippines.', CURRENT_TIMESTAMP)`,
        [jobId, studentId]
      );
      appId = aRes.insertId;
    } else {
      appId = apps[0].application_id;
    }

    // 8. Create Active OJT Placement & Rendered Hours
    const [ojts] = await connection.query("SELECT ojt_id FROM ojt_records WHERE student_id = ? AND organization_id = ?", [studentId, orgId]);
    let ojtId;
    if (ojts.length === 0) {
      const [ojtRes] = await connection.query(
        `INSERT INTO ojt_records (student_id, organization_id, job_id, status, rendered_hours, start_date)
         VALUES (?, ?, ?, 'ongoing', 280, CURRENT_DATE)`,
        [studentId, orgId, jobId]
      );
      ojtId = ojtRes.insertId;
    } else {
      ojtId = ojts[0].ojt_id;
    }

    // 9. Create Performance Evaluation
    const [evals] = await connection.query("SELECT evaluation_id FROM evaluations WHERE student_id = ?", [studentId]);
    if (evals.length === 0) {
      await connection.query(
        `INSERT INTO evaluations (student_id, evaluator_id, evaluation_type, overall_score, remarks, created_at)
         VALUES (?, ?, 'midterm', 4.8, 'Outstanding technical competence, punctual attendance, and great teamwork in sprint tasks.', CURRENT_TIMESTAMP)`,
        [studentId, orgUser.user_id]
      );
    }

    await connection.commit();
    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    await connection.rollback();
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seedData();
