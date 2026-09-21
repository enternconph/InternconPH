import express from 'express';
import pool from '../config/db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { emitUpdate } from '../config/socket.js';
import { sendNotification } from '../utils/notification.helper.js';
import { checkAndGenerateCertificate } from '../services/certificate.service.js';
import { isValidEmail, normalizeEmail } from '../utils/email.js';

const router = express.Router();
router.use(verifyToken);
router.use(requireRole(['hiring_organization', 'workplace_mentor', 'mentor', 'hr_staff', 'system_admin']));

// HR-Exclusive operations restriction: Workplace Mentors cannot manage jobs, offers, or HR access codes
const requireHROrAdmin = (req, res, next) => {
  const role = req.user.role_name || req.user.role;
  if (role === 'workplace_mentor' || role === 'mentor') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Workplace mentors are restricted from HR management operations.'
    });
  }
  next();
};

// Helper to get organization info for user
const getOrgId = async (userId) => {
  // 1. Check organization_staff
  const [staffRows] = await pool.query(
    `SELECT ho.*, os.org_staff_id, os.position as staff_position, os.first_name as staff_first_name, os.last_name as staff_last_name 
     FROM organization_staff os
     JOIN hiring_organizations ho ON os.organization_id = ho.organization_id
     WHERE os.user_id = ?`,
    [userId]
  );
  if (staffRows.length > 0) return staffRows[0];

  // 2. Check direct submitter in organization_registrations
  const [regRows] = await pool.query(
    `SELECT ho.* FROM organization_registrations oreg
     JOIN hiring_organizations ho ON oreg.organization_id = ho.organization_id
     WHERE oreg.submitted_by = ?`,
    [userId]
  );
  if (regRows.length > 0) return regRows[0];

  // 3. Check contact_email
  const [userRows] = await pool.query('SELECT email FROM users WHERE user_id = ?', [userId]);
  if (userRows.length > 0) {
    const [orgRows] = await pool.query('SELECT * FROM hiring_organizations WHERE contact_email = ?', [userRows[0].email]);
    if (orgRows.length > 0) return orgRows[0];
  }

  // 4. If system_admin previewing or testing, fallback to first active organization
  const [[adminUser]] = await pool.query(
    'SELECT r.role_name FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.user_id = ?',
    [userId]
  );
  if (adminUser && adminUser.role_name === 'system_admin') {
    const [firstOrg] = await pool.query('SELECT * FROM hiring_organizations WHERE status = \'active\' ORDER BY organization_id ASC LIMIT 1');
    if (firstOrg.length > 0) return firstOrg[0];
  }

  return null;
};

const formatFilePath = (fp) => {
  if (!fp) return '';
  if (fp.startsWith('http://') || fp.startsWith('https://') || fp.startsWith('blob:') || fp.startsWith('data:')) return fp;
  if (fp.startsWith('/uploads/')) return fp;
  if (fp.startsWith('uploads/')) return '/' + fp;
  return `/uploads/portfolio/${fp.replace(/^\/+/, '')}`;
};

// GET /api/org/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const org = await getOrgId(req.user.user_id);
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization profile not found.' });
    }

    const orgId = org.organization_id;

    // 1. Active job postings count
    const [[{ activeJobs }]] = await pool.query(
      'SELECT COUNT(*) as activeJobs FROM job_postings WHERE organization_id = ? AND status = \'active\'',
      [orgId]
    );

    // 2. Total applicants across all jobs
    const [[{ totalApplicants }]] = await pool.query(
      `SELECT COUNT(*) as totalApplicants 
       FROM job_applications ja
       JOIN job_postings jp ON ja.job_id = jp.job_id
       WHERE jp.organization_id = ?`,
      [orgId]
    );

    // 3. Active interns (OJT)
    const [[{ activeInterns }]] = await pool.query(
      'SELECT COUNT(*) as activeInterns FROM ojt_records WHERE organization_id = ? AND status = \'ongoing\'',
      [orgId]
    );

    // 4. Deployed Interns
    const [deployedInterns] = await pool.query(
      `SELECT o.*, 
              COALESCE(o.required_hours, s.required_ojt_hours, p.required_ojt_hours, 600) as required_hours,
              COALESCE(s.required_ojt_hours, o.required_hours, p.required_ojt_hours, 600) as required_ojt_hours,
              s.first_name, s.last_name, s.student_number, s.contact_number, s.completed_ojt_hours,
              p.program_name, i.institution_name,
              (SELECT COUNT(*) FROM ojt_performance_records opr WHERE opr.ojt_id = o.ojt_id) as evaluation_count
       FROM ojt_records o
       JOIN students s ON o.student_id = s.student_id
       LEFT JOIN programs p ON s.program_id = p.program_id
       LEFT JOIN institutions i ON s.institution_id = i.institution_id
       WHERE o.organization_id = ?
       ORDER BY (CASE WHEN o.status = 'ongoing' THEN 0 ELSE 1 END), o.created_at DESC`,
      [orgId]
    );

    // 5. Total completed evaluations
    const [[{ completedEvaluations }]] = await pool.query(
      `SELECT COUNT(*) as completedEvaluations
       FROM ojt_performance_records opr
       JOIN ojt_records o ON opr.ojt_id = o.ojt_id
       WHERE o.organization_id = ?`,
      [orgId]
    );

    // 6. Recent job applicants
    const [recentApplicants] = await pool.query(
      `SELECT ja.*, s.first_name, s.last_name, s.student_number, jp.title as job_title
       FROM job_applications ja
       JOIN job_postings jp ON ja.job_id = jp.job_id
       JOIN students s ON ja.student_id = s.student_id
       WHERE jp.organization_id = ?
       ORDER BY ja.applied_at DESC
       LIMIT 5`,
      [orgId]
    );

    // 7. Recent jobs
    const [jobs] = await pool.query(
      `SELECT jp.*, 
              (SELECT COUNT(*) FROM job_applications ja WHERE ja.job_id = jp.job_id) as applicant_count
       FROM job_postings jp
       WHERE jp.organization_id = ?
       ORDER BY jp.created_at DESC
       LIMIT 10`,
      [orgId]
    );

    const dashboardJobIds = jobs.map(j => j.job_id);
    let dashboardApprovalsMap = {};
    let dashboardProgramsMap = {};

    if (dashboardJobIds.length > 0) {
      const [approvals] = await pool.query(
        `SELECT ija.*, i.institution_name, i.institution_code
         FROM institution_job_approvals ija
         JOIN institutions i ON ija.institution_id = i.institution_id
         WHERE ija.job_id IN (?)`,
        [dashboardJobIds]
      );
      approvals.forEach(a => {
        if (!dashboardApprovalsMap[a.job_id]) dashboardApprovalsMap[a.job_id] = [];
        dashboardApprovalsMap[a.job_id].push(a);
      });

      const [targetPrograms] = await pool.query(
        `SELECT jrp.job_id, 
                COALESCE(MIN(mp.master_program_id), MIN(p.program_id)) as program_id, 
                TRIM(p.program_name) as program_name, 
                TRIM(p.program_code) as program_code
         FROM job_required_programs jrp
         JOIN programs p ON jrp.program_id = p.program_id
         LEFT JOIN master_programs mp ON TRIM(p.program_name) = TRIM(mp.program_name) AND TRIM(p.program_code) = TRIM(mp.program_code)
         WHERE jrp.job_id IN (?)
         GROUP BY jrp.job_id, TRIM(p.program_name), TRIM(p.program_code)
         ORDER BY TRIM(p.program_name) ASC`,
        [dashboardJobIds]
      );
      targetPrograms.forEach(tp => {
        if (!dashboardProgramsMap[tp.job_id]) dashboardProgramsMap[tp.job_id] = [];
        dashboardProgramsMap[tp.job_id].push(tp);
      });
    }

    const enrichedDashboardJobs = jobs.map(job => ({
      ...job,
      institution_approvals: dashboardApprovalsMap[job.job_id] || [],
      target_programs: dashboardProgramsMap[job.job_id] || []
    }));

    // 8. Workplace Mentors stats
    const [[{ pendingMentorsCount }]] = await pool.query(
      `SELECT COUNT(*) as pendingMentorsCount 
       FROM organization_staff os
       LEFT JOIN entity_registrations er ON er.entity_type = 'workplace_mentor' AND er.entity_id = os.org_staff_id
       WHERE os.organization_id = ? AND (os.position = 'workplace_mentor' OR os.position = 'mentor') AND os.is_verified = 0 AND (er.status IS NULL OR er.status != 'rejected')`,
      [orgId]
    );

    const [[{ verifiedMentorsCount }]] = await pool.query(
      `SELECT COUNT(*) as verifiedMentorsCount 
       FROM organization_staff os
       WHERE os.organization_id = ? AND (os.position = 'workplace_mentor' OR os.position = 'mentor') AND os.is_verified = 1`,
      [orgId]
    );

    // 9. Staff details if logged in as mentor
    const [staffDetails] = await pool.query(
      'SELECT * FROM organization_staff WHERE user_id = ?',
      [req.user.user_id]
    );

    return res.json({
      success: true,
      data: {
        organization: org,
        staff: staffDetails.length > 0 ? staffDetails[0] : null,
        stats: {
          activeJobs,
          totalApplicants,
          activeInterns,
          completedEvaluations,
          totalInterns: deployedInterns.length,
          pendingMentorsCount,
          verifiedMentorsCount
        },
        deployedInterns,
        recentApplicants,
        jobs: enrichedDashboardJobs
      }
    });
  } catch (error) {
    console.error('Org dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Could not load organization dashboard.' });
  }
});

// GET /api/org/institutions
router.get('/institutions', async (req, res) => {
  try {
    const [institutions] = await pool.query(
      `SELECT 
         i.institution_id, 
         i.institution_name, 
         i.institution_code, 
         i.city, 
         i.province, 
         i.status,
         GROUP_CONCAT(DISTINCT p.program_id) as program_ids_str,
         GROUP_CONCAT(DISTINCT mp.master_program_id) as master_program_ids_str,
         GROUP_CONCAT(DISTINCT TRIM(p.program_code)) as program_codes_str
       FROM institutions i
       LEFT JOIN programs p ON i.institution_id = p.institution_id
       LEFT JOIN master_programs mp ON TRIM(p.program_name) = TRIM(mp.program_name) AND TRIM(p.program_code) = TRIM(mp.program_code)
       WHERE i.status = 'active'
       GROUP BY i.institution_id
       ORDER BY i.institution_name ASC`
    );

    const formattedInstitutions = institutions.map(inst => {
      const pIds = inst.program_ids_str
        ? inst.program_ids_str.split(',').map(Number).filter(Boolean)
        : [];
      const mpIds = inst.master_program_ids_str
        ? inst.master_program_ids_str.split(',').map(Number).filter(Boolean)
        : [];
      const pCodes = inst.program_codes_str
        ? inst.program_codes_str.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      return {
        ...inst,
        program_ids: pIds,
        master_program_ids: mpIds,
        program_codes: pCodes
      };
    });

    return res.json({ success: true, data: formattedInstitutions });
  } catch (error) {
    console.error('Fetch institutions error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch institutions.' });
  }
});

// GET /api/org/programs
router.get('/programs', async (req, res) => {
  try {
    let [programs] = await pool.query(
      `SELECT 
         mp.master_program_id as program_id,
         TRIM(mp.program_name) as program_name,
         TRIM(mp.program_code) as program_code,
         TRIM(mp.discipline) as department,
         mp.default_ojt_hours as required_ojt_hours,
         GROUP_CONCAT(DISTINCT p.institution_id) as institution_ids_str,
         GROUP_CONCAT(DISTINCT p.program_id) as all_program_ids_str
       FROM master_programs mp
       LEFT JOIN programs p ON TRIM(p.program_name) = TRIM(mp.program_name) AND TRIM(p.program_code) = TRIM(mp.program_code)
       GROUP BY mp.master_program_id
       ORDER BY mp.discipline ASC, mp.program_name ASC`
    );

    if (!programs || programs.length === 0) {
      const [directProgs] = await pool.query(
        `SELECT 
           MIN(p.program_id) as program_id,
           TRIM(p.program_name) as program_name,
           TRIM(p.program_code) as program_code,
           TRIM(p.department) as department,
           MIN(p.required_ojt_hours) as required_ojt_hours,
           GROUP_CONCAT(DISTINCT p.institution_id) as institution_ids_str,
           GROUP_CONCAT(DISTINCT p.program_id) as all_program_ids_str
         FROM programs p
         JOIN institutions i ON p.institution_id = i.institution_id AND i.status = 'active'
         WHERE p.program_name IS NOT NULL AND p.program_name != ''
         GROUP BY TRIM(p.program_name), TRIM(p.program_code), TRIM(p.department)
         ORDER BY TRIM(p.department) ASC, TRIM(p.program_name) ASC`
      );
      if (directProgs && directProgs.length > 0) programs = directProgs;
    }

    const formattedPrograms = (programs || []).map(p => {
      const institutionIds = p.institution_ids_str
        ? p.institution_ids_str.split(',').map(Number).filter(Boolean)
        : [];
      const allProgramIds = p.all_program_ids_str
        ? p.all_program_ids_str.split(',').map(Number).filter(Boolean)
        : [p.program_id];
      return {
        ...p,
        institution_ids: institutionIds,
        all_program_ids: allProgramIds
      };
    });

    return res.json({ success: true, data: formattedPrograms });
  } catch (error) {
    console.error('Fetch programs error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch programs.' });
  }
});

