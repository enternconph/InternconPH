import fs from 'fs';
import path from 'path';
import pool from '../server/src/config/db.js';

async function audit() {
  console.log('=== STEP 1: FETCHING DB TABLES AND COLUMNS ===');
  const [tables] = await pool.query("SHOW TABLES");
  const dbName = Object.keys(tables[0])[0];
  const tableNames = tables.map(t => t[dbName]);
  
  const schema = {};
  for (const t of tableNames) {
    const [cols] = await pool.query(`DESCRIBE \`${t}\``);
    schema[t] = cols.map(c => c.Field);
  }
  console.log(`Found ${tableNames.length} tables in database ${dbName}.`);

  console.log('\n=== STEP 2: CHECKING ROUTES FOR NON-EXISTENT TABLES ===');
  const routesDir = 'c:/laragon/www/internconph/server/src/routes';
  const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.routes.js'));

  for (const rf of routeFiles) {
    const filePath = path.join(routesDir, rf);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Find table names in queries: FROM `?(\w+)`? or JOIN `?(\w+)`? or INTO `?(\w+)`? or UPDATE `?(\w+)`?
    const queryRegex = /(?:FROM|JOIN|INTO|UPDATE)\s+`?([a-zA-Z0-9_]+)`?/gi;
    let match;
    const usedTables = new Set();
    while ((match = queryRegex.exec(content)) !== null) {
      const tbl = match[1].toLowerCase();
      // Exclude SQL keywords or subqueries
      if (!['select', 'where', 'set', 'order', 'group', 'limit', 'on', 'inner', 'left', 'right', 'outer', 'join', 'as'].includes(tbl)) {
        usedTables.add(match[1]);
      }
    }

    for (const ut of usedTables) {
      if (!tableNames.includes(ut) && !tableNames.includes(ut.toLowerCase())) {
        console.error(`[INVALID TABLE] in ${rf}: Table "${ut}" does not exist in DB!`);
      }
    }
  }

  console.log('\n=== STEP 3: VERIFYING CRITICAL COLUMNS IN OJT & APPLICATION TABLES ===');
  const criticalChecks = [
    { table: 'ojt_records', cols: ['ojt_id', 'student_id', 'organization_id', 'status', 'rendered_hours'] },
    { table: 'job_applications', cols: ['application_id', 'student_id', 'job_id', 'status'] },
    { table: 'job_postings', cols: ['job_id', 'organization_id', 'title', 'posting_type', 'status'] },
    { table: 'portfolio_items', cols: ['item_id', 'portfolio_id', 'title', 'item_type', 'is_verified'] },
    { table: 'student_portfolios', cols: ['portfolio_id', 'student_id'] },
    { table: 'ojt_attendance_logs', cols: ['attendance_id', 'ojt_id', 'log_date', 'hours_rendered', 'status'] }
  ];

  for (const check of criticalChecks) {
    if (!schema[check.table]) {
      console.error(`[MISSING TABLE] Critical table "${check.table}" missing!`);
      continue;
    }
    for (const c of check.cols) {
      if (!schema[check.table].includes(c)) {
        console.warn(`[COLUMN CHECK] Table "${check.table}" has columns: ${schema[check.table].join(', ')} -> MISSING "${c}"!`);
      }
    }
  }

  console.log('\n=== AUDIT COMPLETED ===');
  process.exit(0);
}

audit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
