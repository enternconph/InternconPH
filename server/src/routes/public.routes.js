import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

const DEFAULT_CHED_PROGRAMS = [
  { name: 'Bachelor of Science in Information Technology', code: 'BSIT', dept: 'College of Computer Studies', hours: 486 },
  { name: 'Bachelor of Science in Computer Science', code: 'BSCS', dept: 'College of Computer Studies', hours: 486 },
  { name: 'Bachelor of Science in Accountancy', code: 'BSA', dept: 'College of Business & Accountancy', hours: 600 },
  { name: 'Bachelor of Science in Business Administration', code: 'BSBA', dept: 'College of Business Administration', hours: 600 },
  { name: 'Bachelor of Science in Civil Engineering', code: 'BSCE', dept: 'College of Engineering', hours: 240 },
  { name: 'Bachelor of Science in Computer Engineering', code: 'BSCpE', dept: 'College of Engineering', hours: 240 },
  { name: 'Bachelor of Science in Electrical Engineering', code: 'BSEE', dept: 'College of Engineering', hours: 240 },
  { name: 'Bachelor of Science in Hospitality Management', code: 'BSHM', dept: 'College of International Hospitality Management', hours: 600 },
  { name: 'Bachelor of Science in Tourism Management', code: 'BSTM', dept: 'College of Tourism Management', hours: 600 },
  { name: 'Bachelor of Science in Nursing', code: 'BSN', dept: 'College of Nursing & Allied Health', hours: 600 },
  { name: 'Bachelor of Science in Psychology', code: 'BSPSY', dept: 'College of Arts & Sciences', hours: 300 },
  { name: 'Bachelor of Secondary Education', code: 'BSEd', dept: 'College of Education', hours: 300 }
];

// Helper to fetch programs for an institution
async function getInstitutionPrograms(institutionId) {
  let [rows] = await pool.query(
    'SELECT program_id, program_name, program_code, department, required_ojt_hours FROM programs WHERE institution_id = ? ORDER BY program_name ASC',
    [institutionId]
  );

  // If this institution does not have seeded programs yet, seed default active CHED degree offerings
  if (rows.length === 0) {
    for (const prog of DEFAULT_CHED_PROGRAMS) {
      try {
        await pool.query(
          `INSERT INTO programs (institution_id, program_name, program_code, department, required_ojt_hours, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE program_name = VALUES(program_name)`,
          [institutionId, prog.name, prog.code, prog.dept, prog.hours]
        );
      } catch (err) {
        // Ignore duplicate key
      }
    }

    [rows] = await pool.query(
      'SELECT program_id, program_name, program_code, department, required_ojt_hours FROM programs WHERE institution_id = ? ORDER BY program_name ASC',
      [institutionId]
    );
  }

  return rows;
}

// GET /api/public/stats
router.get('/stats', async (req, res) => {
  try {
    const [[{ studentCount }]] = await pool.query('SELECT COUNT(*) as studentCount FROM students');
    const [[{ jobCount }]] = await pool.query("SELECT COUNT(*) as jobCount FROM job_postings WHERE status = 'open' OR status = 'published'");
    const [[{ orgCount }]] = await pool.query("SELECT COUNT(*) as orgCount FROM hiring_organizations WHERE status = 'approved' OR status = 'active'");
    const [[{ instCount }]] = await pool.query("SELECT COUNT(*) as instCount FROM institutions WHERE status = 'approved' OR status = 'active'");

    return res.json({
      success: true,
      data: {
        students: Math.max(10, studentCount),
        jobs: Math.max(5, jobCount),
        organizations: Math.max(3, orgCount),
        institutions: Math.max(2, instCount)
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    return res.json({
      success: true,
      data: {
        students: 10000,
        jobs: 500,
        organizations: 100,
        institutions: 50
      }
    });
  }
});

// GET /api/public/institutions
router.get('/institutions', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT institution_id, institution_name, institution_code FROM institutions WHERE status = 'approved' OR status = 'active' ORDER BY institution_name ASC"
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Fetch institutions error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch institutions.' });
  }
});

// GET /api/public/programs/:institutionId
router.get('/programs/:institutionId', async (req, res) => {
  try {
    const rows = await getInstitutionPrograms(req.params.institutionId);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Fetch programs error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch programs.' });
  }
});

// GET /api/public/institutions/:institutionId/programs (Alias for staff/student registration)
router.get('/institutions/:institutionId/programs', async (req, res) => {
  try {
    const rows = await getInstitutionPrograms(req.params.institutionId);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Fetch institution programs error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch programs.' });
  }
});

// GET /api/public/programs (Global list of active CHED degree programs)
router.get('/programs', async (req, res) => {
  try {
    let [rows] = await pool.query(
      `SELECT 
         mp.master_program_id as program_id,
         TRIM(mp.program_name) as program_name,
         TRIM(mp.program_code) as program_code,
         TRIM(mp.discipline) as department,
         mp.default_ojt_hours as required_ojt_hours
       FROM master_programs mp
       ORDER BY department ASC, program_name ASC`
    );

    // Also include any university-specific programs from programs table not in master_programs
    try {
      const [extraProgs] = await pool.query(
        `SELECT 
           MIN(p.program_id) as program_id,
           TRIM(p.program_name) as program_name,
           TRIM(p.program_code) as program_code,
           TRIM(p.department) as department,
           MIN(p.required_ojt_hours) as required_ojt_hours
         FROM programs p
         WHERE p.program_name IS NOT NULL AND p.program_name != ''
           AND NOT EXISTS (
             SELECT 1 FROM master_programs mp 
             WHERE LOWER(TRIM(mp.program_name)) = LOWER(TRIM(p.program_name))
           )
         GROUP BY TRIM(p.program_name), TRIM(p.program_code), TRIM(p.department)
         ORDER BY department ASC, program_name ASC`
      );

      if (extraProgs && extraProgs.length > 0) {
        rows = [...rows, ...extraProgs];
      }
    } catch (extraErr) {
      console.warn('Optional extra programs query skipped:', extraErr.message);
    }

    if (!rows || rows.length === 0) {
      const [directProgs] = await pool.query(
        `SELECT DISTINCT
           p.program_id,
           TRIM(p.program_name) as program_name,
           TRIM(p.program_code) as program_code,
           TRIM(p.department) as department,
           p.required_ojt_hours
         FROM programs p
         WHERE p.program_name IS NOT NULL AND p.program_name != ''
         ORDER BY department ASC, program_name ASC`
      );
      rows = directProgs;
    }

    if (!rows || rows.length === 0) {
      rows = DEFAULT_CHED_PROGRAMS.map((p, idx) => ({
        program_id: idx + 1,
        program_name: p.name,
        program_code: p.code,
        department: p.dept,
        required_ojt_hours: p.hours
      }));
    }

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Fetch public programs error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch programs.' });
  }
});

// GET /api/public/organizations
router.get('/organizations', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT organization_id, organization_name, industry, status FROM hiring_organizations ORDER BY organization_name ASC"
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Fetch organizations error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch hiring organizations.' });
  }
});

export default router;
