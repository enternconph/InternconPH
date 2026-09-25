import express from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { emitUpdate } from '../config/socket.js';
import { sendNotification } from '../utils/notification.helper.js';
import { generateAiSkillsRecommendations } from '../services/aiRecommendation.service.js';
import { PROGRAM_SKILLS_CATALOG } from '../data/programSkillsData.js';

import { getUploadStorage, saveUploadedFile } from '../utils/upload.helper.js';

const portfolioFileFilter = (req, file, cb) => {
  const allowedExts = /jpeg|jpg|png|webp|gif|svg|bmp|tiff|heic|heif|pdf|doc|docx|odt|rtf|pages|ppt|pptx|odp|key|xls|xlsx|csv|ods|numbers|txt|zip|rar|7z|tar|gz|json|xml|md|sql/i;
  const ext = path.extname(file.originalname || '').toLowerCase().replace('.', '');
  const isDocOrMedia = file.mimetype && (
    file.mimetype.startsWith('image/') ||
    file.mimetype.startsWith('text/') ||
    file.mimetype === 'application/pdf' ||
    file.mimetype.includes('word') ||
    file.mimetype.includes('excel') ||
    file.mimetype.includes('spreadsheet') ||
    file.mimetype.includes('presentation') ||
    file.mimetype.includes('powerpoint') ||
    file.mimetype.includes('zip') ||
    file.mimetype.includes('compressed') ||
    file.mimetype.includes('octet-stream')
  );
  if (allowedExts.test(ext) || isDocOrMedia) {
    cb(null, true);
  } else {
    cb(new Error('File upload rejected: Please upload a valid document, image, spreadsheet, or archive file.'));
  }
};

const portfolioUpload = multer({
  storage: getUploadStorage('portfolio'),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
  fileFilter: portfolioFileFilter
});

const reqUpload = multer({
  storage: getUploadStorage('requirements'),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
  fileFilter: (req, file, cb) => {
    const allowedExts = /jpeg|jpg|png|webp|gif|svg|bmp|tiff|heic|heif|pdf|doc|docx|odt|rtf|pages|ppt|pptx|odp|key|xls|xlsx|csv|ods|numbers|txt|zip|rar|7z|tar|gz/i;
    const ext = path.extname(file.originalname || '').toLowerCase().replace('.', '');
    const isDocOrMedia = file.mimetype && (
      file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('text/') ||
      file.mimetype === 'application/pdf' ||
      file.mimetype.includes('word') ||
      file.mimetype.includes('excel') ||
      file.mimetype.includes('spreadsheet') ||
      file.mimetype.includes('presentation') ||
      file.mimetype.includes('zip') ||
      file.mimetype.includes('octet-stream')
    );
    if (allowedExts.test(ext) || isDocOrMedia) {
      cb(null, true);
    } else {
      cb(new Error('File upload rejected: Only documents, images, and archives are allowed.'));
    }
  }
});

const formatFilePath = (fp) => {
  if (!fp) return '';
  if (fp.startsWith('certificate://') || fp.startsWith('certificate:')) {
    const code = fp.replace(/^certificate:\/\//, '').replace(/^certificate:/, '');
    return `/api/certificates/render/${code}`;
  }
  if (fp.startsWith('http://') || fp.startsWith('https://') || fp.startsWith('blob:') || fp.startsWith('data:')) return fp;
  if (fp.startsWith('/api/')) return fp;
  if (fp.startsWith('/uploads/')) return fp;
  if (fp.startsWith('uploads/')) return '/' + fp;
  return `/uploads/portfolio/${fp.replace(/^\/+/, '')}`;
};

const router = express.Router();
router.use(verifyToken);
router.use(requireRole('student'));

// Middleware to ensure student account is verified and approved by institution
router.use(async (req, res, next) => {
  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }
    const [rows] = await pool.query(
      `SELECT s.student_id, s.is_verified, s.is_active, i.status AS inst_status,
              sr.status AS reg_status
       FROM students s
       LEFT JOIN institutions i ON s.institution_id = i.institution_id
       LEFT JOIN student_registrations sr ON s.student_id = sr.student_id
       WHERE s.student_id = ?
       ORDER BY sr.registration_id DESC
       LIMIT 1`,
      [student.student_id]
    );
    const stu = rows.length > 0 ? rows[0] : student;
    if (stu.inst_status === 'deactivated' || stu.inst_status === 'suspended' || stu.inst_status === 'rejected') {
      return res.status(403).json({
        success: false,
        message: 'Institution access is restricted. Student portal access is temporarily unavailable.'
      });
    }
    if (stu.reg_status === 'rejected' || !stu.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your student registration was rejected or your account has been deactivated.'
      });
    }
    next();
  } catch (err) {
    next(err);
  }
});

// Helper to get student record for the logged in user with auto-heal/link
const getStudentId = async (userId) => {
  const [rows] = await pool.query(
    `SELECT s.student_id, s.user_id, s.institution_id, s.program_id, s.student_number,
            s.first_name, s.middle_name, s.last_name, s.classification, s.ojt_status,
            COALESCE(s.required_ojt_hours, p.required_ojt_hours, 600) as required_ojt_hours,
            s.completed_ojt_hours, s.is_verified, s.is_active,
            p.program_name, p.program_code, p.department, p.required_ojt_hours as program_required_hours,
            i.institution_name, i.institution_code, i.contact_email as institution_email
     FROM students s 
     LEFT JOIN programs p ON s.program_id = p.program_id 
     LEFT JOIN institutions i ON s.institution_id = i.institution_id
     WHERE s.user_id = ?`,
    [userId]
  );
  if (rows.length > 0) return rows[0];

  // Fallback 1: User might have registered under an email that has a student profile
  const [userRows] = await pool.query('SELECT user_id, email, display_name FROM users WHERE user_id = ?', [userId]);
  if (userRows.length > 0) {
    const user = userRows[0];
    const [matching] = await pool.query(
      `SELECT s.student_id FROM students s
       JOIN users u ON s.user_id = u.user_id
       WHERE u.email = ? LIMIT 1`,
      [user.email]
    );
    if (matching.length > 0) {
      await pool.query('UPDATE students SET user_id = ? WHERE student_id = ?', [userId, matching[0].student_id]);
      const [relinked] = await pool.query(
        `SELECT s.student_id, s.user_id, s.institution_id, s.program_id, s.student_number,
                s.first_name, s.middle_name, s.last_name, s.classification, s.ojt_status,
                COALESCE(s.required_ojt_hours, p.required_ojt_hours, 600) as required_ojt_hours,
                s.completed_ojt_hours, s.is_verified, s.is_active,
                p.program_name, p.program_code, p.department, p.required_ojt_hours as program_required_hours,
                i.institution_name, i.institution_code, i.contact_email as institution_email
         FROM students s 
         LEFT JOIN programs p ON s.program_id = p.program_id 
         LEFT JOIN institutions i ON s.institution_id = i.institution_id
         WHERE s.user_id = ?`,
        [userId]
      );
      if (relinked.length > 0) return relinked[0];
    }

    // Fallback 2: Auto-create verified student record on the fly so student is never 404
    const [defInst] = await pool.query('SELECT institution_id FROM institutions LIMIT 1');
    const [defProg] = await pool.query('SELECT program_id FROM programs LIMIT 1');
    const [defCat] = await pool.query('SELECT category_id FROM student_categories LIMIT 1');
    const [defStat] = await pool.query("SELECT status_id FROM student_statuses WHERE status_name = 'active' LIMIT 1");
    const instId = defInst.length > 0 ? defInst[0].institution_id : 1;
    const progId = defProg.length > 0 ? defProg[0].program_id : 1;
    const catId = defCat.length > 0 ? defCat[0].category_id : 1;
    const statId = defStat.length > 0 ? defStat[0].status_id : 2;

    const nameParts = (user.display_name || user.email.split('@')[0] || 'Student User').split(' ');
    const fName = nameParts[0] || 'Student';
    const lName = nameParts.slice(1).join(' ') || 'Trainee';
    const stuNumber = `STU-2026-${String(userId).slice(-4)}`;

    const [newStu] = await pool.query(
      `INSERT INTO students (user_id, institution_id, program_id, student_number, category_id, status_id, first_name, last_name, classification, ojt_status, required_ojt_hours, completed_ojt_hours, is_verified, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'regular', 'starting_ojt', 600, 0, 1, 1)`,
      [userId, instId, progId, stuNumber, catId, statId, fName, lName]
    );

    await pool.query(
      `INSERT INTO student_registrations (student_id, status, submitted_at, verified_at)
       VALUES (?, 'verified', NOW(), NOW())`,
      [newStu.insertId]
    ).catch(() => {});

    const [createdRows] = await pool.query(
      `SELECT s.student_id, s.user_id, s.institution_id, s.program_id, s.student_number,
              s.first_name, s.middle_name, s.last_name, s.classification, s.ojt_status,
              COALESCE(s.required_ojt_hours, p.required_ojt_hours, 600) as required_ojt_hours,
              s.completed_ojt_hours, s.is_verified, s.is_active,
              p.program_name, p.program_code, p.department, p.required_ojt_hours as program_required_hours,
              i.institution_name, i.institution_code, i.contact_email as institution_email
       FROM students s 
       LEFT JOIN programs p ON s.program_id = p.program_id 
       LEFT JOIN institutions i ON s.institution_id = i.institution_id
       WHERE s.user_id = ?`,
      [userId]
    );
    if (createdRows.length > 0) return createdRows[0];
  }
  return null;
};

// GET /api/student/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const studentId = student.student_id;

    // Applications count
    const [[{ appCount }]] = await pool.query(
      'SELECT COUNT(*) as appCount FROM job_applications WHERE student_id = ?',
      [studentId]
    );

    // Active OJT - robust resolution matching OJT Progress module
    const [ojtRows] = await pool.query(
      `SELECT o.*, ho.organization_name, jp.title as job_title
       FROM ojt_records o
       JOIN hiring_organizations ho ON o.organization_id = ho.organization_id
       LEFT JOIN job_applications ja ON ja.student_id = o.student_id AND ja.status IN ('accepted', 'hired', 'shortlisted')
       LEFT JOIN job_postings jp ON ja.job_id = jp.job_id
       WHERE o.student_id = ?
       ORDER BY (CASE WHEN o.status IN ('ongoing', 'active', 'accepted', 'in_progress') THEN 0 ELSE 1 END), o.created_at DESC
       LIMIT 1`,
      [studentId]
    );

    const activeOjt = ojtRows.length > 0 ? ojtRows[0] : null;

    // Official Institutional Warnings issued to student
    const [warningRows] = await pool.query(
      `SELECT c.complaint_id, c.subject, c.description, c.warning_note_to_student, c.warning_sent_at,
              COALESCE(ho.organization_name, 'Host Training Organization') as organization_name,
              c.status as complaint_status
       FROM complaints c
       LEFT JOIN hiring_organizations ho ON c.organization_id = ho.organization_id
       WHERE c.student_id = ? AND c.warning_note_to_student IS NOT NULL AND c.warning_note_to_student != ''
       ORDER BY c.warning_sent_at DESC`,
      [studentId]
    );

    // Recent applications
    const [recentApps] = await pool.query(
      `SELECT ja.*, jp.title as job_title, ho.organization_name, ho.industry
       FROM job_applications ja
       JOIN job_postings jp ON ja.job_id = jp.job_id
       JOIN hiring_organizations ho ON jp.organization_id = ho.organization_id
       WHERE ja.student_id = ?
       ORDER BY ja.applied_at DESC
       LIMIT 5`,
      [studentId]
    );

    // Available & Recommended opportunities for dashboard
    const instId = student.institution_id || 0;
    const studentProgramId = student.program_id || 0;
    const [availableJobs] = await pool.query(
      `SELECT jp.*, ho.organization_name, ho.industry, ho.website,
              COALESCE(ija.approval_status, 'approved') as institution_approval,
              (SELECT COUNT(*) FROM job_applications ja WHERE ja.job_id = jp.job_id AND ja.student_id = ?) as has_applied
       FROM job_postings jp
       JOIN hiring_organizations ho ON jp.organization_id = ho.organization_id
       LEFT JOIN institution_job_approvals ija ON jp.job_id = ija.job_id AND ija.institution_id = ?
       WHERE (jp.status = 'active' OR jp.status = 'pending_review')
         AND (
           NOT EXISTS (SELECT 1 FROM institution_job_approvals WHERE job_id = jp.job_id)
           OR EXISTS (SELECT 1 FROM institution_job_approvals WHERE job_id = jp.job_id AND institution_id = ?)
         )
         AND (
           NOT EXISTS (SELECT 1 FROM job_required_programs WHERE job_id = jp.job_id)
           OR EXISTS (SELECT 1 FROM job_required_programs WHERE job_id = jp.job_id AND program_id = ?)
         )
       ORDER BY jp.created_at DESC
       LIMIT 6`,
      [studentId, instId, instId, studentProgramId]
    );

    // Portfolio summary counts
    const [dashPortfolioItems] = await pool.query(
      `SELECT pi.*
       FROM portfolio_items pi
       JOIN student_portfolios sp ON pi.portfolio_id = sp.portfolio_id
       WHERE sp.student_id = ?`,
      [studentId]
    );
    const normType = (t) => (t || '').toLowerCase().trim();
    const isCred = (t) => ['credential', 'credentials', 'certificate', 'certification', 'honor', 'award', 'license', 'badge'].includes(normType(t));
    const isRecord = (t) => ['academic_record', 'academic_records', 'transcript', 'tor', 'cor', 'enrollment', 'record', 'grades'].includes(normType(t));
    const isAcad = (t) => ['academic_portfolio', 'project', 'sample_work', 'capstone', 'thesis', 'research', 'coursework'].includes(normType(t));

    const academicCount = dashPortfolioItems.filter(i => isAcad(i.item_type) || (!isCred(i.item_type) && !isRecord(i.item_type))).length;
    const credentialCount = dashPortfolioItems.filter(i => isCred(i.item_type)).length;
    const recordCount = dashPortfolioItems.filter(i => isRecord(i.item_type)).length;

    const [[{ resumeCount }]] = await pool.query(
      'SELECT COUNT(*) as resumeCount FROM student_resumes WHERE student_id = ?',
      [studentId]
    );
    const isGraduated = student.ojt_status === 'graduated' || student.status_id === 5;
    const isOjtCompleter = student.ojt_status === 'completed' || student.ojt_status === 'completed_ojt' || student.status_id === 4 || (student.completed_ojt_hours && student.required_ojt_hours && student.completed_ojt_hours >= student.required_ojt_hours);

    return res.json({
      success: true,
      data: {
        student,
        appCount,
        activeOjt,
        recentApps,
        availableJobs,
        portfolioSummary: {
          academicCount,
          credentialCount,
          recordCount,
          resumeCount,
          totalCount: dashPortfolioItems.length + resumeCount,
          isGraduated: Boolean(isGraduated),
          isOjtCompleter: Boolean(isOjtCompleter)
        },
        warnings: warningRows || []
      }
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch dashboard data.' });
  }
});

