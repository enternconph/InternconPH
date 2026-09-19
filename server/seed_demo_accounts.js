import bcrypt from 'bcryptjs';
import pool from './src/config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createSamplePdf(title) {
  const content = `BT /F1 16 Tf 72 720 Td (${title}) Tj /F1 11 Tf 72 690 Td (InternCon.ph - Verified Student Career Portfolio Document) Tj ET`;
  const streamLen = Buffer.byteLength(content);
  return `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLen} >>
stream
${content}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000234 00000 n 
0000000320 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
410
%%EOF`;
}

async function seed() {
  console.log('Seeding demo accounts and portfolio test data...');
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 0. Ensure uploads/portfolio directory and physical sample files exist
  const uploadsDir = path.resolve(__dirname, 'uploads/portfolio');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const sampleFiles = [
    { name: 'capstone_smart_ojt_tracking.pdf', title: 'Capstone Design - Smart Attendance and OJT Tracking System' },
    { name: 'fullstack_webdev_cert.pdf', title: 'Certificate of Competency - Full-Stack Web Development' },
    { name: 'aws_cloud_practitioner_cert.pdf', title: 'AWS Certified Cloud Practitioner - Certificate of Completion' },
    { name: 'official_transcript_of_records.pdf', title: 'Official Transcript of Records TOR - Certified True Copy' },
    { name: 'certificate_of_registration_cor.pdf', title: 'Certificate of Registration COR - Academic Term 2026' },
    { name: 'denmark_catolico_resume_2026.pdf', title: 'Curriculum Vitae and Professional Career Resume' },
    { name: 'juan_dela_cruz_resume_2026.pdf', title: 'Student Professional Resume - Juan Dela Cruz' }
  ];

  sampleFiles.forEach(f => {
    const p = path.join(uploadsDir, f.name);
    if (!fs.existsSync(p)) {
      fs.writeFileSync(p, createSamplePdf(f.title));
      console.log(`Created sample PDF: ${f.name}`);
    }
  });

  const dummyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const pngPath = path.join(uploadsDir, 'project_ui_preview.png');
  if (!fs.existsSync(pngPath)) {
    fs.writeFileSync(pngPath, dummyPng);
    console.log('Created sample PNG: project_ui_preview.png');
  }

  // 1. Roles
  const [[adminRole]] = await pool.query("SELECT role_id FROM roles WHERE role_name = 'system_admin'");
  const [[instRole]] = await pool.query("SELECT role_id FROM roles WHERE role_name = 'institution'");
  const [[staffRole]] = await pool.query("SELECT role_id FROM roles WHERE role_name = 'institution_staff'");
  const [[orgRole]] = await pool.query("SELECT role_id FROM roles WHERE role_name = 'hiring_organization'");
  const [[studentRole]] = await pool.query("SELECT role_id FROM roles WHERE role_name = 'student'");

  // Helper to upsert user
  async function ensureUser(email, roleId) {
    const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      await pool.query(
        'UPDATE users SET password_hash = ?, is_active = 1, is_verified = 1, role_id = ? WHERE user_id = ?',
        [passwordHash, roleId, existing[0].user_id]
      );
      return existing[0].user_id;
    } else {
      const [res] = await pool.query(
        'INSERT INTO users (role_id, email, password_hash, is_active, is_verified) VALUES (?, ?, ?, 1, 1)',
        [roleId, email, passwordHash]
      );
      return res.insertId;
    }
  }

  // A. System Admin
  await ensureUser('admin@gmail.com', adminRole.role_id);
  await ensureUser('admin@interncon.ph', adminRole.role_id);
  console.log('Admin accounts ready: admin@gmail.com and admin@interncon.ph / Password123!');

  // B. Institution
  await ensureUser('institution@gmail.com', instRole.role_id);
  await ensureUser('seait@gmail.com', instRole.role_id);

  // Ensure Institution record (check by code or email)
  let [[inst]] = await pool.query(
    "SELECT * FROM institutions WHERE institution_code = 'SEAIT' OR contact_email IN ('institution@gmail.com', 'seait@gmail.com', 'detector@seait.com') LIMIT 1"
  );
  if (!inst) {
    const [res] = await pool.query(
      `INSERT INTO institutions (institution_name, institution_code, address, city, province, contact_email, contact_phone, website, status)
       VALUES ('South East Asian Institute of Technology', 'SEAIT', 'National Highway, Tupi', 'Tupi', 'South Cotabato', 'institution@gmail.com', '09123456789', 'https://seait.edu.ph', 'active')`
    );
    inst = { institution_id: res.insertId };
  } else {
    await pool.query("UPDATE institutions SET status = 'active', contact_email = 'institution@gmail.com' WHERE institution_id = ?", [inst.institution_id]);
  }

  // Ensure Programs
  const [progs] = await pool.query('SELECT * FROM programs WHERE institution_id = ?', [inst.institution_id]);
  let progId = progs.length > 0 ? progs[0].program_id : null;
  if (!progId) {
    const [progRes] = await pool.query(
      `INSERT INTO programs (institution_id, program_name, program_code, department, required_ojt_hours)
       VALUES (?, 'BS in Information Technology', 'BSIT', 'College of Computer Studies', 600)`,
      [inst.institution_id]
    );
    progId = progRes.insertId;
    await pool.query(
      `INSERT INTO programs (institution_id, program_name, program_code, department, required_ojt_hours)
       VALUES (?, 'BS in Computer Science', 'BSCS', 'College of Computer Studies', 600)`,
      [inst.institution_id]
    );
  }

  // B2. Institution Staff
  const staffUserId = await ensureUser('staff@gmail.com', staffRole.role_id);
  await ensureUser('dean@ndmu.edu.ph', staffRole.role_id);
  await ensureUser('staff.1.pup@pup.edu.ph', staffRole.role_id);

  const [staffRows] = await pool.query('SELECT staff_id FROM institution_staff WHERE user_id = ?', [staffUserId]);
  if (staffRows.length === 0) {
    await pool.query(
      `INSERT INTO institution_staff (user_id, institution_id, program_id, department, position, employee_id, staff_number, first_name, last_name, contact_number, permissions, is_active, is_verified, created_at, updated_at)
       VALUES (?, ?, ?, 'College of Computer Studies', 'Dean / Coordinator', 'STF-DEMO-01', 'STF-DEMO-01', 'Maria', 'Santos', '09123456789', ?, 1, 1, NOW(), NOW())`,
      [
        staffUserId,
        inst.institution_id,
        progId,
        JSON.stringify({
          can_verify_students: true,
          can_handle_grievances: true,
          can_approve_job_offers: true,
          can_manage_ojt_records: true
        })
      ]
    );
  }
  console.log('Institution Staff ready: staff@gmail.com / Password123!');

  // C. Hiring Organization
  const orgUserId = await ensureUser('organization@gmail.com', orgRole.role_id);
  await ensureUser('kcc123@gmail.com', orgRole.role_id);

  let [[org]] = await pool.query(
    "SELECT * FROM hiring_organizations WHERE contact_email IN ('organization@gmail.com', 'kcc123@gmail.com') OR organization_name LIKE '%TechCore%' LIMIT 1"
  );
  if (!org) {
    const [res] = await pool.query(
      `INSERT INTO hiring_organizations (organization_name, industry, address, city, province, contact_email, contact_phone, website, status)
       VALUES ('TechCore Solutions Inc.', 'Information Technology', 'J. Catolico Ave, Lagao', 'General Santos City', 'South Cotabato', 'organization@gmail.com', '09987654321', 'https://techcore.ph', 'active')`
    );
    org = { organization_id: res.insertId };
  } else {
    await pool.query("UPDATE hiring_organizations SET status = 'active', contact_email = 'organization@gmail.com' WHERE organization_id = ?", [org.organization_id]);
  }

  // Ensure Job Postings for Org
  const [jobs] = await pool.query('SELECT * FROM job_postings WHERE organization_id = ?', [org.organization_id]);
  let jobId = jobs.length > 0 ? jobs[0].job_id : null;
  if (jobs.length === 0) {
    const [j1] = await pool.query(
      `INSERT INTO job_postings (organization_id, title, description, location, slots_available, status, posted_at)
       VALUES (?, 'Frontend React Developer Intern', 'Assist in building modern web interfaces using React, Tailwind CSS, and REST APIs.', 'General Santos City / Hybrid', 3, 'active', CURRENT_TIMESTAMP)`,
      [org.organization_id]
    );
    jobId = j1.insertId;

    await pool.query(
      `INSERT INTO job_postings (organization_id, title, description, location, slots_available, status, posted_at)
       VALUES (?, 'Full-Stack Node.js / Python Intern', 'Collaborate with senior developers on database optimization, API design, and backend microservices.', 'General Santos City', 2, 'active', CURRENT_TIMESTAMP)`,
      [org.organization_id]
    );

    await pool.query(
      `INSERT INTO job_postings (organization_id, title, description, location, slots_available, status, posted_at)
       VALUES (?, 'UI/UX Design Intern', 'Design beautiful wireframes, design systems, and responsive prototypes in Figma.', 'Remote / WFH', 2, 'active', CURRENT_TIMESTAMP)`,
      [org.organization_id]
    );
  }

  // C2. Workplace Mentor
  const mentorUserId = await ensureUser('mentor@gmail.com', orgRole.role_id);
  await ensureUser('mentor@marbelworx.com', orgRole.role_id);
  await ensureUser('mentor.1.ayala_com_ph@interncon.ph', orgRole.role_id);

  const [mentorRows] = await pool.query('SELECT org_staff_id FROM organization_staff WHERE user_id = ?', [mentorUserId]);
  if (mentorRows.length === 0) {
    await pool.query(
      `INSERT INTO organization_staff (user_id, organization_id, program_id, staff_number, title, first_name, last_name, position, job_title, department, work_location, years_of_experience, contact_number, is_verified, created_at, updated_at)
       VALUES (?, ?, ?, 'EMP-DEMO-01', 'Engr.', 'Alex', 'Santos', 'workplace_mentor', 'Senior OJT Supervisor & Lead Engineer', 'Engineering', 'Main Office', 5, '09987654321', 1, NOW(), NOW())`,
      [mentorUserId, org.organization_id, progId]
    );
  }
  console.log('Workplace Mentor ready: mentor@gmail.com / Password123!');

  // D. Helper to seed full student portfolio items
  async function seedStudentPortfolio(studentId, fullName) {
    // 1. Ensure student_portfolios entry
    let [portfolios] = await pool.query('SELECT portfolio_id FROM student_portfolios WHERE student_id = ?', [studentId]);
    let portfolioId;
    if (portfolios.length === 0) {
      const [pRes] = await pool.query(
        `INSERT INTO student_portfolios (student_id, title, summary, created_at, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [studentId, `${fullName} - Career Portfolio`, `Digital career portfolio of ${fullName}, showcasing capstone projects, professional credentials, and academic records.`]
      );
      portfolioId = pRes.insertId;
    } else {
      portfolioId = portfolios[0].portfolio_id;
    }

    // 2. Clear out any legacy broken items for this portfolio to start clean
    await pool.query('DELETE FROM portfolio_items WHERE portfolio_id = ?', [portfolioId]);

    // 3. Seed Academic Portfolio items (2 items)
    await pool.query(
      `INSERT INTO portfolio_items (portfolio_id, title, description, file_path, file_name, file_size, item_type, created_at, updated_at)
       VALUES 
       (?, 'Smart Attendance & OJT Tracking System', 'Comprehensive capstone platform for biometric attendance, GPS geofencing, and real-time mentor logs built with React and Node.js.', '/uploads/portfolio/capstone_smart_ojt_tracking.pdf', 'capstone_smart_ojt_tracking.pdf', 2450000, 'academic_portfolio', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       (?, 'Enterprise Inventory & Resource Planner', 'High-performance web dashboard with automated analytics, barcode scanning, and supply tracking.', '/uploads/portfolio/project_ui_preview.png', 'project_ui_preview.png', 850000, 'project', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [portfolioId, portfolioId]
    );

    // 4. Seed Credentials items (2 items)
    await pool.query(
      `INSERT INTO portfolio_items (portfolio_id, title, description, file_path, file_name, file_size, item_type, created_at, updated_at)
       VALUES 
       (?, 'AWS Certified Cloud Practitioner', 'Industry cloud computing certification demonstrating proficiency in cloud infrastructure, security, and deployment.', '/uploads/portfolio/aws_cloud_practitioner_cert.pdf', 'aws_cloud_practitioner_cert.pdf', 1420000, 'certificate', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       (?, 'Full-Stack Web Development Specialization', 'Verified diploma certification in modern JavaScript, React ecosystem, and relational database management.', '/uploads/portfolio/fullstack_webdev_cert.pdf', 'fullstack_webdev_cert.pdf', 1150000, 'credential', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [portfolioId, portfolioId]
    );

    // 5. Seed Academic Records items (2 items)
    await pool.query(
      `INSERT INTO portfolio_items (portfolio_id, title, description, file_path, file_name, file_size, item_type, created_at, updated_at)
       VALUES 
       (?, 'Official Transcript of Records (TOR)', 'Certified true copy of academic grades from 1st Year to 3rd Year with general weighted average (GWA) of 1.35.', '/uploads/portfolio/official_transcript_of_records.pdf', 'official_transcript_of_records.pdf', 1850000, 'transcript', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       (?, 'Certificate of Registration (COR - 2026)', 'Official proof of current collegiate enrollment in Bachelor of Science in Information Technology.', '/uploads/portfolio/certificate_of_registration_cor.pdf', 'certificate_of_registration_cor.pdf', 980000, 'cor', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [portfolioId, portfolioId]
    );

    // 6. Seed Active Resume
    await pool.query('DELETE FROM student_resumes WHERE student_id = ?', [studentId]);
    await pool.query(
      `INSERT INTO student_resumes (student_id, file_path, file_name, file_size, version, is_active, created_at, updated_at)
       VALUES (?, '/uploads/portfolio/denmark_catolico_resume_2026.pdf', '${fullName.replace(/\s+/g, '_')}_Resume_2026.pdf', 450000, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [studentId]
    );

    console.log(`✅ Seeded complete portfolio & resume for student ${studentId} (${fullName})`);
  }

  // E. Ensure Student Accounts (student@gmail.com, student@interncon.ph, stu01@ndmu.edu.ph)
  const studentUserId = await ensureUser('student@gmail.com', studentRole.role_id);
  await ensureUser('student@interncon.ph', studentRole.role_id);
  await ensureUser('stu01@ndmu.edu.ph', studentRole.role_id);

  let [[student]] = await pool.query('SELECT * FROM students WHERE user_id = ?', [studentUserId]);
  if (!student) {
    const [sRes] = await pool.query(
      `INSERT INTO students (user_id, institution_id, program_id, student_number, category_id, status_id, first_name, middle_name, last_name, contact_number, required_ojt_hours, completed_ojt_hours, is_verified, is_active)
       VALUES (?, ?, ?, '2024-04197', 1, 2, 'Denmark', 'Nemis', 'Catolico', '09309022553', 600, 240, 1, 1)`,
      [studentUserId, inst.institution_id, progId]
    );
    student = { student_id: sRes.insertId, first_name: 'Denmark', last_name: 'Catolico' };
  } else {
    await pool.query('UPDATE students SET completed_ojt_hours = 240, is_verified = 1, is_active = 1 WHERE student_id = ?', [student.student_id]);
  }

  // Ensure registration is verified
  const [reg] = await pool.query('SELECT * FROM student_registrations WHERE student_id = ?', [student.student_id]);
  if (reg.length === 0) {
    await pool.query(
      "INSERT INTO student_registrations (student_id, status, submitted_at, verified_at) VALUES (?, 'verified', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      [student.student_id]
    );
  } else {
    await pool.query("UPDATE student_registrations SET status = 'verified' WHERE student_id = ?", [student.student_id]);
  }

  // Ensure Job Application
  if (jobId && student.student_id) {
    const [apps] = await pool.query('SELECT * FROM job_applications WHERE student_id = ? AND job_id = ?', [student.student_id, jobId]);
    if (apps.length === 0) {
      await pool.query(
        "INSERT INTO job_applications (job_id, student_id, status, applied_at) VALUES (?, ?, 'shortlisted', CURRENT_TIMESTAMP)",
        [jobId, student.student_id]
      );
    }
  }

  // Ensure OJT Record
  const [ojts] = await pool.query('SELECT * FROM ojt_records WHERE student_id = ? AND organization_id = ?', [student.student_id, org.organization_id]);
  let ojtId = ojts.length > 0 ? ojts[0].ojt_id : null;
  if (!ojtId) {
    const [oRes] = await pool.query(
      `INSERT INTO ojt_records (student_id, organization_id, program_id, start_date, required_hours, rendered_hours, status, supervisor_name, supervisor_contact)
       VALUES (?, ?, ?, '2026-02-01', 600, 240, 'ongoing', 'Engr. Alex Santos', 'alex@techcore.ph')`,
      [student.student_id, org.organization_id, progId]
    );
    ojtId = oRes.insertId;
  }

  // Ensure Performance Evaluation
  if (ojtId) {
    const [evals] = await pool.query('SELECT * FROM ojt_performance_records WHERE ojt_id = ?', [ojtId]);
    if (evals.length === 0) {
      await pool.query(
        `INSERT INTO ojt_performance_records (ojt_id, evaluator_id, evaluation_period, rating, comments, evaluated_at)
         VALUES (?, ?, 'midterm', 4.85, 'Outstanding performance in React UI components and backend integration.', CURRENT_TIMESTAMP)`,
        [ojtId, orgUserId]
      );
    }
  }

  // Seed portfolio for student@gmail.com
  await seedStudentPortfolio(student.student_id, 'Denmark Catolico');

  // Also seed portfolio for a small sample of other existing students
  const [otherStudents] = await pool.query('SELECT student_id, first_name, last_name FROM students WHERE student_id != ? LIMIT 5', [student.student_id]);
  for (const os of otherStudents) {
    const name = `${os.first_name || 'Student'} ${os.last_name || os.student_id}`;
    await seedStudentPortfolio(os.student_id, name);
  }

  console.log('✅ All demo accounts, students, and digital career portfolios successfully seeded!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
