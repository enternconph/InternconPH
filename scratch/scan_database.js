import pool from '../server/src/config/db.js';

async function scan() {
  console.log('=== INITIATING COMPREHENSIVE DATABASE SCAN ===\n');

  // 1. Basic Database Information
  const [[dbMeta]] = await pool.query(`
    SELECT 
      DATABASE() as db_name,
      VERSION() as mysql_version,
      NOW() as scan_time
  `);

  // 2. Storage & Table Overview
  const [tablesMeta] = await pool.query(`
    SELECT 
      TABLE_NAME, 
      ENGINE, 
      TABLE_ROWS, 
      DATA_LENGTH, 
      INDEX_LENGTH, 
      (DATA_LENGTH + INDEX_LENGTH) as TOTAL_SIZE_BYTES,
      CREATE_TIME,
      UPDATE_TIME
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE()
    ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC
  `);

  let totalSizeBytes = 0;
  tablesMeta.forEach(t => {
    totalSizeBytes += Number(t.TOTAL_SIZE_BYTES || 0);
  });

  // 3. Exact Row Counts for Every Table
  const exactCounts = {};
  for (const t of tablesMeta) {
    try {
      const [[{ cnt }]] = await pool.query(`SELECT COUNT(1) as cnt FROM \`${t.TABLE_NAME}\``);
      exactCounts[t.TABLE_NAME] = cnt;
    } catch (e) {
      exactCounts[t.TABLE_NAME] = `Error: ${e.message}`;
    }
  }

  // 4. Role Distribution in Users
  const [rolesBreakdown] = await pool.query(`
    SELECT 
      COALESCE(r.role_name, 'NO_ROLE') as role,
      COUNT(u.user_id) as user_count,
      SUM(CASE WHEN u.is_active = 1 THEN 1 ELSE 0 END) as active_count,
      SUM(CASE WHEN u.is_verified = 1 THEN 1 ELSE 0 END) as verified_count
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.role_id
    GROUP BY r.role_id, r.role_name
    ORDER BY user_count DESC
  `);

  // 5. Institution Status Breakdown
  const [instBreakdown] = await pool.query(`
    SELECT 
      status, 
      COUNT(1) as count 
    FROM institutions 
    GROUP BY status
  `);

  // 6. Organization Status Breakdown
  const [orgBreakdown] = await pool.query(`
    SELECT 
      status, 
      COUNT(1) as count 
    FROM hiring_organizations 
    GROUP BY status
  `);

  // 7. Relational Integrity & Orphan Audits
  const integrity = {};

  // A. Students integrity
  const [[{ studentsWithoutUser }]] = await pool.query(`
    SELECT COUNT(1) as cnt 
    FROM students s 
    LEFT JOIN users u ON s.user_id = u.user_id 
    WHERE u.user_id IS NULL
  `);
  const [[{ studentUsersWithoutStudent }]] = await pool.query(`
    SELECT COUNT(1) as cnt 
    FROM users u 
    JOIN roles r ON u.role_id = r.role_id 
    LEFT JOIN students s ON u.user_id = s.user_id 
    WHERE r.role_name = 'student' AND s.student_id IS NULL
  `);
  const [[{ studentsWithoutInst }]] = await pool.query(`
    SELECT COUNT(1) as cnt 
    FROM students s 
    LEFT JOIN institutions i ON s.institution_id = i.institution_id 
    WHERE s.institution_id IS NOT NULL AND i.institution_id IS NULL
  `);
  const [[{ studentsWithoutProg }]] = await pool.query(`
    SELECT COUNT(1) as cnt 
    FROM students s 
    LEFT JOIN programs p ON s.program_id = p.program_id 
    WHERE s.program_id IS NOT NULL AND p.program_id IS NULL
  `);

  // B. Portfolios & Resumes
  const [[{ orphanPortfolios }]] = await pool.query(`
    SELECT COUNT(1) as cnt 
    FROM student_portfolios sp 
    LEFT JOIN students s ON sp.student_id = s.student_id 
    WHERE s.student_id IS NULL
  `);
  const [[{ orphanResumes }]] = await pool.query(`
    SELECT COUNT(1) as cnt 
    FROM student_resumes sr 
    LEFT JOIN students s ON sr.student_id = s.student_id 
    WHERE s.student_id IS NULL
  `);
  const [[{ studentsMissingPortfolios }]] = await pool.query(`
    SELECT COUNT(1) as cnt 
    FROM students s 
    LEFT JOIN student_portfolios sp ON s.student_id = sp.student_id 
    WHERE sp.student_id IS NULL
  `);
  const [[{ studentsMissingResumes }]] = await pool.query(`
    SELECT COUNT(1) as cnt 
    FROM students s 
    LEFT JOIN student_resumes sr ON s.student_id = sr.student_id 
    WHERE sr.student_id IS NULL
  `);

  // C. Jobs & Applications
  const [[{ orphanJobs }]] = await pool.query(`
    SELECT COUNT(1) as cnt 
    FROM job_postings jp 
    LEFT JOIN hiring_organizations ho ON jp.organization_id = ho.organization_id 
    WHERE ho.organization_id IS NULL
  `);
  const [[{ orphanAppsStudent }]] = await pool.query(`
    SELECT COUNT(1) as cnt 
    FROM job_applications ja 
    LEFT JOIN students s ON ja.student_id = s.student_id 
    WHERE s.student_id IS NULL
  `);
  const [[{ orphanAppsJob }]] = await pool.query(`
    SELECT COUNT(1) as cnt 
    FROM job_applications ja 
    LEFT JOIN job_postings jp ON ja.job_id = jp.job_id 
    WHERE jp.job_id IS NULL
  `);

  // D. OJTs & Complaints
  const [[{ orphanOjt }]] = await pool.query(`
    SELECT COUNT(1) as cnt 
    FROM ojt_records o 
    LEFT JOIN students s ON o.student_id = s.student_id 
    WHERE s.student_id IS NULL
  `);
  const [[{ orphanComplaintsStudent }]] = await pool.query(`
    SELECT COUNT(1) as cnt 
    FROM complaints c 
    LEFT JOIN students s ON c.student_id = s.student_id 
    WHERE c.student_id IS NOT NULL AND s.student_id IS NULL
  `);
  const [[{ orphanComplaintsOrg }]] = await pool.query(`
    SELECT COUNT(1) as cnt 
    FROM complaints c 
    LEFT JOIN hiring_organizations ho ON c.organization_id = ho.organization_id 
    WHERE c.organization_id IS NOT NULL AND ho.organization_id IS NULL
  `);

  integrity.studentsWithoutUser = studentsWithoutUser;
  integrity.studentUsersWithoutStudent = studentUsersWithoutStudent;
  integrity.studentsWithoutInst = studentsWithoutInst;
  integrity.studentsWithoutProg = studentsWithoutProg;
  integrity.orphanPortfolios = orphanPortfolios;
  integrity.orphanResumes = orphanResumes;
  integrity.studentsMissingPortfolios = studentsMissingPortfolios;
  integrity.studentsMissingResumes = studentsMissingResumes;
  integrity.orphanJobs = orphanJobs;
  integrity.orphanAppsStudent = orphanAppsStudent;
  integrity.orphanAppsJob = orphanAppsJob;
  integrity.orphanOjt = orphanOjt;
  integrity.orphanComplaintsStudent = orphanComplaintsStudent;
  integrity.orphanComplaintsOrg = orphanComplaintsOrg;

  // 8. OJT Records Status Breakdown
  const [ojtStatusBreakdown] = await pool.query(`
    SELECT 
      status, 
      COUNT(1) as count 
    FROM ojt_records 
    GROUP BY status
  `);

  // 9. Primary Keys Check
  const [noPrimaryKeyTables] = await pool.query(`
    SELECT t.TABLE_NAME
    FROM information_schema.TABLES t
    LEFT JOIN information_schema.TABLE_CONSTRAINTS tc 
      ON t.TABLE_SCHEMA = tc.TABLE_SCHEMA 
      AND t.TABLE_NAME = tc.TABLE_NAME 
      AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
    WHERE t.TABLE_SCHEMA = DATABASE() 
      AND tc.CONSTRAINT_NAME IS NULL
  `);

  console.log(JSON.stringify({
    dbMeta,
    totalSizeBytes,
    totalSizeMB: (totalSizeBytes / (1024 * 1024)).toFixed(2),
    totalTables: tablesMeta.length,
    tablesMeta: tablesMeta.map(t => ({
      name: t.TABLE_NAME,
      engine: t.ENGINE,
      exactRows: exactCounts[t.TABLE_NAME],
      dataMB: (t.DATA_LENGTH / (1024 * 1024)).toFixed(2),
      indexMB: (t.INDEX_LENGTH / (1024 * 1024)).toFixed(2),
      totalMB: (t.TOTAL_SIZE_BYTES / (1024 * 1024)).toFixed(2)
    })),
    rolesBreakdown,
    instBreakdown,
    orgBreakdown,
    ojtStatusBreakdown,
    integrity,
    noPrimaryKeyTables: noPrimaryKeyTables.map(t => t.TABLE_NAME)
  }, null, 2));

  process.exit(0);
}

scan().catch(err => {
  console.error('Database scan failed:', err);
  process.exit(1);
});
