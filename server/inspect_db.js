import pool from './src/config/db.js';

async function inspect() {
  const tables = ['ojt_performance_records', 'complaints', 'interviews', 'notifications', 'ojt_deployment_offers', 'institution_staff'];
  for (const t of tables) {
    const [cols] = await pool.query(`DESCRIBE ${t}`);
    console.log(`\n=== ${t} ===`);
    console.log(cols.map(c => `  ${c.Field} (${c.Type}, Null:${c.Null}, Key:${c.Key}, Default:${c.Default})`).join('\n'));
  }
  process.exit(0);
}
inspect().catch(err => { console.error(err); process.exit(1); });
