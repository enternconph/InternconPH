import pool from './src/config/db.js';
import fs from 'fs';

async function dump() {
  const [tables] = await pool.query('SHOW TABLES');
  let schema = '';
  for (const t of tables) {
    const tableName = Object.values(t)[0];
    const [[createRes]] = await pool.query(`SHOW CREATE TABLE \`${tableName}\``);
    schema += `-- Table: ${tableName}\n` + createRes['Create Table'] + ';\n\n';
  }
  fs.writeFileSync('./internconph.sql', schema);
  console.log(`Successfully dumped ${tables.length} tables to internconph.sql`);
  process.exit(0);
}

dump().catch(err => {
  console.error(err);
  process.exit(1);
});