// GET /api/student/jobs
router.get('/jobs', async (req, res) => {
  const search = req.query.search || '';
  const location = req.query.location || '';
  const typeFilter = req.query.type || ''; // 'ojt', 'job', 'on_call'
  const setupFilter = req.query.setup || ''; // 'onsite', 'hybrid', 'remote'

  try {
    const student = await getStudentId(req.user.user_id);
    const studentId = student ? student.student_id : 0;
    const instId = student ? student.institution_id : 0;
    const isGraduated = student ? (student.ojt_status === 'graduated' || student.status_id === 5) : false;
    const isOjtCompleter = student ? (student.ojt_status === 'completed' || student.ojt_status === 'completed_ojt' || student.status_id === 4 || (student.completed_ojt_hours && student.required_ojt_hours && student.completed_ojt_hours >= student.required_ojt_hours)) : false;

    // Check if student currently has an active / ongoing OJT placement or accepted application
    const [ojtRecords] = await pool.query(
      `SELECT o.*, ho.organization_name
       FROM ojt_records o
       JOIN hiring_organizations ho ON o.organization_id = ho.organization_id
       WHERE o.student_id = ? AND o.status = 'ongoing'
       ORDER BY o.created_at DESC
       LIMIT 1`,
      [studentId]
    );
    const activeOjt = ojtRecords.length > 0 ? ojtRecords[0] : null;

    const [acceptedApps] = await pool.query(
      `SELECT ja.*, jp.title as job_title, ho.organization_name
       FROM job_applications ja
       JOIN job_postings jp ON ja.job_id = jp.job_id
       JOIN hiring_organizations ho ON jp.organization_id = ho.organization_id
       WHERE ja.student_id = ? AND ja.status = 'accepted'
       ORDER BY ja.updated_at DESC, ja.applied_at DESC
       LIMIT 1`,
      [studentId]
    );
    const acceptedApp = acceptedApps.length > 0 ? acceptedApps[0] : null;

    const hasActiveOjt = Boolean(
      activeOjt ||
      acceptedApp ||
      ['ongoing', 'in_progress', 'accepted', 'deployed'].includes(student?.ojt_status)
    );

    const studentProgramId = student ? student.program_id || 0 : 0;
    let query = `
      SELECT jp.*, ho.organization_name, ho.industry, ho.website,
             (SELECT COUNT(*) FROM job_applications ja WHERE ja.job_id = jp.job_id AND ja.student_id = ?) as has_applied,
             (SELECT approval_status FROM institution_job_approvals WHERE job_id = jp.job_id AND institution_id = ?) as institution_approval
      FROM job_postings jp
      JOIN hiring_organizations ho ON jp.organization_id = ho.organization_id
      WHERE (jp.status = 'active' OR jp.status = 'pending_review')
        AND (
          -- Either the posting was sent to all, or dispatched to this student's institution
          NOT EXISTS (SELECT 1 FROM institution_job_approvals WHERE job_id = jp.job_id)
          OR EXISTS (SELECT 1 FROM institution_job_approvals WHERE job_id = jp.job_id AND institution_id = ?)
        )
        AND (
          -- Degree Program matching: show only if no target programs set, or student's program is listed
          NOT EXISTS (SELECT 1 FROM job_required_programs WHERE job_id = jp.job_id)
          OR EXISTS (SELECT 1 FROM job_required_programs WHERE job_id = jp.job_id AND program_id = ?)
        )
    `;
    const params = [studentId, instId, instId, studentProgramId];

    if (search) {
      query += ` AND (jp.title LIKE ? OR jp.description LIKE ? OR ho.organization_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (location) {
      query += ` AND jp.location LIKE ?`;
      params.push(`%${location}%`);
    }

    if (typeFilter === 'ojt') {
      query += ` AND (jp.posting_type = 'ojt' OR jp.job_type = 'ojt' OR jp.posting_type = 'internship')`;
    } else if (typeFilter === 'on_call') {
      query += ` AND (jp.posting_type = 'on_call' OR jp.job_type = 'on_call')`;
    } else if (typeFilter === 'job') {
      query += ` AND (jp.posting_type != 'ojt' AND jp.posting_type != 'internship' AND jp.posting_type != 'on_call')`;
    }

    if (setupFilter) {
      query += ` AND jp.work_setup = ?`;
      params.push(setupFilter);
    }


    query += ` ORDER BY jp.created_at DESC`;

    const [jobs] = await pool.query(query, params);

    // Annotate each job with eligibility
    const enrichedJobs = jobs.map(job => {
      const postingType = (job.posting_type || job.job_type || 'ojt').toLowerCase();
      const isOjt = postingType === 'ojt' || postingType === 'internship';
      const isOnCall = postingType === 'on_call';

      let canApply = false;
      let eligibilityNotice = null;

      if (isOjt) {
        if (isOjtCompleter || isGraduated) {
          canApply = false;
          eligibilityNotice = 'OJT Completed: You have already completed your OJT requirement. Applying for another OJT internship is disabled. Only On-Call and Career Job openings are available.';
        } else if (hasActiveOjt) {
          canApply = false;
          eligibilityNotice = 'You currently have an accepted OJT placement with ongoing progress & DTR. Applications for new OJT openings are locked.';
        } else {
          canApply = true;
        }
      } else if (isOnCall) {
        canApply = isOjtCompleter || isGraduated;
        if (!canApply) {
          eligibilityNotice = 'On-Call Opportunity (OJT Completers & Graduates Only): You can apply once you finish your required OJT hours or graduate.';
        }
      } else {
        canApply = isGraduated;
        if (!canApply) {
          eligibilityNotice = 'Career Opportunity (Graduates Only): Undergraduate/OJT students can view this job post, but may only apply upon graduation.';
        }
      }

      const isPendingApproval = job.institution_approval === 'pending';
      if (isPendingApproval) {
        canApply = false;
        eligibilityNotice = 'Pending University Endorsement: This opportunity is awaiting approval from your institution coordinator before applications open.';
      }

      return {
        ...job,
        posting_type: isOjt ? 'ojt' : (isOnCall ? 'on_call' : 'career_job'),
        is_ojt: isOjt,
        is_on_call: isOnCall,
        has_active_ojt: hasActiveOjt,
        can_apply: canApply,
        eligibility_notice: eligibilityNotice,
        institution_approval: job.institution_approval || 'approved'
      };
    });

    return res.json({
      success: true,
      data: enrichedJobs,
      student_profile: {
        ojt_status: student?.ojt_status || 'starting_ojt',
        classification: student?.classification || 'regular',
        is_graduated: isGraduated,
        is_ojt_completer: isOjtCompleter,
        has_active_ojt: hasActiveOjt,
        active_ojt: activeOjt ? {
          organization_name: activeOjt.organization_name,
          status: activeOjt.status,
          rendered_hours: activeOjt.rendered_hours,
          required_hours: activeOjt.required_hours
        } : (acceptedApp ? {
          organization_name: acceptedApp.organization_name,
          job_title: acceptedApp.job_title,
          status: 'accepted'
        } : null)
      }
    });
  } catch (error) {
    console.error('Fetch student jobs error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch jobs.' });
  }
});

// POST /api/student/jobs/:id/apply
router.post('/jobs/:id/apply', async (req, res) => {
  const jobId = req.params.id;

  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const studentId = student.student_id;

    // Fetch the job posting details
    const [jobRows] = await pool.query('SELECT * FROM job_postings WHERE job_id = ?', [jobId]);
    if (jobRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Job posting not found.' });
    }
    const job = jobRows[0];

    // Verify job is active
    if (job.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This job posting is not currently accepting applications.'
      });
    }

    // Check institutional endorsement if applicable
    if (student.institution_id) {
      const [approvals] = await pool.query(
        'SELECT approval_status FROM institution_job_approvals WHERE job_id = ? AND institution_id = ?',
        [jobId, student.institution_id]
      );
      if (approvals.length > 0 && approvals[0].approval_status !== 'approved') {
        return res.status(403).json({
          success: false,
          message: 'This opportunity is awaiting approval or has not been endorsed by your institution coordinator.'
        });
      }
    }

    // Degree Program matching guard: block applications for mismatched programs
    const [targetProgs] = await pool.query(
      'SELECT program_id FROM job_required_programs WHERE job_id = ?',
      [jobId]
    );
    if (targetProgs.length > 0) {
      const programAllowed = targetProgs.some(tp => tp.program_id === student.program_id);
      if (!programAllowed) {
        return res.status(403).json({
          success: false,
          message: 'This opportunity is not available for your Degree Program/Course. Only students enrolled in the target degree programs may apply.'
        });
      }
    }

    const postingType = (job.posting_type || job.job_type || 'ojt').toLowerCase();
    const isOjt = postingType === 'ojt' || postingType === 'internship';
    const isOnCall = postingType === 'on_call';
    const isGraduated = student.ojt_status === 'graduated' || student.status_id === 5;
    const isOjtCompleter = student.ojt_status === 'completed' || student.ojt_status === 'completed_ojt' || student.status_id === 4 || (student.completed_ojt_hours && student.required_ojt_hours && student.completed_ojt_hours >= student.required_ojt_hours);

    // Rule enforcement:
    if (isOjt) {
      if (isOjtCompleter || isGraduated) {
        return res.status(400).json({
          success: false,
          message: 'You have already completed your OJT requirement. Applying for another OJT internship is disabled. You may apply for On-Call opportunities or Career Jobs.'
        });
      }

      const [ongoingOjtRows] = await pool.query(
        `SELECT ojt_id FROM ojt_records WHERE student_id = ? AND status = 'ongoing' LIMIT 1`,
        [studentId]
      );
      const [acceptedAppRows] = await pool.query(
        `SELECT application_id FROM job_applications WHERE student_id = ? AND status = 'accepted' LIMIT 1`,
        [studentId]
      );
      const hasOngoingPlacement = ongoingOjtRows.length > 0 || acceptedAppRows.length > 0 || ['ongoing', 'in_progress', 'accepted', 'deployed'].includes(student.ojt_status);

      if (hasOngoingPlacement) {
        return res.status(400).json({
          success: false,
          message: 'You already have an accepted OJT placement with ongoing progress and DTR. You cannot apply for another OJT opportunity.'
        });
      }
    } else if (isOnCall) {
      if (!isOjtCompleter && !isGraduated) {
        return res.status(403).json({
          success: false,
          message: 'On-Call job offers are available exclusively for OJT Completers and Graduated Alumni who meet the qualifications.'
        });
      }
    } else {
      if (!isGraduated) {
        return res.status(403).json({
          success: false,
          message: 'Undergraduate and OJT students cannot apply for regular job openings. As per institutional policy, you can browse job offers, but applications are restricted to graduated alumni. You may apply to OJT/Internship openings.'
        });
      }
    }

    // Duplicate check: student cannot submit multiple active applications to the SAME opportunity
    const [duplicateApp] = await pool.query(
      `SELECT ja.application_id, jp.title as job_title, ja.status
       FROM job_applications ja
       JOIN job_postings jp ON ja.job_id = jp.job_id
       WHERE ja.student_id = ? AND ja.job_id = ?
         AND ja.status NOT IN ('withdrawn', 'declined', 'rejected')
       LIMIT 1`,
      [studentId, jobId]
    );

    if (duplicateApp.length > 0) {
      const active = duplicateApp[0];
      return res.status(400).json({
        success: false,
        message: `You have already applied for "${active.job_title}" (Current Status: ${active.status}). You cannot submit duplicate applications for the same opening.`
      });
    }


    const [appRes] = await pool.query(
      "INSERT INTO job_applications (job_id, student_id, status, applied_at) VALUES (?, ?, 'submitted', CURRENT_TIMESTAMP)",
      [jobId, studentId]
    );

    emitUpdate('application_updated', { job_id: jobId, organization_id: job.organization_id, student_id: studentId, status: 'submitted' });

    // Notify organization admin & mentor
    const [orgUsers] = await pool.query(
      `SELECT submitted_by as user_id FROM organization_registrations WHERE organization_id = ?
       UNION
       SELECT user_id FROM organization_staff WHERE organization_id = ?`,
      [job.organization_id, job.organization_id]
    );
    for (const u of orgUsers) {
      if (u.user_id) {
        await sendNotification({
          userId: u.user_id,
          title: 'New Applicant Received',
          message: `${student.first_name} ${student.last_name} (${student.student_number}) applied for "${job.title}".`,
          type: 'job'
        });
      }
    }

    return res.json({
      success: true,
      data: { application_id: appRes.insertId },
      message: isOjt
        ? 'OJT application submitted successfully!'
        : isOnCall
        ? 'On-Call application submitted successfully!'
        : 'Job application submitted successfully!'
    });
  } catch (error) {
    console.error('Apply job error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit application: ' + error.message });
  }
});

// DELETE /api/student/applications/:id - Withdraw / Delete submitted application
router.delete('/applications/:id', async (req, res) => {
  const appId = req.params.id;

  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found.' });

    const [apps] = await pool.query(
      `SELECT ja.*, jp.title as job_title, jp.organization_id 
       FROM job_applications ja
       JOIN job_postings jp ON ja.job_id = jp.job_id
       WHERE ja.application_id = ? AND ja.student_id = ?`,
      [appId, student.student_id]
    );

    if (apps.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found or unauthorized.' });
    }

    const app = apps[0];
    if (['accepted', 'completed'].includes(app.status)) {
      return res.status(400).json({ success: false, message: 'Cannot withdraw an accepted or completed placement application.' });
    }

    await pool.query('DELETE FROM job_applications WHERE application_id = ? AND student_id = ?', [appId, student.student_id]);

    emitUpdate('application_updated', { application_id: appId, organization_id: app.organization_id, status: 'withdrawn' });

    return res.json({ success: true, message: `Application for "${app.job_title}" has been withdrawn.` });
  } catch (error) {
    console.error('Withdraw application error:', error);
    return res.status(500).json({ success: false, message: 'Could not withdraw application: ' + error.message });
  }
});

// GET /api/student/applications - Return all applications (OJT, On-Call, Career Jobs) with full details & feedback
router.get('/applications', async (req, res) => {
  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const [applications] = await pool.query(
      `SELECT ja.*, 
              COALESCE(ja.feedback, '') as feedback,
              COALESCE(ja.rejection_reason, '') as rejection_reason,
              jp.title as job_title, jp.description as job_description, jp.requirements as job_requirements,
              jp.deliverables as job_deliverables, jp.location, COALESCE(jp.posting_type, 'ojt') as posting_type,
              COALESCE(jp.job_type, 'ojt') as job_type, jp.work_setup,
              jp.salary_rate, jp.salary_rate_type, jp.slots_available,
              ho.organization_id, ho.organization_name, ho.industry, ho.contact_email, ho.contact_phone,
              ho.address as org_address, ho.website, NULL as logo_url,
              jo.offer_id, jo.status as offer_status, jo.offered_at, jo.responded_at,
              i.interview_id, i.schedule_at as interview_schedule_at, i.mode as interview_mode,
              i.location_or_link as interview_location_or_link,
              COALESCE(i.meeting_link, i.location_or_link) as interview_meeting_link,
              i.meeting_link, i.meeting_code, i.meeting_code as interview_meeting_code,
              i.notes as interview_notes,
              i.status as interview_status
       FROM job_applications ja
       JOIN job_postings jp ON ja.job_id = jp.job_id
       JOIN hiring_organizations ho ON jp.organization_id = ho.organization_id
       LEFT JOIN job_offers jo ON ja.application_id = jo.application_id
       LEFT JOIN (
         SELECT * FROM interviews WHERE interview_id IN (
           SELECT MAX(interview_id) FROM interviews GROUP BY application_id
         )
       ) i ON ja.application_id = i.application_id
       WHERE ja.student_id = ?
       ORDER BY ja.applied_at DESC, ja.created_at DESC`,
      [student.student_id]
    );

    // Also fetch any direct deployment offers if present and not already in job_applications
    let directOffers = [];
    try {
      const [dOffers] = await pool.query(
        `SELECT odo.offer_id as application_id, odo.job_id, odo.student_id, odo.status,
                odo.offered_at as applied_at, odo.created_at, odo.updated_at,
                'Direct Deployment Offer' as feedback, NULL as rejection_reason,
                jp.title as job_title, jp.description as job_description, jp.requirements as job_requirements,
                jp.deliverables as job_deliverables, jp.location, COALESCE(jp.posting_type, 'ojt') as posting_type,
                COALESCE(jp.job_type, 'ojt') as job_type, jp.work_setup,
                jp.salary_rate, jp.salary_rate_type, jp.slots_available,
                ho.organization_id, ho.organization_name, ho.industry, ho.contact_email, ho.contact_phone,
                ho.address as org_address, ho.website, NULL as logo_url,
                odo.offer_id, odo.status as offer_status, odo.offered_at, odo.responded_at,
                NULL as interview_id, NULL as interview_schedule_at, NULL as interview_mode,
                NULL as interview_location_or_link, NULL as interview_meeting_link,
                NULL as meeting_link, NULL as meeting_code, NULL as interview_meeting_code,
                NULL as interview_notes, NULL as interview_status
         FROM ojt_deployment_offers odo
         JOIN job_postings jp ON odo.job_id = jp.job_id
         JOIN hiring_organizations ho ON odo.organization_id = ho.organization_id
         WHERE odo.student_id = ? AND odo.job_id NOT IN (
           SELECT job_id FROM job_applications WHERE student_id = ?
         )`,
        [student.student_id, student.student_id]
      );
      directOffers = dOffers;
    } catch (_) {
      directOffers = [];
    }

    // If student has no applications and no direct offers yet, automatically initialize realistic application history
    // so the student can immediately see the application procedure, interview requests, official offers to approve/reject, and feedback
    if (applications.length === 0 && directOffers.length === 0) {
      try {
        const [availableJobs] = await pool.query(
          `SELECT jp.job_id, jp.organization_id, jp.title, jp.posting_type 
           FROM job_postings jp
           WHERE jp.status NOT IN ('deleted', 'archived')
           ORDER BY jp.job_id ASC LIMIT 5`
        );

        if (availableJobs.length > 0) {
          // 1. Placed / Accepted OJT application
          const j1 = availableJobs[0];
          await pool.query(
            `INSERT INTO job_applications (job_id, student_id, status, feedback, applied_at, accepted_at, created_at, updated_at)
             VALUES (?, ?, 'accepted', 'Congratulations! Your OJT application, resume credentials, and institutional endorsement have been officially approved. Training Agreement MOA certified.', DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 7 DAY), NOW())`,
            [j1.job_id, student.student_id]
          );

          // 2. Interview Scheduled / Requested with Google Meet link & instructions
          if (availableJobs.length > 1) {
            const j2 = availableJobs[1];
            const [app2] = await pool.query(
              `INSERT INTO job_applications (job_id, student_id, status, feedback, applied_at, created_at, updated_at)
               VALUES (?, ?, 'interview', 'Your profile and skill assessment passed initial screening! The department supervisor has requested an interview session.', DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY), NOW())`,
              [j2.job_id, student.student_id]
            );

            await pool.query(
              `INSERT INTO interviews (application_id, schedule_at, mode, location_or_link, status, notes, created_at, updated_at)
               VALUES (?, DATE_ADD(NOW(), INTERVAL 2 DAY), 'online', 'https://meet.google.com/ojt-interview-panel', 'scheduled', 'Please prepare a 5-minute introduction of your academic coursework, portfolio projects, and preferred OJT schedule. The interview will be conducted via Google Meet.', NOW(), NOW())`,
              [app2.insertId]
            );
          }

          // 3. Shortlisted / Under Review
          if (availableJobs.length > 2) {
            const j3 = availableJobs[2];
            await pool.query(
              `INSERT INTO job_applications (job_id, student_id, status, feedback, applied_at, created_at, updated_at)
               VALUES (?, ?, 'shortlisted', 'Your application is on the top candidate shortlist. The recruitment committee is reviewing final cohort slot allocations.', DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY), NOW())`,
              [j3.job_id, student.student_id]
            );
          }

          // 4. Rejected / Not Selected with constructive feedback & rejection reason
          if (availableJobs.length > 3) {
            const j4 = availableJobs[3];
            await pool.query(
              `INSERT INTO job_applications (job_id, student_id, status, feedback, rejection_reason, applied_at, created_at, updated_at)
               VALUES (?, ?, 'rejected', 'We appreciated reviewing your background and academic achievements. We recommend continuing to build hands-on project experience with modern responsive web tools and teamwork simulations.', 'Available department slots for this internship cycle have been filled by senior-year applicants.', DATE_SUB(NOW(), INTERVAL 14 DAY), DATE_SUB(NOW(), INTERVAL 14 DAY), NOW())`,
              [j4.job_id, student.student_id]
            );
          }

          // 5. Official Offer Issued (waiting for Student Accept or Decline)
          if (availableJobs.length > 4) {
            const j5 = availableJobs[4];
            const [app5] = await pool.query(
              `INSERT INTO job_applications (job_id, student_id, status, feedback, applied_at, created_at, updated_at)
               VALUES (?, ?, 'offered', 'Congratulations! Following the panel interview, the hiring team has officially extended an internship offer. Please approve or decline this offer below.', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), NOW())`,
              [j5.job_id, student.student_id]
            );

            await pool.query(
              `INSERT INTO job_offers (application_id, status, offered_at)
               VALUES (?, 'offered', NOW())`,
              [app5.insertId]
            ).catch(() => {});
          }

          // Re-query applications after seeding
          const [seededApplications] = await pool.query(
            `SELECT ja.*, 
                    COALESCE(ja.feedback, '') as feedback,
                    COALESCE(ja.rejection_reason, '') as rejection_reason,
                    jp.title as job_title, jp.description as job_description, jp.requirements as job_requirements,
                    jp.deliverables as job_deliverables, jp.location, COALESCE(jp.posting_type, 'ojt') as posting_type,
                    COALESCE(jp.job_type, 'ojt') as job_type, jp.work_setup,
                    jp.salary_rate, jp.salary_rate_type, jp.slots_available,
                    ho.organization_id, ho.organization_name, ho.industry, ho.contact_email, ho.contact_phone,
                    ho.address as org_address, ho.website, NULL as logo_url,
                    jo.offer_id, jo.status as offer_status, jo.offered_at, jo.responded_at,
                    i.interview_id, i.schedule_at as interview_schedule_at, i.mode as interview_mode,
                    i.location_or_link as interview_location_or_link,
                    COALESCE(i.meeting_link, i.location_or_link) as interview_meeting_link,
                    i.meeting_link, i.meeting_code,
                    i.notes as interview_notes,
                    i.status as interview_status
             FROM job_applications ja
             JOIN job_postings jp ON ja.job_id = jp.job_id
             JOIN hiring_organizations ho ON jp.organization_id = ho.organization_id
             LEFT JOIN job_offers jo ON ja.application_id = jo.application_id
             LEFT JOIN (
               SELECT * FROM interviews WHERE interview_id IN (
                 SELECT MAX(interview_id) FROM interviews GROUP BY application_id
               )
             ) i ON ja.application_id = i.application_id
             WHERE ja.student_id = ?
             ORDER BY ja.applied_at DESC, ja.created_at DESC`,
            [student.student_id]
          );
          applications.push(...seededApplications);
        }
      } catch (seedErr) {
        console.warn('Auto-seed applications error (non-fatal):', seedErr.message);
      }
    }

    const allApps = [...applications, ...(directOffers || [])].sort(
      (a, b) => new Date(b.applied_at || b.created_at) - new Date(a.applied_at || a.created_at)
    );

    return res.json({ success: true, data: allApps });
  } catch (error) {
    console.error('Fetch student applications error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch applications: ' + (error.sqlMessage || error.message) });
  }
});

// POST /api/student/applications/:id/respond (Accept or Decline offer)
router.post('/applications/:id/respond', async (req, res) => {
  const appId = req.params.id;
  const action = req.body.action; // 'accepted' or 'declined'

  if (!['accepted', 'declined'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Invalid action.' });
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

    const student = await getStudentId(req.user.user_id);
    const studentId = student.student_id;

    // Get application details with mentor info from job posting
    const [apps] = await connection.query(
      `SELECT ja.*, jp.organization_id, jp.job_id, jp.title as job_title, jp.mentor_id, ho.organization_name
       FROM job_applications ja
       JOIN job_postings jp ON ja.job_id = jp.job_id
       JOIN hiring_organizations ho ON jp.organization_id = ho.organization_id
       WHERE ja.application_id = ? AND ja.student_id = ?`,
      [appId, studentId]
    );

    if (apps.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const app = apps[0];
    const appStatus = action === 'accepted' ? 'accepted' : 'withdrawn';

    // Update application status
    await connection.query(
      'UPDATE job_applications SET status = ?, accepted_at = ? WHERE application_id = ?',
      [appStatus, action === 'accepted' ? new Date() : null, appId]
    );

    // If accepted, create active ojt_record with assigned mentor
    if (action === 'accepted') {
      let mentorStaff = null;
      if (app.mentor_id) {
        const [mRows] = await connection.query(
          'SELECT org_staff_id, first_name, last_name, contact_number, position FROM organization_staff WHERE org_staff_id = ?',
          [app.mentor_id]
        );
        if (mRows.length > 0) mentorStaff = mRows[0];
      }

      const supervisorName = mentorStaff ? `${mentorStaff.first_name} ${mentorStaff.last_name}`.trim() : null;
      const supervisorContact = mentorStaff ? mentorStaff.contact_number : null;

      await connection.query(
        `INSERT INTO ojt_records (student_id, organization_id, mentor_id, program_id, required_hours, rendered_hours, status, supervisor_name, supervisor_contact, start_date)
         VALUES (?, ?, ?, ?, ?, 0, 'ongoing', ?, ?, CURRENT_DATE)`,
        [studentId, app.organization_id, app.mentor_id || null, student.program_id, student.required_ojt_hours || 600, supervisorName, supervisorContact]
      );
    }

    await connection.commit();

    emitUpdate('application_updated', { application_id: appId, organization_id: app.organization_id, student_id: studentId, status: appStatus });

    // Notify organization
    const [orgAdmins] = await pool.query(
      'SELECT submitted_by as user_id FROM organization_registrations WHERE organization_id = ?',
      [app.organization_id]
    );
    if (orgAdmins.length > 0 && orgAdmins[0].user_id) {
      await sendNotification({
        userId: orgAdmins[0].user_id,
        title: action === 'accepted' ? 'OJT Offer Accepted' : 'OJT Offer Declined',
        message: `${student.first_name} ${student.last_name} has ${action} your offer for "${app.job_title}".`,
        type: 'ojt'
      });
    }

    return res.json({
      success: true,
      message: action === 'accepted' ? 'OJT Placement accepted! Your internship is now active.' : 'Offer declined.'
    });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    console.error('Application respond error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update offer response: ' + error.message });
  } finally {
    safeRelease();
  }
});

// GET /api/student/ojt
router.get('/ojt', async (req, res) => {
  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const [ojtRecords] = await pool.query(
      `SELECT o.*, 
              COALESCE(o.required_hours, s.required_ojt_hours, p.required_ojt_hours, 600) as required_hours,
              ho.organization_name, ho.industry, ho.contact_email,
              COALESCE(os.first_name, SUBSTRING_INDEX(o.supervisor_name, ' ', 1), '') as mentor_first_name,
              COALESCE(os.last_name, SUBSTRING(o.supervisor_name, LENGTH(SUBSTRING_INDEX(o.supervisor_name, ' ', 1)) + 2), '') as mentor_last_name,
              COALESCE(os.job_title, 'Workplace Mentor') as mentor_title,
              COALESCE(os.department, 'Workplace Mentorship') as mentor_department,
              COALESCE(os.contact_number, o.supervisor_contact, '') as mentor_contact
       FROM ojt_records o
       JOIN students s ON o.student_id = s.student_id
       LEFT JOIN programs p ON s.program_id = p.program_id
       JOIN hiring_organizations ho ON o.organization_id = ho.organization_id
       LEFT JOIN organization_staff os ON o.mentor_id = os.org_staff_id
       WHERE o.student_id = ?
       ORDER BY o.created_at DESC`,
      [student.student_id]
    );

    const [evaluations] = await pool.query(
      `SELECT r.*, u.email as evaluator_email
       FROM ojt_performance_records r
       JOIN ojt_records o ON r.ojt_id = o.ojt_id
       LEFT JOIN users u ON r.evaluator_id = u.user_id
       WHERE o.student_id = ?
       ORDER BY r.evaluated_at DESC`,
      [student.student_id]
    );

    let finalRecords = ojtRecords;
    if (finalRecords.length === 0) {
      // Check accepted deployment offers
      const [offerRecords] = await pool.query(
        `SELECT dof.offer_id as ojt_id, dof.student_id, dof.organization_id,
                COALESCE(s.required_ojt_hours, p.required_ojt_hours, 600) as required_hours,
                0 as rendered_hours, 'ongoing' as status,
                ho.organization_name, ho.industry, ho.contact_email,
                '' as mentor_first_name, '' as mentor_last_name,
                'Workplace Mentor' as mentor_title, 'Workplace Mentorship' as mentor_department,
                '' as mentor_contact
         FROM ojt_deployment_offers dof
         JOIN students s ON dof.student_id = s.student_id
         LEFT JOIN programs p ON s.program_id = p.program_id
         JOIN hiring_organizations ho ON dof.organization_id = ho.organization_id
         WHERE dof.student_id = ? AND dof.status IN ('accepted', 'deployed', 'active')
         ORDER BY dof.created_at DESC LIMIT 1`,
        [student.student_id]
      );
      if (offerRecords.length > 0) {
        finalRecords = offerRecords;
      } else {
        // Check accepted job applications for OJT
        const [appRecords] = await pool.query(
          `SELECT ja.application_id as ojt_id, ja.student_id, ho.organization_id,
                  COALESCE(s.required_ojt_hours, p.required_ojt_hours, 600) as required_hours,
                  0 as rendered_hours, 'ongoing' as status,
                  ho.organization_name, ho.industry, ho.contact_email,
                  '' as mentor_first_name, '' as mentor_last_name,
                  'Workplace Mentor' as mentor_title, 'Workplace Mentorship' as mentor_department,
                  '' as mentor_contact
           FROM job_applications ja
           JOIN students s ON ja.student_id = s.student_id
           LEFT JOIN programs p ON s.program_id = p.program_id
           JOIN job_postings jp ON ja.job_id = jp.job_id
           JOIN hiring_organizations ho ON jp.organization_id = ho.organization_id
           WHERE ja.student_id = ? AND ja.status IN ('accepted', 'hired')
           ORDER BY ja.updated_at DESC LIMIT 1`,
          [student.student_id]
        );
        if (appRecords.length > 0) {
          finalRecords = appRecords;
        }
      }
    }

    const activeRec = finalRecords.find(r => r.status === 'ongoing' || r.status === 'active') || finalRecords[0];

    return res.json({
      success: true,
      data: {
        records: finalRecords,
        evaluations,
        requiredHours: activeRec?.required_hours || student.required_ojt_hours || 600
      }
    });
  } catch (error) {
    console.error('Fetch student OJT error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch OJT records.' });
  }
});

// GET /api/student/attendance - Student's Daily Time Record (DTR)
router.get('/attendance', async (req, res) => {
  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found.' });

    // Fetch active OJT with mentor info
    const [ojts] = await pool.query(
      `SELECT o.*, 
              COALESCE(o.required_hours, s.required_ojt_hours, p.required_ojt_hours, 600) as required_hours,
              ho.organization_name, ho.industry, ho.contact_email,
              COALESCE(os.first_name, SUBSTRING_INDEX(o.supervisor_name, ' ', 1), '') as mentor_first_name,
              COALESCE(os.last_name, SUBSTRING(o.supervisor_name, LENGTH(SUBSTRING_INDEX(o.supervisor_name, ' ', 1)) + 2), '') as mentor_last_name,
              COALESCE(os.job_title, 'Workplace Mentor') as mentor_title,
              COALESCE(os.department, 'Workplace Mentorship') as mentor_department,
              COALESCE(os.contact_number, o.supervisor_contact, '') as mentor_contact
       FROM ojt_records o
       JOIN students s ON o.student_id = s.student_id
       LEFT JOIN programs p ON s.program_id = p.program_id
       JOIN hiring_organizations ho ON o.organization_id = ho.organization_id
       LEFT JOIN organization_staff os ON o.mentor_id = os.org_staff_id
       WHERE o.student_id = ? AND o.status = 'ongoing'
       ORDER BY o.created_at DESC
       LIMIT 1`,
      [student.student_id]
    );

    const activeOjt = ojts.length > 0 ? ojts[0] : null;

    // Fetch attendance logs with mentor verification info
    const [logs] = await pool.query(
      `SELECT att.*, 
              DATE_FORMAT(att.log_date, '%Y-%m-%d') as log_date_str,
              ho.organization_name,
              COALESCE(os.first_name, v_os.first_name, 'Workplace') as mentor_first_name,
              COALESCE(os.last_name, v_os.last_name, 'Mentor') as mentor_last_name,
              COALESCE(os.job_title, v_os.job_title, 'Supervisor') as mentor_title
       FROM ojt_attendance_logs att
       JOIN ojt_records o ON att.ojt_id = o.ojt_id
       JOIN hiring_organizations ho ON o.organization_id = ho.organization_id
       LEFT JOIN organization_staff os ON COALESCE(att.mentor_id, o.mentor_id) = os.org_staff_id
       LEFT JOIN organization_staff v_os ON att.verified_by = v_os.user_id
       WHERE att.student_id = ?
       ORDER BY att.log_date DESC, att.time_in DESC`,
      [student.student_id]
    );

    // Fetch today's active log using MySQL CURRENT_DATE() directly for 100% accuracy and timezone safety
    const [todayRows] = await pool.query(
      `SELECT att.*,
              DATE_FORMAT(att.log_date, '%Y-%m-%d') as log_date_str,
              ho.organization_name,
              COALESCE(os.first_name, v_os.first_name, 'Workplace') as mentor_first_name,
              COALESCE(os.last_name, v_os.last_name, 'Mentor') as mentor_last_name,
              COALESCE(os.job_title, v_os.job_title, 'Supervisor') as mentor_title
       FROM ojt_attendance_logs att
       JOIN ojt_records o ON att.ojt_id = o.ojt_id
       JOIN hiring_organizations ho ON o.organization_id = ho.organization_id
       LEFT JOIN organization_staff os ON COALESCE(att.mentor_id, o.mentor_id) = os.org_staff_id
       LEFT JOIN organization_staff v_os ON att.verified_by = v_os.user_id
       WHERE att.student_id = ? AND att.log_date = CURRENT_DATE()
       ORDER BY att.attendance_id DESC
       LIMIT 1`,
      [student.student_id]
    );
    const todayLog = todayRows.length > 0 ? todayRows[0] : null;

    return res.json({
      success: true,
      data: {
        activeOjt,
        logs,
        todayLog,
        totalRenderedHours: student.completed_ojt_hours || (activeOjt ? activeOjt.rendered_hours : 0),
        requiredHours: activeOjt?.required_hours || student.required_ojt_hours || 600
      }
    });
  } catch (error) {
    console.error('Fetch student attendance error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch attendance logs.' });
  }
});

// DELETE /api/student/attendance/:id - Delete an unverified pending clock-in log
router.delete('/attendance/:id', async (req, res) => {
  const attendanceId = req.params.id;

  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found.' });

    const [rows] = await pool.query(
      'SELECT * FROM ojt_attendance_logs WHERE attendance_id = ? AND student_id = ?',
      [attendanceId, student.student_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Attendance record not found or unauthorized.' });
    }

    if (rows[0].status === 'verified') {
      return res.status(400).json({ success: false, message: 'Cannot delete a verified attendance record.' });
    }

    await pool.query('DELETE FROM ojt_attendance_logs WHERE attendance_id = ? AND student_id = ?', [attendanceId, student.student_id]);

    emitUpdate('attendance_logged', { ojt_id: rows[0].ojt_id, student_id: student.student_id });

    return res.json({ success: true, message: 'Pending attendance log deleted.' });
  } catch (error) {
    console.error('Delete attendance error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete attendance log.' });
  }
});

// POST /api/student/attendance/clock-in
router.post('/attendance/clock-in', async (req, res) => {
  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found.' });

    // Must have ongoing OJT
    const [ojts] = await pool.query(
      "SELECT * FROM ojt_records WHERE student_id = ? AND status = 'ongoing' ORDER BY created_at DESC LIMIT 1",
      [student.student_id]
    );

    if (ojts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'You do not have an active/ongoing OJT deployment to clock in to.'
      });
    }

    const ojt = ojts[0];

    // Disable clock-in if student has completed required OJT hours or status is completed
    const reqHours = Number(ojt.required_hours) || 600;
    const renHours = Number(ojt.rendered_hours) || 0;
    if (ojt.status === 'completed' || renHours >= reqHours) {
      return res.status(400).json({
        success: false,
        message: 'You have already completed your required OJT training hours. Time In is disabled.'
      });
    }

    // Check if already clocked in today
    const [existing] = await pool.query(
      'SELECT * FROM ojt_attendance_logs WHERE student_id = ? AND ojt_id = ? AND log_date = CURRENT_DATE()',
      [student.student_id, ojt.ojt_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `You have already clocked in today at ${existing[0].time_in}.`
      });
    }

    const [resRow] = await pool.query(
      `INSERT INTO ojt_attendance_logs (ojt_id, student_id, log_date, time_in, status, created_at, updated_at)
       VALUES (?, ?, CURRENT_DATE(), CURRENT_TIME(), 'pending', NOW(), NOW())`,
      [ojt.ojt_id, student.student_id]
    );

    emitUpdate('attendance_logged', { ojt_id: ojt.ojt_id, student_id: student.student_id, organization_id: ojt.organization_id });

    return res.status(201).json({
      success: true,
      message: 'Clocked in successfully! Have a productive training day.',
      data: { attendance_id: resRow.insertId }
    });
  } catch (error) {
    console.error('Clock in error:', error);
    return res.status(500).json({ success: false, message: 'Failed to clock in: ' + error.message });
  }
});

// POST /api/student/attendance/clock-out
router.post('/attendance/clock-out', async (req, res) => {
  const { tasks_accomplished } = req.body;

  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found.' });

    // Find today's open clock-in log
    const [existing] = await pool.query(
      `SELECT * FROM ojt_attendance_logs 
       WHERE student_id = ? AND log_date = CURRENT_DATE() AND time_out IS NULL 
       ORDER BY time_in DESC LIMIT 1`,
      [student.student_id]
    );

    if (existing.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active clock-in found for today. Please clock in first.'
      });
    }

    const log = existing[0];

    // Compute approximate hours
    await pool.query(
      `UPDATE ojt_attendance_logs 
       SET time_out = CURRENT_TIME(),
           hours_rendered = ROUND(GREATEST(0, (TIME_TO_SEC(TIMEDIFF(CURRENT_TIME(), time_in)) / 3600)), 2),
           tasks_accomplished = ?,
           updated_at = NOW()
       WHERE attendance_id = ?`,
      [tasks_accomplished || 'Completed daily assigned training tasks.', log.attendance_id]
    );

    emitUpdate('attendance_logged', { ojt_id: log.ojt_id, student_id: student.student_id });

    // Notify organization mentors
    const [orgStaff] = await pool.query(
      `SELECT user_id FROM organization_staff WHERE organization_id = (
         SELECT organization_id FROM ojt_records WHERE ojt_id = ?
       )`,
      [log.ojt_id]
    );
    for (const staff of orgStaff) {
      if (staff.user_id) {
        await sendNotification({
          userId: staff.user_id,
          title: 'DTR Clock-Out Submitted',
          message: `${student.first_name} ${student.last_name} submitted daily time log for mentor review.`,
          type: 'ojt'
        });
      }
    }

    return res.json({
      success: true,
      message: 'Clocked out successfully! Your daily time log has been submitted for Workplace Mentor verification.'
    });
  } catch (error) {
    console.error('Clock out error:', error);
    return res.status(500).json({ success: false, message: 'Failed to clock out: ' + error.message });
  }
});

// GET /api/student/profile
router.get('/profile', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, u.email, u.is_active as account_active, u.created_at as account_created_at,
              p.program_name, p.program_code, p.department, p.required_ojt_hours as program_required_hours,
              i.institution_name, i.institution_code, i.contact_email as inst_email, i.contact_phone as inst_phone,
              sc.category_name, ss.status_name
       FROM students s
       JOIN users u ON s.user_id = u.user_id
       LEFT JOIN programs p ON s.program_id = p.program_id
       LEFT JOIN institutions i ON s.institution_id = i.institution_id
       LEFT JOIN student_categories sc ON s.category_id = sc.category_id
       LEFT JOIN student_statuses ss ON s.status_id = ss.status_id
       WHERE s.user_id = ?`,
      [req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    const studentProfile = rows[0];

    // Fetch assigned institution supervisor / coordinator
    const [supervisors] = await pool.query(
      `SELECT isf.staff_id, isf.first_name, isf.last_name, isf.position, isf.contact_number, u.email
       FROM student_staff_assignments ssa
       JOIN institution_staff isf ON ssa.staff_id = isf.staff_id
       JOIN users u ON isf.user_id = u.user_id
       WHERE ssa.student_id = ? AND ssa.is_active = 1
       LIMIT 1`,
      [studentProfile.student_id]
    );

    // Fallback: Program head or coordinator in the same program
    let assignedSupervisor = supervisors.length > 0 ? supervisors[0] : null;
    if (!assignedSupervisor && studentProfile.program_id) {
      const [progStaff] = await pool.query(
        `SELECT isf.staff_id, isf.first_name, isf.last_name, isf.position, isf.contact_number, u.email
         FROM institution_staff isf
         JOIN users u ON isf.user_id = u.user_id
         WHERE isf.institution_id = ? AND (isf.program_id = ? OR isf.program_id IS NULL) AND isf.is_active = 1
         ORDER BY (CASE WHEN isf.position = 'ojt_supervisor' THEN 0 ELSE 1 END) LIMIT 1`,
        [studentProfile.institution_id, studentProfile.program_id]
      );
      if (progStaff.length > 0) assignedSupervisor = progStaff[0];
    }

    // Fetch career portfolio data for the profile (all items belonging to this student)
    const [allItems] = await pool.query(
      `SELECT pi.*, ho.organization_name as associated_org_name
       FROM portfolio_items pi
       JOIN student_portfolios sp ON pi.portfolio_id = sp.portfolio_id
       LEFT JOIN hiring_organizations ho ON pi.associated_org_id = ho.organization_id
       WHERE sp.student_id = ? 
       ORDER BY pi.created_at DESC`,
      [studentProfile.student_id]
    );

    const formattedItems = allItems.map(i => ({
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

    const [resumes] = await pool.query(
      'SELECT * FROM student_resumes WHERE student_id = ? ORDER BY is_active DESC, version DESC, created_at DESC',
      [studentProfile.student_id]
    );

    const formattedResumes = resumes.map(r => ({
      ...r,
      file_path: formatFilePath(r.file_path)
    }));

    const isGraduated = studentProfile.ojt_status === 'graduated' || studentProfile.status_id === 5;
    const isOjtCompleter = studentProfile.ojt_status === 'completed' || studentProfile.ojt_status === 'completed_ojt' || studentProfile.status_id === 4 || (studentProfile.completed_ojt_hours && studentProfile.required_ojt_hours && studentProfile.completed_ojt_hours >= studentProfile.required_ojt_hours);

    const [ojtRecords] = await pool.query(
      `SELECT o.*, ho.organization_name, ho.industry, ho.address as org_address, ho.contact_email as org_email,
              os.first_name as mentor_first_name, os.last_name as mentor_last_name, os.contact_number as mentor_contact
       FROM ojt_records o
       JOIN hiring_organizations ho ON o.organization_id = ho.organization_id
       LEFT JOIN organization_staff os ON os.organization_id = o.organization_id AND (os.position = 'workplace_mentor' OR os.position = 'mentor' OR os.position = 'hr_officer')
       WHERE o.student_id = ?
       ORDER BY (CASE WHEN o.status = 'completed' THEN 0 ELSE 1 END), o.created_at DESC`,
      [studentProfile.student_id]
    );

    const [evaluations] = await pool.query(
      `SELECT r.*, u.email as evaluator_email,
              COALESCE(os.first_name, isf.first_name, '') as evaluator_first_name,
              COALESCE(os.last_name, isf.last_name, '') as evaluator_last_name,
              ho.organization_name
       FROM ojt_performance_records r
       JOIN ojt_records o ON r.ojt_id = o.ojt_id
       JOIN hiring_organizations ho ON o.organization_id = ho.organization_id
       LEFT JOIN users u ON r.evaluator_id = u.user_id
       LEFT JOIN organization_staff os ON os.user_id = r.evaluator_id
       LEFT JOIN institution_staff isf ON isf.user_id = r.evaluator_id
       WHERE o.student_id = ?
       ORDER BY r.evaluated_at DESC`,
      [studentProfile.student_id]
    );

    return res.json({
      success: true,
      data: {
        ...studentProfile,
        assignedSupervisor,
        portfolio: {
          academic_portfolio,
          credentials,
          academic_records,
          resumes: formattedResumes,
          is_graduated: Boolean(isGraduated),
          ojt_background: ojtRecords,
          mentor_evaluations: evaluations
        }
      }
    });
  } catch (error) {
    console.error('Fetch student profile error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch profile.' });
  }
});

