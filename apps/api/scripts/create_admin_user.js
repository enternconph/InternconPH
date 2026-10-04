import pool from './src/config/db.js';
import bcrypt from 'bcryptjs';

async function createAdmin() {
  try {
    // 1. Ensure roles exist
    const roles = [
      { id: 1, name: 'system_admin', desc: 'System Administrator' },
      { id: 2, name: 'institution', desc: 'Institution Director' },
      { id: 3, name: 'institution_staff', desc: 'Institution Staff' },
      { id: 4, name: 'student', desc: 'Student' },
      { id: 5, name: 'hiring_organization', desc: 'Hiring Organization HR' }
    ];

    for (const r of roles) {
      await pool.query(
        `INSERT INTO roles (role_id, role_name, description)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE role_name = VALUES(role_name), description = VALUES(description)`,
        [r.id, r.name, r.desc]
      );
    }

    // 2. Hash password
    const passwordHash = await bcrypt.hash('admin1', 10);

    // 3. Insert or update admin user
    await pool.query(
      `INSERT INTO users (role_id, email, password_hash, is_active, is_verified)
       VALUES (1, 'admin1@g.com', ?, 1, 1)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role_id = 1, is_active = 1, is_verified = 1`,
      [passwordHash]
    );

    // 4. Verify created user
    const [[user]] = await pool.query(
      `SELECT u.user_id, u.email, u.is_active, u.is_verified, r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.email = 'admin1@g.com'`
    );

    console.log('SUCCESS! Admin user created successfully:');
    console.log(JSON.stringify(user, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdmin();
