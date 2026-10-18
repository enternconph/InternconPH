import pool from './config/db.js';

async function addIndexes() {
  try {
    console.log("Adding indexes...");
    await pool.query('CREATE INDEX idx_hiring_orgs_email ON hiring_organizations(contact_email);').catch(e => console.log(e.message));
    await pool.query('CREATE INDEX idx_institutions_email ON institutions(contact_email);').catch(e => console.log(e.message));
    await pool.query('CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);').catch(e => console.log(e.message));
    await pool.query('CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);').catch(e => console.log(e.message));
    console.log("Indexes added.");
    process.exit(0);
  } catch (error) {
    console.error("Error adding indexes", error);
    process.exit(1);
  }
}

addIndexes();