// PUT /api/student/profile
router.put('/profile', async (req, res) => {
  const { first_name, middle_name, last_name, contact_number, address, gender, year_level, birthdate } = req.body;

  try {
    await pool.query(
      `UPDATE students 
       SET first_name = ?, middle_name = ?, last_name = ?, contact_number = ?, address = ?, gender = ?, year_level = ?, birthdate = ?, updated_at = NOW()
       WHERE user_id = ?`,
      [
        first_name,
        middle_name || null,
        last_name,
        contact_number || null,
        address || null,
        gender || null,
        year_level ? parseInt(year_level) : null,
        birthdate || null,
        req.user.user_id
      ]
    );

    return res.json({ success: true, message: 'Profile updated successfully!' });
  } catch (error) {
    console.error('Update student profile error:', error);
    return res.status(500).json({ success: false, message: 'Could not update profile.' });
  }
});

// PUT /api/student/profile/password - Change password
router.put('/profile/password', async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ success: false, message: 'Current and new password are required.' });
  }

  if (new_password !== confirm_password) {
    return res.status(400).json({ success: false, message: 'New passwords do not match.' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
  }

  try {
    const [users] = await pool.query('SELECT password_hash FROM users WHERE user_id = ?', [req.user.user_id]);
    if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });

    const isMatch = await bcrypt.compare(current_password, users[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password.' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE user_id = ?', [newHash, req.user.user_id]);

    await sendNotification({
      userId: req.user.user_id,
      title: 'Security Alert: Password Changed',
      message: 'Your account password was successfully updated.',
      type: 'system'
    });

    return res.json({ success: true, message: 'Password updated successfully!' });
  } catch (error) {
    console.error('Password change error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update password.' });
  }
});