// GET /api/org/jobs
router.get('/jobs', async (req, res) => {
  try {
    const org = await getOrgId(req.user.user_id);
    if (!org) return res.status(404).json({ success: false, message: 'Org not found' });

    const [jobs] = await pool.query(
      `SELECT jp.*, 
              os.first_name as mentor_first_name, os.last_name as mentor_last_name,
              os.staff_number as mentor_staff_number, os.department as mentor_department,
              os.program_id as mentor_program_id,
              mp.program_name as mentor_program_name, mp.program_code as mentor_program_code,
              (SELECT COUNT(*) FROM job_applications ja WHERE ja.job_id = jp.job_id) as applicant_count
       FROM job_postings jp
       LEFT JOIN organization_staff os ON jp.mentor_id = os.org_staff_id
       LEFT JOIN programs mp ON os.program_id = mp.program_id
       WHERE jp.organization_id = ?
       ORDER BY jp.created_at DESC`,
      [org.organization_id]
    );

    const jobIds = jobs.map(j => j.job_id);
    let approvalsMap = {};
    let programsMap = {};

    if (jobIds.length > 0) {
      const [approvals] = await pool.query(
        `SELECT ija.*, i.institution_name, i.institution_code
         FROM institution_job_approvals ija
         JOIN institutions i ON ija.institution_id = i.institution_id
         WHERE ija.job_id IN (?)`,
        [jobIds]
      );
      approvals.forEach(a => {
        if (!approvalsMap[a.job_id]) approvalsMap[a.job_id] = [];
        approvalsMap[a.job_id].push(a);
      });

      const [targetPrograms] = await pool.query(
        `SELECT jrp.job_id, 
                COALESCE(MIN(mp.master_program_id), MIN(p.program_id)) as program_id, 
                TRIM(p.program_name) as program_name, 
                TRIM(p.program_code) as program_code
         FROM job_required_programs jrp
         JOIN programs p ON jrp.program_id = p.program_id
         LEFT JOIN master_programs mp ON TRIM(p.program_name) = TRIM(mp.program_name) AND TRIM(p.program_code) = TRIM(mp.program_code)
         WHERE jrp.job_id IN (?)
         GROUP BY jrp.job_id, TRIM(p.program_name), TRIM(p.program_code)
         ORDER BY TRIM(p.program_name) ASC`,
        [jobIds]
      );
      targetPrograms.forEach(tp => {
        if (!programsMap[tp.job_id]) programsMap[tp.job_id] = [];
        programsMap[tp.job_id].push(tp);
      });
    }

    const enrichedJobs = jobs.map(job => ({
      ...job,
      institution_approvals: approvalsMap[job.job_id] || [],
      target_programs: programsMap[job.job_id] || []
    }));

    return res.json({ success: true, data: enrichedJobs });
  } catch (error) {
    console.error('Fetch org jobs error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch jobs.' });
  }
});

// POST /api/org/jobs
router.post('/jobs', requireHROrAdmin, async (req, res) => {
  const {
    title,
    description,
    posting_type,
    job_type,
    location,
    workplace_area,
    work_setup,
    slots_available,
    mentor_id,
    finish_time,
    on_call_days,
    salary_rate,
    salary_rate_type,
    target_audience,
    requirements,
    deliverables,
    institution_ids,
    program_ids
  } = req.body;

  if (!title || !description) {
    return res.status(400).json({ success: false, message: 'Posting title and description are required.' });
  }

  if (!Array.isArray(program_ids) || program_ids.length === 0) {
    return res.status(400).json({ success: false, message: 'Target Degree Programs / Courses are required. Please select at least one.' });
  }

  if (!Array.isArray(institution_ids) || institution_ids.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one Target Academic Institution for Approval must be selected.' });
  }

  const pType = posting_type || 'ojt';

  if (pType === 'ojt' && !mentor_id) {
    const org = await getOrgId(req.user.user_id);
    if (org) {
      const [mentors] = await pool.query(
        'SELECT org_staff_id FROM organization_staff WHERE organization_id = ? AND (position = \'workplace_mentor\' OR position = \'mentor\')',
        [org.organization_id]
      );
      if (mentors.length === 0) {
        return res.status(400).json({
          success: false,
          message: "You don't have a mentor yet. Please add your mentor now in the Workplace Mentors module before posting an opportunity."
        });
      }
    }
  }

  const connection = await pool.getConnection();
  let released = false;
  const safeRelease = () => {
    if (!released) {
      released = true;
      try { connection.release(); } catch (_) {}
    }
  };
  try {
    await connection.beginTransaction();

    const org = await getOrgId(req.user.user_id);
    if (!org) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Org not found' });
    }

    const [jobRes] = await connection.query(
      `INSERT INTO job_postings (
        organization_id, mentor_id, title, description, requirements, deliverables,
        posting_type, job_type, location, workplace_area, finish_time, on_call_days, salary_rate, salary_rate_type,
        target_audience, work_setup, slots_available, status, posted_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW(), NOW())`,
      [
        org.organization_id,
        mentor_id || null,
        title,
        description,
        requirements || null,
        deliverables || null,
        pType,
        job_type || (pType === 'ojt' ? 'internship' : pType === 'on_call' ? 'on_call' : 'full_time'),
        location || 'On-site / Hybrid',
        workplace_area ? workplace_area.trim() : null,
        finish_time || null,
        on_call_days ? parseInt(on_call_days) : null,
        pType === 'ojt' ? null : (salary_rate ? parseFloat(salary_rate) : null),
        pType === 'ojt' ? null : (salary_rate_type || 'daily'),
        target_audience || (pType === 'ojt' ? 'ojt_students' : pType === 'on_call' ? 'ojt_completers_or_graduates' : 'graduated_students'),
        work_setup || 'hybrid',
        parseInt(slots_available) || 1
      ]
    );

    const jobId = jobRes.insertId;

    let selectedInstitutions = Array.isArray(institution_ids) ? institution_ids : [];
    if (selectedInstitutions.length === 0) {
      const [allInsts] = await connection.query('SELECT institution_id FROM institutions WHERE status = \'active\'');
      selectedInstitutions = allInsts.map(i => i.institution_id);
    }

    for (const instId of selectedInstitutions) {
      await connection.query(
        `INSERT INTO institution_job_approvals (job_id, institution_id, approval_status, created_at)
         VALUES (?, ?, 'pending', NOW())
         ON DUPLICATE KEY UPDATE approval_status = 'pending'`,
        [jobId, instId]
      );
    }

    if (Array.isArray(program_ids) && program_ids.length > 0) {
      const [matchingProgs] = await connection.query(
        `SELECT DISTINCT p.program_id
         FROM master_programs mp
         JOIN programs p ON TRIM(p.program_name) = TRIM(mp.program_name) AND TRIM(p.program_code) = TRIM(mp.program_code)
         WHERE mp.master_program_id IN (?) OR p.program_id IN (?)`,
        [program_ids, program_ids]
      );
      for (const p of matchingProgs) {
        await connection.query(
          `INSERT INTO job_required_programs (job_id, program_id, is_mandatory, created_at)
           VALUES (?, ?, 1, NOW())
           ON DUPLICATE KEY UPDATE is_mandatory = 1`,
          [jobId, p.program_id]
        );
      }
    }

    await connection.commit();

    emitUpdate('job_posted', { job_id: jobId, organization_id: org.organization_id, posting_type: pType });

    const typeLabel = pType === 'ojt' ? 'OJT Opportunity' : pType === 'on_call' ? 'On-Call Opportunity' : 'Career Job Opening';
    return res.status(201).json({
      success: true,
      message: `${typeLabel} posted successfully and submitted to ${selectedInstitutions.length} partner institution(s) for approval!`
    });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    console.error('Post job error:', error);
    return res.status(500).json({ success: false, message: 'Failed to post opportunity.' });
  } finally {
    safeRelease();
  }
});

// PUT /api/org/jobs/:id
router.put('/jobs/:id', requireHROrAdmin, async (req, res) => {
  const jobId = req.params.id;
  const {
    title,
    description,
    posting_type,
    job_type,
    location,
    workplace_area,
    work_setup,
    slots_available,
    mentor_id,
    finish_time,
    on_call_days,
    salary_rate,
    salary_rate_type,
    target_audience,
    requirements,
    deliverables,
    status,
    institution_ids,
    program_ids
  } = req.body;

  const connection = await pool.getConnection();
  let released = false;
  const safeRelease = () => {
    if (!released) {
      released = true;
      try { connection.release(); } catch (_) {}
    }
  };
  try {
    await connection.beginTransaction();

    const org = await getOrgId(req.user.user_id);
    if (!org) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Org not found' });
    }

    await connection.query(
      `UPDATE job_postings SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        requirements = COALESCE(?, requirements),
        deliverables = COALESCE(?, deliverables),
        posting_type = COALESCE(?, posting_type),
        job_type = COALESCE(?, job_type),
        location = COALESCE(?, location),
        workplace_area = ?,
        work_setup = COALESCE(?, work_setup),
        slots_available = COALESCE(?, slots_available),
        mentor_id = ?,
        finish_time = ?,
        on_call_days = ?,
        salary_rate = ?,
        salary_rate_type = COALESCE(?, salary_rate_type),
        target_audience = COALESCE(?, target_audience),
        status = COALESCE(?, status),
        updated_at = NOW()
       WHERE job_id = ? AND organization_id = ?`,
      [
        title,
        description,
        requirements,
        deliverables,
        posting_type,
        job_type,
        location,
        workplace_area !== undefined ? (workplace_area ? workplace_area.trim() : null) : null,
        work_setup,
        slots_available ? parseInt(slots_available) : null,
        mentor_id || null,
        finish_time || null,
        on_call_days ? parseInt(on_call_days) : null,
        posting_type === 'ojt' ? null : (salary_rate ? parseFloat(salary_rate) : null),
        posting_type === 'ojt' ? null : salary_rate_type,
        target_audience,
        status,
        jobId,
        org.organization_id
      ]
    );

    if (Array.isArray(institution_ids)) {
      for (const instId of institution_ids) {
        await connection.query(
          `INSERT INTO institution_job_approvals (job_id, institution_id, approval_status, created_at)
           VALUES (?, ?, 'pending', NOW())
           ON DUPLICATE KEY UPDATE approval_status = approval_status`,
          [jobId, instId]
        );
      }
    }

    if (Array.isArray(program_ids)) {
      await connection.query('DELETE FROM job_required_programs WHERE job_id = ?', [jobId]);
      if (program_ids.length > 0) {
        const [matchingProgs] = await connection.query(
          `SELECT DISTINCT p.program_id
           FROM master_programs mp
           JOIN programs p ON TRIM(p.program_name) = TRIM(mp.program_name) AND TRIM(p.program_code) = TRIM(mp.program_code)
           WHERE mp.master_program_id IN (?) OR p.program_id IN (?)`,
          [program_ids, program_ids]
        );
        for (const p of matchingProgs) {
          await connection.query(
            `INSERT INTO job_required_programs (job_id, program_id, is_mandatory, created_at)
             VALUES (?, ?, 1, NOW())
             ON DUPLICATE KEY UPDATE is_mandatory = 1`,
            [jobId, p.program_id]
          );
        }
      }
    }

    await connection.commit();

    emitUpdate('job_updated', { job_id: jobId, organization_id: org.organization_id });

    return res.json({ success: true, message: 'Posting updated successfully.' });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    console.error('Update job error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update job posting.' });
  } finally {
    safeRelease();
  }
});

// PUT /api/org/jobs/:id/status
router.put('/jobs/:id/status', requireHROrAdmin, async (req, res) => {
  const jobId = req.params.id;
  const { status } = req.body;

  if (!['draft', 'pending_review', 'active', 'closed'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid job status provided.' });
  }

  try {
    const org = await getOrgId(req.user.user_id);
    if (!org) return res.status(404).json({ success: false, message: 'Org not found' });

    const [result] = await pool.query(
      'UPDATE job_postings SET status = ?, updated_at = NOW() WHERE job_id = ? AND organization_id = ?',
      [status, jobId, org.organization_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Job posting not found or not owned by organization.' });
    }

    emitUpdate('job_updated', { job_id: jobId, organization_id: org.organization_id, status });

    return res.json({ success: true, message: `Opportunity status set to ${status}.` });
  } catch (error) {
    console.error('Toggle job status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update job status.' });
  }
});

// DELETE /api/org/jobs/:id
router.delete('/jobs/:id', requireHROrAdmin, async (req, res) => {
  const jobId = req.params.id;

  try {
    const org = await getOrgId(req.user.user_id);
    if (!org) return res.status(404).json({ success: false, message: 'Org not found' });

    await pool.query('DELETE FROM institution_job_approvals WHERE job_id = ?', [jobId]);
    await pool.query('DELETE FROM job_required_programs WHERE job_id = ?', [jobId]);
    await pool.query('DELETE FROM job_required_skills WHERE job_id = ?', [jobId]);
    await pool.query('DELETE FROM job_applications WHERE job_id = ?', [jobId]);
    await pool.query('DELETE FROM job_postings WHERE job_id = ? AND organization_id = ?', [jobId, org.organization_id]);

    emitUpdate('job_updated', { job_id: jobId, organization_id: org.organization_id });

    return res.json({ success: true, message: 'Posting deleted successfully.' });
  } catch (error) {
    console.error('Delete job error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete posting.' });
  }
});

// GET /api/org/applicants
router.get('/applicants', async (req, res) => {
  try {
    const org = await getOrgId(req.user.user_id);
    if (!org) return res.status(404).json({ success: false, message: 'Org not found' });

    const [applicants] = await pool.query(
      `SELECT ja.*, s.first_name, s.last_name, s.student_number, s.contact_number, s.ojt_status, s.classification,
              s.completed_ojt_hours, s.required_ojt_hours,
              p.program_name, p.program_code, i.institution_name,
              jp.title as job_title, jp.job_id, jp.posting_type, jp.salary_rate, jp.salary_rate_type, jp.on_call_days, jp.finish_time
       FROM job_applications ja
       JOIN job_postings jp ON ja.job_id = jp.job_id
       JOIN students s ON ja.student_id = s.student_id
       LEFT JOIN programs p ON s.program_id = p.program_id
       LEFT JOIN institutions i ON s.institution_id = i.institution_id
       WHERE jp.organization_id = ?
       ORDER BY ja.applied_at DESC`,
      [org.organization_id]
    );

    const [jobs] = await pool.query(
      'SELECT job_id, title, posting_type FROM job_postings WHERE organization_id = ? ORDER BY title ASC',
      [org.organization_id]
    );

    return res.json({ success: true, data: { applicants, jobs } });
  } catch (error) {
    console.error('Fetch org applicants error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch applicants.' });
  }
});

