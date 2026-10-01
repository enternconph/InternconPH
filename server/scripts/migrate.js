import pool from './src/config/db.js';

async function migrate() {
  try {
    const queries = [
      "ALTER TABLE institutions ADD COLUMN google_map_link VARCHAR(500) DEFAULT NULL;",
      "ALTER TABLE hiring_organizations ADD COLUMN google_map_link VARCHAR(500) DEFAULT NULL;",
      "ALTER TABLE institution_staff ADD COLUMN address TEXT DEFAULT NULL;",
      "ALTER TABLE organization_staff ADD COLUMN address TEXT DEFAULT NULL;",
      "ALTER TABLE students MODIFY COLUMN address TEXT DEFAULT NULL;",
      "ALTER TABLE institutions MODIFY COLUMN address TEXT DEFAULT NULL;",
      "ALTER TABLE hiring_organizations MODIFY COLUMN address TEXT DEFAULT NULL;"
    ];
    
    for (const q of queries) {
      try {
        await pool.query(q);
        console.log("Success:", q);
      } catch (err) {
        console.log("Error on:", q, "=>", err.message);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

migrate();