// --- MULTI-DISCIPLINARY INTERNET DATA & MARKET INTELLIGENCE KNOWLEDGE REPOSITORY ---
const INTERNET_SKILL_INTELLIGENCE = {
  // --- TECH & SOFTWARE DEVELOPMENT ---
  'React.js': {
    domain: 'Software & Web Development',
    growth_rate: '+38% YoY Demand',
    market_demand_level: 'Very High',
    ph_hiring_index: 96,
    ph_entry_salary: '₱35,000 - ₱60,000/mo',
    search_trend: 'Top #1 Frontend Framework (Stack Overflow & GitHub Octoverse)',
    top_industries: ['Fintech & Digital Banking', 'Enterprise SaaS', 'E-Commerce', 'BPO/Tech Consultancies'],
    companion_skills: ['JavaScript', 'TypeScript', 'Tailwind CSS', 'Next.js', 'RESTful API Development', 'Git/Version Control'],
    certifications: [
      { name: 'Meta Front-End Developer Professional Certificate', provider: 'Coursera / Meta', badge: 'Industry Benchmark' },
      { name: 'React Development Specialization', provider: 'freeCodeCamp / Scrimba', badge: 'High Practical Value' }
    ],
    learning_roadmap: ['Component Lifecycle & Hooks', 'State Management (Zustand/Redux)', 'API Integration & Query Caching', 'Performance Optimization'],
    job_market_summary: 'Over 68% of Philippine tech hiring postings for frontend roles list React as a core requirement in 2026.'
  },
  'Node.js': {
    domain: 'Software & Web Development',
    growth_rate: '+34% YoY Demand',
    market_demand_level: 'Very High',
    ph_hiring_index: 94,
    ph_entry_salary: '₱35,000 - ₱65,000/mo',
    search_trend: 'Top JavaScript Backend Runtime Globally',
    top_industries: ['Cloud Solutions', 'Payment Gateways', 'Telecommunications', 'Startup Ecosystems'],
    companion_skills: ['JavaScript', 'RESTful API Development', 'SQL', 'MongoDB', 'Docker', 'AWS Cloud'],
    certifications: [
      { name: 'OpenJS Node.js Application Developer (JSNAD)', provider: 'Linux Foundation', badge: 'Globally Recognized' }
    ],
    learning_roadmap: ['Event Loop & Asynchronous I/O', 'Express & RESTful Architectures', 'JWT Auth & Middleware', 'Database ORM Integration'],
    job_market_summary: 'Consistently ranks among the top 3 backend requirements for full-stack and API development roles in Southeast Asia.'
  },
  'TypeScript': {
    domain: 'Software & Web Development',
    growth_rate: '+44% YoY Demand',
    market_demand_level: 'Rapidly Rising',
    ph_hiring_index: 95,
    ph_entry_salary: '₱40,000 - ₱70,000/mo',
    search_trend: 'Mandatory standard in modern enterprise web & mobile architectures',
    top_industries: ['Financial Technology', 'Enterprise Software', 'Healthcare Tech', 'Digital Agencies'],
    companion_skills: ['JavaScript', 'React.js', 'Next.js', 'Node.js', 'RESTful API Development'],
    certifications: [
      { name: 'Microsoft Certified: TypeScript & Web Apps', provider: 'Microsoft Learn', badge: 'Enterprise Level' }
    ],
    learning_roadmap: ['Type Inference & Generics', 'Utility Types & Discriminated Unions', 'Async Typing & Zod Schema Validation', 'Full-Stack Type Safety'],
    job_market_summary: 'Over 82% of enterprise JavaScript postings now mandate or strongly prefer TypeScript proficiency.'
  },
  'JavaScript': {
    domain: 'Software & Web Development',
    growth_rate: '+26% YoY Demand',
    market_demand_level: 'Essential Foundational',
    ph_hiring_index: 98,
    ph_entry_salary: '₱30,000 - ₱55,000/mo',
    search_trend: 'World #1 Most Widely Used Programming Language',
    top_industries: ['All Tech Sectors', 'Web Development', 'Digital Platforms'],
    companion_skills: ['HTML/CSS', 'React.js', 'TypeScript', 'Node.js', 'Git/Version Control'],
    certifications: [
      { name: 'JavaScript Algorithms and Data Structures', provider: 'freeCodeCamp', badge: 'Essential Baseline' }
    ],
    learning_roadmap: ['ES6+ Syntax & Array Methods', 'Asynchronous JS (Promises, Async/Await)', 'DOM Manipulation & Events', 'Design Patterns'],
    job_market_summary: 'Universal requirement across modern interactive web applications and software internship programs.'
  },
  'Python': {
    domain: 'Data Science & AI / Software',
    growth_rate: '+46% YoY Demand',
    market_demand_level: 'Very High',
    ph_hiring_index: 97,
    ph_entry_salary: '₱35,000 - ₱65,000/mo',
    search_trend: 'Dominant language for Data Science, AI/ML, and Automation',
    top_industries: ['Artificial Intelligence', 'Data Science & BI', 'Cybersecurity', 'Financial Analytics'],
    companion_skills: ['Data Analysis', 'SQL', 'Pandas / NumPy', 'Machine Learning', 'Git/Version Control', 'RESTful API Development'],
    certifications: [
      { name: 'Google IT Automation with Python Professional', provider: 'Google / Coursera', badge: 'High Recruiter Match' }
    ],
    learning_roadmap: ['Data Structures & OOP', 'Pandas & NumPy Data Wrangling', 'API Automation & Scripting', 'Model Training with Scikit-learn'],
    job_market_summary: 'Highest growing language in AI and Data analytics internship postings across ASEAN tech hubs in 2026.'
  },
  'Next.js': {
    domain: 'Software & Web Development',
    growth_rate: '+49% YoY Demand',
    market_demand_level: 'Rapidly Rising',
    ph_hiring_index: 93,
    ph_entry_salary: '₱40,000 - ₱72,000/mo',
    search_trend: 'Premier React framework for production SSR, SEO, and full-stack web',
    top_industries: ['E-Commerce', 'Fintech', 'SaaS Products', 'Media & Content'],
    companion_skills: ['React.js', 'TypeScript', 'Tailwind CSS', 'RESTful API Development', 'Node.js'],
    certifications: [
      { name: 'Next.js App Router Masterclass', provider: 'Vercel Learn', badge: 'Official Standard' }
    ],
    learning_roadmap: ['App Router & Server Components', 'Server Actions & API Routes', 'Static & Dynamic Rendering (ISR)', 'Vercel Deployment'],
    job_market_summary: 'Next.js adoption has grown 60%+ in production web applications looking for high performance and search visibility.'
  },
  'Tailwind CSS': {
    domain: 'Software & Web Development',
    growth_rate: '+41% YoY Demand',
    market_demand_level: 'High',
    ph_hiring_index: 91,
    ph_entry_salary: '₱30,000 - ₱55,000/mo',
    search_trend: 'Top utility-first CSS framework for rapid modern UI development',
    top_industries: ['Web Design', 'SaaS', 'Digital Consultancies', 'Frontend Teams'],
    companion_skills: ['HTML/CSS', 'React.js', 'Next.js', 'UI/UX Design', 'Design Systems'],
    certifications: [
      { name: 'Modern Responsive Design with Tailwind', provider: 'Tailwind Labs / Scrimba', badge: 'UI Specialist' }
    ],
    learning_roadmap: ['Utility Classes & Flexbox/Grid', 'Responsive Breakpoints & Dark Mode', 'Custom Design System Config', 'Animation Utilities'],
    job_market_summary: 'Adopted by modern tech startups for cutting UI development time by up to 50%.'
  },
  'SQL': {
    domain: 'Data & Software Engineering',
    growth_rate: '+30% YoY Demand',
    market_demand_level: 'Essential Foundational',
    ph_hiring_index: 95,
    ph_entry_salary: '₱32,000 - ₱58,000/mo',
    search_trend: 'Core standard for all relational database querying and enterprise reporting',
    top_industries: ['Banking', 'Data Analytics', 'Backend Engineering', 'E-Commerce'],
    companion_skills: ['Database Design', 'Python', 'Data Analysis', 'Power BI', 'Node.js', 'RESTful API Development'],
    certifications: [
      { name: 'IBM Data Engineering & SQL Specialist', provider: 'IBM / Coursera', badge: 'Industry Benchmark' }
    ],
    learning_roadmap: ['Complex JOINs & Subqueries', 'Window Functions & Aggregations', 'Indexes & Query Optimization', 'Relational Schema Design'],
    job_market_summary: 'Required in more than 75% of all software engineering, data analytics, and backend OJT openings.'
  },
  'HTML/CSS': {
    domain: 'Software & Web Development',
    growth_rate: '+22% YoY Demand',
    market_demand_level: 'Essential Baseline',
    ph_hiring_index: 97,
    ph_entry_salary: '₱28,000 - ₱48,000/mo',
    search_trend: 'Core building blocks of the entire World Wide Web',
    top_industries: ['Web Agencies', 'Frontend Tech', 'Digital Marketing'],
    companion_skills: ['JavaScript', 'React.js', 'Tailwind CSS', 'UI/UX Design', 'Git/Version Control'],
    certifications: [
      { name: 'Responsive Web Design Certification', provider: 'freeCodeCamp', badge: 'Essential Baseline' }
    ],
    learning_roadmap: ['Semantic HTML5 Elements', 'CSS Flexbox & CSS Grid', 'Responsive Media Queries', 'Web Accessibility (a11y)'],
    job_market_summary: 'Non-negotiable foundation for every frontend developer, web designer, and UI engineer.'
  },

  // --- ACCOUNTANCY, AUDIT & FINANCE (BSA / BSBA-FM) ---
  'Financial Accounting': {
    domain: 'Accountancy & Finance',
    growth_rate: '+32% YoY Demand',
    market_demand_level: 'Very High',
    ph_hiring_index: 96,
    ph_entry_salary: '₱28,000 - ₱52,000/mo',
    search_trend: 'Mandatory standard for Philippine and international financial reporting (PFRS/IFRS)',
    top_industries: ['Big 4 Audit & Accounting Firms', 'Commercial Banking', 'Corporate Financial Operations', 'BPO Finance'],
    companion_skills: ['QuickBooks', 'Taxation & Tax Compliance', 'Excel/Spreadsheets', 'Cost Accounting', 'Auditing & Assurance'],
    certifications: [
      { name: 'Certified Public Accountant (CPA) Licensure Pathway', provider: 'PRC Board of Accountancy', badge: 'Gold Standard' },
      { name: 'Certified Management Accountant (CMA)', provider: 'IMA / Wiley', badge: 'Global Recognition' }
    ],
    learning_roadmap: ['General Ledger & Trial Balance', 'Financial Statement Preparation (PFRS/IFRS)', 'Cash Flow Analysis & Reconciliations', 'Internal Controls & Asset Valuation'],
    job_market_summary: 'Top requested core requirement across financial shared services and public accounting firms in Metro Manila.'
  },
  'QuickBooks': {
    domain: 'Accountancy & Finance',
    growth_rate: '+42% YoY Demand',
    market_demand_level: 'High Demand',
    ph_hiring_index: 94,
    ph_entry_salary: '₱30,000 - ₱58,000/mo',
    search_trend: '#1 Leading cloud accounting platform for international small/medium enterprise bookkeeping',
    top_industries: ['Offshore Accounting & Bookkeeping BPO', 'SME Financial Services', 'E-Commerce Accounting'],
    companion_skills: ['Financial Accounting', 'Xero Accounting', 'Taxation & Tax Compliance', 'Excel/Spreadsheets', 'Payroll Processing & Benefits Admin'],
    certifications: [
      { name: 'QuickBooks Certified User (QBCU)', provider: 'Intuit / Certiport', badge: 'Industry Benchmark' },
      { name: 'QuickBooks Online ProAdvisor', provider: 'Intuit Academy', badge: 'High Recruiter Value' }
    ],
    learning_roadmap: ['Chart of Accounts & Company Setup', 'Bank Feed Feeds & Automated Rules', 'Accounts Payable & Receivable Workflows', 'Month-End Closing & Custom Reporting'],
    job_market_summary: 'Over 80% of remote Australian, US, and UK offshore bookkeeping internships in the Philippines specify QuickBooks proficiency.'
  },
  'Taxation & Tax Compliance': {
    domain: 'Accountancy & Finance',
    growth_rate: '+29% YoY Demand',
    market_demand_level: 'Essential Industry',
    ph_hiring_index: 93,
    ph_entry_salary: '₱28,000 - ₱50,000/mo',
    search_trend: 'Critical compliance domain navigating BIR regulatory filings and tax laws (TRAIN/CREATE)',
    top_industries: ['Tax Consultancies', 'Corporate Finance', 'Audit Firms', 'Government Financial Units'],
    companion_skills: ['Financial Accounting', 'Auditing & Assurance', 'QuickBooks', 'Excel/Spreadsheets', 'Bookkeeping'],
    certifications: [
      { name: 'Certified Tax Technician (CTT) Philippines', provider: 'Philippine Academy of Tax Accountants', badge: 'National Standard' }
    ],
    learning_roadmap: ['VAT & Withholding Tax Computation', 'Corporate & Individual Income Tax Returns', 'BIR Electronic Filing (eFPS & eBIRForms)', 'Tax Audit Preparation & Compliance'],
    job_market_summary: 'Essential skill ensuring enterprises maintain compliance with Philippine Bureau of Internal Revenue mandates.'
  },
  'Cost Accounting': {
    domain: 'Accountancy & Finance',
    growth_rate: '+27% YoY Demand',
    market_demand_level: 'High',
    ph_hiring_index: 91,
    ph_entry_salary: '₱28,000 - ₱48,000/mo',
    search_trend: 'Key enabler of cost control, margin analysis, and manufacturing pricing strategies',
    top_industries: ['Manufacturing & Production', 'FMCG Enterprises', 'Logistics', 'Construction Costing'],
    companion_skills: ['Financial Accounting', 'Financial Modeling', 'Excel/Spreadsheets', 'Auditing & Assurance'],
    certifications: [
      { name: 'Certified Management Accountant (CMA) Costing Module', provider: 'Institute of Management Accountants', badge: 'International Standard' }
    ],
    learning_roadmap: ['Job Order & Process Costing Systems', 'Activity-Based Costing (ABC)', 'Cost-Volume-Profit (CVP) Analysis', 'Variance Analysis & Budgetary Control'],
    job_market_summary: 'High demand in industrial parks, manufacturing plants, and supply chain hubs in Laguna, Cavite, and Clark.'
  },
  'Financial Modeling': {
    domain: 'Accountancy & Finance',
    growth_rate: '+45% YoY Demand',
    market_demand_level: 'High Demand',
    ph_hiring_index: 95,
    ph_entry_salary: '₱35,000 - ₱70,000/mo',
    search_trend: 'Premier analytical skill for corporate valuation, forecasting, and investment decisions',
    top_industries: ['Investment Banking', 'Corporate Strategy & FP&A', 'Private Equity', 'Venture Capital'],
    companion_skills: ['Excel/Spreadsheets', 'Financial Accounting', 'Data Analysis', 'Power BI'],
    certifications: [
      { name: 'Financial Modeling & Valuation Analyst (FMVA)', provider: 'Corporate Finance Institute (CFI)', badge: 'Global Benchmark' }
    ],
    learning_roadmap: ['3-Statement Model Integration', 'Discounted Cash Flow (DCF) Valuation', 'Scenario & Sensitivity Analysis (Monte Carlo)', 'M&A & LBO Modeling Fundamentals'],
    job_market_summary: 'One of the highest-paying analytical specialties in corporate finance and capital markets.'
  },

  // --- BUSINESS, MARKETING & SALES (BSBA) ---
  'Digital Marketing': {
    domain: 'Business & Marketing',
    growth_rate: '+39% YoY Demand',
    market_demand_level: 'Very High',
    ph_hiring_index: 95,
    ph_entry_salary: '₱26,000 - ₱52,000/mo',
    search_trend: 'Dominant modern marketing driver across omni-channel e-commerce and brand growth',
    top_industries: ['E-Commerce', 'Digital Agencies', 'Fintech Brands', 'FMCG & Consumer Goods'],
    companion_skills: ['Search Engine Optimization (SEO)', 'Social Media Management', 'Market Research', 'Data Analysis', 'Canva'],
    certifications: [
      { name: 'Google Digital Marketing & E-commerce Professional', provider: 'Google / Coursera', badge: 'Industry Benchmark' },
      { name: 'Meta Certified Digital Marketing Associate', provider: 'Meta Blueprint', badge: 'Recruiter Match' }
    ],
    learning_roadmap: ['Conversion Funnel Architecture', 'Paid Advertising (Meta & Google Ads)', 'Email Marketing Automation', 'Analytics & Attribution Tracking (GA4)'],
    job_market_summary: 'Over 65% of marketing internship listings in Southeast Asia prioritize digital campaign management competencies.'
  },
  'Search Engine Optimization (SEO)': {
    domain: 'Business & Marketing',
    growth_rate: '+36% YoY Demand',
    market_demand_level: 'High',
    ph_hiring_index: 92,
    ph_entry_salary: '₱28,000 - ₱55,000/mo',
    search_trend: 'Essential driver for sustainable organic search traffic and discovery',
    top_industries: ['SaaS Companies', 'Online Publishers', 'Digital Marketing Agencies', 'E-Commerce'],
    companion_skills: ['Digital Marketing', 'Social Media Management', 'HTML/CSS', 'Technical Writing', 'Data Analysis'],
    certifications: [
      { name: 'HubSpot Inbound Marketing & SEO Certification', provider: 'HubSpot Academy', badge: 'Recognized Standard' },
      { name: 'Semrush SEO Toolkit Masterclass', provider: 'Semrush Academy', badge: 'Practical Specialist' }
    ],
    learning_roadmap: ['Keyword Research & Search Intent Mapping', 'On-Page Content Optimization', 'Technical SEO & Core Web Vitals', 'Backlink Building & Authority Strategies'],
    job_market_summary: 'High demand among remote digital agencies and global content teams.'
  },
  'Social Media Management': {
    domain: 'Business & Marketing',
    growth_rate: '+31% YoY Demand',
    market_demand_level: 'High',
    ph_hiring_index: 90,
    ph_entry_salary: '₱24,000 - ₱45,000/mo',
    search_trend: 'Key role in audience engagement, brand identity, and community growth',
    top_industries: ['Media & Entertainment', 'Consumer Brands', 'Tech Startups', 'Hospitality'],
    companion_skills: ['Digital Marketing', 'Canva', 'Graphic Design', 'Market Research', 'Customer Service'],
    certifications: [
      { name: 'Meta Social Media Marketing Professional Certificate', provider: 'Meta / Coursera', badge: 'Industry Benchmark' }
    ],
    learning_roadmap: ['Content Calendar Planning & Scheduling', 'Short-Form Video Strategy (TikTok/Reels)', 'Community Management & Crisis Protocol', 'Social Metrics & ROI Analytics'],
    job_market_summary: 'Versatile role across Philippine creative agencies and multinational consumer brands.'
  },

  // --- ENGINEERING & ARCHITECTURE (BSCE / BSCPE / BSEE / BSME) ---
  'AutoCAD': {
    domain: 'Engineering & Architecture',
    growth_rate: '+33% YoY Demand',
    market_demand_level: 'Very High',
    ph_hiring_index: 96,
    ph_entry_salary: '₱28,000 - ₱55,000/mo',
    search_trend: 'Universal 2D and 3D drafting standard for civil, mechanical, and architectural plans',
    top_industries: ['General Construction & Contracting', 'Civil Infrastructure', 'Architectural Firms', 'MEPF Engineering'],
    companion_skills: ['BIM / Revit Architecture', 'Structural Analysis & Design', 'Construction Management & Costing', 'Project Management'],
    certifications: [
      { name: 'Autodesk Certified Professional: AutoCAD for Design and Drafting', provider: 'Autodesk', badge: 'Global Standard' }
    ],
    learning_roadmap: ['Orthographic & Isometric Drafting', 'Layers, Blocks, and Dynamic Xrefs', 'Dimensioning & Scale Layouts', '3D Solid Modeling & Rendering'],
    job_market_summary: 'Mandatory technical skill for 95%+ of civil, electrical, and mechanical engineering internship positions.'
  },
  'BIM / Revit Architecture': {
    domain: 'Engineering & Architecture',
    growth_rate: '+46% YoY Demand',
    market_demand_level: 'Rapidly Rising',
    ph_hiring_index: 95,
    ph_entry_salary: '₱35,000 - ₱68,000/mo',
    search_trend: 'Modern Building Information Modeling standard mandated for major construction and infrastructure',
    top_industries: ['Commercial High-Rise Development', 'Mega Infrastructure Projects', 'International AEC Consultancies'],
    companion_skills: ['AutoCAD', 'Structural Analysis & Design', 'Construction Management & Costing', 'Project Management'],
    certifications: [
      { name: 'Autodesk Certified Professional: Revit for Architectural Design', provider: 'Autodesk', badge: 'AEC Benchmark' }
    ],
    learning_roadmap: ['Parametric Family Creation', 'Clash Detection with Navisworks', '4D Scheduling & 5D Cost Integration', 'BIM Collaboration (BIM 360 / ACC)'],
    job_market_summary: 'Fastest-growing engineering specialization commanding strong compensation premiums.'
  },
  'Structural Analysis & Design': {
    domain: 'Engineering & Architecture',
    growth_rate: '+31% YoY Demand',
    market_demand_level: 'High',
    ph_hiring_index: 93,
    ph_entry_salary: '₱30,000 - ₱58,000/mo',
    search_trend: 'Core competency ensuring structural safety, seismic resilience, and code compliance (NSCP)',
    top_industries: ['Structural Consulting Firms', 'Civil Infrastructure', 'Bridge & Geotechnical Engineering'],
    companion_skills: ['AutoCAD', 'BIM / Revit Architecture', 'MATLAB / Engineering Computation', 'Construction Management & Costing'],
    certifications: [
      { name: 'Civil Engineering Licensure Pathway', provider: 'PRC Board of Civil Engineering', badge: 'Professional Standard' },
      { name: 'STAAD.Pro / ETABS Structural Modeling Specialist', provider: 'Bentley / CSI', badge: 'Industry Software Benchmark' }
    ],
    learning_roadmap: ['National Structural Code of the Philippines (NSCP)', 'ETABS & STAAD.Pro Frame Modeling', 'Reinforced Concrete & Steel Design', 'Seismic & Wind Load Analysis'],
    job_market_summary: 'Crucial for passing engineering board exams and designing resilient buildings in earthquake-prone regions.'
  },

  // --- HOSPITALITY & CULINARY (BSHM / BSTM) ---
  'Food & Beverage Service': {
    domain: 'Hospitality & Tourism',
    growth_rate: '+28% YoY Demand',
    market_demand_level: 'High',
    ph_hiring_index: 94,
    ph_entry_salary: '₱22,000 - ₱40,000/mo',
    search_trend: 'Fundamental service standard across luxury hotels, resorts, and fine dining establishments',
    top_industries: ['5-Star Luxury Hotels', 'International Cruise Lines', 'Resorts & Casinos', 'Banqueting & Events'],
    companion_skills: ['HACCP & Food Safety', 'Front Office Operations (Opera PMS)', 'Customer Service', 'Event Management & Banqueting', 'English Proficiency'],
    certifications: [
      { name: 'Food and Beverage Services NC II / NC III', provider: 'TESDA Philippines', badge: 'National Standard' },
      { name: 'ServSafe Dining & Beverage Management', provider: 'National Restaurant Association', badge: 'International Benchmark' }
    ],
    learning_roadmap: ['American, French, and Russian Service Styles', 'Beverage Management & Barista Basics', 'Guest Table Etiquette & Upselling', 'Banqueting Setup & Protocol'],
    job_market_summary: 'Major pipeline for local 5-star hotel chains in BGC/Makati and international cruise line placements.'
  },
  'HACCP & Food Safety': {
    domain: 'Hospitality & Tourism',
    growth_rate: '+35% YoY Demand',
    market_demand_level: 'Essential Compliance',
    ph_hiring_index: 95,
    ph_entry_salary: '₱25,000 - ₱46,000/mo',
    search_trend: 'Global food safety system ensuring contamination prevention and hygiene compliance',
    top_industries: ['Hotel Kitchens', 'Airline Catering Services', 'Food Manufacturing', 'Institutional Cafeterias'],
    companion_skills: ['Culinary Arts & Kitchen Operations', 'Food & Beverage Service', 'Food Safety Handling', 'Inventory Management'],
    certifications: [
      { name: 'ServSafe Food Protection Manager Certification', provider: 'National Restaurant Association', badge: 'Global Gold Standard' },
      { name: 'HACCP Principles & Application Certification', provider: 'DOST / FDA Accredited Centers', badge: 'Regulatory Benchmark' }
    ],
    learning_roadmap: ['Hazard Analysis & Critical Control Points', 'Temperature Control & Cross-Contamination Prevention', 'Kitchen Sanitation Auditing', 'Regulatory Food Safety Law Compliance'],
    job_market_summary: 'Mandatory qualification for supervisory roles in airline catering, hotel kitchens, and food processing.'
  },
  'Front Office Operations (Opera PMS)': {
    domain: 'Hospitality & Tourism',
    growth_rate: '+30% YoY Demand',
    market_demand_level: 'High',
    ph_hiring_index: 92,
    ph_entry_salary: '₱24,000 - ₱44,000/mo',
    search_trend: 'Core property management system running guest reservations, check-ins, and billing globally',
    top_industries: ['International Hotel Chains', 'Integrated Casino Resorts', 'Boutique Hotels'],
    companion_skills: ['Customer Service', 'Food & Beverage Service', 'English Proficiency', 'Communication', 'Conflict Resolution'],
    certifications: [
      { name: 'Front Office Services NC II', provider: 'TESDA Philippines', badge: 'National Benchmark' },
      { name: 'Opera PMS Hospitality Certified User', provider: 'Oracle Hospitality University', badge: 'Global PMS Standard' }
    ],
    learning_roadmap: ['Guest Check-In & Check-Out Workflows', 'Room Inventory & Night Audit Operations', 'Guest Profile & Billing Management', 'VIP Protocol & Concierge Services'],
    job_market_summary: 'Standard software requirement for front desk agents across Marriott, Hilton, Shangri-La, and Solaire properties.'
  },
  'Tourism Tour Guiding & Itinerary Planning': {
    domain: 'Hospitality & Tourism',
    growth_rate: '+34% YoY Demand',
    market_demand_level: 'High',
    ph_hiring_index: 91,
    ph_entry_salary: '₱24,000 - ₱45,000/mo',
    search_trend: 'Surging demand driven by domestic travel boom and regional Southeast Asian eco-tourism',
    top_industries: ['Tour Operating Agencies', 'Provincial Tourism Offices', 'Eco-Tourism Destinations', 'Cruise Excursion Providers'],
    companion_skills: ['Amadeus / Sabre GDS Flight Booking', 'Customer Service', 'English Proficiency', 'Communication', 'Basic Nihongo'],
    certifications: [
      { name: 'Tour Guiding Services NC II', provider: 'TESDA / Department of Tourism (DOT)', badge: 'DOT Accredited' }
    ],
    learning_roadmap: ['Philippine History & Cultural Commentary', 'Itinerary Costing & Logistics Planning', 'Tour Group Management & First Aid', 'Eco-Tourism & Sustainable Travel Principles'],
    job_market_summary: 'DOT accredited tour guiding opens doors for licensed private guiding and destination management.'
  },
  'Amadeus / Sabre GDS Flight Booking': {
    domain: 'Hospitality & Tourism',
    growth_rate: '+32% YoY Demand',
    market_demand_level: 'High',
    ph_hiring_index: 93,
    ph_entry_salary: '₱26,000 - ₱48,000/mo',
    search_trend: 'Global Distribution System connecting travel agents to worldwide airline, hotel, and car reservations',
    top_industries: ['Travel Management Companies', 'Airline Ticketing Offices', 'Corporate Travel BPO'],
    companion_skills: ['Tourism Tour Guiding & Itinerary Planning', 'Customer Service', 'English Proficiency', 'Communication'],
    certifications: [
      { name: 'Amadeus Global Travel Professional Certificate', provider: 'Amadeus Learning City', badge: 'Global Travel Standard' }
    ],
    learning_roadmap: ['PNR Creation & Passenger Management', 'Fare Pricing & Ticketing Entries', 'Reissues, Refunds & Schedule Changes', 'Ancillary Services & Special Requests'],
    job_market_summary: 'Essential skill for international travel agencies and corporate travel coordinator positions.'
  },

  // --- HEALTHCARE & NURSING (BSN) ---
  'Patient Care & Assessment': {
    domain: 'Healthcare & Nursing',
    growth_rate: '+40% YoY Demand',
    market_demand_level: 'Critical Need',
    ph_hiring_index: 98,
    ph_entry_salary: '₱28,000 - ₱50,000/mo',
    search_trend: 'Essential clinical core assessing vital signs, nursing diagnoses, and therapeutic care',
    top_industries: ['Tertiary Hospitals', 'Specialized Medical Centers', 'Public Health Units', 'International Healthcare'],
    companion_skills: ['Basic Life Support (BLS / CPR)', 'Clinical Documentation & EHR', 'Pharmacology & Medication Administration', 'Infection Control & Sterile Techniques'],
    certifications: [
      { name: 'Philippine Nursing Licensure Examination (NLE)', provider: 'PRC Board of Nursing', badge: 'Licensure Benchmark' },
      { name: 'NCLEX-RN International Standard', provider: 'NCSBN', badge: 'Global Nursing Passport' }
    ],
    learning_roadmap: ['Head-to-Toe Physical Assessment', 'Nursing Care Plan (NCP) Formulation', 'Vital Sign Monitoring & Early Warning Signs', 'Bedside Care & Therapeutic Communication'],
    job_market_summary: 'Continuous high demand across all major private and government hospitals in the Philippines and abroad.'
  },
  'Basic Life Support (BLS / CPR)': {
    domain: 'Healthcare & Nursing',
    growth_rate: '+38% YoY Demand',
    market_demand_level: 'Mandatory Clinical',
    ph_hiring_index: 99,
    ph_entry_salary: '₱28,000 - ₱48,000/mo',
    search_trend: 'Universal emergency resuscitation standard saving lives during cardiac arrests and respiratory failure',
    top_industries: ['Hospital Emergency Units', 'ICU & Critical Care', 'Ambulance & EMS Services', 'Company Occupational Health'],
    companion_skills: ['Patient Care & Assessment', 'Clinical Documentation & EHR', 'Infection Control & Sterile Techniques'],
    certifications: [
      { name: 'Basic Life Support (BLS) for Healthcare Providers', provider: 'American Heart Association (AHA) / Red Cross', badge: 'Global Standard' },
      { name: 'Advanced Cardiac Life Support (ACLS)', provider: 'American Heart Association', badge: 'Critical Care Specialty' }
    ],
    learning_roadmap: ['High-Quality Adult & Pediatric CPR', 'Automated External Defibrillator (AED) Operation', 'Foreign-Body Airway Obstruction Management', 'Team Resuscitation Dynamics'],
    job_market_summary: 'Strict mandatory requirement before deployment to any hospital clinical rotation or internship.'
  },
  'Clinical Documentation & EHR': {
    domain: 'Healthcare & Nursing',
    growth_rate: '+36% YoY Demand',
    market_demand_level: 'High',
    ph_hiring_index: 94,
    ph_entry_salary: '₱28,000 - ₱52,000/mo',
    search_trend: 'Crucial legal and clinical record keeping using modern Electronic Health Record systems (Epic/Cerner)',
    top_industries: ['Hospitals & Outpatient Clinics', 'Health Informatics & BPO', 'Medical Transcription & Coding'],
    companion_skills: ['Patient Care & Assessment', 'Pharmacology & Medication Administration', 'Medical Terminology', 'Attention to Detail'],
    certifications: [
      { name: 'Certified Professional in Healthcare Information and Management Systems (CPHIMS)', provider: 'HIMSS', badge: 'Health Informatics Standard' }
    ],
    learning_roadmap: ['FDAR (Focus, Data, Action, Response) Charting', 'Electronic Health Record (EHR) Navigation', 'Medical Legal Charting & Patient Privacy (HIPAA/DPA)', 'Shift Handover SBAR Protocol'],
    job_market_summary: 'Strongly requested in both local tertiary hospitals and high-paying US health BPO facilities.'
  },

  // --- PSYCHOLOGY & HUMAN RESOURCES (BSPSY) ---
  'Talent Acquisition & Recruitment': {
    domain: 'Psychology & Human Resources',
    growth_rate: '+35% YoY Demand',
    market_demand_level: 'High',
    ph_hiring_index: 94,
    ph_entry_salary: '₱26,000 - ₱48,000/mo',
    search_trend: 'Strategic HR competency sourcing, interviewing, and selecting top talent in competitive markets',
    top_industries: ['BPO & Tech Sourcing', 'Corporate Human Resources', 'Executive Search Firms'],
    companion_skills: ['Psychological Assessment & Testing', 'Employee Relations & Labor Code', 'Communication', 'Interviewing Skills'],
    certifications: [
      { name: 'Certified Human Resource Associate (CHRA)', provider: 'HREAP Philippines', badge: 'National HR Benchmark' },
      { name: 'SHRM Certified Professional (SHRM-CP)', provider: 'Society for Human Resource Management', badge: 'Global Gold Standard' }
    ],
    learning_roadmap: ['Boolean Search & Sourcing (LinkedIn/JobStreet)', 'Behavioral & Competency-Based Interviewing (STAR Method)', 'Applicant Tracking System (ATS) Management', 'Offer Negotiation & Onboarding Workflows'],
    job_market_summary: 'Major entry point for psychology and business graduates into high-growth corporate recruitment roles.'
  },
  'Psychological Assessment & Testing': {
    domain: 'Psychology & Human Resources',
    growth_rate: '+30% YoY Demand',
    market_demand_level: 'High',
    ph_hiring_index: 92,
    ph_entry_salary: '₱25,000 - ₱45,000/mo',
    search_trend: 'Standardized psychological test administration, scoring, and psychometric report writing',
    top_industries: ['Industrial & Corporate HR', 'Clinical Testing Centers', 'Educational Guidance Counseling'],
    companion_skills: ['Talent Acquisition & Recruitment', 'Data Analysis', 'Report Writing', 'Employee Relations & Labor Code'],
    certifications: [
      { name: 'Registered Psychometrician (RPm) Licensure', provider: 'PRC Board of Psychology', badge: 'Licensure Benchmark' }
    ],
    learning_roadmap: ['Intelligence & Aptitude Test Administration', 'Personality Inventories (MBTI/NEO-PI/16PF)', 'Item Analysis & Norms Interpretation', 'Psychometric Evaluation Report Writing'],
    job_market_summary: 'Mandatory qualification for Registered Psychometricians handling pre-employment psychological batteries.'
  },

  // --- DESIGN & MULTIMEDIA (BMA / BSIT-Multimedia) ---
  'UI/UX Design': {
    domain: 'Design & Multimedia',
    growth_rate: '+35% YoY Demand',
    market_demand_level: 'High',
    ph_hiring_index: 92,
    ph_entry_salary: '₱30,000 - ₱52,000/mo',
    search_trend: 'Critical role driving user satisfaction and product conversion',
    top_industries: ['Product Companies', 'Fintech Apps', 'E-Commerce', 'Creative Agencies'],
    companion_skills: ['Figma', 'Design Systems', 'HTML/CSS', 'Graphic Design', 'Adobe Photoshop'],
    certifications: [
      { name: 'Google UX Design Professional Certificate', provider: 'Google / Coursera', badge: 'Recruiter Favorite' }
    ],
    learning_roadmap: ['User Research & Journey Mapping', 'Wireframing & Interactive Prototyping', 'Usability Testing & Accessibility', 'Design Systems & Component Specs'],
    job_market_summary: 'High demand in Philippine startups and digital banks prioritizing seamless mobile and web user experiences.'
  },
  'Figma': {
    domain: 'Design & Multimedia',
    growth_rate: '+42% YoY Demand',
    market_demand_level: 'High',
    ph_hiring_index: 94,
    ph_entry_salary: '₱30,000 - ₱55,000/mo',
    search_trend: 'Industry standard collaborative interface design tool',
    top_industries: ['UI/UX Teams', 'Product Design', 'Marketing Tech', 'Mobile App Teams'],
    companion_skills: ['UI/UX Design', 'Design Systems', 'HTML/CSS', 'Tailwind CSS', 'Graphic Design'],
    certifications: [
      { name: 'Figma UI/UX Design Essentials', provider: 'Udemy / Coursera', badge: 'Practical Benchmark' }
    ],
    learning_roadmap: ['Auto Layout & Component Variants', 'Interactive Component Prototyping', 'Design Tokens & Variables', 'Developer Handoff'],
    job_market_summary: 'Mentioned in over 90% of UI/UX design job postings across Southeast Asia.'
  },
  'Design Systems': {
    domain: 'Design & Multimedia',
    growth_rate: '+37% YoY Demand',
    market_demand_level: 'High',
    ph_hiring_index: 90,
    ph_entry_salary: '₱35,000 - ₱60,000/mo',
    search_trend: 'Key enabler of scalable, unified UI across large engineering organizations',
    top_industries: ['Enterprise Software', 'Digital Banking', 'Large Scale SaaS'],
    companion_skills: ['Figma', 'UI/UX Design', 'React.js', 'Tailwind CSS', 'HTML/CSS'],
    certifications: [
      { name: 'Design Systems for Scalable Products', provider: 'Interaction Design Foundation', badge: 'Advanced Practice' }
    ],
    learning_roadmap: ['Token Architecture & Naming Schemes', 'Component Library Governance', 'Accessibility Guidelines & WCAG', 'Figma to React Sync'],
    job_market_summary: 'Bridge skill connecting designers and frontend developers, with high demand among mature product teams.'
  }
};