// GET /api/org/applicants/:id/profile
router.get('/applicants/:id/profile', async (req, res) => {
  const appId = req.params.id;

  try {
    const org = await getOrgId(req.user.user_id);
    if (!org) return res.status(404).json({ success: false, message: 'Org not found' });

    const [appRows] = await pool.query(
      `SELECT ja.*, jp.title as job_title, jp.posting_type, jp.salary_rate, jp.salary_rate_type, jp.on_call_days, jp.finish_time, jp.deliverables,
              s.student_id, s.user_id as student_user_id, s.first_name, s.last_name, s.student_number, s.contact_number,
              s.ojt_status, s.classification, s.completed_ojt_hours, s.required_ojt_hours,
              p.program_name, p.program_code, p.department,
              i.institution_name, i.city as institution_city,
              u.email as student_email
       FROM job_applications ja
       JOIN job_postings jp ON ja.job_id = jp.job_id
       JOIN students s ON ja.student_id = s.student_id
       JOIN users u ON s.user_id = u.user_id
       LEFT JOIN programs p ON s.program_id = p.program_id
       LEFT JOIN institutions i ON s.institution_id = i.institution_id
       WHERE ja.application_id = ? AND jp.organization_id = ?`,
      [appId, org.organization_id]
    );

    if (appRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Applicant record not found.' });
    }

    const applicant = appRows[0];
    const studentId = applicant.student_id;
    const isGraduated = applicant.ojt_status === 'graduated' || applicant.status_id === 5;
    const isOjtCompleter = applicant.ojt_status === 'completed' || applicant.ojt_status === 'completed_ojt' || applicant.status_id === 4 || (applicant.completed_ojt_hours && applicant.required_ojt_hours && applicant.completed_ojt_hours >= applicant.required_ojt_hours);

    const [resumes] = await pool.query(
      'SELECT * FROM student_resumes WHERE student_id = ? ORDER BY is_active DESC, version DESC, created_at DESC',
      [studentId]
    );

    const [portfolioItems] = await pool.query(
      `SELECT pi.*, ho.organization_name as verified_by_org
       FROM student_portfolios sp
       JOIN portfolio_items pi ON sp.portfolio_id = pi.portfolio_id
       LEFT JOIN hiring_organizations ho ON pi.associated_org_id = ho.organization_id
       WHERE sp.student_id = ?
       ORDER BY pi.created_at DESC`,
      [studentId]
    );

    const formattedItems = portfolioItems.map(i => ({
      ...i,
      file_path: formatFilePath(i.file_path)
    }));

    const normType = (t) => (t || '').toLowerCase().trim();
    const isCred = (t) => ['credential', 'credentials', 'certificate', 'certification', 'honor', 'award', 'license', 'badge'].includes(normType(t));
    const isRecord = (t) => ['academic_record', 'academic_records', 'transcript', 'tor', 'cor', 'enrollment', 'record', 'grades'].includes(normType(t));
    const isAcad = (t) => ['academic_portfolio', 'project', 'sample_work', 'capstone', 'thesis', 'research', 'coursework'].includes(normType(t));

    const credentials = formattedItems.filter(i => isCred(i.item_type));
    const academic_records = formattedItems.filter(i => isRecord(i.item_type));
    const academic_portfolio = formattedItems.filter(i => isAcad(i.item_type) || (!isCred(i.item_type) && !isRecord(i.item_type)));

    const formattedResumes = resumes.map(r => ({
      ...r,
      file_path: formatFilePath(r.file_path)
    }));

    const [achievements] = await pool.query(
      'SELECT * FROM student_achievements WHERE student_id = ? ORDER BY date_achieved DESC, created_at DESC',
      [studentId]
    );

    const [ojtRecords] = await pool.query(
      `SELECT o.*, ho.organization_name, ho.industry, ho.address as org_address, ho.contact_email as org_email,
              os.first_name as mentor_first_name, os.last_name as mentor_last_name, os.contact_number as mentor_contact
       FROM ojt_records o
       JOIN hiring_organizations ho ON o.organization_id = ho.organization_id
       LEFT JOIN organization_staff os ON os.organization_id = o.organization_id AND (os.position = 'workplace_mentor' OR os.position = 'mentor' OR os.position = 'hr_officer')
       WHERE o.student_id = ?
       ORDER BY (CASE WHEN o.status = 'completed' THEN 0 ELSE 1 END), o.created_at DESC`,
      [studentId]
    );

    const [ojtEvaluations] = await pool.query(
      `SELECT opr.*, o.required_hours, o.rendered_hours, o.status as ojt_status, ho.organization_name,
              u.email as evaluator_email,
              COALESCE(os.first_name, isf.first_name, '') as evaluator_first_name,
              COALESCE(os.last_name, isf.last_name, '') as evaluator_last_name
       FROM ojt_records o
       JOIN ojt_performance_records opr ON o.ojt_id = opr.ojt_id
       JOIN hiring_organizations ho ON o.organization_id = ho.organization_id
       LEFT JOIN users u ON opr.evaluator_id = u.user_id
       LEFT JOIN organization_staff os ON os.user_id = opr.evaluator_id
       LEFT JOIN institution_staff isf ON isf.user_id = opr.evaluator_id
       WHERE o.student_id = ?
       ORDER BY opr.evaluated_at DESC`,
      [studentId]
    );

    return res.json({
      success: true,
      data: {
        applicant,
        resume: formattedResumes.length > 0 ? formattedResumes[0] : null,
        resumes: formattedResumes,
        academic_portfolio,
        credentials,
        academic_records,
        portfolio: formattedItems,
        achievements,
        is_graduated: Boolean(isGraduated),
        ojt_background: ojtRecords,
        evaluations: ojtEvaluations
      }
    });
  } catch (error) {
    console.error('Fetch applicant profile error:', error);
    return res.status(500).json({ success: false, message: 'Could not load applicant profile.' });
  }
});

// POST /api/org/applicants/:id/status
router.post('/applicants/:id/status', requireHROrAdmin, async (req, res) => {
  const appId = req.params.id;
  const status = req.body.status;

  try {
    const org = await getOrgId(req.user.user_id);
    if (!org) return res.status(404).json({ success: false, message: 'Org not found' });

    const [appRows] = await pool.query(
      `SELECT ja.*, s.user_id as student_user_id, s.first_name, jp.title as job_title, ho.organization_name
       FROM job_applications ja
       JOIN job_postings jp ON ja.job_id = jp.job_id
       JOIN hiring_organizations ho ON jp.organization_id = ho.organization_id
       JOIN students s ON ja.student_id = s.student_id
       WHERE ja.application_id = ? AND jp.organization_id = ?`,
      [appId, org.organization_id]
    );

    if (appRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application record not found.' });
    }

    const app = appRows[0];

    await pool.query(
      'UPDATE job_applications SET status = ?, updated_at = NOW() WHERE application_id = ?',
      [status, appId]
    );

    emitUpdate('application_updated', { application_id: appId, organization_id: org.organization_id, status });

    // Send notification to student
    if (app.student_user_id) {
      const statusTitles = {
        shortlisted: 'Application Shortlisted!',
        interviewed: 'Interview Update',
        accepted: 'Job Offer Received!',
        rejected: 'Application Update',
        withdrawn: 'Application Withdrawn'
      };
      await sendNotification({
        userId: app.student_user_id,
        title: statusTitles[status] || 'Application Status Update',
        message: `Your application for "${app.job_title}" at ${app.organization_name} has been updated to "${status}".`,
        type: 'job'
      });
    }

    return res.json({ success: true, message: `Applicant status updated to ${status}.` });
  } catch (error) {
    console.error('Update applicant status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update status.' });
  }
});

