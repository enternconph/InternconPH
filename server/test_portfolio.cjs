const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'c:/internconph/server/.env' });

async function verifyStudentQueries() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const studentId = 6;

  // Query as in student.routes.js GET /portfolio
  const [allItems] = await pool.query(
    `SELECT pi.*, ho.organization_name as associated_org_name
     FROM portfolio_items pi
     JOIN student_portfolios sp ON pi.portfolio_id = sp.portfolio_id
     LEFT JOIN hiring_organizations ho ON pi.associated_org_id = ho.organization_id
     WHERE sp.student_id = ? 
     ORDER BY pi.created_at DESC`,
    [studentId]
  );

  const normType = (t) => (t || '').toLowerCase().trim();
  const isCred = (t) => ['credential', 'credentials', 'certificate', 'certification', 'honor', 'award', 'license', 'badge'].includes(normType(t));
  const isRecord = (t) => ['academic_record', 'academic_records', 'transcript', 'tor', 'cor', 'enrollment', 'record', 'grades'].includes(normType(t));
  const isAcad = (t) => ['academic_portfolio', 'project', 'sample_work', 'capstone', 'thesis', 'research', 'coursework'].includes(normType(t));

  const credentials = allItems.filter(i => isCred(i.item_type));
  const academic_records = allItems.filter(i => isRecord(i.item_type));
  const academic_portfolio = allItems.filter(i => isAcad(i.item_type) || (!isCred(i.item_type) && !isRecord(i.item_type)));

  const [resumes] = await pool.query(
    'SELECT * FROM student_resumes WHERE student_id = ? ORDER BY is_active DESC, version DESC, created_at DESC',
    [studentId]
  );

  console.log('Student 6 Results:');
  console.log('Total portfolio items:', allItems.length);
  console.log('Academic Portfolio:', academic_portfolio.map(i => ({ id: i.item_id, title: i.title, type: i.item_type })));
  console.log('Credentials:', credentials.map(i => ({ id: i.item_id, title: i.title, type: i.item_type })));
  console.log('Academic Records:', academic_records.map(i => ({ id: i.item_id, title: i.title, type: i.item_type })));
  console.log('Resumes:', resumes.map(r => ({ id: r.resume_id, file: r.file_name, version: r.version })));

  process.exit();
}
verifyStudentQueries();