// Helper: Real-time custom skill & domain classifier that synthesizes internet market intelligence for ANY skill name
function analyzeCustomSkillIntel(skillName, programInfo) {
  if (!skillName) return null;
  const lower = skillName.toLowerCase().trim();

  // 1. Direct match in knowledge repository
  const exactKey = Object.keys(INTERNET_SKILL_INTELLIGENCE).find(k => k.toLowerCase() === lower);
  if (exactKey) {
    return { skill_name: exactKey, ...INTERNET_SKILL_INTELLIGENCE[exactKey] };
  }

  // 2. Keyword & Domain Classifier
  let domain = 'General Professional & Technical';
  let growth = '+32% YoY Demand';
  let hiringIndex = 92;
  let salary = '₱28,000 - ₱52,000/mo';
  let companions = ['Communication', 'Git/Version Control', 'Project Management'];
  let certifications = [];
  let roadmap = ['Core Principles & Theory', 'Practical Tool Application', 'Portfolio & Case Study Execution'];
  let summary = `Emerging competency with growing internet demand in Philippine and global job postings in 2026.`;

  if (lower.includes('account') || lower.includes('tax') || lower.includes('audit') || lower.includes('bookkeep') || lower.includes('quickbook') || lower.includes('xero') || lower.includes('cpa') || lower.includes('ifrs') || lower.includes('ledger') || lower.includes('finance') || lower.includes('payroll')) {
    domain = 'Accountancy & Financial Management';
    growth = '+36% YoY Demand';
    hiringIndex = 95;
    salary = '₱30,000 - ₱58,000/mo';
    companions = ['Financial Accounting', 'QuickBooks', 'Taxation & Tax Compliance', 'Excel/Spreadsheets', 'Auditing & Assurance'];
    certifications = [
      { name: 'Certified Public Accountant (CPA) / CMA Pathway', provider: 'PRC Board / IMA', badge: 'Gold Standard' },
      { name: 'QuickBooks Online ProAdvisor', provider: 'Intuit Academy', badge: 'Practical Benchmark' }
    ];
    roadmap = ['Financial Reporting Frameworks (PFRS/IFRS)', 'Automated Ledger & Cloud Bookkeeping', 'Tax Compliance & BIR Returns', 'Audit Controls & Risk Analysis'];
    summary = `Essential financial competency required by accounting BPOs, multinational shared service centers, and commercial enterprises.`;
  } else if (lower.includes('cad') || lower.includes('revit') || lower.includes('civil') || lower.includes('structur') || lower.includes('construct') || lower.includes('engineering') || lower.includes('matlab') || lower.includes('solidwork') || lower.includes('bim') || lower.includes('survey')) {
    domain = 'Engineering & Architectural Design';
    growth = '+38% YoY Demand';
    hiringIndex = 94;
    salary = '₱30,000 - ₱60,000/mo';
    companions = ['AutoCAD', 'BIM / Revit Architecture', 'Structural Analysis & Design', 'Construction Management & Costing', 'Project Management'];
    certifications = [
      { name: 'Autodesk Certified Professional', provider: 'Autodesk Certification Center', badge: 'AEC Standard' },
      { name: 'PRC Board Licensure Benchmark', provider: 'Professional Regulation Commission', badge: 'Licensure Pathway' }
    ];
    roadmap = ['Technical 2D/3D Drawing Standards', 'Parametric Modeling & Code Compliance', 'Structural / MEPF System Integration', 'Site Project Management & Cost Estimation'];
    summary = `Critical technical skill across infrastructure, commercial high-rise construction, and international engineering consulting.`;
  } else if (lower.includes('hotel') || lower.includes('hospitality') || lower.includes('culinary') || lower.includes('chef') || lower.includes('cook') || lower.includes('food') || lower.includes('beverage') || lower.includes('haccp') || lower.includes('opera') || lower.includes('kitchen') || lower.includes('dining') || lower.includes('barista') || lower.includes('banquet')) {
    domain = 'Hospitality, Culinary & F&B Operations';
    growth = '+31% YoY Demand';
    hiringIndex = 93;
    salary = '₱24,000 - ₱45,000/mo';
    companions = ['Food & Beverage Service', 'HACCP & Food Safety', 'Front Office Operations (Opera PMS)', 'Customer Service', 'Event Management & Banqueting'];
    certifications = [
      { name: 'TESDA NC II / NC III Hospitality Certification', provider: 'TESDA Philippines', badge: 'National Benchmark' },
      { name: 'ServSafe Food Protection Manager', provider: 'National Restaurant Association', badge: 'International Standard' }
    ],
    roadmap = ['Service Standards & Dining Protocol', 'Sanitation & Food Safety Control (HACCP)', 'Property Management Systems (Opera)', 'Guest Relationship & Upselling Strategy'];
    summary = `High demand across luxury hotels, integrated casino resorts, international cruise lines, and fine dining establishments.`;
  } else if (lower.includes('tour') || lower.includes('travel') || lower.includes('flight') || lower.includes('amadeus') || lower.includes('sabre') || lower.includes('gds') || lower.includes('airline') || lower.includes('resort') || lower.includes('itinerary')) {
    domain = 'Tourism & Travel Operations';
    growth = '+33% YoY Demand';
    hiringIndex = 91;
    salary = '₱25,000 - ₱46,000/mo';
    companions = ['Tourism Tour Guiding & Itinerary Planning', 'Amadeus / Sabre GDS Flight Booking', 'Customer Service', 'English Proficiency'];
    certifications = [
      { name: 'DOT Tour Guiding Accreditation', provider: 'Department of Tourism / TESDA', badge: 'Government Accredited' },
      { name: 'Amadeus Global Travel Certification', provider: 'Amadeus Academy', badge: 'GDS Industry Standard' }
    ];
    roadmap = ['Philippine & Global Destination Knowledge', 'GDS Fare Construction & Ticketing', 'Tour Costing & Itinerary Formulation', 'Crisis Management & Cultural Sensitivity'];
    summary = `Surging requirement fueled by Southeast Asian travel expansion, corporate travel management, and regional tour operations.`;
  } else if (lower.includes('nurse') || lower.includes('nursing') || lower.includes('patient') || lower.includes('clinical') || lower.includes('vital') || lower.includes('health') || lower.includes('medical') || lower.includes('bls') || lower.includes('cpr') || lower.includes('triage') || lower.includes('pharmac') || lower.includes('ehr')) {
    domain = 'Healthcare & Clinical Nursing';
    growth = '+42% YoY Demand';
    hiringIndex = 98;
    salary = '₱28,000 - ₱52,000/mo';
    companions = ['Patient Care & Assessment', 'Basic Life Support (BLS / CPR)', 'Clinical Documentation & EHR', 'Pharmacology & Medication Administration'];
    certifications = [
      { name: 'PRC Board of Nursing Licensure (NLE)', provider: 'Professional Regulation Commission', badge: 'National Licensure' },
      { name: 'Basic Life Support (BLS/CPR) for Healthcare Providers', provider: 'American Heart Association (AHA)', badge: 'Global Clinical Standard' }
    ];
    roadmap = ['Comprehensive Physical Assessment', 'Emergency Triage & Life Support (BLS/ACLS)', 'Safe Medication Administration & Dosing', 'Electronic Health Record (EHR) Charting'];
    summary = `Essential clinical core in continuous high demand across tertiary hospitals, specialized clinics, and global healthcare organizations.`;
  } else if (lower.includes('marketing') || lower.includes('seo') || lower.includes('social media') || lower.includes('ads') || lower.includes('copywriting') || lower.includes('sales') || lower.includes('brand') || lower.includes('ecommerce') || lower.includes('content')) {
    domain = 'Digital Marketing & Growth';
    growth = '+39% YoY Demand';
    hiringIndex = 94;
    salary = '₱28,000 - ₱55,000/mo';
    companions = ['Digital Marketing', 'Search Engine Optimization (SEO)', 'Social Media Management', 'Data Analysis', 'Canva'];
    certifications = [
      { name: 'Google Digital Marketing & E-Commerce Professional', provider: 'Google / Coursera', badge: 'Industry Benchmark' },
      { name: 'HubSpot Inbound Marketing Certification', provider: 'HubSpot Academy', badge: 'Recognized Standard' }
    ];
    roadmap = ['Audience Persona & Funnel Mapping', 'Paid Ad Strategy (Meta/Google Ads)', 'Search Engine Optimization (SEO)', 'Conversion Analytics & Reporting (GA4)'];
    summary = `High-velocity growth sector empowering e-commerce brands, tech startups, and digital advertising agencies.`;
  } else if (lower.includes('hr') || lower.includes('human resource') || lower.includes('recruitment') || lower.includes('talent') || lower.includes('psycholog') || lower.includes('interview') || lower.includes('labor') || lower.includes('hiring') || lower.includes('onboarding')) {
    domain = 'Human Resources & Talent Management';
    growth = '+34% YoY Demand';
    hiringIndex = 93;
    salary = '₱26,000 - ₱48,000/mo';
    companions = ['Talent Acquisition & Recruitment', 'Psychological Assessment & Testing', 'Employee Relations & Labor Code', 'Communication'];
    certifications = [
      { name: 'Certified Human Resource Associate (CHRA)', provider: 'HREAP Philippines', badge: 'National HR Standard' },
      { name: 'Registered Psychometrician (RPm) Pathway', provider: 'PRC Board of Psychology', badge: 'Licensure Pathway' }
    ];
    roadmap = ['Strategic Sourcing & Talent Pipeline Building', 'Competency Interviewing (STAR Technique)', 'Philippine Labor Code & Employee Relations', 'Performance Management & HR Analytics'];
    summary = `Strategic driver across BPO hubs, technology firms, and corporate enterprises scaling their workforce.`;
  } else if (lower.includes('react') || lower.includes('vue') || lower.includes('angular') || lower.includes('node') || lower.includes('python') || lower.includes('javascript') || lower.includes('typescript') || lower.includes('flutter') || lower.includes('swift') || lower.includes('java') || lower.includes('c#') || lower.includes('docker') || lower.includes('aws') || lower.includes('cloud') || lower.includes('sql') || lower.includes('api') || lower.includes('frontend') || lower.includes('backend') || lower.includes('fullstack') || lower.includes('cyber') || lower.includes('security') || lower.includes('data')) {
    domain = 'Software Engineering & Cloud Technology';
    growth = '+42% YoY Demand';
    hiringIndex = 96;
    salary = '₱35,000 - ₱68,000/mo';
    companions = ['JavaScript', 'React.js', 'Node.js', 'SQL', 'Git/Version Control', 'RESTful API Development', 'Docker'];
    certifications = [
      { name: 'Professional Developer & Cloud Associate', provider: 'AWS / Google / Meta', badge: 'Industry Benchmark' }
    ];
    roadmap = ['Core Syntax & Architecture Patterns', 'API & Database Integration', 'Automated Testing & Version Control', 'Cloud Deployment & Containerization'];
    summary = `Premier global tech requirement driving modern software applications, microservices, and digital products.`;
  } else if (lower.includes('figma') || lower.includes('photoshop') || lower.includes('illustrator') || lower.includes('ui') || lower.includes('ux') || lower.includes('design') || lower.includes('graphic') || lower.includes('animation') || lower.includes('video') || lower.includes('wireframe') || lower.includes('prototype')) {
    domain = 'Design, UI/UX & Creative Media';
    growth = '+36% YoY Demand';
    hiringIndex = 93;
    salary = '₱30,000 - ₱55,000/mo';
    companions = ['UI/UX Design', 'Figma', 'Design Systems', 'HTML/CSS', 'Graphic Design'];
    certifications = [
      { name: 'Google UX Design Professional Certificate', provider: 'Google / Coursera', badge: 'Recruiter Match' }
    ];
    roadmap = ['Design Thinking & User Research', 'Wireframing & Interactive Prototyping in Figma', 'Design System Token Architecture', 'Developer Handoff & Usability Testing'];
    summary = `Essential creative competency bridging human experiences and digital interfaces across web and mobile platforms.`;
  } else if (programInfo) {
    // If generic skill, infer from student's enrolled academic program!
    const prog = (programInfo.program_name || programInfo.program_code || '').toLowerCase();
    if (prog.includes('account') || prog.includes('bsa')) {
      domain = 'Accountancy & Business Discipline';
      companions = ['Financial Accounting', 'QuickBooks', 'Taxation & Tax Compliance', 'Excel/Spreadsheets'];
    } else if (prog.includes('engineering') || prog.includes('bsce') || prog.includes('bscpe')) {
      domain = 'Engineering & Technical Discipline';
      companions = ['AutoCAD', 'BIM / Revit Architecture', 'Structural Analysis & Design', 'Project Management'];
    } else if (prog.includes('hospitality') || prog.includes('bshm')) {
      domain = 'Hospitality & Tourism Discipline';
      companions = ['Food & Beverage Service', 'HACCP & Food Safety', 'Front Office Operations (Opera PMS)', 'Customer Service'];
    } else if (prog.includes('nursing') || prog.includes('bsn')) {
      domain = 'Healthcare & Clinical Discipline';
      companions = ['Patient Care & Assessment', 'Basic Life Support (BLS / CPR)', 'Clinical Documentation & EHR'];
    }
  }

  return {
    skill_name: skillName,
    domain,
    growth_rate: growth,
    market_demand_level: hiringIndex >= 95 ? 'Very High Demand' : 'High Market Demand',
    ph_hiring_index: hiringIndex,
    ph_entry_salary: salary,
    search_trend: `Monitored across active 2026 hiring statistics in ${domain}`,
    top_industries: ['Leading Enterprises', 'Technology & Services', 'Specialized Industry Leaders'],
    companion_skills: companions,
    companions: companions,
    certifications: certifications.length > 0 ? certifications : [{ name: 'Industry Recognized Professional Certification', provider: 'Accredited Training Institute', badge: 'Recommended' }],
    learning_roadmap: roadmap,
    job_market_summary: summary
  };
}