// POST /api/org/applicants/:id/accept-on-call
router.post('/applicants/:id/accept-on-call', requireHROrAdmin, async (req, res) => {
  const appId = req.params.id;
  const connection = await pool.getConnection();
  let released = false;
  const safeRelease = () => {
    if (!released) {
      released = true;
      try { connection.release(); } catch (_) {}
    }
  };

  try {
    await connection.beginTransaction();

    const org = await getOrgId(req.user.user_id);
    if (!org) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Org not found' });
    }

    const [appRows] = await connection.query(
      `SELECT ja.*, jp.title as job_title, jp.finish_time, jp.salary_rate, jp.salary_rate_type, jp.on_call_days,
              s.student_id, s.user_id as student_user_id, s.first_name, s.last_name, ho.organization_name
       FROM job_applications ja
       JOIN job_postings jp ON ja.job_id = jp.job_id
       JOIN hiring_organizations ho ON jp.organization_id = ho.organization_id
       JOIN students s ON ja.student_id = s.student_id
       WHERE ja.application_id = ? AND jp.organization_id = ?`,
      [appId, org.organization_id]
    );

    if (appRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Application record not found.' });
    }

    const app = appRows[0];

    // Mark application as accepted
    await connection.query(
      'UPDATE job_applications SET status = \'accepted\', updated_at = NOW() WHERE application_id = ?',
      [appId]
    );

    // Ensure student portfolio exists
    let portfolioId = null;
    const [portRows] = await connection.query(
      'SELECT portfolio_id FROM student_portfolios WHERE student_id = ? LIMIT 1',
      [app.student_id]
    );

    if (portRows.length > 0) {
      portfolioId = portRows[0].portfolio_id;
    } else {
      const [newPort] = await connection.query(
        'INSERT INTO student_portfolios (student_id, title, summary, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [app.student_id, `${app.first_name}'s Career Portfolio`, 'Verified institutional and industry verified career portfolio items.']
      );
      portfolioId = newPort.insertId;
    }

    // Insert or update verified portfolio item for this on-call experience
    const itemTitle = `On-Call Experience: ${app.job_title}`;
    const itemDesc = `Successfully engaged and completed on-call deliverables (${app.on_call_days || 1} day(s), deadline: ${app.finish_time || 'Standard'}) with ${app.organization_name}. Verified industry engagement.`;

    const [existingItems] = await connection.query(
      'SELECT item_id FROM portfolio_items WHERE portfolio_id = ? AND associated_job_id = ? LIMIT 1',
      [portfolioId, app.job_id]
    );

    if (existingItems.length === 0) {
      await connection.query(
        `INSERT INTO portfolio_items (
          portfolio_id, title, description, item_type, sub_category, is_verified,
          associated_org_id, associated_job_id, created_at, updated_at
        ) VALUES (?, ?, ?, 'work_experience', 'On-Call Project', 1, ?, ?, NOW(), NOW())`,
        [portfolioId, itemTitle, itemDesc, org.organization_id, app.job_id]
      );
    } else {
      await connection.query(
        'UPDATE portfolio_items SET is_verified = 1, updated_at = NOW() WHERE item_id = ?',
        [existingItems[0].item_id]
      );
    }

    await connection.commit();

    emitUpdate('application_updated', { application_id: appId, organization_id: org.organization_id, status: 'accepted' });

    if (app.student_user_id) {
      await sendNotification({
        userId: app.student_user_id,
        title: 'On-Call Engagement Accepted!',
        message: `Congratulations! ${app.organization_name} has accepted you for "${app.job_title}". This experience has been auto-credited to your verified Career Portfolio.`,
        type: 'job'
      });
    }

    return res.json({
      success: true,
      message: 'On-call candidate accepted and experience credited to portfolio!'
    });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (_) {}
    }
    console.error('Accept on-call error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process on-call acceptance.' });
  } finally {
    safeRelease();
  }
});

// GET /api/org/interns
router.get('/interns', async (req, res) => {
  try {
    const org = await getOrgId(req.user.user_id);
    if (!org) return res.status(404).json({ success: false, message: 'Org not found' });

    const [interns] = await pool.query(
      `SELECT o.*, 
              COALESCE(
                (
                  SELECT jp.title
                  FROM job_applications ja
                  JOIN job_postings jp ON ja.job_id = jp.job_id
                  WHERE ja.student_id = o.student_id AND jp.organization_id = o.organization_id
                  ORDER BY (CASE WHEN ja.status = 'accepted' THEN 0 WHEN ja.status = 'hired' THEN 1 ELSE 2 END), ja.updated_at DESC
                  LIMIT 1
                ),
                'Intern'
              ) as position_title,
              COALESCE(
                (
                  SELECT jp.title
                  FROM job_applications ja
                  JOIN job_postings jp ON ja.job_id = jp.job_id
                  WHERE ja.student_id = o.student_id AND jp.organization_id = o.organization_id
                  ORDER BY (CASE WHEN ja.status = 'accepted' THEN 0 WHEN ja.status = 'hired' THEN 1 ELSE 2 END), ja.updated_at DESC
                  LIMIT 1
                ),
                'Intern'
              ) as job_title,
              COALESCE(o.required_hours, s.required_ojt_hours, p.required_ojt_hours, 600) as required_hours,
              COALESCE(s.required_ojt_hours, o.required_hours, p.required_ojt_hours, 600) as required_ojt_hours,
              s.first_name, s.last_name, s.student_number, s.completed_ojt_hours,
              p.program_name, i.institution_name,
              today_att.attendance_id as today_attendance_id,
              today_att.time_in as today_time_in,
              today_att.time_out as today_time_out,
              today_att.hours_rendered as today_hours,
              today_att.status as today_status,
              today_att.tasks_accomplished as today_tasks
       FROM ojt_records o
       JOIN students s ON o.student_id = s.student_id
       LEFT JOIN programs p ON s.program_id = p.program_id
       LEFT JOIN institutions i ON s.institution_id = i.institution_id
       LEFT JOIN ojt_attendance_logs today_att ON today_att.attendance_id = (
         SELECT MAX(al.attendance_id)
         FROM ojt_attendance_logs al
         WHERE al.ojt_id = o.ojt_id AND al.log_date = CURRENT_DATE()
       )
       WHERE o.organization_id = ?
       ORDER BY (CASE WHEN o.status = 'ongoing' THEN 0 ELSE 1 END), o.created_at DESC`,
      [org.organization_id]
    );

    return res.json({ success: true, data: interns });
  } catch (error) {
    console.error('Fetch org interns error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch interns.' });
  }
});

// GET /api/org/interns/:id/profile
router.get('/interns/:id/profile', async (req, res) => {
  const ojtId = req.params.id;
  try {
    const org = await getOrgId(req.user.user_id);
    if (!org) return res.status(404).json({ success: false, message: 'Org not found' });

    const [ojtRows] = await pool.query(
      `SELECT o.*, 
              COALESCE(o.required_hours, s.required_ojt_hours, p.required_ojt_hours, 600) as required_hours,
              s.student_id, s.user_id as student_user_id, s.first_name, s.last_name, s.student_number, s.contact_number,
              s.ojt_status, s.classification, s.completed_ojt_hours, 
              COALESCE(s.required_ojt_hours, o.required_hours, p.required_ojt_hours, 600) as required_ojt_hours,
              p.program_name, p.program_code, p.department,
              i.institution_name, i.city as institution_city,
              u.email as student_email
       FROM ojt_records o
       JOIN students s ON o.student_id = s.student_id
       JOIN users u ON s.user_id = u.user_id
       LEFT JOIN programs p ON s.program_id = p.program_id
       LEFT JOIN institutions i ON s.institution_id = i.institution_id
       WHERE o.ojt_id = ? AND o.organization_id = ?`,
      [ojtId, org.organization_id]
    );

    if (ojtRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Intern record not found.' });
    }

    const intern = ojtRows[0];
    const studentId = intern.student_id;
    const isGraduated = intern.ojt_status === 'graduated' || intern.status_id === 5;
    const isOjtCompleter = intern.ojt_status === 'completed' || intern.ojt_status === 'completed_ojt' || intern.status_id === 4 || (intern.completed_ojt_hours && intern.required_ojt_hours && intern.completed_ojt_hours >= intern.required_ojt_hours);

    const [resumes] = await pool.query(
      'SELECT * FROM student_resumes WHERE student_id = ? ORDER BY is_active DESC, version DESC, created_at DESC',
      [studentId]
    );

    const [portfolioItems] = await pool.query(
      `SELECT pi.*, ho.organization_name as verified_by_org
       FROM student_portfolios sp
       JOIN portfolio_items pi ON sp.portfolio_id = pi.portfolio_id
       LEFT JOIN hiring_organizations ho ON pi.associated_org_id = ho.organization_id
       WHERE sp.student_id = ?
       ORDER BY pi.created_at DESC`,
      [studentId]
    );

    const academic_portfolio = portfolioItems.filter(i => i.item_type === 'academic_portfolio' || i.item_type === 'project' || i.item_type === 'sample_work');
    const credentials = portfolioItems.filter(i => i.item_type === 'credential' || i.item_type === 'credentials' || i.item_type === 'certificate');
    const academic_records = portfolioItems.filter(i => i.item_type === 'academic_record' || i.item_type === 'academic_records' || i.item_type === 'transcript' || i.item_type === 'cor');

    const [ojtRecords] = await pool.query(
      `SELECT o.*, ho.organization_name, ho.industry, ho.address as org_address, ho.contact_email as org_email,
              os.first_name as mentor_first_name, os.last_name as mentor_last_name, os.contact_number as mentor_contact
       FROM ojt_records o
       JOIN hiring_organizations ho ON o.organization_id = ho.organization_id
       LEFT JOIN organization_staff os ON os.organization_id = o.organization_id AND (os.position = 'workplace_mentor' OR os.position = 'mentor' OR os.position = 'hr_officer')
       WHERE o.student_id = ?
       ORDER BY (CASE WHEN o.status = 'completed' THEN 0 ELSE 1 END), o.created_at DESC`,
      [studentId]
    );

    const [ojtEvaluations] = await pool.query(
      `SELECT opr.*, o.required_hours, o.rendered_hours, o.status as ojt_status, ho.organization_name,
              u.email as evaluator_email,
              COALESCE(os.first_name, isf.first_name, '') as evaluator_first_name,
              COALESCE(os.last_name, isf.last_name, '') as evaluator_last_name
       FROM ojt_records o
       JOIN ojt_performance_records opr ON o.ojt_id = opr.ojt_id
       JOIN hiring_organizations ho ON o.organization_id = ho.organization_id
       LEFT JOIN users u ON opr.evaluator_id = u.user_id
       LEFT JOIN organization_staff os ON os.user_id = opr.evaluator_id
       LEFT JOIN institution_staff isf ON isf.user_id = opr.evaluator_id
       WHERE o.student_id = ?
       ORDER BY opr.evaluated_at DESC`,
      [studentId]
    );

    return res.json({
      success: true,
      data: {
        intern,
        applicant: intern,
        resume: resumes.length > 0 ? resumes[0] : null,
        resumes,
        academic_portfolio,
        credentials,
        academic_records,
        portfolio: portfolioItems,
        is_graduated: Boolean(isGraduated),
        ojt_background: ojtRecords,
        evaluations: ojtEvaluations
      }
    });
  } catch (error) {
    console.error('Fetch intern profile error:', error);
    return res.status(500).json({ success: false, message: 'Could not load intern profile.' });
  }
});

// POST /api/org/interns/:ojtId/hours
router.post('/interns/:ojtId/hours', async (req, res) => {
  const ojtId = req.params.ojtId;
  const hoursToAdd = parseFloat(req.body.hours_to_add);

  if (isNaN(hoursToAdd) || hoursToAdd <= 0 || hoursToAdd > 40) {
    return res.status(400).json({ success: false, message: 'Please provide a valid number of hours between 0.5 and 40.' });
  }

  const connection = await pool.getConnection();
  let released = false;
  const safeRelease = () => {
    if (!released) {
      released = true;
      try { connection.release(); } catch (_) {}
    }
  };
  try {
    await connection.beginTransaction();

    const org = await getOrgId(req.user.user_id);
    if (!org) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Org not found' });
    }

    const [ojtRows] = await connection.query(
      `SELECT o.*, s.user_id as student_user_id, s.first_name, s.last_name, s.completed_ojt_hours, s.required_ojt_hours,
              ho.organization_name
       FROM ojt_records o
       JOIN students s ON o.student_id = s.student_id
       JOIN hiring_organizations ho ON o.organization_id = ho.organization_id
       WHERE o.ojt_id = ? AND o.organization_id = ?`,
      [ojtId, org.organization_id]
    );

    if (ojtRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Internship record not found or not managed by your organization.' });
    }

    const ojt = ojtRows[0];
    const newRendered = (parseFloat(ojt.rendered_hours) || 0) + hoursToAdd;
    const newStudentCompleted = (parseFloat(ojt.completed_ojt_hours) || 0) + hoursToAdd;

    await connection.query(
      `UPDATE ojt_records 
       SET rendered_hours = ?, 
           status = CASE WHEN ? >= required_hours THEN 'completed' ELSE status END,
           updated_at = NOW() 
       WHERE ojt_id = ?`,
      [newRendered, newRendered, ojtId]
    );

    await connection.query(
      'UPDATE students SET completed_ojt_hours = ?, updated_at = NOW() WHERE student_id = ?',
      [newStudentCompleted, ojt.student_id]
    );

    // Auto-update OJT status when hours requirement is met
    await connection.query(
      `UPDATE students SET ojt_status = 'completed_ojt', status_id = 4, updated_at = NOW()
       WHERE student_id = ? AND ojt_status NOT IN ('graduated', 'completed_ojt', 'completed')
         AND required_ojt_hours > 0 AND completed_ojt_hours >= required_ojt_hours`,
      [ojt.student_id]
    );

    await connection.query(
      `INSERT INTO ojt_attendance_logs (
        ojt_id, student_id, log_date, time_in, time_out, hours_rendered, tasks_accomplished, status, verified_by, verified_at, created_at, updated_at
      ) VALUES (?, ?, CURRENT_DATE(), '08:00:00', '17:00:00', ?, 'Manual supervisor verified OJT training hours credit.', 'verified', ?, NOW(), NOW(), NOW())`,
      [ojtId, ojt.student_id, hoursToAdd, req.user.user_id]
    );

    await connection.commit();

    if (newRendered >= (parseFloat(ojt.required_hours) || 600)) {
      try {
        await checkAndGenerateCertificate(ojtId);
      } catch (certErr) {
        console.error('Auto certificate generation check error:', certErr);
      }
    }

    emitUpdate('ojt_updated', { ojt_id: ojtId, organization_id: org.organization_id, hours_added: hoursToAdd });

    if (ojt.student_user_id) {
      await sendNotification({
        userId: ojt.student_user_id,
        title: 'OJT Hours Credited',
        message: `${hoursToAdd} OJT training hour(s) have been verified and credited by ${ojt.organization_name}. Total rendered: ${newStudentCompleted} hrs.`,
        type: 'ojt'
      });
    }

    return res.json({
      success: true,
      message: `Logged and credited ${hoursToAdd} training hours successfully!`,
      data: {
        ojt_id: ojtId,
        rendered_hours: newRendered,
        completed_ojt_hours: newStudentCompleted
      }
    });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (_) {}
    }
    console.error('Log intern hours error:', error);
    return res.status(500).json({ success: false, message: 'Failed to log hours.' });
  } finally {
    safeRelease();
  }
});

// GET /api/org/attendance - List daily attendance logs of interns for this organization
router.get('/attendance', async (req, res) => {
  const { ojt_id, status } = req.query;

  try {
    const org = await getOrgId(req.user.user_id);
    if (!org) return res.status(404).json({ success: false, message: 'Org not found' });

    let query = `
      SELECT att.*, s.first_name, s.last_name, s.student_number, p.program_name,
             o.required_hours, o.rendered_hours
      FROM ojt_attendance_logs att
      JOIN ojt_records o ON att.ojt_id = o.ojt_id
      JOIN students s ON att.student_id = s.student_id
      LEFT JOIN programs p ON s.program_id = p.program_id
      WHERE o.organization_id = ?
    `;
    const params = [org.organization_id];

    if (ojt_id) {
      query += ' AND att.ojt_id = ?';
      params.push(ojt_id);
    }
    if (status) {
      query += ' AND att.status = ?';
      params.push(status);
    }

    query += ' ORDER BY att.log_date DESC, att.time_in DESC LIMIT 200';

    const [logs] = await pool.query(query, params);
    return res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Fetch org attendance error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch attendance logs.' });
  }
});

// POST /api/org/attendance/:id/verify - Workplace Mentor approves/rejects daily attendance
router.post('/attendance/:id/verify', async (req, res) => {
  const attendanceId = req.params.id;
  const { action, hours_rendered, rejection_notes } = req.body; // 'verify' or 'reject'

  const connection = await pool.getConnection();
  let released = false;
  const safeRelease = () => {
    if (!released) {
      released = true;
      try { connection.release(); } catch (_) {}
    }
  };
  try {
    await connection.beginTransaction();

    const org = await getOrgId(req.user.user_id);
    if (!org) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Org not found' });
    }

    const [attRows] = await connection.query(
      `SELECT att.*, o.organization_id, o.ojt_id, s.student_id, s.user_id as student_user_id
       FROM ojt_attendance_logs att
       JOIN ojt_records o ON att.ojt_id = o.ojt_id
       JOIN students s ON att.student_id = s.student_id
       WHERE att.attendance_id = ? AND o.organization_id = ?`,
      [attendanceId, org.organization_id]
    );

    if (attRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }

    const att = attRows[0];
    const previousHours = parseFloat(att.hours_rendered) || 0;
    const newHours = hours_rendered !== undefined ? parseFloat(hours_rendered) : previousHours;

    if (action === 'verify') {
      await connection.query(
        `UPDATE ojt_attendance_logs 
         SET status = 'verified', hours_rendered = ?, verified_by = ?, verified_at = NOW(), rejection_notes = NULL
         WHERE attendance_id = ?`,
        [newHours, req.user.user_id, attendanceId]
      );

      // Increment rendered hours on ojt_records and student profile
      const hoursDiff = att.status === 'verified' ? (newHours - previousHours) : newHours;
      if (hoursDiff !== 0) {
        await connection.query(
          'UPDATE ojt_records SET rendered_hours = GREATEST(0, rendered_hours + ?) WHERE ojt_id = ?',
          [hoursDiff, att.ojt_id]
        );
        await connection.query(
          'UPDATE students SET completed_ojt_hours = GREATEST(0, completed_ojt_hours + ?) WHERE student_id = ?',
          [hoursDiff, att.student_id]
        );
        // Auto-update OJT status when hours requirement is met
        await connection.query(
          `UPDATE students SET ojt_status = 'completed_ojt', status_id = 4
           WHERE student_id = ? AND ojt_status NOT IN ('graduated', 'completed_ojt', 'completed')
             AND required_ojt_hours > 0 AND completed_ojt_hours >= required_ojt_hours`,
          [att.student_id]
        );
      }
    } else {
      await connection.query(
        `UPDATE ojt_attendance_logs 
         SET status = 'rejected', rejection_notes = ?, verified_by = ?, verified_at = NOW()
         WHERE attendance_id = ?`,
        [rejection_notes || 'Attendance entry rejected by Mentor.', req.user.user_id, attendanceId]
      );

      // If previously verified, deduct hours
      if (att.status === 'verified' && previousHours > 0) {
        await connection.query(
          'UPDATE ojt_records SET rendered_hours = GREATEST(0, rendered_hours - ?) WHERE ojt_id = ?',
          [previousHours, att.ojt_id]
        );
        await connection.query(
          'UPDATE students SET completed_ojt_hours = GREATEST(0, completed_ojt_hours - ?) WHERE student_id = ?',
          [previousHours, att.student_id]
        );
      }
    }

    await connection.commit();

    emitUpdate('attendance_verified', { ojt_id: att.ojt_id, student_id: att.student_id, organization_id: org.organization_id });

    if (att.student_user_id) {
      await sendNotification({
        userId: att.student_user_id,
        title: action === 'verify' ? 'Attendance Verified' : 'Attendance Rejected',
        message: action === 'verify'
          ? `Your DTR log for ${new Date(att.log_date).toLocaleDateString()} was verified (${newHours} hrs credited).`
          : `Your DTR log for ${new Date(att.log_date).toLocaleDateString()} was rejected: ${rejection_notes || 'Please check with your mentor.'}`,
        type: 'ojt'
      });
    }

    return res.json({
      success: true,
      message: action === 'verify' ? `Attendance approved (${newHours} hours credited).` : 'Attendance log rejected.'
    });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    console.error('Verify attendance error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify attendance: ' + error.message });
  } finally {
    safeRelease();
  }
});

// POST /api/org/interns/:ojtId/time-in - Workplace Mentor clocks in a student intern
router.post('/interns/:ojtId/time-in', async (req, res) => {
  const ojtId = req.params.ojtId;
  const { time_in } = req.body;

  try {
    const org = await getOrgId(req.user.user_id);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });

    const [ojts] = await pool.query(
      `SELECT o.*, s.student_id, s.first_name, s.last_name, s.user_id as student_user_id
       FROM ojt_records o
       JOIN students s ON o.student_id = s.student_id
       WHERE o.ojt_id = ? AND o.organization_id = ?`,
      [ojtId, org.organization_id]
    );

    if (ojts.length === 0) {
      return res.status(404).json({ success: false, message: 'Active intern record not found.' });
    }

    const ojt = ojts[0];

    // Disable time-in if student has completed required hours or status is completed
    const reqHours = Number(ojt.required_hours) || 600;
    const renHours = Number(ojt.rendered_hours) || 0;
    if (ojt.status === 'completed' || renHours >= reqHours) {
      return res.status(400).json({
        success: false,
        message: `${ojt.first_name} has already completed their required OJT hours (${renHours}/${reqHours} hrs). Time In is disabled.`
      });
    }

    // Check if already timed in today
    const [existing] = await pool.query(
      'SELECT * FROM ojt_attendance_logs WHERE ojt_id = ? AND log_date = CURRENT_DATE()',
      [ojtId]
    );

    // Format current time HH:MM:SS
    const now = new Date();
    const formattedNow = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const timeInToRecord = time_in || formattedNow;

    if (existing.length > 0) {
      if (existing[0].time_in) {
        return res.status(400).json({
          success: false,
          message: `${ojt.first_name} is already clocked in today at ${existing[0].time_in}.`
        });
      }
      await pool.query(
        `UPDATE ojt_attendance_logs 
         SET time_in = ?, verified_by = ?, verified_at = NOW(), updated_at = NOW()
         WHERE attendance_id = ?`,
        [timeInToRecord, req.user.user_id, existing[0].attendance_id]
      );
    } else {
      await pool.query(
        `INSERT INTO ojt_attendance_logs (ojt_id, student_id, log_date, time_in, status, verified_by, verified_at, created_at, updated_at)
         VALUES (?, ?, CURRENT_DATE(), ?, 'verified', ?, NOW(), NOW(), NOW())`,
        [ojtId, ojt.student_id, timeInToRecord, req.user.user_id]
      );
    }

    emitUpdate('attendance_logged', { ojt_id: ojt.ojt_id, student_id: ojt.student_id, organization_id: org.organization_id });

    if (ojt.student_user_id) {
      await sendNotification({
        userId: ojt.student_user_id,
        title: 'Mentor Recorded Time-In',
        message: `Your workplace mentor timed you in today at ${timeInToRecord}. Have a productive training shift!`,
        type: 'ojt'
      });
    }

    return res.json({
      success: true,
      message: `Time-In officially recorded for ${ojt.first_name} ${ojt.last_name} at ${timeInToRecord}.`
    });
  } catch (err) {
    console.error('Mentor time in error:', err);
    return res.status(500).json({ success: false, message: 'Failed to record student time in.' });
  }
});

// POST /api/org/interns/:ojtId/time-out - Workplace Mentor clocks out a student intern and credits hours
router.post('/interns/:ojtId/time-out', async (req, res) => {
  const ojtId = req.params.ojtId;
  const { time_out, hours_rendered, tasks_accomplished } = req.body;

  const connection = await pool.getConnection();
  let released = false;
  const safeRelease = () => {
    if (!released) {
      released = true;
      try { connection.release(); } catch (_) {}
    }
  };
  try {
    await connection.beginTransaction();

    const org = await getOrgId(req.user.user_id);
    if (!org) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Organization not found.' });
    }

    const [ojts] = await connection.query(
      `SELECT o.*, s.student_id, s.first_name, s.last_name, s.user_id as student_user_id
       FROM ojt_records o
       JOIN students s ON o.student_id = s.student_id
       WHERE o.ojt_id = ? AND o.organization_id = ?`,
      [ojtId, org.organization_id]
    );

    if (ojts.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Active intern record not found.' });
    }

    const ojt = ojts[0];

    const [existing] = await connection.query(
      'SELECT * FROM ojt_attendance_logs WHERE ojt_id = ? AND log_date = CURRENT_DATE()',
      [ojtId]
    );

    const now = new Date();
    const formattedNow = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const timeOutToRecord = time_out || formattedNow;

    let computedHours = 8.0;
    if (hours_rendered !== undefined && hours_rendered !== null && hours_rendered !== '') {
      computedHours = parseFloat(hours_rendered);
    } else if (existing.length > 0 && existing[0].time_in) {
      try {
        const [inH, inM] = existing[0].time_in.split(':').map(Number);
        const [outH, outM] = timeOutToRecord.split(':').map(Number);
        let diffHours = (outH + outM / 60) - (inH + inM / 60);
        if (diffHours < 0) diffHours += 24;
        computedHours = Math.round(Math.max(0.5, diffHours) * 10) / 10;
      } catch (e) {
        computedHours = 8.0;
      }
    }

    if (isNaN(computedHours) || computedHours < 0 || computedHours > 24) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Invalid training hours rendered (must be between 0 and 24 hours).' });
    }

    let attendanceId;
    let prevHours = 0;

    if (existing.length > 0) {
      attendanceId = existing[0].attendance_id;
      prevHours = parseFloat(existing[0].hours_rendered) || 0;
      await connection.query(
        `UPDATE ojt_attendance_logs 
         SET time_out = ?, hours_rendered = ?, tasks_accomplished = ?, status = 'verified',
             verified_by = ?, verified_at = NOW(), updated_at = NOW()
         WHERE attendance_id = ?`,
        [timeOutToRecord, computedHours, tasks_accomplished || 'Workplace training shift tasks completed.', req.user.user_id, attendanceId]
      );
    } else {
      const [insRes] = await connection.query(
        `INSERT INTO ojt_attendance_logs (ojt_id, student_id, log_date, time_in, time_out, hours_rendered, tasks_accomplished, status, verified_by, verified_at, created_at, updated_at)
         VALUES (?, ?, CURRENT_DATE(), '08:00:00', ?, ?, ?, 'verified', ?, NOW(), NOW(), NOW())`,
        [ojtId, ojt.student_id, timeOutToRecord, computedHours, tasks_accomplished || 'Workplace training shift tasks completed.', req.user.user_id]
      );
      attendanceId = insRes.insertId;
    }

    const hoursDiff = computedHours - prevHours;
    if (hoursDiff !== 0) {
      await connection.query(
        'UPDATE ojt_records SET rendered_hours = GREATEST(0, rendered_hours + ?), updated_at = NOW() WHERE ojt_id = ?',
        [hoursDiff, ojtId]
      );
      await connection.query(
        'UPDATE students SET completed_ojt_hours = GREATEST(0, completed_ojt_hours + ?), updated_at = NOW() WHERE student_id = ?',
        [hoursDiff, ojt.student_id]
      );
      // Auto-update OJT status when hours requirement is met
      await connection.query(
        `UPDATE students SET ojt_status = 'completed_ojt', status_id = 4, updated_at = NOW()
         WHERE student_id = ? AND ojt_status NOT IN ('graduated', 'completed_ojt', 'completed')
           AND required_ojt_hours > 0 AND completed_ojt_hours >= required_ojt_hours`,
        [ojt.student_id]
      );
    }

    await connection.commit();

    emitUpdate('attendance_verified', { ojt_id: ojt.ojt_id, student_id: ojt.student_id, organization_id: org.organization_id });

    if (ojt.student_user_id) {
      await sendNotification({
        userId: ojt.student_user_id,
        title: 'Mentor Recorded Time-Out & Hours Credited',
        message: `Your mentor timed you out at ${timeOutToRecord}. ${computedHours} training hours have been officially credited to your DTR!`,
        type: 'ojt'
      });
    }

    return res.json({
      success: true,
      message: `Time-Out recorded and ${computedHours} training hours credited for ${ojt.first_name} ${ojt.last_name}!`
    });
  } catch (err) {
    try { await connection.rollback(); } catch (_) {}
    console.error('Mentor time out error:', err);
    return res.status(500).json({ success: false, message: 'Failed to record student time out.' });
  } finally {
    safeRelease();
  }
});

// POST /api/org/interns/:ojtId/attendance - Mentor creates a custom / backdated attendance log
router.post('/interns/:ojtId/attendance', async (req, res) => {
  const ojtId = req.params.ojtId;
  const { log_date, time_in, time_out, hours_rendered, tasks_accomplished } = req.body;

  if (!log_date) {
    return res.status(400).json({ success: false, message: 'Date is required.' });
  }

  const connection = await pool.getConnection();
  let released = false;
  const safeRelease = () => {
    if (!released) {
      released = true;
      try { connection.release(); } catch (_) {}
    }
  };
  try {
    await connection.beginTransaction();

    const org = await getOrgId(req.user.user_id);
    if (!org) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Organization not found.' });
    }

    const [ojts] = await connection.query(
      `SELECT o.*, s.student_id, s.first_name, s.last_name, s.user_id as student_user_id
       FROM ojt_records o
       JOIN students s ON o.student_id = s.student_id
       WHERE o.ojt_id = ? AND o.organization_id = ?`,
      [ojtId, org.organization_id]
    );

    if (ojts.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Active intern record not found.' });
    }

    const ojt = ojts[0];
    const hours = parseFloat(hours_rendered) || 8.0;

    if (isNaN(hours) || hours <= 0 || hours > 24) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Invalid training hours rendered (must be between 0.1 and 24 hours).' });
    }

    await connection.query(
      `INSERT INTO ojt_attendance_logs (ojt_id, student_id, log_date, time_in, time_out, hours_rendered, tasks_accomplished, status, verified_by, verified_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'verified', ?, NOW(), NOW(), NOW())`,
      [ojtId, ojt.student_id, log_date, time_in || '08:00:00', time_out || '17:00:00', hours, tasks_accomplished || 'Shift completed.', req.user.user_id]
    );

    await connection.query(
      'UPDATE ojt_records SET rendered_hours = GREATEST(0, rendered_hours + ?), updated_at = NOW() WHERE ojt_id = ?',
      [hours, ojtId]
    );
    await connection.query(
      'UPDATE students SET completed_ojt_hours = GREATEST(0, completed_ojt_hours + ?), updated_at = NOW() WHERE student_id = ?',
      [hours, ojt.student_id]
    );
    // Auto-update OJT status when hours requirement is met
    await connection.query(
      `UPDATE students SET ojt_status = 'completed_ojt', status_id = 4, updated_at = NOW()
       WHERE student_id = ? AND ojt_status NOT IN ('graduated', 'completed_ojt', 'completed')
         AND required_ojt_hours > 0 AND completed_ojt_hours >= required_ojt_hours`,
      [ojt.student_id]
    );

    await connection.commit();

    emitUpdate('attendance_verified', { ojt_id: ojt.ojt_id, student_id: ojt.student_id, organization_id: org.organization_id });

    return res.json({
      success: true,
      message: `Attendance log for ${log_date} (${hours} hrs) recorded and credited for ${ojt.first_name} ${ojt.last_name}.`
    });
  } catch (err) {
    try { await connection.rollback(); } catch (_) {}
    console.error('Custom attendance error:', err);
    return res.status(500).json({ success: false, message: 'Failed to record custom attendance log.' });
  } finally {
    safeRelease();
  }
});

// PUT /api/org/attendance/:id - Mentor edits an existing attendance log
router.put('/attendance/:id', async (req, res) => {
  const attendanceId = req.params.id;
  const { time_in, time_out, hours_rendered, tasks_accomplished } = req.body;

  const connection = await pool.getConnection();
  let released = false;
  const safeRelease = () => {
    if (!released) {
      released = true;
      try { connection.release(); } catch (_) {}
    }
  };
  try {
    await connection.beginTransaction();

    const org = await getOrgId(req.user.user_id);
    if (!org) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Organization not found.' });
    }

    const [attRows] = await connection.query(
      `SELECT att.*, o.ojt_id, s.student_id
       FROM ojt_attendance_logs att
       JOIN ojt_records o ON att.ojt_id = o.ojt_id
       JOIN students s ON att.student_id = s.student_id
       WHERE att.attendance_id = ? AND o.organization_id = ?`,
      [attendanceId, org.organization_id]
    );

    if (attRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }

    const att = attRows[0];
    const prevHours = parseFloat(att.hours_rendered) || 0;
    const newHours = hours_rendered !== undefined ? parseFloat(hours_rendered) : prevHours;

    if (isNaN(newHours) || newHours < 0 || newHours > 24) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Invalid training hours rendered (must be between 0 and 24 hours).' });
    }

    await connection.query(
      `UPDATE ojt_attendance_logs
       SET time_in = COALESCE(?, time_in),
           time_out = COALESCE(?, time_out),
           hours_rendered = ?,
           tasks_accomplished = COALESCE(?, tasks_accomplished),
           status = 'verified',
           verified_by = ?,
           verified_at = NOW(),
           updated_at = NOW()
       WHERE attendance_id = ?`,
      [time_in, time_out, newHours, tasks_accomplished, req.user.user_id, attendanceId]
    );

    const diff = att.status === 'verified' ? (newHours - prevHours) : newHours;
    if (diff !== 0) {
      await connection.query(
        'UPDATE ojt_records SET rendered_hours = GREATEST(0, rendered_hours + ?), updated_at = NOW() WHERE ojt_id = ?',
        [diff, att.ojt_id]
      );
      await connection.query(
        'UPDATE students SET completed_ojt_hours = GREATEST(0, completed_ojt_hours + ?), updated_at = NOW() WHERE student_id = ?',
        [diff, att.student_id]
      );
      // Auto-update OJT status when hours requirement is met
      await connection.query(
        `UPDATE students SET ojt_status = 'completed_ojt', status_id = 4, updated_at = NOW()
         WHERE student_id = ? AND ojt_status NOT IN ('graduated', 'completed_ojt', 'completed')
           AND required_ojt_hours > 0 AND completed_ojt_hours >= required_ojt_hours`,
        [att.student_id]
      );
    }

    await connection.commit();

    emitUpdate('attendance_verified', { ojt_id: att.ojt_id, student_id: att.student_id, organization_id: org.organization_id });

    return res.json({
      success: true,
      message: `Attendance log updated successfully (${newHours} hrs credited).`
    });
  } catch (err) {
    try { await connection.rollback(); } catch (_) {}
    console.error('Update attendance error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update attendance log.' });
  } finally {
    safeRelease();
  }
});

// GET /api/org/evaluations
router.get('/evaluations', async (req, res) => {
  try {
    const org = await getOrgId(req.user.user_id);
    if (!org) return res.status(404).json({ success: false, message: 'Org not found' });

    // Eligible interns: only completed required hours (rendered >= required) AND not yet evaluated
    const [interns] = await pool.query(
      `SELECT DISTINCT o.ojt_id, o.rendered_hours, o.required_hours, o.status as ojt_status,
              s.student_id, s.first_name, s.last_name, s.student_number, p.program_name,
              inst.institution_name
       FROM ojt_records o
       JOIN students s ON o.student_id = s.student_id
       LEFT JOIN programs p ON s.program_id = p.program_id
       LEFT JOIN institutions inst ON s.institution_id = inst.institution_id
       WHERE o.organization_id = ?
         AND (o.rendered_hours >= o.required_hours OR o.status = 'completed')
         AND o.ojt_id NOT IN (SELECT ojt_id FROM ojt_performance_records)
       ORDER BY s.last_name ASC, s.first_name ASC`,
      [org.organization_id]
    );

    // Finalized evaluations submitted by this organization
    const [evaluations] = await pool.query(
      `SELECT r.*, s.first_name, s.last_name, s.student_number, p.program_name,
              o.rendered_hours, o.required_hours, o.start_date, o.end_date,
              cert.certificate_code, cert.certificate_id
       FROM ojt_performance_records r
       JOIN ojt_records o ON r.ojt_id = o.ojt_id
       JOIN students s ON o.student_id = s.student_id
       LEFT JOIN programs p ON s.program_id = p.program_id
       LEFT JOIN ojt_certificates cert ON o.ojt_id = cert.ojt_id
       WHERE o.organization_id = ?
       ORDER BY r.evaluated_at DESC`,
      [org.organization_id]
    );

    return res.json({ success: true, data: { interns, evaluations } });
  } catch (error) {
    console.error('Fetch evaluations error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch evaluations.' });
  }
});

// POST /api/org/evaluations
router.post('/evaluations', async (req, res) => {
  const { ojt_id, student_id, evaluation_period, rating, comments, score_details } = req.body;

  if ((!ojt_id && !student_id) || !rating) {
    return res.status(400).json({ success: false, message: 'Intern selection and rating are required.' });
  }

  try {
    const org = await getOrgId(req.user.user_id);
    if (!org) return res.status(404).json({ success: false, message: 'Org not found' });

    let targetOjtId = ojt_id;
    if (!targetOjtId && student_id) {
      const [ojt] = await pool.query(
        'SELECT ojt_id FROM ojt_records WHERE student_id = ? AND organization_id = ? ORDER BY created_at DESC LIMIT 1',
        [student_id, org.organization_id]
      );
      if (ojt.length > 0) targetOjtId = ojt[0].ojt_id;
    }

    if (!targetOjtId) {
      return res.status(400).json({ success: false, message: 'Active OJT record not found for this intern.' });
    }

    // 1. Fetch OJT record and validate completion eligibility
    const [ojtRows] = await pool.query(
      'SELECT * FROM ojt_records WHERE ojt_id = ? AND organization_id = ?',
      [targetOjtId, org.organization_id]
    );
    if (!ojtRows.length) {
      return res.status(404).json({ success: false, message: 'OJT record not found for this organization.' });
    }

    const ojtRecord = ojtRows[0];
    const renHours = Number(ojtRecord.rendered_hours) || 0;
    const reqHours = Number(ojtRecord.required_hours) || 600;

    if (renHours < reqHours && ojtRecord.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: `Evaluation rejected: Intern has only rendered ${renHours} of ${reqHours} required hours. An organization can only evaluate a student after the student has completed their required OJT hours.`
      });
    }

    // 2. Strict One-Time Evaluation Rule: Cannot evaluate more than once or edit submitted evaluations
    const [prevEval] = await pool.query(
      'SELECT record_id FROM ojt_performance_records WHERE ojt_id = ?',
      [targetOjtId]
    );
    if (prevEval.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'An evaluation has already been submitted for this intern. Evaluations are permanently finalized and cannot be modified or re-submitted.'
      });
    }

    const scoreDetailsObj = score_details || {
      score_instructions: Number(req.body.score_instructions) || 5,
      score_appearance: Number(req.body.score_appearance) || 5,
      score_attitude: Number(req.body.score_attitude) || 5,
      score_interpersonal: Number(req.body.score_interpersonal) || 5,
      score_quality: Number(req.body.score_quality) || 5,
      score_motivation: Number(req.body.score_motivation) || 5,
      score_learning: Number(req.body.score_learning) || 5
    };
    const scoreDetailsJson = JSON.stringify(scoreDetailsObj);

    // Insert permanent evaluation record
    await pool.query(
      `INSERT INTO ojt_performance_records (ojt_id, evaluator_id, evaluation_period, rating, comments, score_details, evaluated_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [targetOjtId, req.user.user_id, evaluation_period || 'final', parseFloat(rating) || 5.0, comments || '', scoreDetailsJson]
    );

    // Ensure OJT status is marked completed
    await pool.query(
      'UPDATE ojt_records SET status = \'completed\', end_date = COALESCE(end_date, CURRENT_DATE), updated_at = NOW() WHERE ojt_id = ?',
      [targetOjtId]
    );

    emitUpdate('evaluation_submitted', { ojt_id: targetOjtId, organization_id: org.organization_id });

    // 3. Automatically trigger OJT Certificate Generation & Career Portfolio insertion
    let certResult = null;
    try {
      certResult = await checkAndGenerateCertificate(targetOjtId);
    } catch (certError) {
      console.error('Automatic certificate generation error:', certError);
    }

    return res.json({
      success: true,
      message: 'Performance Evaluation submitted and permanently finalized! Official OJT Certificate has been automatically generated.',
      certificate: certResult?.certificate || null
    });
  } catch (error) {
    console.error('Submit evaluation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit evaluation: ' + error.message });
  }
});

