import pool from './src/config/db.js';

async function main() {
  const [users] = await pool.query(
    "SELECT u.user_id, u.email, r.role_name, s.student_id, s.first_name, s.last_name, s.institution_id, s.program_id FROM users u JOIN roles r ON u.role_id = r.role_id LEFT JOIN students s ON u.user_id = s.user_id WHERE r.role_name = 'student' LIMIT 5"
  );
  console.log('STUDENT USERS:', users);

  const [staff] = await pool.query(
    "SELECT u.user_id, u.email, r.role_name, isf.staff_id, isf.institution_id, isf.program_id, isf.position, isf.first_name, isf.last_name FROM users u JOIN roles r ON u.role_id = r.role_id LEFT JOIN institution_staff isf ON u.user_id = isf.user_id WHERE r.role_name IN ('institution', 'institution_staff')"
  );
  console.log('INSTITUTION USERS / STAFF:', staff);

  const [institutions] = await pool.query("SELECT * FROM institutions");
  console.log('INSTITUTIONS:', institutions);

  const [programs] = await pool.query("SELECT * FROM institution_programs");
  console.log('PROGRAMS:', programs);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