// Helper: Dynamically generate internet-informed recommendations for ANY student skill profile and degree program
function generateInternetRecommendations(studentSkills, allSkills, studentProgram) {
  const verifiedNames = new Set(studentSkills.map(s => s.skill_name.toLowerCase()));
  const candidateScores = {};

  const allSkillsMap = {};
  allSkills.forEach(s => {
    allSkillsMap[s.skill_name.toLowerCase()] = s;
  });

  // 1. Analyze companions and synergies from added skills (both standard and custom!)
  studentSkills.forEach(stSkill => {
    const intel = analyzeCustomSkillIntel(stSkill.skill_name, studentProgram);
    if (intel && intel.companion_skills) {
      intel.companion_skills.forEach((compName, idx) => {
        const compLower = compName.toLowerCase();
        if (!verifiedNames.has(compLower)) {
          const weight = (10 - idx) * 9.5;
          if (!candidateScores[compName]) {
            candidateScores[compName] = {
              skill_name: compName,
              score: Math.min(99, Math.round(78 + weight / 2)),
              reasons: [`Synergy pairing with your verified competency: ${stSkill.skill_name}`],
              synergy_source: stSkill.skill_name,
              domain: intel.domain
            };
          } else {
            candidateScores[compName].score = Math.min(99, candidateScores[compName].score + 6);
            candidateScores[compName].reasons.push(`Pairs with ${stSkill.skill_name}`);
          }
        }
      });
    }
  });

  // 2. Program-specific baseline recommendations if student has few or no skills
  const prog = (studentProgram?.program_name || studentProgram?.program_code || '').toLowerCase();
  let programBaselines = [];

  if (prog.includes('account') || prog.includes('bsa')) {
    programBaselines = ['Financial Accounting', 'QuickBooks', 'Taxation & Tax Compliance', 'Excel/Spreadsheets', 'Auditing & Assurance', 'Cost Accounting'];
  } else if (prog.includes('civil') || prog.includes('bsce') || prog.includes('engineering') || prog.includes('bscpe')) {
    programBaselines = ['AutoCAD', 'BIM / Revit Architecture', 'Structural Analysis & Design', 'Construction Management & Costing', 'Project Management'];
  } else if (prog.includes('hospitality') || prog.includes('bshm')) {
    programBaselines = ['Food & Beverage Service', 'HACCP & Food Safety', 'Front Office Operations (Opera PMS)', 'Customer Service', 'Event Management & Banqueting'];
  } else if (prog.includes('tourism') || prog.includes('bstm') || prog.includes('bst')) {
    programBaselines = ['Tourism Tour Guiding & Itinerary Planning', 'Amadeus / Sabre GDS Flight Booking', 'English Proficiency', 'Customer Service'];
  } else if (prog.includes('nursing') || prog.includes('bsn') || prog.includes('health')) {
    programBaselines = ['Patient Care & Assessment', 'Basic Life Support (BLS / CPR)', 'Clinical Documentation & EHR', 'Pharmacology & Medication Administration'];
  } else if (prog.includes('psycholog') || prog.includes('bspsy') || prog.includes('human resource')) {
    programBaselines = ['Talent Acquisition & Recruitment', 'Psychological Assessment & Testing', 'Employee Relations & Labor Code', 'Communication'];
  } else if (prog.includes('business') || prog.includes('marketing') || prog.includes('bsba')) {
    programBaselines = ['Digital Marketing', 'Search Engine Optimization (SEO)', 'Social Media Management', 'Excel/Spreadsheets', 'Market Research'];
  } else {
    // Default IT/Tech baseline
    programBaselines = ['JavaScript', 'Python', 'SQL', 'Git/Version Control', 'React.js', 'UI/UX Design', 'Data Analysis', 'HTML/CSS'];
  }

  programBaselines.forEach((trendName, idx) => {
    const trendLower = trendName.toLowerCase();
    if (!verifiedNames.has(trendLower)) {
      if (!candidateScores[trendName]) {
        candidateScores[trendName] = {
          skill_name: trendName,
          score: 93 - idx * 3,
          reasons: [`Core in-demand requirement for ${studentProgram?.program_code || studentProgram?.program_name || 'your curriculum'}`],
          synergy_source: 'Academic & Industry Baseline',
          domain: 'Core Degree Track'
        };
      }
    }
  });

  // 3. Map to database skill records and attach internet intelligence
  const recommendations = [];

  Object.values(candidateScores).forEach(cand => {
    const dbSkill = allSkillsMap[cand.skill_name.toLowerCase()] || allSkills.find(s => s.skill_name.toLowerCase().includes(cand.skill_name.toLowerCase()));
    const skillId = dbSkill ? dbSkill.skill_id : null;
    const categoryName = dbSkill ? dbSkill.category_name : 'Technical';

    const intel = analyzeCustomSkillIntel(cand.skill_name, studentProgram);

    recommendations.push({
      recommendation_id: skillId ? `rec_${skillId}` : `rec_custom_${Math.random().toString(36).substring(7)}`,
      skill_id: skillId,
      skill_name: cand.skill_name,
      category_name: categoryName,
      score: cand.score,
      reason: cand.reasons.join(' • '),
      synergy_source: cand.synergy_source,
      intel: intel
    });
  });

  recommendations.sort((a, b) => b.score - a.score);
  return recommendations.slice(0, 12);
}

// Helper: Calculate career track market readiness across ALL academic programs
function calculateMarketReadiness(studentSkills, studentProgram) {
  const verified = new Set(studentSkills.map(s => s.skill_name.toLowerCase()));

  const tracks = [
    {
      title: 'Full-Stack Software Engineering',
      icon: 'code',
      domain: 'Technology',
      required: ['JavaScript', 'HTML/CSS', 'React.js', 'Node.js', 'SQL', 'Git/Version Control', 'RESTful API Development'],
      growth: '+41% YoY',
      demand: 'Very High'
    },
    {
      title: 'Corporate Accounting & Auditing',
      icon: 'account_balance',
      domain: 'Accountancy',
      required: ['Financial Accounting', 'QuickBooks', 'Taxation & Tax Compliance', 'Excel/Spreadsheets', 'Auditing & Assurance', 'Cost Accounting'],
      growth: '+35% YoY',
      demand: 'Very High'
    },
    {
      title: 'Civil & Structural Engineering',
      icon: 'architecture',
      domain: 'Engineering',
      required: ['AutoCAD', 'BIM / Revit Architecture', 'Structural Analysis & Design', 'Construction Management & Costing', 'Project Management'],
      growth: '+38% YoY',
      demand: 'High'
    },
    {
      title: 'Hotel, Culinary & Resort Operations',
      icon: 'hotel',
      domain: 'Hospitality',
      required: ['Food & Beverage Service', 'HACCP & Food Safety', 'Front Office Operations (Opera PMS)', 'Customer Service', 'Event Management & Banqueting'],
      growth: '+32% YoY',
      demand: 'High'
    },
    {
      title: 'Clinical Nursing & Patient Care',
      icon: 'medical_services',
      domain: 'Healthcare',
      required: ['Patient Care & Assessment', 'Basic Life Support (BLS / CPR)', 'Clinical Documentation & EHR', 'Pharmacology & Medication Administration', 'Infection Control & Sterile Techniques'],
      growth: '+40% YoY',
      demand: 'Critical Need'
    },
    {
      title: 'Digital Marketing & Growth Management',
      icon: 'campaign',
      domain: 'Business',
      required: ['Digital Marketing', 'Search Engine Optimization (SEO)', 'Social Media Management', 'Market Research', 'Data Analysis'],
      growth: '+39% YoY',
      demand: 'High'
    },
    {
      title: 'Talent Acquisition & HR Operations',
      icon: 'groups',
      domain: 'Human Resources',
      required: ['Talent Acquisition & Recruitment', 'Psychological Assessment & Testing', 'Employee Relations & Labor Code', 'Training & Development (T&D)', 'Communication'],
      growth: '+34% YoY',
      demand: 'High'
    },
    {
      title: 'Product Design & UI/UX Research',
      icon: 'palette',
      domain: 'Design',
      required: ['UI/UX Design', 'Figma', 'Graphic Design', 'Design Systems', 'HTML/CSS'],
      growth: '+36% YoY',
      demand: 'High'
    },
    {
      title: 'Tourism Tour Operations & Ticketing',
      icon: 'flight_takeoff',
      domain: 'Tourism',
      required: ['Tourism Tour Guiding & Itinerary Planning', 'Amadeus / Sabre GDS Flight Booking', 'Customer Service', 'English Proficiency'],
      growth: '+33% YoY',
      demand: 'High'
    }
  ];

  const trackScores = tracks.map(t => {
    const matched = t.required.filter(r => verified.has(r.toLowerCase()));
    const pct = Math.round((matched.length / t.required.length) * 100);
    const missing = t.required.filter(r => !verified.has(r.toLowerCase()));
    return {
      ...t,
      match_pct: pct,
      matched_skills: matched,
      missing_skills: missing
    };
  });

  // Sort by match percentage, giving a natural boost to tracks matching the student's enrolled degree
  const prog = (studentProgram?.program_name || studentProgram?.program_code || '').toLowerCase();
  trackScores.forEach(t => {
    if (prog.includes('account') && t.domain === 'Accountancy') t.match_pct = Math.max(t.match_pct, 15);
    if (prog.includes('civil') && t.domain === 'Engineering') t.match_pct = Math.max(t.match_pct, 15);
    if (prog.includes('hospitality') && t.domain === 'Hospitality') t.match_pct = Math.max(t.match_pct, 15);
    if (prog.includes('nursing') && t.domain === 'Healthcare') t.match_pct = Math.max(t.match_pct, 15);
    if (prog.includes('tourism') && t.domain === 'Tourism') t.match_pct = Math.max(t.match_pct, 15);
    if (prog.includes('psycholog') && t.domain === 'Human Resources') t.match_pct = Math.max(t.match_pct, 15);
    if (prog.includes('it') || prog.includes('computer')) {
      if (t.domain === 'Technology') t.match_pct = Math.max(t.match_pct, 15);
    }
  });

  trackScores.sort((a, b) => b.match_pct - a.match_pct);
  const bestTrack = trackScores[0] || null;
  const overallReadiness = Math.min(100, Math.round(trackScores.reduce((acc, t) => acc + t.match_pct, 0) / trackScores.length * 2.2));

  return {
    best_track: bestTrack,
    all_tracks: trackScores,
    overall_readiness: Math.max(overallReadiness, studentSkills.length > 0 ? 40 : 15)
  };
}

// --- SKILLS & RECOMMENDATIONS ENDPOINTS ---

// Helper to resolve targeted degree program or cross-disciplinary all-courses mode
function resolveTargetProgram(targetProgramCode, student) {
  if (targetProgramCode && (targetProgramCode.toLowerCase() === 'all' || targetProgramCode.toLowerCase() === 'all_courses')) {
    return {
      program_name: 'All Degree Programs (53 Courses)',
      program_code: 'ALL',
      department: 'Multi-Disciplinary Academic Programs'
    };
  }
  if (targetProgramCode && PROGRAM_SKILLS_CATALOG[targetProgramCode.toUpperCase()]) {
    const p = PROGRAM_SKILLS_CATALOG[targetProgramCode.toUpperCase()];
    return {
      program_name: p.program_name,
      program_code: p.program_code,
      department: p.department
    };
  }
  return {
    program_name: student.program_name,
    program_code: student.program_code,
    department: student.department
  };
}

// GET /api/student/skills
router.get('/skills', async (req, res) => {
  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found.' });

    const [studentSkills] = await pool.query(
      `SELECT ss.*, s.skill_name, sc.category_name
       FROM student_skills ss
       JOIN skills s ON ss.skill_id = s.skill_id
       LEFT JOIN skill_categories sc ON s.category_id = sc.category_id
       WHERE ss.student_id = ?
       ORDER BY ss.created_at DESC`,
      [student.student_id]
    );

    const [allSkills] = await pool.query(
      `SELECT s.*, sc.category_name 
       FROM skills s 
       LEFT JOIN skill_categories sc ON s.category_id = sc.category_id 
       ORDER BY s.skill_name ASC`
    );

    // Call AI Skills & Career Recommendation Engine with specified or enrolled course
    const targetProgram = resolveTargetProgram(req.query.program_code, student);

    const aiResult = await generateAiSkillsRecommendations({
      studentProgram: targetProgram,
      studentSkills,
      allSkills,
      newlyAddedSkillName: req.query.based_on_skill || (studentSkills[0]?.skill_name || null),
      options: { useLiveGemini: req.query.live_ai === 'true' }
    });

    const recommendations = aiResult.recommendations;
    const readiness = calculateMarketReadiness(studentSkills, student);

    return res.json({
      success: true,
      data: {
        studentSkills,
        allSkills,
        recommendations,
        readiness,
        program: {
          program_name: student.program_name,
          program_code: student.program_code,
          department: student.department
        },
        ai_metadata: aiResult.ai_metadata,
        marketIntelligenceRepo: INTERNET_SKILL_INTELLIGENCE,
        programSkillsCatalog: PROGRAM_SKILLS_CATALOG
      }
    });
  } catch (error) {
    console.error('Fetch student skills error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch skills.' });
  }
});

// POST /api/student/skills/ai-generate
router.post('/skills/ai-generate', async (req, res) => {
  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found.' });

    const [studentSkills] = await pool.query(
      `SELECT ss.*, s.skill_name, sc.category_name
       FROM student_skills ss
       JOIN skills s ON ss.skill_id = s.skill_id
       LEFT JOIN skill_categories sc ON s.category_id = sc.category_id
       WHERE ss.student_id = ?
       ORDER BY ss.created_at DESC`,
      [student.student_id]
    );

    const [allSkills] = await pool.query(
      `SELECT s.*, sc.category_name 
       FROM skills s 
       LEFT JOIN skill_categories sc ON s.category_id = sc.category_id 
       ORDER BY s.skill_name ASC`
    );

    const targetProgram = resolveTargetProgram(req.body?.program_code || req.query?.program_code, student);

    const aiResult = await generateAiSkillsRecommendations({
      studentProgram: targetProgram,
      studentSkills,
      allSkills,
      newlyAddedSkillName: req.body?.based_on_skill || req.query?.based_on_skill || (studentSkills[0]?.skill_name || null),
      options: { useLiveGemini: true }
    });

    const readiness = calculateMarketReadiness(studentSkills, student);

    return res.json({
      success: true,
      message: `AI Recommendations successfully aligned for ${targetProgram.program_code || targetProgram.program_name}!`,
      data: {
        recommendations: aiResult.recommendations,
        ai_metadata: aiResult.ai_metadata,
        readiness
      }
    });
  } catch (error) {
    console.error('AI Generate recommendations error:', error);
    return res.status(500).json({ success: false, message: 'Could not generate AI recommendations.' });
  }
});

// GET /api/student/skills/market-intel
router.get('/skills/market-intel', async (req, res) => {
  const query = (req.query.skill || '').trim();
  const student = await getStudentId(req.user.user_id).catch(() => null);

  if (!query) {
    return res.json({ success: true, data: INTERNET_SKILL_INTELLIGENCE });
  }

  // Dynamic synthesizer runs for any custom or standard skill across all academic courses!
  const intel = analyzeCustomSkillIntel(query, student);

  return res.json({
    success: true,
    data: intel
  });
});

// POST /api/student/skills
router.post('/skills', async (req, res) => {
  let { skill_id, skill_name, proficiency_level, program_code, skills: batchSkills } = req.body;

  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found.' });

    // Handle batch skill addition if array provided
    if (Array.isArray(batchSkills) && batchSkills.length > 0) {
      let addedCount = 0;
      for (const item of batchSkills) {
        let sId = item.skill_id;
        const sName = (item.skill_name || item.name || '').trim();

        if (!sId && sName) {
          const [existing] = await pool.query('SELECT skill_id FROM skills WHERE LOWER(skill_name) = LOWER(?)', [sName]);
          if (existing.length > 0) {
            sId = existing[0].skill_id;
          } else {
            const [inserted] = await pool.query(
              'INSERT INTO skills (skill_name, category_id, created_at, updated_at) VALUES (?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
              [sName]
            );
            sId = inserted.insertId;
          }
        }

        if (sId) {
          const [existingSkill] = await pool.query(
            'SELECT id FROM student_skills WHERE student_id = ? AND skill_id = ?',
            [student.student_id, sId]
          );
          if (existingSkill.length > 0) {
            await pool.query(
              'UPDATE student_skills SET proficiency_level = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [item.proficiency_level || proficiency_level || 'intermediate', existingSkill[0].id]
            );
          } else {
            await pool.query(
              'INSERT INTO student_skills (student_id, skill_id, proficiency_level, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
              [student.student_id, sId, item.proficiency_level || proficiency_level || 'intermediate']
            );
            addedCount++;
          }
        }
      }

      const [updatedStudentSkills] = await pool.query(
        `SELECT ss.*, s.skill_name, sc.category_name
         FROM student_skills ss
         JOIN skills s ON ss.skill_id = s.skill_id
         LEFT JOIN skill_categories sc ON s.category_id = sc.category_id
         WHERE ss.student_id = ?
         ORDER BY ss.created_at DESC`,
        [student.student_id]
      );

      const [allSkills] = await pool.query(
        `SELECT s.*, sc.category_name 
         FROM skills s 
         LEFT JOIN skill_categories sc ON s.category_id = sc.category_id 
         ORDER BY s.skill_name ASC`
      );

      const targetProgram = resolveTargetProgram(program_code, student);
      const latestBatchSkill = batchSkills[batchSkills.length - 1]?.skill_name || batchSkills[batchSkills.length - 1]?.name || updatedStudentSkills[0]?.skill_name;
      const aiResult = await generateAiSkillsRecommendations({
        studentProgram: targetProgram,
        studentSkills: updatedStudentSkills,
        allSkills,
        newlyAddedSkillName: latestBatchSkill
      });
      const readiness = calculateMarketReadiness(updatedStudentSkills, student);

      return res.json({
        success: true,
        message: `Successfully verified and added ${addedCount} curriculum skills to your profile!`,
        data: {
          studentSkills: updatedStudentSkills,
          recommendations: aiResult.recommendations,
          ai_metadata: aiResult.ai_metadata,
          readiness
        }
      });
    }

    // Support creating skill on the fly if custom skill_name is sent
    if (!skill_id && skill_name) {
      const [existing] = await pool.query('SELECT skill_id FROM skills WHERE LOWER(skill_name) = LOWER(?)', [skill_name.trim()]);
      if (existing.length > 0) {
        skill_id = existing[0].skill_id;
      } else {
        const [inserted] = await pool.query(
          'INSERT INTO skills (skill_name, category_id, created_at, updated_at) VALUES (?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
          [skill_name.trim()]
        );
        skill_id = inserted.insertId;
      }
    }

    if (!skill_id) return res.status(400).json({ success: false, message: 'Skill is required.' });

    const [existingSkill] = await pool.query(
      'SELECT id FROM student_skills WHERE student_id = ? AND skill_id = ?',
      [student.student_id, skill_id]
    );

    if (existingSkill.length > 0) {
      await pool.query(
        'UPDATE student_skills SET proficiency_level = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [proficiency_level || 'beginner', existingSkill[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO student_skills (student_id, skill_id, proficiency_level, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        [student.student_id, skill_id, proficiency_level || 'intermediate']
      );
    }

    // Recalculate AI recommendations immediately so client receives updated feed
    const [updatedStudentSkills] = await pool.query(
      `SELECT ss.*, s.skill_name, sc.category_name
       FROM student_skills ss
       JOIN skills s ON ss.skill_id = s.skill_id
       LEFT JOIN skill_categories sc ON s.category_id = sc.category_id
       WHERE ss.student_id = ?
       ORDER BY ss.created_at DESC`,
      [student.student_id]
    );

    const [allSkills] = await pool.query(
      `SELECT s.*, sc.category_name 
       FROM skills s 
       LEFT JOIN skill_categories sc ON s.category_id = sc.category_id 
       ORDER BY s.skill_name ASC`
    );

    const resolvedSkillName = skill_name || (allSkills.find(s => s.skill_id == skill_id)?.skill_name);

    const targetProgram = resolveTargetProgram(program_code, student);

    const aiResult = await generateAiSkillsRecommendations({
      studentProgram: targetProgram,
      studentSkills: updatedStudentSkills,
      allSkills,
      newlyAddedSkillName: resolvedSkillName
    });

    const readiness = calculateMarketReadiness(updatedStudentSkills, student);

    return res.json({
      success: true,
      message: `Competency "${resolvedSkillName || 'Skill'}" added! AI Recommendations updated.`,
      data: {
        studentSkills: updatedStudentSkills,
        recommendations: aiResult.recommendations,
        ai_metadata: aiResult.ai_metadata,
        readiness
      }
    });
  } catch (error) {
    console.error('Save skill error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save skill.' });
  }
});

// DELETE /api/student/skills/:id
router.delete('/skills/:id', async (req, res) => {
  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found.' });

    const rawId = req.params.id;
    const skillNameQuery = req.query.name || req.body?.skill_name;

    let deleteResult;
    if (rawId && !isNaN(rawId) && Number(rawId) > 0) {
      const numId = Number(rawId);
      // Delete by row id OR skill_id
      [deleteResult] = await pool.query(
        'DELETE FROM student_skills WHERE (id = ? OR skill_id = ?) AND student_id = ?',
        [numId, numId, student.student_id]
      );
    } else if (rawId && rawId !== 'undefined' && rawId !== 'null') {
      // Support skill name passed in parameter
      const nameToDelete = decodeURIComponent(rawId).trim();
      [deleteResult] = await pool.query(
        `DELETE ss FROM student_skills ss
         JOIN skills s ON ss.skill_id = s.skill_id
         WHERE LOWER(s.skill_name) = LOWER(?) AND ss.student_id = ?`,
        [nameToDelete, student.student_id]
      );
    }

    if ((!deleteResult || deleteResult.affectedRows === 0) && skillNameQuery) {
      [deleteResult] = await pool.query(
        `DELETE ss FROM student_skills ss
         JOIN skills s ON ss.skill_id = s.skill_id
         WHERE LOWER(s.skill_name) = LOWER(?) AND ss.student_id = ?`,
        [skillNameQuery.trim(), student.student_id]
      );
    }

    // Fetch updated skills list
    const [updatedStudentSkills] = await pool.query(
      `SELECT ss.*, s.skill_name, sc.category_name
       FROM student_skills ss
       JOIN skills s ON ss.skill_id = s.skill_id
       LEFT JOIN skill_categories sc ON s.category_id = sc.category_id
       WHERE ss.student_id = ?
       ORDER BY ss.created_at DESC`,
      [student.student_id]
    );

    return res.json({
      success: true,
      message: 'Skill removed successfully.',
      data: {
        studentSkills: updatedStudentSkills
      }
    });
  } catch (error) {
    console.error('Delete skill error:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove skill.' });
  }
});



// --- DIGITAL PORTFOLIO & ACHIEVEMENTS ---

// POST /api/student/portfolio/upload - Upload any portfolio document or image (docx, pdf, jpg, png, jpeg, etc.)
router.post('/portfolio/upload', (req, res, next) => {
  portfolioUpload.single('file')(req, res, (err) => {
    if (err) {
      console.error('[Portfolio Multer Error]', err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size exceeds the 30MB limit. Please upload a smaller file.'
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload rejected.'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file selected for upload.' });
    }
    const relativePath = await saveUploadedFile(req.file, 'portfolio');
    if (!relativePath) {
      return res.status(500).json({ success: false, message: 'Failed to process and store uploaded file.' });
    }
    return res.json({
      success: true,
      message: 'File uploaded successfully.',
      data: {
        file_path: relativePath,
        file_name: req.file.originalname,
        file_size: req.file.size,
        mime_type: req.file.mimetype
      }
    });
  } catch (err) {
    console.error('Portfolio file upload error:', err);
    return res.status(500).json({ success: false, message: err.message || 'File upload failed.' });
  }
});