// GET /api/org/interviews
router.get('/interviews', async (req, res) => {
  try {
    const org = await getOrgId(req.user.user_id);
    if (!org) return res.status(404).json({ success: false, message: 'Org not found' });

    const [interviews] = await pool.query(
      `SELECT i.*, ja.student_id, ja.status as app_status,
              s.first_name, s.last_name, s.student_number, s.contact_number, u.email as student_email,
              jp.title as job_title, jp.job_id,
              inst.institution_name, p.program_name
       FROM interviews i
       JOIN job_applications ja ON i.application_id = ja.application_id
       JOIN job_postings jp ON ja.job_id = jp.job_id
       JOIN students s ON ja.student_id = s.student_id
       JOIN users u ON s.user_id = u.user_id
       LEFT JOIN institutions inst ON s.institution_id = inst.institution_id
       LEFT JOIN programs p ON s.program_id = p.program_id
       WHERE jp.organization_id = ?
       ORDER BY i.schedule_at ASC`,
      [org.organization_id]
    );

    const [candidates] = await pool.query(
      `SELECT ja.application_id, ja.student_id, s.first_name, s.last_name, jp.title as job_title
       FROM job_applications ja
       JOIN job_postings jp ON ja.job_id = jp.job_id
       JOIN students s ON ja.student_id = s.student_id
       WHERE jp.organization_id = ? AND (ja.status = 'shortlisted' OR ja.status = 'under_review' OR ja.status = 'submitted' OR ja.status = 'interview')`,
      [org.organization_id]
    );

    return res.json({ success: true, data: { interviews, candidates } });
  } catch (error) {
    console.error('Fetch interviews error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch interviews.' });
  }
});

