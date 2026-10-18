import pool from './src/config/db.js';
import bcrypt from 'bcryptjs';

async function verifyDatabase() {
  console.log('--- DATABASE COUNT VERIFICATION ---');
  
  const tables = [
    'users',
    'institutions',
    'institution_staff',
    'programs',
    'students',
    'student_registrations',
    'student_staff_assignments',
    'hiring_organizations',
    'organization_staff',
    'job_postings',
    'job_applications',
    'ojt_records',
    'ojt_attendance_logs',
    'ojt_performance_records',
    'ojt_requirements'
  ];

  for (const table of tables) {
    const [[{ cnt }]] = await pool.query(`SELECT COUNT(*) as cnt FROM ${table}`);
    console.log(`• ${table.padEnd(28)}: ${cnt.toLocaleString()}`);
  }

  console.log('\n--- VERIFYING INSTITUTION STUDENT COUNTS ---');
  const [instCounts] = await pool.query(`
    SELECT i.institution_code, i.institution_name, COUNT(s.student_id) as student_count,
           (SELECT COUNT(*) FROM institution_staff WHERE institution_id = i.institution_id) as staff_count,
           (SELECT COUNT(*) FROM programs WHERE institution_id = i.institution_id) as prog_count
    FROM institutions i
    LEFT JOIN students s ON s.institution_id = i.institution_id
    GROUP BY i.institution_id
    ORDER BY student_count DESC
    LIMIT 10
  `);
  console.table(instCounts);

  console.log('\n--- VERIFYING PROGRAM STUDENT DISTRIBUTION (SAMPLE PUP) ---');
  const [[pup]] = await pool.query(`SELECT institution_id FROM institutions WHERE institution_code = 'PUP'`);
  const [progDist] = await pool.query(`
    SELECT p.program_code, p.program_name, COUNT(s.student_id) as student_count
    FROM programs p
    LEFT JOIN students s ON s.program_id = p.program_id
    WHERE p.institution_id = ?
    GROUP BY p.program_id
    LIMIT 5
  `, [pup.institution_id]);
  console.table(progDist);

  console.log('\n--- VERIFYING MENTOR OJT WORKLOAD (SAMPLE 5 MENTORS) ---');
  const [mentorWorkload] = await pool.query(`
    SELECT o.organization_name, os.org_staff_id, CONCAT(os.first_name, ' ', os.last_name) as mentor_name,
           os.job_title,
           (SELECT COUNT(*) FROM ojt_records r 
            WHERE r.organization_id = os.organization_id 
              AND r.supervisor_name = CONCAT(os.first_name, ' ', os.last_name)) as assigned_students
    FROM organization_staff os
    JOIN hiring_organizations o ON o.organization_id = os.organization_id
    WHERE os.position = 'workplace_mentor'
    LIMIT 5
  `);
  console.table(mentorWorkload);

  console.log('\n--- VERIFYING AUTHENTICATION WITH Password123! ---');
  const testEmails = [
    'director.pup@pup.edu.ph',
    'staff.1.pup@pup.edu.ph',
    'hr.ayala_com_ph@interncon.ph',
    'mentor.1.ayala_com_ph@interncon.ph',
    's.pup.1@pup.edu.ph'
  ];

  for (const email of testEmails) {
    const [[user]] = await pool.query('SELECT user_id, email, role_id, password_hash FROM users WHERE email = ?', [email]);
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      continue;
    }
    const match = await bcrypt.compare('Password123!', user.password_hash);
    console.log(`✓ User ${email} (Role ${user.role_id}): Password matches? -> ${match}`);
  }

  process.exit(0);
}

verifyDatabase().catch(err => {
  console.error(err);
  process.exit(1);
});