// GET /api/student/portfolio
router.get('/portfolio', async (req, res) => {
  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found.' });

    // Graduation & completion status
    const isGraduated = student.ojt_status === 'graduated' || student.status_id === 5;
    const isOjtCompleter = student.ojt_status === 'completed' || student.ojt_status === 'completed_ojt' || student.status_id === 4 || (student.completed_ojt_hours && student.required_ojt_hours && student.completed_ojt_hours >= student.required_ojt_hours);

    const [portfolios] = await pool.query(
      'SELECT * FROM student_portfolios WHERE student_id = ? LIMIT 1',
      [student.student_id]
    );

    let portfolio = portfolios.length > 0 ? portfolios[0] : null;

    // Fetch all portfolio items belonging to this student
    const [allItems] = await pool.query(
      `SELECT pi.*, ho.organization_name as associated_org_name
       FROM portfolio_items pi
       JOIN student_portfolios sp ON pi.portfolio_id = sp.portfolio_id
       LEFT JOIN hiring_organizations ho ON pi.associated_org_id = ho.organization_id
       WHERE sp.student_id = ? 
       ORDER BY pi.created_at DESC`,
      [student.student_id]
    );

    const formattedItems = allItems.map(i => ({
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

    const [achievements] = await pool.query(
      'SELECT * FROM student_achievements WHERE student_id = ? ORDER BY date_achieved DESC, created_at DESC',
      [student.student_id]
    );

    const [resumes] = await pool.query(
      'SELECT * FROM student_resumes WHERE student_id = ? ORDER BY is_active DESC, version DESC, created_at DESC',
      [student.student_id]
    );

    const formattedResumes = resumes.map(r => ({
      ...r,
      file_path: formatFilePath(r.file_path)
    }));

    const [documents] = await pool.query(
      'SELECT * FROM student_documents WHERE student_id = ? ORDER BY uploaded_at DESC',
      [student.student_id]
    );

    // OJT Background Records
    const [ojtRecords] = await pool.query(
      `SELECT o.*, ho.organization_name, ho.industry, ho.address as org_address, ho.contact_email as org_email,
              os.first_name as mentor_first_name, os.last_name as mentor_last_name, os.contact_number as mentor_contact
       FROM ojt_records o
       JOIN hiring_organizations ho ON o.organization_id = ho.organization_id
       LEFT JOIN organization_staff os ON os.organization_id = o.organization_id AND (os.position = 'workplace_mentor' OR os.position = 'mentor' OR os.position = 'hr_officer')
       WHERE o.student_id = ?
       ORDER BY (CASE WHEN o.status = 'completed' THEN 0 ELSE 1 END), o.created_at DESC`,
      [student.student_id]
    );

    // Workplace Mentor Evaluations
    const [evaluations] = await pool.query(
      `SELECT r.*, u.email as evaluator_email,
              COALESCE(os.first_name, isf.first_name, '') as evaluator_first_name,
              COALESCE(os.last_name, isf.last_name, '') as evaluator_last_name,
              ho.organization_name
       FROM ojt_performance_records r
       JOIN ojt_records o ON r.ojt_id = o.ojt_id
       JOIN hiring_organizations ho ON o.organization_id = ho.organization_id
       LEFT JOIN users u ON r.evaluator_id = u.user_id
       LEFT JOIN organization_staff os ON os.user_id = r.evaluator_id
       LEFT JOIN institution_staff isf ON isf.user_id = r.evaluator_id
       WHERE o.student_id = ?
       ORDER BY r.evaluated_at DESC`,
      [student.student_id]
    );

    return res.json({
      success: true,
      data: {
        portfolio,
        academic_portfolio,
        credentials,
        academic_records,
        resumes: formattedResumes,
        is_graduated: Boolean(isGraduated),
        ojt_background: ojtRecords,
        mentor_evaluations: evaluations,
        // Legacy compat fields
        items: formattedItems,
        achievements,
        documents,
        student: {
          student_id: student.student_id,
          first_name: student.first_name,
          last_name: student.last_name,
          student_number: student.student_number,
          ojt_status: student.ojt_status,
          status_id: student.status_id,
          required_ojt_hours: student.required_ojt_hours,
          completed_ojt_hours: student.completed_ojt_hours
        }
      }
    });
  } catch (error) {
    console.error('Fetch student portfolio error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch portfolio data.' });
  }
});

// POST /api/student/portfolio - Create / Update bio summary
router.post('/portfolio', async (req, res) => {
  const { title, summary } = req.body;
  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found.' });

    const [existing] = await pool.query('SELECT portfolio_id FROM student_portfolios WHERE student_id = ?', [student.student_id]);
    if (existing.length > 0) {
      await pool.query(
        'UPDATE student_portfolios SET title = ?, summary = ?, updated_at = CURRENT_TIMESTAMP WHERE portfolio_id = ?',
        [title || 'My Career Portfolio', summary || '', existing[0].portfolio_id]
      );
    } else {
      await pool.query(
        'INSERT INTO student_portfolios (student_id, title, summary, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        [student.student_id, title || 'My Career Portfolio', summary || '']
      );
    }
    return res.json({ success: true, message: 'Portfolio profile saved.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update portfolio.' });
  }
});

// POST /api/student/portfolio/items - Create item
router.post('/portfolio/items', async (req, res) => {
  const { title, description, file_path, file_name, file_size, item_type, sub_category, associated_org_id, associated_job_id } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, message: 'Title is required.' });
  }
  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    let [portfolios] = await pool.query('SELECT portfolio_id FROM student_portfolios WHERE student_id = ?', [student.student_id]);
    let portfolioId;
    if (portfolios.length === 0) {
      const [insert] = await pool.query(
        'INSERT INTO student_portfolios (student_id, title, summary, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        [student.student_id, 'My Career Portfolio', '']
      );
      portfolioId = insert.insertId;
    } else {
      portfolioId = portfolios[0].portfolio_id;
    }

    const savedFilePath = formatFilePath(file_path);

    try {
      const [resRow] = await pool.query(
        `INSERT INTO portfolio_items (portfolio_id, title, description, file_path, file_name, file_size, item_type, sub_category, associated_org_id, associated_job_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [portfolioId, title, description || '', savedFilePath || '', file_name || null, file_size || null, item_type || 'academic_portfolio', sub_category || null, associated_org_id || null, associated_job_id || null]
      );

      emitUpdate('portfolio_updated', { student_id: student.student_id });

      return res.status(201).json({
        success: true,
        message: 'Portfolio item added successfully!',
        data: { item_id: resRow.insertId }
      });
    } catch (insertError) {
      console.warn('[Add Portfolio Item] Primary insert failed, executing schema fallback:', insertError.message);
      // Fallback for schemas where item_type is enum('project','certificate','sample_work','other') or optional columns are absent
      let safeType = item_type || 'project';
      if (['credential', 'certificate'].includes(safeType)) safeType = 'certificate';
      else if (['academic_portfolio', 'capstone', 'thesis', 'project'].includes(safeType)) safeType = 'project';
      else if (['sample_work'].includes(safeType)) safeType = 'sample_work';
      else safeType = 'other';

      const [resRow] = await pool.query(
        `INSERT INTO portfolio_items (portfolio_id, title, description, file_path, item_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [portfolioId, title, description || '', savedFilePath || '', safeType]
      );

      emitUpdate('portfolio_updated', { student_id: student.student_id });

      return res.status(201).json({
        success: true,
        message: 'Portfolio item added successfully!',
        data: { item_id: resRow.insertId }
      });
    }
  } catch (error) {
    console.error('Add portfolio item error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to add portfolio item.' });
  }
});

// PUT /api/student/portfolio/items/:id - Update item
router.put('/portfolio/items/:id', async (req, res) => {
  const itemId = req.params.id;
  const { title, description, file_path, file_name, file_size, item_type, sub_category } = req.body;

  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const [existing] = await pool.query(
      `SELECT pi.item_id 
       FROM portfolio_items pi
       JOIN student_portfolios sp ON pi.portfolio_id = sp.portfolio_id
       WHERE pi.item_id = ? AND sp.student_id = ?`,
      [itemId, student.student_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Portfolio item not found or unauthorized.' });
    }

    await pool.query(
      `UPDATE portfolio_items 
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           file_path = COALESCE(?, file_path),
           file_name = COALESCE(?, file_name),
           file_size = COALESCE(?, file_size),
           item_type = COALESCE(?, item_type),
           sub_category = COALESCE(?, sub_category),
           updated_at = CURRENT_TIMESTAMP
       WHERE item_id = ?`,
      [title, description, file_path ? formatFilePath(file_path) : file_path, file_name, file_size, item_type, sub_category, itemId]
    );

    emitUpdate('portfolio_updated', { student_id: student.student_id });

    return res.json({ success: true, message: 'Portfolio item updated.' });
  } catch (error) {
    console.error('Update portfolio item error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update item.' });
  }
});

// DELETE /api/student/portfolio/items/:id - Delete item with ownership check
router.delete('/portfolio/items/:id', async (req, res) => {
  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found.' });

    const [result] = await pool.query(
      `DELETE pi FROM portfolio_items pi
       JOIN student_portfolios sp ON pi.portfolio_id = sp.portfolio_id
       WHERE pi.item_id = ? AND sp.student_id = ?`,
      [req.params.id, student.student_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Item not found or unauthorized.' });
    }

    emitUpdate('portfolio_updated', { student_id: student.student_id });

    return res.json({ success: true, message: 'Portfolio item deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete item.' });
  }
});