// POST /api/org/interviews
router.post('/interviews', requireHROrAdmin, async (req, res) => {
  const { application_id, schedule_at, mode, location_or_link, notes } = req.body;

  if (!application_id || !schedule_at) {
    return res.status(400).json({ success: false, message: 'Application and schedule datetime are required.' });
  }

  try {
    const org = await getOrgId(req.user.user_id);
    if (!org) return res.status(404).json({ success: false, message: 'Org not found' });

    await pool.query(
      `INSERT INTO interviews (application_id, schedule_at, mode, location_or_link, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'scheduled', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [application_id, schedule_at, mode || 'online', location_or_link || 'Google Meet / Zoom', notes || '']
    );

    await pool.query(
      'UPDATE job_applications SET status = \'interview\' WHERE application_id = ?',
      [application_id]
    );

    emitUpdate('interview_updated', { application_id, organization_id: org.organization_id });

    return res.status(201).json({ success: true, message: 'Interview scheduled successfully!' });
  } catch (error) {
    console.error('Schedule interview error:', error);
    return res.status(500).json({ success: false, message: 'Failed to schedule interview.' });
  }
});

// PUT /api/org/interviews/:id
router.put('/interviews/:id', requireHROrAdmin, async (req, res) => {
  const { status, notes } = req.body;
  try {
    await pool.query(
      'UPDATE interviews SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE interview_id = ?',
      [status || 'completed', notes || '', req.params.id]
    );

    emitUpdate('interview_updated', { interview_id: req.params.id });

    return res.json({ success: true, message: 'Interview updated.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update interview.' });
  }
});

// GET /api/org/offers
router.get('/offers', async (req, res) => {
  try {
    const org = await getOrgId(req.user.user_id);
    if (!org) return res.status(404).json({ success: false, message: 'Org not found' });

    // 1. Formal Job & Internship Offers (job_offers PLUS accepted/hired/offered applications and active OJT deployments)
    const [jobOffers] = await pool.query(
      `SELECT 
         COALESCE(jo.offer_id, CONCAT('app-', ja.application_id)) as offer_id,
         ja.application_id,
         COALESCE(jo.status, ja.status) as status,
         COALESCE(jo.offered_at, ja.accepted_at, ja.applied_at, ja.created_at) as offered_at,
         COALESCE(jo.responded_at, ja.accepted_at) as responded_at,
         ja.student_id,
         s.first_name,
         s.last_name,
         s.student_number,
         jp.title as job_title,
         jp.posting_type,
         jp.job_type
       FROM job_applications ja
       JOIN job_postings jp ON ja.job_id = jp.job_id
       JOIN students s ON ja.student_id = s.student_id
       LEFT JOIN job_offers jo ON ja.application_id = jo.application_id
       WHERE jp.organization_id = ?
         AND (jo.offer_id IS NOT NULL OR ja.status IN ('offered', 'accepted', 'hired', 'completed'))

       UNION

       SELECT 
         CONCAT('ojt-', o.ojt_id) as offer_id,
         NULL as application_id,
         CASE 
           WHEN o.status = 'ongoing' THEN 'accepted'
           WHEN o.status = 'completed' THEN 'completed'
           ELSE o.status 
         END as status,
         COALESCE(o.start_date, o.created_at) as offered_at,
         NULL as responded_at,
         o.student_id,
         s.first_name,
         s.last_name,
         s.student_number,
         COALESCE(p.program_name, 'Internship Placement') as job_title,
         'ojt' as posting_type,
         'internship' as job_type
       FROM ojt_records o
       JOIN students s ON o.student_id = s.student_id
       LEFT JOIN programs p ON o.program_id = p.program_id
       WHERE o.organization_id = ?
         AND o.student_id NOT IN (
           SELECT ja2.student_id 
           FROM job_applications ja2 
           JOIN job_postings jp2 ON ja2.job_id = jp2.job_id 
           WHERE jp2.organization_id = ? AND ja2.status IN ('offered', 'accepted', 'hired', 'completed')
         )
       ORDER BY offered_at DESC`,
      [org.organization_id, org.organization_id, org.organization_id]
    );

    // 2. Direct OJT Deployment Offers (ojt_deployment_offers PLUS active ojt_records)
    const [deploymentOffers] = await pool.query(
      `SELECT 
         odo.offer_id,
         odo.student_id,
         odo.organization_id,
         odo.job_id,
         odo.status,
         odo.offered_at,
         s.first_name,
         s.last_name,
         s.student_number,
         COALESCE(jp.title, 'OJT Placement Contract') as job_title
       FROM ojt_deployment_offers odo
       JOIN students s ON odo.student_id = s.student_id
       LEFT JOIN job_postings jp ON odo.job_id = jp.job_id
       WHERE odo.organization_id = ?

       UNION ALL

       SELECT 
         CONCAT('ojt-', o.ojt_id) as offer_id,
         o.student_id,
         o.organization_id,
         NULL as job_id,
         CASE 
           WHEN o.status = 'ongoing' THEN 'accepted'
           WHEN o.status = 'completed' THEN 'completed'
           ELSE o.status 
         END as status,
         COALESCE(o.start_date, o.created_at) as offered_at,
         s.first_name,
         s.last_name,
         s.student_number,
         COALESCE(p.program_name, 'Active OJT Deployment Contract') as job_title
       FROM ojt_records o
       JOIN students s ON o.student_id = s.student_id
       LEFT JOIN programs p ON o.program_id = p.program_id
       WHERE o.organization_id = ?
         AND o.student_id NOT IN (
           SELECT student_id FROM ojt_deployment_offers WHERE organization_id = ?
         )
       ORDER BY offered_at DESC`,
      [org.organization_id, org.organization_id, org.organization_id]
    );

    return res.json({
      success: true,
      data: {
        jobOffers,
        deploymentOffers
      }
    });
  } catch (error) {
    console.error('Fetch offers error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch offers.' });
  }
});

// POST /api/org/offers
router.post('/offers', requireHROrAdmin, async (req, res) => {
  const { application_id } = req.body;
  if (!application_id) return res.status(400).json({ success: false, message: 'Application ID is required.' });

  const connection = await pool.getConnection();
  let released = false;
  const safeRelease = () => {
    if (!released) {
      released = true;
      try { connection.release(); } catch (_) {}
    }
  };
  try {
    await connection.beginTransaction();

    const org = await getOrgId(req.user.user_id);
    if (!org) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Org not found' });
    }

    // Fetch the application and job posting details
    const [apps] = await connection.query(
      `SELECT ja.*, jp.posting_type, jp.job_type
       FROM job_applications ja
       JOIN job_postings jp ON ja.job_id = jp.job_id
       WHERE ja.application_id = ?`,
      [application_id]
    );

    if (apps.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const app = apps[0];
    const postingType = (app.posting_type || app.job_type || 'ojt').toLowerCase();
    const isOjt = postingType === 'ojt' || postingType === 'internship';
    const isOnCall = postingType === 'on_call';

    if (isOjt || isOnCall) {
      // Insert into ojt_deployment_offers
      await connection.query(
        `INSERT INTO ojt_deployment_offers (student_id, organization_id, job_id, status, offered_by, offered_at, created_at, updated_at)
         VALUES (?, ?, ?, 'offered', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [app.student_id, org.organization_id, app.job_id, req.user.user_id]
      );
    } else {
      // Insert into job_offers
      await connection.query(
        `INSERT INTO job_offers (application_id, status, offered_at, created_at, updated_at)
         VALUES (?, 'offered', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [application_id]
      );
    }

    // Update the application status
    await connection.query(
      'UPDATE job_applications SET status = \'offered\' WHERE application_id = ?',
      [application_id]
    );

    await connection.commit();

    emitUpdate('offer_updated', { application_id, organization_id: org.organization_id });

    return res.status(201).json({ success: true, message: 'Official Job/OJT Offer issued to candidate!' });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (_) {}
    }
    console.error('Issue offer error:', error);
    return res.status(500).json({ success: false, message: 'Failed to issue offer.' });
  } finally {
    safeRelease();
  }
});

// GET /api/org/mentors
router.get('/mentors', async (req, res) => {
  try {
    const org = await getOrgId(req.user.user_id);
    if (!org) return res.status(404).json({ success: false, message: 'Org not found' });

    const [allMentors] = await pool.query(
      `SELECT os.*, u.email, u.is_active, u.last_login_at,
              er.status as reg_status, er.rejection_reason as reg_rejection_reason,
              ac.code_id as passcode_id,
              ac.code_hash as passcode_code,
              ac.target_identifier as passcode_target_identifier,
              ac.intended_department as passcode_intended_department,
              ac.intended_position as passcode_intended_position,
              (SELECT COUNT(*) FROM ojt_records o WHERE o.organization_id = os.organization_id AND o.status = 'ongoing') as active_interns_count
       FROM organization_staff os
       JOIN users u ON os.user_id = u.user_id
       LEFT JOIN entity_registrations er ON er.entity_type = 'workplace_mentor' AND (er.entity_id = os.org_staff_id OR er.user_id = os.user_id)
       LEFT JOIN access_codes ac ON (ac.code_hash = os.passcode_used OR ac.used_by_user_id = os.user_id)
       WHERE os.organization_id = ? AND (os.position = 'workplace_mentor' OR os.position = 'mentor')
       ORDER BY os.created_at DESC`,
      [org.organization_id]
    );

    const [codes] = await pool.query(
      `SELECT ac.*, u.email as used_by_email,
              os.first_name as used_by_first_name, os.last_name as used_by_last_name
       FROM access_codes ac
       LEFT JOIN users u ON ac.used_by_user_id = u.user_id
       LEFT JOIN organization_staff os ON ac.used_by_user_id = os.user_id
       WHERE ac.organization_id = ? AND ac.recipient_type = 'workplace_mentor'
       ORDER BY ac.created_at DESC`,
      [org.organization_id]
    );

    const mappedMentors = allMentors.map(m => {
      const targetId = (m.passcode_target_identifier || '').trim().toLowerCase();
      const mentorEmail = (m.email || '').trim().toLowerCase();
      const mentorEmpId = (m.staff_number || '').trim().toLowerCase();
      const intendedDept = (m.passcode_intended_department || '').trim().toLowerCase();
      const mentorDept = (m.department || '').trim().toLowerCase();

      let employee_id_mismatch = false;
      let email_mismatch = false;
      let identifier_mismatch = false;

      if (targetId) {
        if (targetId.includes('@')) {
          if (targetId !== mentorEmail) {
            email_mismatch = true;
            identifier_mismatch = true;
          }
        } else {
          if (targetId !== mentorEmpId) {
            employee_id_mismatch = true;
            identifier_mismatch = true;
          }
        }
      }

      let department_mismatch = false;
      if (intendedDept && mentorDept && intendedDept !== mentorDept) {
        department_mismatch = true;
      }

      const has_discrepancy = identifier_mismatch || employee_id_mismatch || email_mismatch || department_mismatch;

      return {
        ...m,
        employee_id_mismatch,
        email_mismatch,
        identifier_mismatch,
        department_mismatch,
        has_discrepancy
      };
    });

    const pendingMentors = mappedMentors.filter(m => m.is_verified === 0 && m.reg_status !== 'rejected');
    const verifiedMentors = mappedMentors.filter(m => m.is_verified === 1);
    const rejectedMentors = mappedMentors.filter(m => m.reg_status === 'rejected' || (!m.is_verified && m.rejection_reason));

    return res.json({
      success: true,
      data: verifiedMentors,
      mentors: verifiedMentors,
      pendingMentors,
      verifiedMentors,
      rejectedMentors,
      accessCodes: codes
    });
  } catch (error) {
    console.error('Fetch mentors error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch workplace mentors.' });
  }
});

// POST /api/org/mentors/access-code
router.post('/mentors/access-code', requireHROrAdmin, async (req, res) => {
  const { target_identifier, intended_position, department } = req.body;

  if (!target_identifier || !target_identifier.trim()) {
    return res.status(400).json({ success: false, message: 'Mentor identifier (employee ID or email) is required.' });
  }

  const cleanIdentifier = target_identifier.trim();
  const isEmail = cleanIdentifier.includes('@');
  let normalizedEmailVal = null;

  if (isEmail) {
    if (!isValidEmail(cleanIdentifier)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address, like name@university.edu.ph.' });
    }
    normalizedEmailVal = normalizeEmail(cleanIdentifier);
  }

  const cleanTarget = normalizedEmailVal || cleanIdentifier;
  const cleanLower = cleanTarget.toLowerCase();

  try {
    const org = await getOrgId(req.user.user_id);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    // 1. Check for existing active, unused passcode with this identifier
    const [existingCodes] = await pool.query(
      `SELECT code_hash, target_identifier, expires_at 
       FROM access_codes 
       WHERE organization_id = ? 
         AND recipient_type = 'workplace_mentor' 
         AND is_used = 0 
         AND expires_at > NOW() 
         AND (LOWER(TRIM(target_identifier)) = ? OR (intended_email IS NOT NULL AND LOWER(TRIM(intended_email)) = ?))`,
      [org.organization_id, cleanLower, cleanLower]
    );

    if (existingCodes.length > 0) {
      return res.status(409).json({
        success: false,
        message: `An active, unused mentor passcode [${existingCodes[0].code_hash}] has already been generated for this ${isEmail ? 'email' : 'Employee ID'} (${cleanTarget}). Please share or use the existing passcode.`
      });
    }

    // 2. Check for already registered mentor in this organization
    const [existingMentors] = await pool.query(
      `SELECT os.org_staff_id, os.first_name, os.last_name, os.staff_number, os.is_verified, u.email
       FROM organization_staff os
       JOIN users u ON os.user_id = u.user_id
       WHERE os.organization_id = ? 
         AND (LOWER(TRIM(os.staff_number)) = ? OR LOWER(TRIM(u.email)) = ?)`,
      [org.organization_id, cleanLower, cleanLower]
    );

    if (existingMentors.length > 0) {
      const m = existingMentors[0];
      const statusText = m.is_verified
        ? 'is already verified and active in your organization'
        : 'has already registered and is awaiting verification in your Pending tab';
      return res.status(409).json({
        success: false,
        message: `Workplace mentor "${m.first_name} ${m.last_name}" with this ${isEmail ? 'email' : 'Employee ID'} (${cleanTarget}) ${statusText}.`
      });
    }

    // 3. If identifier is an email, check if it's already used by an existing user account
    if (isEmail) {
      const [existingUsers] = await pool.query(
        'SELECT user_id, email FROM users WHERE LOWER(TRIM(email)) = ?',
        [cleanLower]
      );
      if (existingUsers.length > 0) {
        return res.status(409).json({
          success: false,
          message: `A user account with email "${cleanTarget}" already exists on the platform. Please use another email or their employee ID.`
        });
      }
    }

    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    const codeRaw = `WM-${rand}`;

    await pool.query(
      `INSERT INTO access_codes (
        code_hash, recipient_type, organization_id, target_identifier,
        intended_position, intended_department, intended_email, created_by, expires_at
      ) VALUES (?, 'workplace_mentor', ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 14 DAY))`,
      [
        codeRaw,
        org.organization_id,
        cleanTarget,
        intended_position || 'workplace_mentor',
        department ? department.trim() : null,
        normalizedEmailVal,
        req.user.user_id
      ]
    );

    emitUpdate('access_code_generated', { organization_id: org.organization_id, type: 'workplace_mentor' });

    return res.status(201).json({
      success: true,
      message: 'Access code generated for Workplace Mentor!',
      data: {
        access_code: codeRaw,
        target_identifier: cleanIdentifier,
        department: department ? department.trim() : null,
        organization_name: org.organization_name || 'Organization Partner',
        expires_in: '14 days'
      }
    });
  } catch (error) {
    console.error('Generate mentor code error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate access code.' });
  }
});

// PUT /api/org/mentors/:id/verify
router.put('/mentors/:id/verify', requireHROrAdmin, async (req, res) => {
  const staffId = req.params.id;
  const { action, rejection_reason } = req.body;

  const connection = await pool.getConnection();
  let released = false;
  const safeRelease = () => {
    if (!released) {
      released = true;
      try { connection.release(); } catch (_) {}
    }
  };
  try {
    await connection.beginTransaction();

    const org = await getOrgId(req.user.user_id);
    if (!org) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Org not found' });
    }

    const [staffRows] = await connection.query(
      'SELECT * FROM organization_staff WHERE org_staff_id = ? AND organization_id = ?',
      [staffId, org.organization_id]
    );

    if (staffRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Mentor record not found.' });
    }

    const staff = staffRows[0];
    const mentorUserId = staff.user_id;

    if (action === 'approve') {
      await connection.query(
        'UPDATE organization_staff SET is_verified = 1, rejection_reason = NULL, updated_at = NOW() WHERE org_staff_id = ?',
        [staffId]
      );
      await connection.query(
        'UPDATE users SET is_verified = 1, is_active = 1 WHERE user_id = ?',
        [mentorUserId]
      );
      await connection.query(
        `UPDATE entity_registrations 
         SET status = 'verified', reviewed_at = NOW(), reviewer_user_id = ? 
         WHERE entity_type = 'workplace_mentor' AND (entity_id = ? OR user_id = ?)`,
        [req.user.user_id, staffId, mentorUserId]
      );

      await connection.commit();

      emitUpdate('mentor_verified', { organization_id: org.organization_id, staff_id: staffId, action: 'approve' });

      return res.json({
        success: true,
        message: `Workplace Mentor ${staff.first_name} ${staff.last_name} has been successfully verified and activated!`
      });
    } else {
      // Automatic complete deletion upon rejection of workplace mentor registration
      await connection.query(
        `DELETE FROM entity_registrations 
         WHERE entity_type = 'workplace_mentor' AND (entity_id = ? OR user_id = ?)`,
        [staffId, mentorUserId]
      );
      // Reset access code so it can be reissued/reused if needed
      await connection.query(
        'UPDATE access_codes SET is_used = 0, used_by_user_id = NULL, used_at = NULL WHERE used_by_user_id = ?',
        [mentorUserId]
      );
      await connection.query(
        'DELETE FROM organization_staff WHERE org_staff_id = ?',
        [staffId]
      );
      await connection.query(
        'DELETE FROM users WHERE user_id = ?',
        [mentorUserId]
      );

      await connection.commit();

      emitUpdate('mentor_verified', { organization_id: org.organization_id, staff_id: staffId, action: 'reject', deleted: true });

      return res.json({
        success: true,
        message: `Workplace Mentor registration for ${staff.first_name} ${staff.last_name} has been rejected and deleted automatically.`
      });
    }
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    console.error('Verify mentor error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify workplace mentor: ' + error.message });
  } finally {
    safeRelease();
  }
});

// Shared handler for incident reports & student grievances
const getOrgGrievancesHandler = async (req, res) => {
  try {
    const org = await getOrgId(req.user.user_id);
    if (!org) return res.status(404).json({ success: false, message: 'Organization profile not found.' });

    // 1. Check complaints table schema safely to prevent 500 on unmigrated deployments
    let hasIncidentCategory = false;
    let hasEvidenceUrl = false;
    try {
      const [compCols] = await pool.query('DESCRIBE complaints');
      const compColNames = compCols.map(c => c.Field);
      hasIncidentCategory = compColNames.includes('incident_category');
      hasEvidenceUrl = compColNames.includes('evidence_url');
    } catch (_) {}

    const incCatSelect = hasIncidentCategory 
      ? 'COALESCE(c.incident_category, cc.category_name) as category_name, c.incident_category,' 
      : 'cc.category_name, NULL as incident_category,';
    const evUrlSelect = hasEvidenceUrl ? 'c.evidence_url,' : 'NULL as evidence_url,';

    // Complaints filed by this Organization about interns
    const [filedComplaints] = await pool.query(
      `SELECT c.*, 
              ${incCatSelect}
              ${evUrlSelect}
              s.first_name, s.last_name, s.student_number, s.institution_id,
              CONCAT(s.first_name, ' ', s.last_name) as student_name,
              p.program_name as course,
              c.subject as title,
              i.institution_name,
              ar.accident_id, ar.incident_datetime, ar.location as accident_location,
              ar.severity as accident_severity, ar.injury_description, ar.medical_attention_given,
              ar.witnesses, ar.immediate_action_taken, ar.preventive_measures
       FROM complaints c
       LEFT JOIN complaint_categories cc ON c.category_id = cc.category_id
       JOIN students s ON c.student_id = s.student_id
       LEFT JOIN programs p ON s.program_id = p.program_id
       LEFT JOIN institutions i ON s.institution_id = i.institution_id
       LEFT JOIN accident_reports ar ON c.complaint_id = ar.complaint_id
       WHERE c.organization_id = ? AND c.complainant_type = 'organization'
       ORDER BY c.filed_at DESC`,
      [org.organization_id]
    );

    // Sanitize any legacy mismatches where an organization filing was assigned an allowance category
    const sanitizedFiledComplaints = filedComplaints.map(c => {
      const isAcc = Boolean(c.is_accident || c.accident_id || c.accident_severity);
      let cat = c.incident_category || c.category_name;
      if (isAcc) {
        if (!cat || cat.toLowerCase().includes('allowance') || cat.toLowerCase().includes('stipend') || cat === 'misconduct' || cat.toLowerCase().includes('general misconduct')) {
          const text = `${c.title || ''} ${c.subject || ''} ${c.injury_description || ''} ${c.description || ''}`.toLowerCase();
          if (text.includes('slip') || text.includes('fall') || text.includes('trip')) cat = 'Slip, Trip or Fall Incident';
          else if (text.includes('machine') || text.includes('equipment')) cat = 'Machinery / Equipment Hazard';
          else if (text.includes('chemical') || text.includes('fume') || text.includes('hazard')) cat = 'Chemical / Hazardous Substance Exposure';
          else if (text.includes('strain') || text.includes('lift') || text.includes('ergonomic')) cat = 'Physical Strain / Ergonomic Injury';
          else if (text.includes('emergency') || text.includes('faint') || text.includes('trauma')) cat = 'Medical Emergency / Acute Physical Trauma';
          else cat = 'Workplace Accident & Physical Injury';
        }
      } else {
        if (!cat || cat.toLowerCase().includes('allowance') || cat.toLowerCase().includes('stipend')) {
          const text = `${c.title || ''} ${c.subject || ''} ${c.description || ''}`.toLowerCase();
          if (text.includes('server') || text.includes('damage') || text.includes('property')) {
            cat = 'Company Property Damage / Negligence';
          } else if (text.includes('absent') || text.includes('late') || text.includes('tardy') || text.includes('attendance')) {
            cat = 'Chronic Absenteeism / Unauthorized Tardiness';
          } else if (text.includes('safety') || text.includes('protocol') || text.includes('ppe')) {
            cat = 'Safety Protocol Violation';
          } else {
            cat = 'General Misconduct / Unprofessional Behavior';
          }
        }
      }
      return {
        ...c,
        category_name: cat,
        incident_category: cat
      };
    });

    // 2. Grievances forwarded by Institutions to this Organization
    const [forwardedNotices] = await pool.query(
      `SELECT c.complaint_id, c.subject, c.subject as title, c.description, c.org_notice_summary, c.forwarded_to_org_at,
              c.include_student_details, c.status, c.filed_at,
              cc.category_name,
              i.institution_name,
              CASE WHEN c.include_student_details = 1 THEN CONCAT(s.first_name, ' ', s.last_name) ELSE 'Student Intern' END as student_name,
              CASE WHEN c.include_student_details = 1 THEN s.first_name ELSE 'Student Intern' END as first_name,
              CASE WHEN c.include_student_details = 1 THEN s.last_name ELSE '(Identity Protected by Institution)' END as last_name,
              CASE WHEN c.include_student_details = 1 THEN s.student_number ELSE NULL END as student_number
       FROM complaints c
       JOIN complaint_categories cc ON c.category_id = cc.category_id
       JOIN students s ON c.student_id = s.student_id
       LEFT JOIN institutions i ON s.institution_id = i.institution_id
       WHERE c.organization_id = ? AND c.forwarded_to_org = 1
       ORDER BY c.forwarded_to_org_at DESC`,
      [org.organization_id]
    );

    // 3. Deployed interns eligible for filing incident complaints (from ojt_records, ojt_deployment_offers, and job_applications)
    const [deployedStudents] = await pool.query(
      `SELECT DISTINCT s.student_id, s.first_name, s.last_name,
              CONCAT(s.first_name, ' ', s.last_name) as student_name,
              s.student_number,
              s.institution_id, i.institution_name, p.program_name,
              COALESCE(p.program_name, 'Intern') as course
       FROM students s
       LEFT JOIN institutions i ON s.institution_id = i.institution_id
       LEFT JOIN programs p ON s.program_id = p.program_id
       WHERE s.student_id IN (
         SELECT student_id FROM ojt_records WHERE organization_id = ?
         UNION
         SELECT student_id FROM ojt_deployment_offers WHERE organization_id = ? AND status IN ('accepted', 'deployed', 'active')
         UNION
         SELECT ja.student_id FROM job_applications ja 
         JOIN job_postings jp ON ja.job_id = jp.job_id 
         WHERE jp.organization_id = ? AND ja.status IN ('accepted', 'hired', 'offered', 'deployed')
       )
       ORDER BY s.last_name ASC`,
      [org.organization_id, org.organization_id, org.organization_id]
    );

    const [categories] = await pool.query('SELECT * FROM complaint_categories ORDER BY category_name ASC');

    return res.json({
      success: true,
      data: {
        filedComplaints: sanitizedFiledComplaints,
        forwardedNotices,
        forwardedGrievances: forwardedNotices,
        deployedStudents,
        deployedInterns: deployedStudents,
        categories
      }
    });
  } catch (error) {
    console.error('Fetch org grievances error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch incident reports and grievances.' });
  }
};

// GET /api/org/grievances - Incident Reports & Student Grievances for Organization dashboard
router.get('/grievances', getOrgGrievancesHandler);

// GET /api/org/compliance - Alias for compliance audits
router.get('/compliance', getOrgGrievancesHandler);

// Category mapping dictionaries for Conduct and Accident reports
const CONDUCT_CATEGORY_MAP = {
  misconduct: 'General Misconduct / Unprofessional Behavior',
  attendance: 'Chronic Absenteeism / Unauthorized Tardiness',
  safety_violation: 'Safety Protocol Violation',
  property_damage: 'Company Property Damage / Negligence',
  academic_integrity: 'Breach of NDA / Data Confidentiality',
  harassment: 'Interpersonal Conflict / Harassment',
  other: 'Other Workplace Concern'
};

const ACCIDENT_CATEGORY_MAP = {
  workplace_accident: 'Workplace Accident & Physical Injury',
  slip_fall: 'Slip, Trip or Fall Incident',
  machinery_equipment: 'Machinery / Equipment Hazard',
  chemical_hazardous: 'Chemical / Hazardous Exposure',
  physical_strain: 'Physical Strain / Ergonomic Injury',
  medical_emergency: 'Medical Emergency / Acute Physical Trauma',
  other_accident: 'Other Workplace Safety Incident'
};

// POST /api/org/complaints - Workplace Mentor / HR filing intern complaint or accident report
router.post('/complaints', async (req, res) => {
  const {
    student_id,
    category_id,
    category,
    subject: rawSubject,
    title,
    description,
    evidence_url,
    job_id,
    is_accident,
    accident_details: rawAccidentDetails,
    accident_severity,
    incident_date,
    incident_location,
    injuries_sustained,
    medical_attention_required,
    witnesses,
    emergency_actions_taken,
    preventive_measures
  } = req.body;

  const subject = rawSubject || title;

  if (!student_id || !subject || !description) {
    return res.status(400).json({ success: false, message: 'Student selection, subject, and description are required.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const org = await getOrgId(req.user.user_id);
    if (!org) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Organization profile not found.' });
    }

    // Verify student and retrieve student's institution
    const [studentRows] = await connection.query(
      'SELECT student_id, first_name, last_name, institution_id FROM students WHERE student_id = ?',
      [student_id]
    );
    if (studentRows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Selected student not found.' });
    }
    const student = studentRows[0];

    const isAccidentFlag = Boolean(is_accident);

    // Resolve target human-readable category name
    let targetCategoryName = '';
    if (isAccidentFlag) {
      targetCategoryName = ACCIDENT_CATEGORY_MAP[category] || CONDUCT_CATEGORY_MAP[category] || category || 'Workplace Accident & Physical Injury';
    } else {
      targetCategoryName = CONDUCT_CATEGORY_MAP[category] || ACCIDENT_CATEGORY_MAP[category] || category || 'General Misconduct / Unprofessional Behavior';
    }

    let catId = category_id;
    if (!catId) {
      const [matchedCats] = await connection.query(
        'SELECT category_id FROM complaint_categories WHERE category_name = ? LIMIT 1',
        [targetCategoryName]
      );
      if (matchedCats.length > 0) {
        catId = matchedCats[0].category_id;
      } else {
        const [insertCat] = await connection.query(
          'INSERT INTO complaint_categories (category_name, description) VALUES (?, ?)',
          [targetCategoryName, isAccidentFlag ? 'Workplace health, safety and physical injury report' : 'Intern conduct and workplace behavioral report']
        );
        catId = insertCat.insertId;
      }
    }

    // Sanitize severity to strictly match allowed ENUM values in accident_reports
    const sanitizeSeverity = (val) => {
      if (!val || typeof val !== 'string') return 'moderate';
      const s = val.toLowerCase().trim();
      if (['minor', 'moderate', 'severe', 'critical', 'fatal'].includes(s)) return s;
      if (s === 'low') return 'minor';
      if (s === 'medium') return 'moderate';
      if (s === 'high') return 'severe';
      if (s === 'catastrophic' || s === 'life_threatening') return 'critical';
      return 'moderate';
    };

    // Build accident details if accident flag is active
    let accident_details = rawAccidentDetails;
    if (isAccidentFlag && !accident_details) {
      accident_details = {
        incident_datetime: incident_date ? new Date(incident_date) : new Date(),
        location: incident_location,
        severity: sanitizeSeverity(accident_severity),
        injury_description: injuries_sustained,
        medical_attention_given: medical_attention_required ? 'Medical attention was required' : 'No external medical attention required',
        witnesses: witnesses || '',
        immediate_action_taken: emergency_actions_taken || '',
        preventive_measures: preventive_measures || ''
      };
    }

    // Pre-validate accident report details before creating complaint record
    if (isAccidentFlag) {
      if (!accident_details || !accident_details.location || !accident_details.injury_description) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: 'Location and injury description are required for an official Accident Report.'
        });
      }
    }

    const [resRow] = await connection.query(
      `INSERT INTO complaints (
         student_id, organization_id, category_id, incident_category, job_id, subject, description,
         evidence_url, complainant_type, is_accident, status, filed_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'organization', ?, 'submitted', NOW(), NOW(), NOW())`,
      [student_id, org.organization_id, catId, targetCategoryName, job_id || null, subject, description, evidence_url || null, isAccidentFlag ? 1 : 0]
    );

    const complaintId = resRow.insertId;

    // Save evidence link into complaint_evidence if provided
    if (evidence_url && evidence_url.trim()) {
      try {
        await connection.query(
          `INSERT INTO complaint_evidence (complaint_id, file_path, description, uploaded_at, created_at, updated_at)
           VALUES (?, ?, 'Supporting evidence or incident report link', NOW(), NOW(), NOW())`,
          [complaintId, evidence_url.trim()]
        );
      } catch (evErr) {
        console.warn('Failed to insert into complaint_evidence:', evErr.message);
      }
    }

    // If marked as accident, insert into accident_reports
    if (isAccidentFlag && accident_details) {
      const {
        incident_datetime,
        location,
        severity,
        injury_description,
        medical_attention_given,
        witnesses: accWitnesses,
        immediate_action_taken,
        preventive_measures: accPreventive
      } = accident_details;

      const rawDt = incident_datetime || incident_date;
      const parsedDt = rawDt ? new Date(rawDt) : new Date();
      const validIncidentDate = (!isNaN(parsedDt.getTime())) ? parsedDt : new Date();

      await connection.query(
        `INSERT INTO accident_reports (
           complaint_id, organization_id, student_id, incident_datetime, location,
           severity, injury_description, medical_attention_given, witnesses,
           immediate_action_taken, preventive_measures, reported_by, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          complaintId,
          org.organization_id,
          student_id,
          validIncidentDate,
          location,
          sanitizeSeverity(severity),
          injury_description,
          medical_attention_given || '',
          accWitnesses !== undefined ? accWitnesses : (witnesses || ''),
          immediate_action_taken || '',
          accPreventive !== undefined ? accPreventive : (preventive_measures || ''),
          req.user.user_id
        ]
      );
    }

    // Audit log
    await connection.query(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, created_at) VALUES (?, \'org_complaint_filed\', \'complaints\', ?, CURRENT_TIMESTAMP)',
      [req.user.user_id, complaintId]
    );

    await connection.commit();
    connection.release();

    // Resolve target institution ID with fallbacks if not directly on student row
    let targetInstitutionId = student.institution_id;
    if (!targetInstitutionId) {
      const [prog] = await connection.query(
        'SELECT p.institution_id FROM students s JOIN programs p ON s.program_id = p.program_id WHERE s.student_id = ?',
        [student_id]
      );
      if (prog.length > 0 && prog[0].institution_id) {
        targetInstitutionId = prog[0].institution_id;
      }
    }
    if (!targetInstitutionId) {
      const [directStu] = await connection.query(
        'SELECT institution_id FROM students WHERE student_id = ? AND institution_id IS NOT NULL LIMIT 1',
        [student_id]
      );
      if (directStu.length > 0 && directStu[0].institution_id) {
        targetInstitutionId = directStu[0].institution_id;
      }
    }

    // Step 4 Privacy Enforcement: Misconduct / incident report goes directly to the student's Academic Institution.
    // Query all institution user accounts: primary institution accounts/registrants, and all staff/coordinators.
    let instRecipients = [];
    if (targetInstitutionId) {
      const studentProgId = student.program_id || null;
      const [recipients] = await pool.query(
        `SELECT DISTINCT user_id FROM (
           SELECT isf.user_id FROM institution_staff isf 
           WHERE isf.institution_id = ? 
             AND isf.user_id IS NOT NULL
             AND (
               isf.position IN ('ojt_supervisor', 'ojt_coordinator', 'dean', 'Internship Practicum Supervisor', 'College OJT Coordinator')
               OR JSON_UNQUOTE(JSON_EXTRACT(isf.permissions, '$.can_manage_ojt_records')) = 'true'
               OR isf.permissions LIKE '%"can_manage_ojt_records":true%'
             )
             AND (isf.position != 'registrar' OR JSON_UNQUOTE(JSON_EXTRACT(isf.permissions, '$.can_manage_ojt_records')) = 'true')
             AND (isf.program_id IS NULL OR ? IS NULL OR isf.program_id = ?)
           UNION
           SELECT ireg.submitted_by as user_id FROM institution_registrations ireg WHERE ireg.institution_id = ? AND ireg.submitted_by IS NOT NULL
           UNION
           SELECT u.user_id FROM users u JOIN institutions i ON i.contact_email = u.email WHERE i.institution_id = ? AND u.user_id IS NOT NULL
         ) as all_inst_users`,
        [targetInstitutionId, studentProgId, studentProgId, targetInstitutionId, targetInstitutionId]
      );
      instRecipients = recipients;
    }

    const titleText = isAccidentFlag
      ? 'Urgent Accident Report: Student Intern'
      : 'Student Misconduct Report Filed';
    const messageText = `${org.organization_name} reported an incident concerning student ${student.first_name} ${student.last_name}: "${subject}".`;

    for (const recipient of instRecipients) {
      if (recipient.user_id) {
        await sendNotification({
          userId: recipient.user_id,
          senderId: req.user.user_id,
          senderName: org.organization_name,
          title: titleText,
          message: messageText,
          type: 'complaint',
          link: isAccidentFlag
            ? '/dashboard/institution/monitoring?tab=accidentReports'
            : '/dashboard/institution/monitoring?tab=employerComplaints',
          relatedType: isAccidentFlag ? 'accident_report' : 'complaint',
          relatedId: complaintId,
          meta: {
            institution_id: targetInstitutionId,
            complaint_id: complaintId
          }
        });
      }
    }

    emitUpdate('complaint_updated', {
      complaint_id: complaintId,
      organization_id: org.organization_id,
      student_id,
      institution_id: targetInstitutionId
    });

    return res.status(201).json({
      success: true,
      message: isAccidentFlag
        ? 'Accident report and misconduct complaint submitted to the Institution OJT Supervisor for priority review.'
        : 'Student incident complaint submitted to the Institution OJT Supervisor for review.'
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Submit org complaint error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit complaint: ' + error.message });
  }
});

export default router;
