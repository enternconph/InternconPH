import pool from './src/config/db.js';

async function inspectUsers() {
  const [users] = await pool.query(`
    SELECT u.user_id, u.email, r.role_name, u.is_active, u.is_verified,
           s.first_name as student_fn, s.last_name as student_ln,
           ho.organization_name,
           inst.institution_name
    FROM users u
    JOIN roles r ON u.role_id = r.role_id
    LEFT JOIN students s ON u.user_id = s.user_id
    LEFT JOIN hiring_organizations ho ON u.email = ho.contact_email
    LEFT JOIN institutions inst ON u.email = inst.contact_email
    ORDER BY u.user_id DESC
    LIMIT 20
  `);
  console.log('Recent Users in DB:');
  console.table(users);
  process.exit(0);
}
inspectUsers().catch(err => { console.error(err); process.exit(1); });