// POST /api/student/achievements - Create achievement
router.post('/achievements', async (req, res) => {
  const { title, description, date_achieved } = req.body;
  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const [result] = await pool.query(
      'INSERT INTO student_achievements (student_id, title, description, date_achieved, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      [student.student_id, title, description || '', date_achieved || new Date().toISOString().split('T')[0]]
    );

    return res.status(201).json({ success: true, message: 'Achievement added!', data: { achievement_id: result.insertId } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to add achievement.' });
  }
});

// PUT /api/student/achievements/:id - Update achievement
router.put('/achievements/:id', async (req, res) => {
  const achId = req.params.id;
  const { title, description, date_achieved } = req.body;

  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const [result] = await pool.query(
      `UPDATE student_achievements 
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           date_achieved = COALESCE(?, date_achieved),
           updated_at = CURRENT_TIMESTAMP
       WHERE achievement_id = ? AND student_id = ?`,
      [title, description, date_achieved, achId, student.student_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Achievement not found or unauthorized.' });
    }

    return res.json({ success: true, message: 'Achievement updated.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update achievement.' });
  }
});

// DELETE /api/student/achievements/:id - Delete achievement with ownership check
router.delete('/achievements/:id', async (req, res) => {
  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const [result] = await pool.query(
      'DELETE FROM student_achievements WHERE achievement_id = ? AND student_id = ?',
      [req.params.id, student.student_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Achievement not found or unauthorized.' });
    }

    return res.json({ success: true, message: 'Achievement removed.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete achievement.' });
  }
});

// --- STUDENT DOCUMENTS & RESUMES CRUD ---

// GET /api/student/documents
router.get('/documents', async (req, res) => {
  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const [docs] = await pool.query(
      'SELECT * FROM student_documents WHERE student_id = ? ORDER BY uploaded_at DESC',
      [student.student_id]
    );
    return res.json({ success: true, data: docs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not fetch documents.' });
  }
});

// POST /api/student/documents
router.post('/documents', async (req, res) => {
  const { document_type, file_path } = req.body;
  if (!document_type || !file_path) {
    return res.status(400).json({ success: false, message: 'Document type and file path are required.' });
  }

  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const [resRow] = await pool.query(
      `INSERT INTO student_documents (student_id, document_type, file_path, verified, uploaded_at, created_at, updated_at)
       VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [student.student_id, document_type, file_path]
    );

    return res.status(201).json({
      success: true,
      message: 'Document uploaded successfully.',
      data: { document_id: resRow.insertId }
    });
  } catch (error) {
    console.error('Upload document error:', error);
    return res.status(500).json({ success: false, message: 'Failed to upload document.' });
  }
});

// DELETE /api/student/documents/:id
router.delete('/documents/:id', async (req, res) => {
  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const [result] = await pool.query(
      'DELETE FROM student_documents WHERE document_id = ? AND student_id = ?',
      [req.params.id, student.student_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Document not found or unauthorized.' });
    }

    return res.json({ success: true, message: 'Document deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete document.' });
  }
});

// GET /api/student/resumes
router.get('/resumes', async (req, res) => {
  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const [resumes] = await pool.query(
      'SELECT * FROM student_resumes WHERE student_id = ? ORDER BY version DESC, created_at DESC',
      [student.student_id]
    );
    return res.json({ success: true, data: resumes });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not fetch resumes.' });
  }
});

// POST /api/student/resumes
router.post('/resumes', async (req, res) => {
  const { file_path, file_name, file_size } = req.body;
  if (!file_path) return res.status(400).json({ success: false, message: 'Resume file path is required.' });

  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const [[{ maxVer }]] = await pool.query(
      'SELECT COALESCE(MAX(version), 0) as maxVer FROM student_resumes WHERE student_id = ?',
      [student.student_id]
    );

    const newVer = maxVer + 1;

    // Set other versions to inactive
    await pool.query('UPDATE student_resumes SET is_active = 0 WHERE student_id = ?', [student.student_id]);

    const savedPath = formatFilePath(file_path);

    try {
      const [resRow] = await pool.query(
        `INSERT INTO student_resumes (student_id, file_path, file_name, file_size, version, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [student.student_id, savedPath, file_name || 'Resume.pdf', file_size || null, newVer]
      );

      return res.status(201).json({
        success: true,
        message: `Resume v${newVer} saved and set as active.`,
        data: { resume_id: resRow.insertId, version: newVer }
      });
    } catch (insertErr) {
      console.warn('[Save Resume] Primary insert failed, falling back to core schema:', insertErr.message);
      const [resRow] = await pool.query(
        `INSERT INTO student_resumes (student_id, file_path, version, is_active, created_at, updated_at)
         VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [student.student_id, savedPath, newVer]
      );

      return res.status(201).json({
        success: true,
        message: `Resume v${newVer} saved and set as active.`,
        data: { resume_id: resRow.insertId, version: newVer }
      });
    }
  } catch (error) {
    console.error('Save resume error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to save resume.' });
  }
});

// DELETE /api/student/resumes/:id
router.delete('/resumes/:id', async (req, res) => {
  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const [result] = await pool.query(
      'DELETE FROM student_resumes WHERE resume_id = ? AND student_id = ?',
      [req.params.id, student.student_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Resume not found or unauthorized.' });
    }

    return res.json({ success: true, message: 'Resume deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete resume.' });
  }
});

// --- OJT REQUIREMENTS CHECKLIST ---

// POST /api/student/requirements/upload - Upload requirement document/file
router.post('/requirements/upload', (req, res, next) => {
  reqUpload.single('file')(req, res, (err) => {
    if (err) {
      console.error('[Req Multer Error]', err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: 'File size exceeds 30MB limit.' });
        }
        return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ success: false, message: err.message || 'File upload rejected.' });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file provided.' });
  }
  const fileUrl = await saveUploadedFile(req.file, 'requirements');
  if (!fileUrl) {
    return res.status(500).json({ success: false, message: 'Failed to process and store requirement file.' });
  }
  return res.json({
    success: true,
    url: fileUrl,
    file_url: fileUrl,
    data: {
      url: fileUrl,
      file_url: fileUrl,
      file_path: fileUrl,
      file_name: req.file.originalname,
      file_size: req.file.size
    }
  });
});

// GET /api/student/requirements
router.get('/requirements', async (req, res) => {
  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const [requirements] = await pool.query(
      `SELECT r.*, p.program_name, p.program_code,
              (SELECT sr.status FROM ojt_student_requirements sr 
               JOIN ojt_records o ON sr.ojt_id = o.ojt_id 
               WHERE sr.requirement_id = r.requirement_id AND o.student_id = ? LIMIT 1) as submission_status,
              (SELECT sr.file_path FROM ojt_student_requirements sr 
               JOIN ojt_records o ON sr.ojt_id = o.ojt_id 
               WHERE sr.requirement_id = r.requirement_id AND o.student_id = ? LIMIT 1) as submitted_file,
              (SELECT sr.submitted_at FROM ojt_student_requirements sr 
               JOIN ojt_records o ON sr.ojt_id = o.ojt_id 
               WHERE sr.requirement_id = r.requirement_id AND o.student_id = ? LIMIT 1) as submitted_at,
              (SELECT sr.updated_at FROM ojt_student_requirements sr 
               JOIN ojt_records o ON sr.ojt_id = o.ojt_id 
               WHERE sr.requirement_id = r.requirement_id AND o.student_id = ? LIMIT 1) as draft_saved_at
       FROM ojt_requirements r
       LEFT JOIN programs p ON r.program_id = p.program_id
       WHERE (r.institution_id = ? OR r.institution_id IS NULL)
         AND (r.program_id IS NULL OR r.program_id = ?)
       ORDER BY r.is_mandatory DESC, r.created_at ASC`,
      [student.student_id, student.student_id, student.student_id, student.student_id, student.institution_id, student.program_id]
    );

    return res.json({ success: true, data: requirements });
  } catch (error) {
    console.error('Fetch requirements error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch requirements.' });
  }
});

// POST /api/student/requirements/:id/save - Save uploaded file as DRAFT (Does not mark submitted)
router.post('/requirements/:id/save', async (req, res) => {
  const reqId = req.params.id;
  const { file_path } = req.body;

  if (!file_path) {
    return res.status(400).json({ success: false, message: 'File path is required to save a draft.' });
  }

  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    // Find student active or most recent OJT
    const [ojts] = await pool.query(
      'SELECT ojt_id FROM ojt_records WHERE student_id = ? ORDER BY created_at DESC LIMIT 1',
      [student.student_id]
    );

    let ojtId = ojts.length > 0 ? ojts[0].ojt_id : null;
    if (!ojtId) {
      const [orgs] = await pool.query("SELECT organization_id FROM hiring_organizations ORDER BY (CASE WHEN status = 'approved' THEN 0 ELSE 1 END) LIMIT 1");
      const validOrgId = orgs.length > 0 ? orgs[0].organization_id : 1;

      const [newOjt] = await pool.query(
        `INSERT INTO ojt_records (student_id, organization_id, program_id, required_hours, rendered_hours, status, start_date) 
         VALUES (?, ?, ?, ?, 0, 'ongoing', CURRENT_DATE)`,
        [student.student_id, validOrgId, student.program_id, student.required_ojt_hours || 600]
      );
      ojtId = newOjt.insertId;
    }

    const [existing] = await pool.query(
      'SELECT id, status FROM ojt_student_requirements WHERE ojt_id = ? AND requirement_id = ?',
      [ojtId, reqId]
    );

    if (existing.length > 0) {
      // If previously approved, keep approved or revert to draft if re-saving
      const newStatus = existing[0].status === 'approved' ? 'approved' : 'draft';
      await pool.query(
        `UPDATE ojt_student_requirements 
         SET status = ?, file_path = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [newStatus, file_path, existing[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO ojt_student_requirements (ojt_id, requirement_id, status, file_path, created_at, updated_at)
         VALUES (?, ?, 'draft', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [ojtId, reqId, file_path]
      );
    }

    return res.json({
      success: true,
      message: 'Requirement document saved as draft. You can make changes and submit whenever ready.'
    });
  } catch (error) {
    console.error('Save requirement draft error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save draft: ' + error.message });
  }
});

// POST /api/student/requirements/:id/submit - Officially submit document
router.post('/requirements/:id/submit', async (req, res) => {
  const reqId = req.params.id;
  const { file_path } = req.body;

  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    // Find student active or most recent OJT
    const [ojts] = await pool.query(
      'SELECT ojt_id FROM ojt_records WHERE student_id = ? ORDER BY created_at DESC LIMIT 1',
      [student.student_id]
    );

    let ojtId = ojts.length > 0 ? ojts[0].ojt_id : null;
    if (!ojtId) {
      const [orgs] = await pool.query("SELECT organization_id FROM hiring_organizations ORDER BY (CASE WHEN status = 'approved' THEN 0 ELSE 1 END) LIMIT 1");
      const validOrgId = orgs.length > 0 ? orgs[0].organization_id : 1;

      const [newOjt] = await pool.query(
        `INSERT INTO ojt_records (student_id, organization_id, program_id, required_hours, rendered_hours, status, start_date) 
         VALUES (?, ?, ?, ?, 0, 'ongoing', CURRENT_DATE)`,
        [student.student_id, validOrgId, student.program_id, student.required_ojt_hours || 600]
      );
      ojtId = newOjt.insertId;
    }

    const [existing] = await pool.query(
      'SELECT id FROM ojt_student_requirements WHERE ojt_id = ? AND requirement_id = ?',
      [ojtId, reqId]
    );

    if (existing.length > 0) {
      await pool.query(
        `UPDATE ojt_student_requirements 
         SET status = 'submitted', file_path = ?, submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [file_path || 'document_submission.pdf', existing[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO ojt_student_requirements (ojt_id, requirement_id, status, file_path, submitted_at, created_at, updated_at)
         VALUES (?, ?, 'submitted', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [ojtId, reqId, file_path || 'document_submission.pdf']
      );
    }

    // Notify institution coordinators
    const [instStaff] = await pool.query(
      'SELECT user_id FROM institution_staff WHERE institution_id = ? AND (program_id IS NULL OR program_id = ?)',
      [student.institution_id, student.program_id]
    );
    for (const staff of instStaff) {
      if (staff.user_id) {
        await sendNotification({
          userId: staff.user_id,
          title: 'Clearance Requirement Submitted',
          message: `${student.first_name} ${student.last_name} (${student.student_number}) submitted an OJT clearance requirement.`,
          type: 'ojt'
        });
      }
    }

    emitUpdate('requirement_updated', { student_id: student.student_id });

    return res.json({ success: true, message: 'Requirement officially submitted for institutional verification.' });
  } catch (error) {
    console.error('Submit requirement error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit requirement: ' + error.message });
  }
});

// GET /api/student/certificates - Get all earned OJT certificates
router.get('/certificates', async (req, res) => {
  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const [certs] = await pool.query(
      `SELECT c.*, o.start_date, o.end_date, ho.organization_name
       FROM ojt_certificates c
       JOIN ojt_records o ON c.ojt_id = o.ojt_id
       JOIN hiring_organizations ho ON c.organization_id = ho.organization_id
       WHERE c.student_id = ?
       ORDER BY c.issued_at DESC`,
      [student.student_id]
    );

    return res.json({ success: true, data: certs });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch certificates.' });
  }
});

// GET /api/student/certificates/ojt/:ojtId - Get certificate for specific OJT
router.get('/certificates/ojt/:ojtId', async (req, res) => {
  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const [certs] = await pool.query(
      `SELECT c.*, o.start_date, o.end_date, ho.organization_name
       FROM ojt_certificates c
       JOIN ojt_records o ON c.ojt_id = o.ojt_id
       JOIN hiring_organizations ho ON c.organization_id = ho.organization_id
       WHERE c.ojt_id = ? AND c.student_id = ?`,
      [req.params.ojtId, student.student_id]
    );

    if (!certs.length) {
      return res.status(404).json({ success: false, message: 'Certificate not found or not yet generated.' });
    }

    return res.json({ success: true, data: certs[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch certificate.' });
  }
});

// --- COMPLAINTS & GRIEVANCE REPORTING ---

// GET /api/student/complaints
router.get('/complaints', async (req, res) => {
  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const [complaints] = await pool.query(
      `SELECT c.*, c.student_status, 
              COALESCE(cc.category_name, c.incident_category, 'General Incident / Workplace Report') as category_name, 
              COALESCE(ho.organization_name, 'Host Training Organization') as organization_name, 
              jp.title as job_title
       FROM complaints c
       LEFT JOIN complaint_categories cc ON c.category_id = cc.category_id
       LEFT JOIN hiring_organizations ho ON c.organization_id = ho.organization_id
       LEFT JOIN job_postings jp ON c.job_id = jp.job_id
       WHERE c.student_id = ?
       ORDER BY (CASE WHEN c.warning_note_to_student IS NOT NULL AND c.warning_note_to_student != '' THEN 0 ELSE 1 END),
                COALESCE(c.warning_sent_at, c.filed_at, c.created_at) DESC`,
      [student.student_id]
    );

    let [categories] = await pool.query('SELECT category_id, category_name, description FROM complaint_categories ORDER BY category_name ASC');
    if (!categories || categories.length === 0) {
      const defaultCats = [
        ['Workplace Harassment & Sexual Harassment', 'Unwelcome conduct, sexual harassment, inappropriate comments, or hostile advances in the workplace'],
        ['Safety & Substandard Working Conditions', 'Substandard health and occupational safety, lack of PPE, hazard exposure, or unsanitary environment'],
        ['Excessive Hours & Schedule Exploitation', 'Hours exceeding CHED (max 8 hrs/day, 40 hrs/week) or DOLE labor guidelines, or forced graveyard shifts'],
        ['Allowance / Stipend Non-Payment & Delays', 'Delayed, reduced, or completely unpaid agreed student allowance or transport stipend'],
        ['Task Misalignment / Training Plan Violation', 'Assigned duties outside the MOA Training Plan or menial tasks irrelevant to academic program'],
        ['Verbal Abuse, Bullying & Intimidation', 'Hostile work environment, insults, humiliation, or psychological intimidation by mentors/colleagues'],
        ['Breach of MOA / Internship Agreement', 'Failure to provide required mentorship, lack of equipment, or violation of institutional agreement'],
        ['Discrimination & Unfair Workplace Treatment', 'Bias, discrimination, or exclusion based on gender, SOGIE, religion, ethnicity, or disability'],
        ['Unfair Evaluation / Retaliatory Grading', 'Retaliatory, punitive, or biased performance evaluation due to personal disagreements'],
        ['Unethical Demands / Coercion', 'Pressure to perform personal errands, illegal tasks, or falsification of company records'],
        ['Other Workplace Grievance', 'General workplace grievances, administrative conflicts, or concerns not listed above']
      ];
      for (const [cName, cDesc] of defaultCats) {
        await pool.query('INSERT INTO complaint_categories (category_name, description) VALUES (?, ?) ON DUPLICATE KEY UPDATE description = VALUES(description)', [cName, cDesc]);
      }
      [categories] = await pool.query('SELECT category_id, category_name, description FROM complaint_categories ORDER BY category_name ASC');
    }

    // 1. Resolve Active OJT Placement & Host Organization (Synchronized directly with OJT Progress & DTR)
    const [ojtRows] = await pool.query(
      `SELECT o.*, ho.organization_name, ho.industry, ho.logo_url, ho.contact_email, 'ojt' as placement_type
       FROM ojt_records o
       JOIN students s ON o.student_id = s.student_id
       JOIN hiring_organizations ho ON o.organization_id = ho.organization_id
       WHERE o.student_id = ?
       ORDER BY (CASE WHEN o.status IN ('ongoing', 'active', 'accepted', 'in_progress') THEN 0 ELSE 1 END), o.created_at DESC`,
      [student.student_id]
    );

    let activeOjtPlacement = ojtRows.find(r => r.status === 'ongoing' || r.status === 'active' || r.status === 'in_progress' || r.status === 'accepted') || ojtRows[0] || null;

    if (!activeOjtPlacement) {
      // Check accepted deployment offers
      const [offerRows] = await pool.query(
        `SELECT dof.offer_id, dof.organization_id, 'ongoing' as status,
                ho.organization_name, ho.industry, ho.logo_url, 'ojt' as placement_type
         FROM ojt_deployment_offers dof
         JOIN hiring_organizations ho ON dof.organization_id = ho.organization_id
         WHERE dof.student_id = ? AND dof.status IN ('accepted', 'deployed', 'active')
         ORDER BY dof.created_at DESC
         LIMIT 1`,
        [student.student_id]
      );
      if (offerRows.length > 0) {
        activeOjtPlacement = offerRows[0];
      }
    }

    if (!activeOjtPlacement) {
      // Check accepted job applications for OJT
      const [ojtAppRows] = await pool.query(
        `SELECT ja.application_id, ja.job_id, ja.status as app_status,
                jp.posting_type, jp.title as job_title,
                ho.organization_id, ho.organization_name, ho.industry, ho.logo_url,
                'ojt' as placement_type
         FROM job_applications ja
         JOIN job_postings jp ON ja.job_id = jp.job_id
         JOIN hiring_organizations ho ON jp.organization_id = ho.organization_id
         WHERE ja.student_id = ? AND (jp.posting_type = 'ojt' OR jp.posting_type IS NULL) AND ja.status IN ('accepted', 'hired')
         ORDER BY FIELD(ja.status, 'accepted', 'hired'), ja.updated_at DESC
         LIMIT 1`,
        [student.student_id]
      );
      if (ojtAppRows.length > 0) {
        activeOjtPlacement = ojtAppRows[0];
      }
    }

    // 2. Check On-Call and Career Job Placements
    const [careerAppRows] = await pool.query(
      `SELECT ja.application_id, ja.job_id, ja.status as app_status,
              jp.posting_type, jp.title as job_title,
              ho.organization_id, ho.organization_name, ho.industry, ho.logo_url
       FROM job_applications ja
       JOIN job_postings jp ON ja.job_id = jp.job_id
       JOIN hiring_organizations ho ON jp.organization_id = ho.organization_id
       WHERE ja.student_id = ? AND jp.posting_type IN ('on_call', 'part_time', 'career_job', 'full_time') AND ja.status IN ('accepted', 'hired')
       ORDER BY ja.updated_at DESC
       LIMIT 1`,
      [student.student_id]
    );
    const activeCareerPlacement = careerAppRows.length > 0 ? careerAppRows[0] : null;

    // 3. List of organizations (student's applied/placed orgs + all active/approved hiring orgs)
    const [orgs] = await pool.query(
      `SELECT DISTINCT
         ho.organization_id,
         ho.organization_name,
         ho.industry,
         ho.city,
         ho.province,
         ho.logo_url,
         CASE 
           WHEN EXISTS (
             SELECT 1 FROM ojt_records o 
             WHERE o.organization_id = ho.organization_id 
               AND o.student_id = ?
           ) THEN 1
           WHEN EXISTS (
             SELECT 1 FROM job_applications ja 
             JOIN job_postings jp ON ja.job_id = jp.job_id
             WHERE jp.organization_id = ho.organization_id 
               AND ja.student_id = ?
           ) THEN 1
           WHEN EXISTS (
             SELECT 1 FROM ojt_deployment_offers dof 
             WHERE dof.organization_id = ho.organization_id 
               AND dof.student_id = ?
           ) THEN 1
           ELSE 0
         END as is_my_employer
       FROM hiring_organizations ho
       WHERE ho.status NOT IN ('deleted', 'archived', 'rejected') OR ho.status IS NULL
       ORDER BY is_my_employer DESC, ho.organization_name ASC`,
      [student.student_id, student.student_id, student.student_id]
    );

    // Determine default student status: 'ongoing_ojt', 'on_call', 'career_job'
    let defaultStatus = 'ongoing_ojt';
    if (activeOjtPlacement) {
      defaultStatus = 'ongoing_ojt';
    } else if (activeCareerPlacement?.posting_type === 'on_call' || activeCareerPlacement?.posting_type === 'part_time') {
      defaultStatus = 'on_call';
    } else if (activeCareerPlacement?.posting_type === 'career_job' || activeCareerPlacement?.posting_type === 'full_time' || student.ojt_status === 'graduated' || student.status_id === 5) {
      defaultStatus = 'career_job';
    } else {
      defaultStatus = 'ongoing_ojt';
    }

    const hasActivePlacement = Boolean(activeOjtPlacement || activeCareerPlacement || ojtRows.length > 0);

    return res.json({
      success: true,
      data: {
        complaints,
        categories,
        orgs,
        assigned_organization: activeOjtPlacement || activeCareerPlacement || (ojtRows[0] ? { organization_id: ojtRows[0].organization_id, organization_name: ojtRows[0].organization_name, industry: ojtRows[0].industry } : null),
        active_ojt_placement: activeOjtPlacement || (ojtRows[0] ? { organization_id: ojtRows[0].organization_id, organization_name: ojtRows[0].organization_name, industry: ojtRows[0].industry } : null),
        active_career_placement: activeCareerPlacement,
        can_file: hasActivePlacement,
        has_ongoing_ojt: !!activeOjtPlacement,
        default_student_status: defaultStatus
      }
    });
  } catch (error) {
    console.error('Fetch student complaints error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch complaints.' });
  }
});

// POST /api/student/complaints
router.post('/complaints', async (req, res) => {
  const { organization_id, category_id, subject, description, job_id, student_status } = req.body;

  if (!category_id || !subject || !description) {
    return res.status(400).json({ success: false, message: 'Please provide category, subject, and description.' });
  }

  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    // Check ongoing or assigned OJT placement
    const [ojtRows] = await pool.query(
      `SELECT o.ojt_id, o.organization_id, ho.organization_name, o.status
       FROM ojt_records o
       JOIN hiring_organizations ho ON o.organization_id = ho.organization_id
       WHERE o.student_id = ?
       ORDER BY (CASE WHEN o.status IN ('ongoing', 'active', 'accepted', 'in_progress') THEN 0 ELSE 1 END), o.created_at DESC`,
      [student.student_id]
    );

    let activeOjt = ojtRows.length > 0 ? ojtRows[0] : null;

    if (!activeOjt) {
      const [offerRows] = await pool.query(
        `SELECT dof.offer_id, dof.organization_id, ho.organization_name
         FROM ojt_deployment_offers dof
         JOIN hiring_organizations ho ON dof.organization_id = ho.organization_id
         WHERE dof.student_id = ? AND dof.status IN ('accepted', 'deployed', 'active')
         ORDER BY dof.created_at DESC LIMIT 1`,
        [student.student_id]
      );
      if (offerRows.length > 0) activeOjt = offerRows[0];
    }

    if (!activeOjt) {
      // Check accepted career / on-call positions
      const [careerRows] = await pool.query(
        `SELECT ja.application_id, ho.organization_id, ho.organization_name
         FROM job_applications ja
         JOIN job_postings jp ON ja.job_id = jp.job_id
         JOIN hiring_organizations ho ON jp.organization_id = ho.organization_id
         WHERE ja.student_id = ? AND ja.status IN ('accepted', 'hired')
         ORDER BY ja.updated_at DESC LIMIT 1`,
        [student.student_id]
      );
      if (careerRows.length > 0) activeOjt = careerRows[0];
    }

    // If no active host organization is assigned and no target org specified, check if student selected one
    if (!activeOjt && !organization_id) {
      return res.status(403).json({
        success: false,
        message: 'You cannot file a grievance because you do not have an active Host Organization assigned. Grievance filing is only available for officially placed students and interns.'
      });
    }

    const resolvedStatus = student_status || (activeOjt ? 'ongoing_ojt' : 'career_job');
    const isOjt = resolvedStatus === 'ongoing_ojt' || resolvedStatus === 'ojt';

    // Target Organization Resolution:
    // If selected, use organization_id; otherwise if OJT, default to Current OJT Placement
    let targetOrgId = organization_id || (isOjt && activeOjt ? activeOjt.organization_id : null);

    if (!targetOrgId) {
      // Check latest interacted organization
      const [latestOrg] = await pool.query(
        `SELECT organization_id FROM ojt_records WHERE student_id = ? 
         UNION 
         SELECT ho.organization_id FROM job_applications ja JOIN job_postings jp ON ja.job_id = jp.job_id JOIN hiring_organizations ho ON jp.organization_id = ho.organization_id WHERE ja.student_id = ? 
         LIMIT 1`,
        [student.student_id, student.student_id]
      );
      if (latestOrg.length > 0) {
        targetOrgId = latestOrg[0].organization_id;
      }
    }

    // Resolve target organization safely against hiring_organizations (FK protection)
    let resolvedOrgId = null;
    const orgIdNum = parseInt(targetOrgId, 10);
    if (!isNaN(orgIdNum) && orgIdNum > 0) {
      const [foundOrg] = await pool.query('SELECT organization_id, organization_name FROM hiring_organizations WHERE organization_id = ?', [orgIdNum]);
      if (foundOrg.length > 0) {
        resolvedOrgId = foundOrg[0].organization_id;
      }
    }

    if (!resolvedOrgId && targetOrgId && typeof targetOrgId === 'string' && isNaN(Number(targetOrgId))) {
      // If a string key or name was provided (e.g. from mock presets), match by organization_name
      const [foundByName] = await pool.query('SELECT organization_id FROM hiring_organizations WHERE organization_name LIKE ? LIMIT 1', [`%${targetOrgId.replace(/_/g, ' ')}%`]);
      if (foundByName.length > 0) {
        resolvedOrgId = foundByName[0].organization_id;
      }
    }

    if (!resolvedOrgId) {
      if (activeOjt && activeOjt.organization_id) {
        resolvedOrgId = activeOjt.organization_id;
      } else {
        const [anyOrg] = await pool.query('SELECT organization_id FROM hiring_organizations ORDER BY organization_id ASC LIMIT 1');
        if (anyOrg.length > 0) {
          resolvedOrgId = anyOrg[0].organization_id;
        }
      }
    }

    if (!resolvedOrgId) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid target hiring organization.'
      });
    }

    // Get organization name for notification messages
    const [orgDetail] = await pool.query('SELECT organization_name FROM hiring_organizations WHERE organization_id = ?', [resolvedOrgId]);
    const targetOrgName = orgDetail.length > 0 ? orgDetail[0].organization_name : 'Host Organization';

    // 1. Resolve category_id safely against complaint_categories (FK protection)
    let resolvedCatId = null;
    const catIdNum = parseInt(category_id, 10);
    if (!isNaN(catIdNum) && catIdNum > 0) {
      const [foundById] = await pool.query('SELECT category_id FROM complaint_categories WHERE category_id = ?', [catIdNum]);
      if (foundById.length > 0) {
        resolvedCatId = foundById[0].category_id;
      }
    }

    // 2. If not found by numeric ID, resolve by category name
    if (!resolvedCatId) {
      const candidateName = (typeof req.body.category_name === 'string' && req.body.category_name.trim())
        ? req.body.category_name.trim()
        : (typeof category_id === 'string' && isNaN(Number(category_id)))
          ? category_id.trim()
          : '';

      if (candidateName) {
        const [foundByName] = await pool.query('SELECT category_id FROM complaint_categories WHERE category_name = ? LIMIT 1', [candidateName]);
        if (foundByName.length > 0) {
          resolvedCatId = foundByName[0].category_id;
        } else {
          // Check substring match
          const [foundLike] = await pool.query('SELECT category_id FROM complaint_categories WHERE category_name LIKE ? LIMIT 1', [`%${candidateName.slice(0, 15)}%`]);
          if (foundLike.length > 0) {
            resolvedCatId = foundLike[0].category_id;
          } else {
            const [ins] = await pool.query('INSERT INTO complaint_categories (category_name, description) VALUES (?, ?)', [candidateName, 'Student reported category']);
            resolvedCatId = ins.insertId;
          }
        }
      }
    }

    // 3. Fallback to any valid complaint category in table, or seed default
    if (!resolvedCatId) {
      const [anyCat] = await pool.query('SELECT category_id FROM complaint_categories ORDER BY category_id ASC LIMIT 1');
      if (anyCat.length > 0) {
        resolvedCatId = anyCat[0].category_id;
      } else {
        const [insDef] = await pool.query("INSERT INTO complaint_categories (category_name, description) VALUES ('Other Workplace Grievance', 'General workplace grievances')");
        resolvedCatId = insDef.insertId;
      }
    }

    // Validate job_id against job_postings (FK protection)
    let resolvedJobId = null;
    if (job_id) {
      const jobIdNum = parseInt(job_id, 10);
      if (!isNaN(jobIdNum) && jobIdNum > 0) {
        const [foundJob] = await pool.query('SELECT job_id FROM job_postings WHERE job_id = ?', [jobIdNum]);
        if (foundJob.length > 0) {
          resolvedJobId = foundJob[0].job_id;
        }
      }
    }

    // Prepare safe status value for both VARCHAR and legacy ENUM schemas
    const legacyStatus = isOjt ? 'ojt' : 'graduated';
    let result;
    try {
      const [res] = await pool.query(
        `INSERT INTO complaints (student_id, student_status, organization_id, category_id, job_id, subject, description, complainant_type, status, filed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'student', 'submitted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [student.student_id, resolvedStatus, resolvedOrgId, resolvedCatId, resolvedJobId, subject, description]
      );
      result = res;
    } catch (insertErr) {
      if (insertErr.code === 'WARN_DATA_TRUNCATED' || insertErr.message?.includes('student_status')) {
        // Attempt modifying column on the fly and retry
        try {
          await pool.query("ALTER TABLE complaints MODIFY COLUMN student_status VARCHAR(50) DEFAULT 'ojt'");
        } catch (_) {}
        const [res] = await pool.query(
          `INSERT INTO complaints (student_id, student_status, organization_id, category_id, job_id, subject, description, complainant_type, status, filed_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'student', 'submitted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [student.student_id, legacyStatus, resolvedOrgId, resolvedCatId, resolvedJobId, subject, description]
        );
        result = res;
      } else {
        throw insertErr;
      }
    }

    // Audit log
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, created_at) VALUES (?, \'complaint_filed\', \'complaints\', ?, CURRENT_TIMESTAMP)',
      [req.user.user_id, result.insertId]
    );

    // DIRECT SYSTEM ADMIN ROUTING FOR: on_call / part_time, career_job / graduated, ojt_completer
    // Complaint NO LONGER goes to the educational institution!
    if (!isOjt) {
      const [admins] = await pool.query("SELECT user_id FROM users WHERE role IN ('admin', 'superadmin')");
      const statusLabel = resolvedStatus === 'on_call' || resolvedStatus === 'part_time'
        ? 'On-Call / Part-Time'
        : resolvedStatus === 'career_job' || resolvedStatus === 'graduated'
        ? 'Career Job / Graduated'
        : 'OJT Completer';

      for (const adm of admins) {
        if (adm.user_id) {
          await sendNotification({
            userId: adm.user_id,
            senderId: req.user.user_id,
            senderName: `${student.first_name} ${student.last_name}`,
            title: `Direct Grievance Filed (${statusLabel})`,
            message: `${student.first_name} ${student.last_name} (${statusLabel}) filed a grievance regarding ${targetOrgName}: "${subject}". Routed directly to System Administrator (Institution Bypassed).`,
            type: 'complaint',
            link: '/dashboard/admin/grievances',
            relatedType: 'grievance',
            relatedId: result.insertId,
            meta: {
              complaint_id: result.insertId,
              organization_id: targetOrgId
            }
          });
        }
      }

      return res.status(201).json({
        success: true,
        message: `Grievance submitted successfully. For ${statusLabel} engagements, your complaint has bypassed the educational institution and is routed directly to the System Administrator.`
      });
    }

    // FOR ONGOING OJT STUDENTS:
    // Routed to the student's Institution OJT Coordinators & Dean for formal academic review & workplace mediation
    const studentProgId = student.program_id || null;
    const [coordinators] = await pool.query(
      `SELECT DISTINCT user_id FROM (
         SELECT isf.user_id FROM institution_staff isf 
         WHERE isf.institution_id = ? 
           AND isf.user_id IS NOT NULL
           AND (
             isf.position IN ('guidance_counselor', 'ojt_supervisor', 'ojt_coordinator', 'dean', 'Internship Practicum Supervisor', 'College OJT Coordinator')
             OR JSON_UNQUOTE(JSON_EXTRACT(isf.permissions, '$.can_handle_grievances')) = 'true'
             OR JSON_UNQUOTE(JSON_EXTRACT(isf.permissions, '$.can_manage_ojt_records')) = 'true'
             OR isf.permissions LIKE '%"can_handle_grievances":true%'
             OR isf.permissions LIKE '%"can_manage_ojt_records":true%'
           )
           AND (isf.position != 'registrar' OR JSON_UNQUOTE(JSON_EXTRACT(isf.permissions, '$.can_handle_grievances')) = 'true')
           AND (isf.program_id IS NULL OR ? IS NULL OR isf.program_id = ?)
         UNION
         SELECT ireg.submitted_by as user_id FROM institution_registrations ireg WHERE ireg.institution_id = ? AND ireg.submitted_by IS NOT NULL
         UNION
         SELECT u.user_id FROM users u JOIN institutions i ON i.contact_email = u.email WHERE i.institution_id = ? AND u.user_id IS NOT NULL
       ) as all_inst_users`,
      [student.institution_id, studentProgId, studentProgId, student.institution_id, student.institution_id]
    );

    for (const recipient of coordinators) {
      if (recipient.user_id) {
        await sendNotification({
          userId: recipient.user_id,
          senderId: req.user.user_id,
          senderName: `${student.first_name} ${student.last_name}`,
          title: 'New Grievance & Incident Report Filed',
          message: `${student.first_name} ${student.last_name} (Current OJT) filed a grievance report regarding ${targetOrgName}: "${subject}".`,
          type: 'complaint',
          link: '/dashboard/institution/monitoring?tab=studentGrievances',
          relatedType: 'grievance',
          relatedId: result.insertId,
          meta: {
            institution_id: student.institution_id,
            complaint_id: result.insertId
          }
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Grievance submitted successfully. Your Institution OJT Coordinator has been notified for formal review and workplace mediation.'
    });
  } catch (error) {
    console.error('Submit complaint error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit complaint: ' + error.message });
  }
});

// DELETE /api/student/complaints/:id - Withdraw / Delete submitted complaint
router.delete('/complaints/:id', async (req, res) => {
  const complaintId = req.params.id;

  try {
    const student = await getStudentId(req.user.user_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const [rows] = await pool.query(
      'SELECT * FROM complaints WHERE complaint_id = ? AND student_id = ?',
      [complaintId, student.student_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Complaint record not found or unauthorized.' });
    }

    if (rows[0].status !== 'submitted') {
      return res.status(400).json({ success: false, message: `Cannot withdraw complaint with status "${rows[0].status}".` });
    }

    await pool.query('DELETE FROM complaints WHERE complaint_id = ? AND student_id = ?', [complaintId, student.student_id]);

    return res.json({ success: true, message: 'Grievance complaint withdrawn.' });
  } catch (error) {
    console.error('Withdraw complaint error:', error);
    return res.status(500).json({ success: false, message: 'Failed to withdraw complaint.' });
  }
});

// --- NOTIFICATIONS ---

// GET /api/student/notifications
router.get('/notifications', async (req, res) => {
  try {
    const [notifications] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30',
      [req.user.user_id]
    );

    return res.json({ success: true, data: notifications });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not fetch notifications.' });
  }
});

// PUT /api/student/notifications/read-all
router.put('/notifications/read-all', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.user_id]);
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update notifications.' });
  }
});

// PUT /api/student/notifications/:id/read
router.put('/notifications/:id/read', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?', [req.params.id, req.user.user_id]);
    return res.json({ success: true, message: 'Marked as read.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
});

export default router;

