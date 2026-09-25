import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { emitUpdate } from '../config/socket.js';
import { sendNotification } from '../utils/notification.helper.js';
import { checkAndGenerateCertificate } from '../services/certificate.service.js';
import { isValidEmail, normalizeEmail } from '../utils/email.js';

import { getUploadStorage, saveUploadedFile } from '../utils/upload.helper.js';

const reqUpload = multer({
  storage: getUploadStorage('requirements'),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
  fileFilter: (req, file, cb) => {
    const allowedExts = /jpeg|jpg|png|webp|gif|pdf|doc|docx|ppt|pptx|xls|xlsx|txt|zip|rar/i;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowedExts.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('File upload rejected: Only documents, images, and archives are allowed.'));
    }
  }
});

const router = express.Router();
router.use(verifyToken);
router.use(requireRole(['institution', 'institution_staff']));

// Helper to get institution details for current authenticated user
const getInstId = async (userId) => {
  const [instReg] = await pool.query(
    `SELECT i.* FROM institutions i
     JOIN institution_registrations ireg ON i.institution_id = ireg.institution_id
     WHERE ireg.submitted_by = ?`,
    [userId]
  );
  if (instReg.length > 0) return instReg[0];

  const [staffRows] = await pool.query(
    `SELECT i.* FROM institutions i
     JOIN institution_staff ist ON i.institution_id = ist.institution_id
     WHERE ist.user_id = ?`,
    [userId]
  );
  if (staffRows.length > 0) return staffRows[0];

  const [userRows] = await pool.query('SELECT email FROM users WHERE user_id = ?', [userId]);
  if (userRows.length > 0) {
    const [instRows] = await pool.query('SELECT * FROM institutions WHERE contact_email = ?', [userRows[0].email]);
    if (instRows.length > 0) return instRows[0];
  }

  return null;
};

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

/**
 * Resolves the program scope for a requesting user.
 * - Main institution account (`role: 'institution'`): returns `{ isRestricted: false, isDean: false, department: null, programId: null, programIds: [], program: null, programs: [] }`
 * - College Dean: returns `{ isRestricted: true, isDean: true, department: <Dept>, programId: <PrimaryID>, programIds: [<IDs in Dept>], programs: [...] }`
 * - Staff assigned to a specific program: returns `{ isRestricted: true, isDean: false, programId: <ID>, programIds: [<ID>], program: { ... } }`
 */
const getStaffProgramScope = async (userId, userRole, institutionId) => {
  if (userRole === 'institution') {
    return { isRestricted: false, isDean: false, department: null, programId: null, programIds: [], program: null, programs: [] };
  }

  if (userRole === 'institution_staff') {
    const [staffRows] = await pool.query(
      `SELECT ist.*, p.program_id as assigned_program_id, p.program_name, p.program_code, p.department as prog_department
       FROM institution_staff ist
       LEFT JOIN programs p ON ist.program_id = p.program_id
       WHERE ist.user_id = ? AND ist.institution_id = ?`,
      [userId, institutionId]
    );

    if (staffRows.length > 0) {
      const staff = staffRows[0];
      const positionLower = (staff.position || '').toLowerCase().trim();
      const isDean = positionLower.includes('dean');
      const staffDept = staff.department || staff.prog_department;
      const deptLower = (staffDept || '').toLowerCase().trim();
      const isAllDepts = !staffDept || ['all', 'all departments', 'all programs', 'institution-wide', 'n/a', 'none', 'entire institution'].includes(deptLower);

      // If staff position or department indicates all-programs / institution-wide access, do not restrict
      if (isAllDepts && !staff.program_id) {
        return { isRestricted: false, isDean: false, department: null, programId: null, programIds: [], program: null, programs: [] };
      }

      if (isDean && staffDept && !isAllDepts) {
        let [deptPrograms] = await pool.query(
          `SELECT program_id, program_name, program_code, department 
           FROM programs 
           WHERE institution_id = ? AND (
             department = ? OR 
             department LIKE ? OR 
             ? LIKE CONCAT('%', department, '%')
           )
           ORDER BY program_name ASC`,
          [institutionId, staffDept, `%${staffDept}%`, staffDept]
        );

        if (deptPrograms.length === 0 && staff.assigned_program_id) {
          const [assignedProg] = await pool.query(
            `SELECT program_id, program_name, program_code, department
             FROM programs
             WHERE program_id = ? AND institution_id = ?`,
            [staff.assigned_program_id, institutionId]
          );
          if (assignedProg.length > 0) {
            deptPrograms = assignedProg;
          }
        }

        let progIds = deptPrograms.map(p => p.program_id);
        if (staff.assigned_program_id && !progIds.includes(staff.assigned_program_id)) {
          progIds.push(staff.assigned_program_id);
        }

        return {
          isRestricted: true,
          isDean: true,
          department: staffDept,
          programId: staff.program_id || (progIds.length > 0 ? progIds[0] : null),
          programIds: progIds,
          staffId: staff.staff_id,
          position: staff.position,
          programs: deptPrograms
        };
      }

      if (staff.program_id) {
        return {
          isRestricted: true,
          isDean: false,
          department: staffDept,
          programId: staff.program_id,
          programIds: [staff.program_id],
          staffId: staff.staff_id,
          position: staff.position,
          programs: [{
            program_id: staff.program_id,
            program_name: staff.program_name,
            program_code: staff.program_code,
            department: staff.prog_department
          }],
          program: {
            program_id: staff.program_id,
            program_name: staff.program_name,
            program_code: staff.program_code,
            department: staff.prog_department
          }
        };
      }

      if (staffDept && !isAllDepts) {
        let [deptPrograms] = await pool.query(
          `SELECT program_id, program_name, program_code, department 
           FROM programs 
           WHERE institution_id = ? AND (
             department = ? OR 
             department LIKE ? OR 
             ? LIKE CONCAT('%', department, '%')
           )
           ORDER BY program_name ASC`,
          [institutionId, staffDept, `%${staffDept}%`, staffDept]
        );
        if (deptPrograms.length > 0) {
          const progIds = deptPrograms.map(p => p.program_id);
          return {
            isRestricted: true,
            isDean: false,
            department: staffDept,
            programId: progIds[0],
            programIds: progIds,
            staffId: staff.staff_id,
            position: staff.position,
            programs: deptPrograms,
            program: deptPrograms[0]
          };
        }
      }
    }
  }

  return { isRestricted: false, isDean: false, department: null, programId: null, programIds: [], program: null, programs: [] };
};

/**
 * Checks whether a given program ID falls within the user's scope.
 */
const isProgramAllowed = (scope, programId) => {
  if (!scope || !scope.isRestricted) return true;
  if (!programId) return true;
  if (scope.isDean || (scope.programIds && scope.programIds.length > 1)) {
    return Array.isArray(scope.programIds) && (scope.programIds.length === 0 || scope.programIds.includes(Number(programId)));
  }
  return Number(scope.programId) === Number(programId);
};

/**
 * Appends the appropriate SQL filter for staff program/department scope.
 */
const appendProgramScopeSql = (sql, params, scope, column = 's.program_id') => {
  if (!scope || !scope.isRestricted) return sql;
  if (scope.isDean || (scope.programIds && scope.programIds.length > 1)) {
    if (scope.programIds && scope.programIds.length > 0) {
      params.push(scope.programIds);
      return sql + ` AND (${column} IN (?) OR ${column} IS NULL)`;
    }
    if (scope.programId) {
      params.push(scope.programId);
      return sql + ` AND (${column} = ? OR ${column} IS NULL)`;
    }
    return sql;
  }
  if (scope.programId) {
    params.push(scope.programId);
    return sql + ` AND (${column} = ? OR ${column} IS NULL)`;
  }
  return sql;
};

/**
 * Verifies if the requester has permission to access a student record.
 */
const verifyStudentAccess = async (scope, studentId, institutionId) => {
  const [stuRows] = await pool.query(
    `SELECT s.*, p.program_name, p.program_code, p.department
     FROM students s
     LEFT JOIN programs p ON s.program_id = p.program_id
     WHERE s.student_id = ? AND s.institution_id = ?`,
    [studentId, institutionId]
  );

  if (stuRows.length === 0) {
    return { allowed: false, status: 404, message: 'Student not found or does not belong to your institution.' };
  }

  const stu = stuRows[0];
  if (scope.isRestricted && !isProgramAllowed(scope, stu.program_id)) {
    return {
      allowed: false,
      status: 403,
      message: `Access Denied: You are assigned to ${scope.isDean ? `the ${scope.department} department` : (scope.program?.program_name || 'your degree program')} and cannot access students from other programs.`
    };
  }

  return { allowed: true, student: stu };
};

/**
 * Verifies if the requester has permission to access a student registration record.
 */
const verifyRegistrationAccess = async (scope, regId, institutionId) => {
  const [regRows] = await pool.query(
    `SELECT sr.*, s.student_id, s.institution_id, s.program_id, s.user_id, s.student_number, s.first_name, s.last_name, s.passcode_used
     FROM student_registrations sr
     JOIN students s ON sr.student_id = s.student_id
     WHERE sr.registration_id = ? AND s.institution_id = ?`,
    [regId, institutionId]
  );

  if (regRows.length === 0) {
    return { allowed: false, status: 404, message: 'Registration record not found or does not belong to your institution.' };
  }

  const reg = regRows[0];
  if (scope.isRestricted && !isProgramAllowed(scope, reg.program_id)) {
    return {
      allowed: false,
      status: 403,
      message: `Access Denied: You are assigned to ${scope.isDean ? `the ${scope.department} department` : (scope.program?.program_name || 'your degree program')} and cannot verify or reject students from other programs.`
    };
  }

  return { allowed: true, registration: reg };
};

/**
 * Verifies if the requester has permission to access a complaint record.
 */
const verifyComplaintAccess = async (scope, complaintId, institutionId) => {
  const [complaintRows] = await pool.query(
    `SELECT c.*, s.program_id, s.institution_id, s.user_id as student_user_id, s.first_name, s.last_name, ho.organization_name
     FROM complaints c
     JOIN students s ON c.student_id = s.student_id
     LEFT JOIN hiring_organizations ho ON c.organization_id = ho.organization_id
     WHERE c.complaint_id = ? AND s.institution_id = ?`,
    [complaintId, institutionId]
  );

  if (complaintRows.length === 0) {
    return { allowed: false, status: 404, message: 'Complaint record not found or does not belong to your institution.' };
  }

  const comp = complaintRows[0];
  if (scope.isRestricted && !isProgramAllowed(scope, comp.program_id)) {
    return {
      allowed: false,
      status: 403,
      message: `Access Denied: You are assigned to ${scope.isDean ? `the ${scope.department} department` : (scope.program?.program_name || 'your degree program')} and cannot manage grievances for students from other programs.`
    };
  }

  return { allowed: true, complaint: comp };
};

// GET /api/inst/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) {
      return res.status(404).json({ success: false, message: 'Institution not found.' });
    }

    const instId = inst.institution_id;
    const scope = await getStaffProgramScope(req.user.user_id, req.user.role, instId);

    // 1. Pending student verifications
    let pendingCountSql = `SELECT COUNT(*) as pendingCount 
       FROM student_registrations sr
       JOIN students s ON sr.student_id = s.student_id
       WHERE s.institution_id = ? AND sr.status = 'pending'`;
    const pendingCountParams = [instId];
    pendingCountSql = appendProgramScopeSql(pendingCountSql, pendingCountParams, scope, 's.program_id');
    const [[{ pendingCount }]] = await pool.query(pendingCountSql, pendingCountParams);

    // 2. Total registered students
    let totalStuSql = 'SELECT COUNT(*) as totalStudents FROM students WHERE institution_id = ? AND is_active = 1';
    const totalStuParams = [instId];
    totalStuSql = appendProgramScopeSql(totalStuSql, totalStuParams, scope, 'program_id');
    const [[{ totalStudents }]] = await pool.query(totalStuSql, totalStuParams);

    // 3. Deployed OJT students
    let deployedSql = `SELECT COUNT(DISTINCT s.student_id) as deployedStudents 
       FROM ojt_records o
       JOIN students s ON o.student_id = s.student_id
       WHERE s.institution_id = ? AND o.status = 'ongoing'`;
    const deployedParams = [instId];
    deployedSql = appendProgramScopeSql(deployedSql, deployedParams, scope, 's.program_id');
    const [[{ deployedStudents }]] = await pool.query(deployedSql, deployedParams);

    // 4. Partner organizations
    let partnerSql = `SELECT COUNT(DISTINCT o.organization_id) as partnerOrgs 
       FROM ojt_records o
       JOIN students s ON o.student_id = s.student_id
       WHERE s.institution_id = ?`;
    const partnerParams = [instId];
    partnerSql = appendProgramScopeSql(partnerSql, partnerParams, scope, 's.program_id');
    const [[{ partnerOrgs }]] = await pool.query(partnerSql, partnerParams);

    // 5. Active staff count & pending staff count
    const [[{ totalStaff }]] = await pool.query(
      'SELECT COUNT(*) as totalStaff FROM institution_staff WHERE institution_id = ? AND is_active = 1',
      [instId]
    );

    let pendingStaffSql = `SELECT COUNT(*) as pendingStaffCount 
       FROM institution_staff s
       LEFT JOIN entity_registrations er ON er.entity_type = 'institution_staff' AND er.entity_id = s.staff_id
       LEFT JOIN programs p ON s.program_id = p.program_id
       WHERE s.institution_id = ? AND (s.is_verified = 0 OR er.status = 'pending')`;
    const pendingStaffParams = [instId];
    if (scope.isRestricted) {
      if (scope.isDean && scope.department) {
        pendingStaffSql += ` AND (s.department = ? OR p.department = ?`;
        pendingStaffParams.push(scope.department, scope.department);
        if (scope.programIds && scope.programIds.length > 0) {
          pendingStaffSql += ` OR s.program_id IN (${scope.programIds.map(() => '?').join(',')})`;
          pendingStaffParams.push(...scope.programIds);
        }
        pendingStaffSql += `)`;
      } else {
        pendingStaffSql += ` AND 1 = 0`;
      }
    }
    const [[{ pendingStaffCount }]] = await pool.query(pendingStaffSql, pendingStaffParams);

    // 6. Active degree programs count
    let activeProgSql = 'SELECT COUNT(*) as activePrograms FROM programs WHERE institution_id = ?';
    const activeProgParams = [instId];
    if (scope.isRestricted) {
      if (scope.isDean) {
        activeProgSql += ' AND department = ?';
        activeProgParams.push(scope.department);
      } else {
        activeProgSql += ' AND program_id = ?';
        activeProgParams.push(scope.programId);
      }
    }
    const [[{ activePrograms }]] = await pool.query(activeProgSql, activeProgParams);

    // 7. Recent pending students list
    let recentPendingSql = `SELECT sr.registration_id, sr.submitted_at, sr.verification_notes,
              s.student_id, s.student_number, s.first_name, s.last_name, s.classification, s.ojt_status,
              p.program_name, p.program_code, u.email
       FROM student_registrations sr
       JOIN students s ON sr.student_id = s.student_id
       JOIN users u ON s.user_id = u.user_id
       LEFT JOIN programs p ON s.program_id = p.program_id
       WHERE s.institution_id = ? AND sr.status = 'pending'`;
    const recentPendingParams = [instId];
    recentPendingSql = appendProgramScopeSql(recentPendingSql, recentPendingParams, scope, 's.program_id');
    recentPendingSql += ' ORDER BY sr.submitted_at ASC LIMIT 10';
    const [recentPending] = await pool.query(recentPendingSql, recentPendingParams);

    // 8. Recent active OJT deployments
    let recentDepSql = `SELECT o.*, s.first_name, s.last_name, s.student_number, p.program_name,
              ho.organization_name, ho.industry
       FROM ojt_records o
       JOIN students s ON o.student_id = s.student_id
       JOIN hiring_organizations ho ON o.organization_id = ho.organization_id
       LEFT JOIN programs p ON s.program_id = p.program_id
       WHERE s.institution_id = ? AND o.status = 'ongoing'`;
    const recentDepParams = [instId];
    recentDepSql = appendProgramScopeSql(recentDepSql, recentDepParams, scope, 's.program_id');
    recentDepSql += ' ORDER BY o.created_at DESC LIMIT 5';
    const [recentDeployments] = await pool.query(recentDepSql, recentDepParams);

    // 9. Issued Passcode statistics
    let totalCodesSql = 'SELECT COUNT(*) as totalCodes FROM access_codes WHERE institution_id = ?';
    const totalCodesParams = [instId];
    if (scope.isRestricted) {
      if (scope.isDean) {
        totalCodesSql += ' AND (intended_department = ? OR program_id IN (?) OR created_by = ?)';
        totalCodesParams.push(scope.department, scope.programIds.length > 0 ? scope.programIds : [-1], req.user.user_id);
      } else {
        totalCodesSql += ' AND (program_id = ? OR created_by = ?)';
        totalCodesParams.push(scope.programId, req.user.user_id);
      }
    }
    const [[{ totalCodes }]] = await pool.query(totalCodesSql, totalCodesParams);

    let usedCodesSql = 'SELECT COUNT(*) as usedCodes FROM access_codes WHERE institution_id = ? AND is_used = 1';
    const usedCodesParams = [instId];
    if (scope.isRestricted) {
      if (scope.isDean) {
        usedCodesSql += ' AND (intended_department = ? OR program_id IN (?) OR created_by = ?)';
        usedCodesParams.push(scope.department, scope.programIds.length > 0 ? scope.programIds : [-1], req.user.user_id);
      } else {
        usedCodesSql += ' AND (program_id = ? OR created_by = ?)';
        usedCodesParams.push(scope.programId, req.user.user_id);
      }
    }
    const [[{ usedCodes }]] = await pool.query(usedCodesSql, usedCodesParams);

    // 10. Opportunities dispatched awaiting approval
    const [pendingOffers] = await pool.query(
      `SELECT ija.approval_id, ija.approval_status, ija.created_at as dispatched_at,
              jp.job_id, jp.title, jp.posting_type, jp.job_type, jp.slots_available, jp.work_setup, jp.location, jp.workplace_area,
              ho.organization_name, ho.industry
       FROM institution_job_approvals ija
       JOIN job_postings jp ON ija.job_id = jp.job_id
       JOIN hiring_organizations ho ON jp.organization_id = ho.organization_id
       WHERE ija.institution_id = ? AND ija.approval_status = 'pending'
       ORDER BY ija.created_at DESC LIMIT 5`,
      [instId]
    );

    const [[{ pendingOffersCount }]] = await pool.query(
      `SELECT COUNT(*) as pendingOffersCount
       FROM institution_job_approvals
       WHERE institution_id = ? AND approval_status = 'pending'`,
      [instId]
    );

    // 11. Student Directory & Programs List
    let studentDirectory = [];
    let programsList = [];

    if (scope.isRestricted) {
      let stuSql = `SELECT s.student_id, s.student_number, s.first_name, s.middle_name, s.last_name,
                s.contact_number, s.ojt_status, s.classification, s.year_level,
                s.required_ojt_hours, s.completed_ojt_hours, s.is_verified,
                p.program_name, p.program_code, p.department, p.program_id,
                sr.status as reg_status, sr.verified_at,
                u.email,
                (SELECT COUNT(*) FROM portfolio_items pi
                 JOIN student_portfolios sp2 ON pi.portfolio_id = sp2.portfolio_id
                 WHERE sp2.student_id = s.student_id) as portfolio_count
         FROM students s
         JOIN users u ON s.user_id = u.user_id
         LEFT JOIN programs p ON s.program_id = p.program_id
         LEFT JOIN student_registrations sr ON s.student_id = sr.student_id AND sr.status = 'verified'
         WHERE s.institution_id = ? AND s.is_active = 1`;
      const stuParams = [instId];
      stuSql = appendProgramScopeSql(stuSql, stuParams, scope, 's.program_id');
      stuSql += ' ORDER BY s.last_name ASC, s.first_name ASC LIMIT 100';
      const [stuRows] = await pool.query(stuSql, stuParams);
      studentDirectory = stuRows;
      programsList = scope.isDean ? (scope.programs || []) : [scope.program];
    } else {
      const [allStu] = await pool.query(
        `SELECT s.student_id, s.student_number, s.first_name, s.middle_name, s.last_name,
                s.contact_number, s.ojt_status, s.classification, s.year_level,
                s.required_ojt_hours, s.completed_ojt_hours, s.is_verified,
                p.program_name, p.program_code, p.department, p.program_id,
                sr.status as reg_status, sr.verified_at,
                u.email,
                (SELECT COUNT(*) FROM portfolio_items pi
                 JOIN student_portfolios sp2 ON pi.portfolio_id = sp2.portfolio_id
                 WHERE sp2.student_id = s.student_id) as portfolio_count
         FROM students s
         JOIN users u ON s.user_id = u.user_id
         LEFT JOIN programs p ON s.program_id = p.program_id
         LEFT JOIN student_registrations sr ON s.student_id = sr.student_id AND sr.status = 'verified'
         WHERE s.institution_id = ? AND s.is_active = 1
         ORDER BY p.program_name ASC, s.last_name ASC, s.first_name ASC LIMIT 200`,
        [instId]
      );
      studentDirectory = allStu;

      const [progRows] = await pool.query(
        'SELECT program_id, program_name, program_code, department FROM programs WHERE institution_id = ? ORDER BY program_name ASC',
        [instId]
      );
      programsList = progRows;
    }

    return res.json({
      success: true,
      data: {
        institution: inst,
        is_staff: req.user.role === 'institution_staff',
        staff_scope: scope,
        staff_assignment: scope.isRestricted ? {
          is_restricted: true,
          is_dean: scope.isDean,
          department: scope.department,
          program_id: scope.programId,
          program_name: scope.program?.program_name,
          program_code: scope.program?.program_code,
          position: scope.position,
          programs: scope.isDean ? scope.programs : [scope.program]
        } : { is_restricted: false },
        metrics: {
          pendingCount,
          pendingStaffCount: pendingStaffCount || 0,
          totalStudents,
          deployedStudents,
          partnerOrgs,
          totalStaff,
          activePrograms,
          totalCodes,
          usedCodes,
          pendingOffersCount
        },
        recentPending,
        recentDeployments,
        pendingOffers,
        studentDirectory,
        programsList
      }
    });
  } catch (error) {
    console.error('Institution dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Could not load institution dashboard.' });
  }
});

// PUT /api/inst/students/:id/graduate — Registrar or Academic Director updates OJT-completed student to Graduated standing
router.put('/students/:id/graduate', async (req, res) => {
  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    const studentId = req.params.id;

    // Check staff permissions: must be main institution account or staff with registrar / director / admin / coordinator position
    if (req.user.role === 'institution_staff') {
      const [staffRows] = await pool.query(
        'SELECT position, classification, department FROM institution_staff WHERE user_id = ? AND institution_id = ?',
        [req.user.user_id, inst.institution_id]
      );
      if (staffRows.length === 0) {
        return res.status(403).json({ success: false, message: 'Unauthorized staff member.' });
      }
      const pos = (staffRows[0].position || '').toLowerCase();
      const cls = (staffRows[0].classification || '').toLowerCase();
      const isRegistrarOrAdmin = pos.includes('registrar') || pos.includes('director') || pos.includes('dean') || pos.includes('admin') || pos.includes('coordinator') || cls.includes('registrar');
      if (!isRegistrarOrAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied. Only academic staff with Registrar, Director, or Coordinator authority can update student status to Graduated.'
        });
      }
    }

    const [stuRows] = await pool.query(
      'SELECT student_id, first_name, last_name, ojt_status, status_id FROM students WHERE student_id = ? AND institution_id = ?',
      [studentId, inst.institution_id]
    );

    if (stuRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found in this institution.' });
    }

    const student = stuRows[0];

    await pool.query(
      "UPDATE students SET ojt_status = 'graduated', status_id = 5, updated_at = NOW() WHERE student_id = ?",
      [studentId]
    );

    emitUpdate('student_updated', { student_id: studentId, institution_id: inst.institution_id, ojt_status: 'graduated' });

    return res.json({
      success: true,
      message: `Student ${student.first_name} ${student.last_name} has been officially updated to Graduated Student standing. The student is now eligible to apply for Career Job openings!`
    });
  } catch (error) {
    console.error('Graduate student error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update student graduation status.' });
  }
});

// GET /api/inst/students/:id/profile — Full student profile inspection for institution staff and main account
router.get('/students/:id/profile', async (req, res) => {
  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    const studentId = req.params.id;
    const scope = await getStaffProgramScope(req.user.user_id, req.user.role, inst.institution_id);
    const access = await verifyStudentAccess(scope, studentId, inst.institution_id);

    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const stu = access.student;

    // Fetch registration status
    const [regRows] = await pool.query(
      'SELECT * FROM student_registrations WHERE student_id = ? ORDER BY submitted_at DESC LIMIT 1',
      [stu.student_id]
    );

    // Fetch all portfolio items
    const [allItems] = await pool.query(
      `SELECT pi.*, ho.organization_name as associated_org_name
       FROM portfolio_items pi
       JOIN student_portfolios sp ON pi.portfolio_id = sp.portfolio_id
       LEFT JOIN hiring_organizations ho ON pi.associated_org_id = ho.organization_id
       WHERE sp.student_id = ?
       ORDER BY pi.created_at DESC`,
      [stu.student_id]
    );

    const formattedItems = allItems.map(i => ({
      ...i,
      file_path: formatFilePath(i.file_path)
    }));

    // Categorize portfolio items
    const normType = (t) => (t || '').toLowerCase().trim();
    const isCred = (t) => ['credential', 'credentials', 'certificate', 'certification', 'honor', 'award', 'license', 'badge'].includes(normType(t));
    const isRecord = (t) => ['academic_record', 'academic_records', 'transcript', 'tor', 'cor', 'enrollment', 'record', 'grades'].includes(normType(t));
    const isAcad = (t) => ['academic_portfolio', 'project', 'sample_work', 'capstone', 'thesis', 'research', 'coursework'].includes(normType(t));

    const credentials = formattedItems.filter(i => isCred(i.item_type));
    const academic_records = formattedItems.filter(i => isRecord(i.item_type));
    const academic_portfolio = formattedItems.filter(i => isAcad(i.item_type) || (!isCred(i.item_type) && !isRecord(i.item_type)));

    // Fetch resumes
    const [resumes] = await pool.query(
      'SELECT * FROM student_resumes WHERE student_id = ? ORDER BY is_active DESC, version DESC LIMIT 5',
      [stu.student_id]
    );

    const formattedResumes = resumes.map(r => ({
      ...r,
      file_path: formatFilePath(r.file_path)
    }));

    // OJT background
    const [ojtRecords] = await pool.query(
      `SELECT o.*, ho.organization_name, ho.industry, ho.address as org_address,
              os.first_name as mentor_first_name, os.last_name as mentor_last_name
       FROM ojt_records o
       JOIN hiring_organizations ho ON o.organization_id = ho.organization_id
       LEFT JOIN organization_staff os ON os.organization_id = o.organization_id
         AND os.position IN ('workplace_mentor', 'mentor', 'hr_officer')
       WHERE o.student_id = ?
       ORDER BY (CASE WHEN o.status = 'completed' THEN 0 ELSE 1 END), o.created_at DESC`,
      [stu.student_id]
    );

    // Mentor evaluations
    const [evaluations] = await pool.query(
      `SELECT r.*, ho.organization_name,
              COALESCE(os.first_name, isf.first_name, '') as evaluator_first_name,
              COALESCE(os.last_name, isf.last_name, '') as evaluator_last_name
       FROM ojt_performance_records r
       JOIN ojt_records o ON r.ojt_id = o.ojt_id
       JOIN hiring_organizations ho ON o.organization_id = ho.organization_id
       LEFT JOIN users u ON r.evaluator_id = u.user_id
       LEFT JOIN organization_staff os ON os.user_id = r.evaluator_id
       LEFT JOIN institution_staff isf ON isf.user_id = r.evaluator_id
       WHERE o.student_id = ?
       ORDER BY r.evaluated_at DESC`,
      [stu.student_id]
    );

    // Fetch assigned institution supervisor / adviser
    const [assignedSupervisors] = await pool.query(
      `SELECT isf.staff_id, isf.first_name, isf.last_name, isf.position, isf.contact_number, isf.employee_id, u.email
       FROM student_staff_assignments ssa
       JOIN institution_staff isf ON ssa.staff_id = isf.staff_id
       JOIN users u ON isf.user_id = u.user_id
       WHERE ssa.student_id = ? AND ssa.is_active = 1
       LIMIT 1`,
      [stu.student_id]
    );

    const isGraduated = stu.ojt_status === 'graduated' || stu.status_id === 5;
    const isOjtCompleter = stu.ojt_status === 'completed' || stu.ojt_status === 'completed_ojt' || stu.status_id === 4 || (stu.completed_ojt_hours && stu.required_ojt_hours && stu.completed_ojt_hours >= stu.required_ojt_hours);

    return res.json({
      success: true,
      data: {
        student: {
          ...stu,
          assigned_supervisor: assignedSupervisors[0] || null
        },
        registration: regRows[0] || null,
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
    console.error('Inspect student profile error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch student profile.' });
  }
});

// GET /api/inst/students - List pending, verified, rejected students & access codes
router.get('/students', async (req, res) => {
  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    // Resolve strict program scope
    const scope = await getStaffProgramScope(req.user.user_id, req.user.role, inst.institution_id);
    const isRestricted = scope.isRestricted;

    // 1. Pending students
    let pendingSql = `
      SELECT sr.registration_id, sr.status as reg_status, sr.submitted_at, sr.verification_notes,
             s.student_id, s.student_number, s.first_name, s.middle_name, s.last_name, s.contact_number,
             s.classification, s.ojt_status, s.required_ojt_hours, s.passcode_used,
             p.program_name, p.program_code, p.department,
             u.user_id, u.email, u.created_at as user_created_at,
             ac.intended_classification as passcode_intended_classification,
             ac.intended_status as passcode_intended_status,
             ac.target_identifier as passcode_target_identifier,
             ac.program_id as passcode_intended_program_id,
             ac.intended_department as passcode_intended_department,
             ac.code_hash as passcode_code_hash,
             ac_p.program_name as passcode_intended_program_name,
             ac_p.program_code as passcode_intended_program_code
      FROM student_registrations sr
      JOIN students s ON sr.student_id = s.student_id
      JOIN users u ON s.user_id = u.user_id
      LEFT JOIN programs p ON s.program_id = p.program_id
      LEFT JOIN access_codes ac ON ac.code_id = (
        SELECT ac2.code_id FROM access_codes ac2
        WHERE (
          ac2.used_by_user_id = s.user_id
          OR (s.passcode_used IS NOT NULL AND s.passcode_used != '' AND ac2.code_hash = s.passcode_used)
          OR (ac2.recipient_type = 'student' AND ac2.institution_id = s.institution_id AND ac2.target_identifier = s.student_number)
        )
        ORDER BY (ac2.used_by_user_id = s.user_id) DESC, ac2.is_used DESC, ac2.code_id DESC
        LIMIT 1
      )
      LEFT JOIN programs ac_p ON ac.program_id = ac_p.program_id
      WHERE s.institution_id = ? AND sr.status = 'pending'`;
    const pendingParams = [inst.institution_id];
    if (isRestricted) {
      pendingSql = appendProgramScopeSql(pendingSql, pendingParams, scope, 's.program_id');
    }
    pendingSql += ' ORDER BY sr.submitted_at ASC';
    const [pendingStudents] = await pool.query(pendingSql, pendingParams);

    // 2. Verified students with server-side pagination to prevent memory crashes on large datasets
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit) || 25));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const programFilter = (req.query.program_id || req.query.program || '').trim();

    let verifiedWhere = 'WHERE s.institution_id = ? AND sr.status = \'verified\'';
    const verifiedParams = [inst.institution_id];
    if (isRestricted) {
      if (scope.isDean) {
        verifiedWhere += ' AND s.program_id IN (?)';
        verifiedParams.push(scope.programIds.length > 0 ? scope.programIds : [-1]);
      } else {
        verifiedWhere += ' AND s.program_id = ?';
        verifiedParams.push(scope.programId);
      }
    }

    if (search) {
      verifiedWhere += ' AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.student_number LIKE ? OR u.email LIKE ? OR CONCAT(s.first_name, \' \', s.last_name) LIKE ?)';
      const sTerm = `%${search}%`;
      verifiedParams.push(sTerm, sTerm, sTerm, sTerm, sTerm);
    }

    if (programFilter && programFilter !== 'all') {
      if (/^\d+$/.test(programFilter)) {
        verifiedWhere += ' AND s.program_id = ?';
        verifiedParams.push(parseInt(programFilter));
      } else {
        verifiedWhere += ' AND p.program_name = ?';
        verifiedParams.push(programFilter);
      }
    }

    // Fast count for filtered verified students
    const [[{ total: totalFilteredVerified }]] = await pool.query(
      `SELECT COUNT(*) as total
       FROM students s
       JOIN users u ON s.user_id = u.user_id
       JOIN student_registrations sr ON s.student_id = sr.student_id
       LEFT JOIN programs p ON s.program_id = p.program_id
       ${verifiedWhere}`,
      verifiedParams
    );

    // Overall verified count for this institution (independent of search filter, for tab counter)
    let overallVerifiedCount = totalFilteredVerified;
    if (search || (programFilter && programFilter !== 'all')) {
      let allWhere = 'WHERE s.institution_id = ? AND sr.status = \'verified\'';
      const allParams = [inst.institution_id];
      if (isRestricted) {
        if (scope.isDean) {
          allWhere += ' AND s.program_id IN (?)';
          allParams.push(scope.programIds.length > 0 ? scope.programIds : [-1]);
        } else {
          allWhere += ' AND s.program_id = ?';
          allParams.push(scope.programId);
        }
      }
      const [[{ total: allTotal }]] = await pool.query(
        `SELECT COUNT(*) as total 
         FROM students s 
         JOIN student_registrations sr ON s.student_id = sr.student_id 
         LEFT JOIN programs p ON s.program_id = p.program_id 
         ${allWhere}`,
        allParams
      );
      overallVerifiedCount = allTotal;
    }

    // Fetch only the paginated verified records
    const verifiedSql = `
      SELECT s.*, u.email, u.is_active, u.created_at as user_created_at,
             p.program_name, p.program_code, p.department,
             sr.registration_id, sr.verified_at, sr.verification_notes,
             ac.intended_classification as passcode_intended_classification,
             ac.intended_status as passcode_intended_status,
             ac.target_identifier as passcode_target_identifier,
             ac.program_id as passcode_intended_program_id,
             ac.intended_department as passcode_intended_department,
             ac.code_hash as passcode_code_hash,
             ac_p.program_name as passcode_intended_program_name,
             ac_p.program_code as passcode_intended_program_code
      FROM students s
      JOIN users u ON s.user_id = u.user_id
      LEFT JOIN programs p ON s.program_id = p.program_id
      JOIN student_registrations sr ON s.student_id = sr.student_id
      LEFT JOIN access_codes ac ON ac.code_id = (
        SELECT ac2.code_id FROM access_codes ac2
        WHERE (
          ac2.used_by_user_id = s.user_id
          OR (s.passcode_used IS NOT NULL AND s.passcode_used != '' AND ac2.code_hash = s.passcode_used)
          OR (ac2.recipient_type = 'student' AND ac2.institution_id = s.institution_id AND ac2.target_identifier = s.student_number)
        )
        ORDER BY (ac2.used_by_user_id = s.user_id) DESC, ac2.is_used DESC, ac2.code_id DESC
        LIMIT 1
      )
      LEFT JOIN programs ac_p ON ac.program_id = ac_p.program_id
      ${verifiedWhere}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?`;

    const [verifiedStudents] = await pool.query(verifiedSql, [...verifiedParams, limit, offset]);

    // 3. Rejected students
    let rejectedSql = `
      SELECT sr.registration_id, sr.status as reg_status, sr.submitted_at, sr.verified_at, sr.verification_notes,
             s.student_id, s.student_number, s.first_name, s.middle_name, s.last_name, s.contact_number,
             s.classification, s.ojt_status, s.required_ojt_hours, s.passcode_used,
             p.program_name, p.program_code, p.department, u.user_id, u.email, u.is_active,
             ac.intended_classification as passcode_intended_classification,
             ac.intended_status as passcode_intended_status,
             ac.target_identifier as passcode_target_identifier,
             ac.program_id as passcode_intended_program_id,
             ac.intended_department as passcode_intended_department,
             ac.code_hash as passcode_code_hash,
             ac_p.program_name as passcode_intended_program_name,
             ac_p.program_code as passcode_intended_program_code
      FROM student_registrations sr
      JOIN students s ON sr.student_id = s.student_id
      JOIN users u ON s.user_id = u.user_id
      LEFT JOIN programs p ON s.program_id = p.program_id
      LEFT JOIN access_codes ac ON ac.code_id = (
        SELECT ac2.code_id FROM access_codes ac2
        WHERE (
          ac2.used_by_user_id = s.user_id
          OR (s.passcode_used IS NOT NULL AND s.passcode_used != '' AND ac2.code_hash = s.passcode_used)
          OR (ac2.recipient_type = 'student' AND ac2.institution_id = s.institution_id AND ac2.target_identifier = s.student_number)
        )
        ORDER BY (ac2.used_by_user_id = s.user_id) DESC, ac2.is_used DESC, ac2.code_id DESC
        LIMIT 1
      )
      LEFT JOIN programs ac_p ON ac.program_id = ac_p.program_id
      WHERE s.institution_id = ? AND (sr.status = 'rejected' OR u.is_active = 0)`;
    const rejectedParams = [inst.institution_id];
    if (isRestricted) {
      rejectedSql = appendProgramScopeSql(rejectedSql, rejectedParams, scope, 's.program_id');
    }
    rejectedSql += ' ORDER BY sr.verified_at DESC, sr.submitted_at DESC LIMIT 100';
    const [rejectedStudents] = await pool.query(rejectedSql, rejectedParams);

    // Map student discrepancy flags (classification, ojt_status, student_number, program)
    const mapStudentDiscrepancies = (row) => {
      const intendedCls = row.passcode_intended_classification || null;
      const intendedStatus = row.passcode_intended_status || null;
      const intendedNum = row.passcode_target_identifier || null;
      const intendedProgId = row.passcode_intended_program_id || null;

      const classificationMismatch = Boolean(
        intendedCls && row.classification && intendedCls.toLowerCase().trim() !== row.classification.toLowerCase().trim()
      );
      const ojtStatusMismatch = Boolean(
        intendedStatus && row.ojt_status && intendedStatus.toLowerCase().trim() !== row.ojt_status.toLowerCase().trim()
      );
      const isProgramCode = Boolean(
        row.passcode_intended_program_id ||
        (intendedNum && (intendedNum === 'PROGRAM_STUDENTS' || intendedNum === row.passcode_intended_program_code || intendedNum.startsWith('PROGRAM:')))
      );
      const studentNumberMismatch = Boolean(
        !isProgramCode &&
        intendedNum && row.student_number && intendedNum.toLowerCase().trim() !== row.student_number.toLowerCase().trim()
      );
      const programMismatch = Boolean(
        intendedProgId && row.program_id && String(intendedProgId) !== String(row.program_id)
      );
      const hasDiscrepancy = Boolean(
        classificationMismatch || ojtStatusMismatch || studentNumberMismatch || programMismatch
      );

      return {
        ...row,
        classification_mismatch: classificationMismatch,
        ojt_status_mismatch: ojtStatusMismatch,
        student_number_mismatch: studentNumberMismatch,
        program_mismatch: programMismatch,
        has_discrepancy: hasDiscrepancy,
        passcode_used: row.passcode_used || row.passcode_code_hash || ''
      };
    };

    const pendingMapped = pendingStudents.map(mapStudentDiscrepancies);
    const verifiedMapped = verifiedStudents.map(mapStudentDiscrepancies);
    const rejectedMapped = rejectedStudents.map(mapStudentDiscrepancies);

    // 4. Access Codes
    let accessCodesSql = `SELECT ac.*, p.program_name, p.program_code, p.department as program_department,
             isf.first_name as supervisor_first_name, isf.last_name as supervisor_last_name,
             isf.position as supervisor_position, isf.employee_id as supervisor_employee_id,
             (SELECT COUNT(*) FROM students s WHERE s.passcode_used = ac.code_hash) as registered_count
      FROM access_codes ac
      LEFT JOIN users u ON ac.used_by_user_id = u.user_id
      LEFT JOIN programs p ON ac.program_id = p.program_id
      LEFT JOIN institution_staff isf ON ac.assigned_staff_id = isf.staff_id
      WHERE ac.institution_id = ? AND ac.recipient_type = 'student'`;
    const accessCodesParams = [inst.institution_id];
    if (isRestricted) {
      if (scope.isDean) {
        accessCodesSql += ' AND (ac.program_id IN (?) OR ac.created_by = ? OR ac.intended_department = ?)';
        accessCodesParams.push(scope.programIds.length > 0 ? scope.programIds : [-1], req.user.user_id, scope.department);
      } else {
        accessCodesSql += ' AND (ac.program_id = ? OR ac.created_by = ?)';
        accessCodesParams.push(scope.programId, req.user.user_id);
      }
    }
    accessCodesSql += ' ORDER BY ac.created_at DESC';
    const [accessCodes] = await pool.query(accessCodesSql, accessCodesParams);

    // 5. Programs
    let programs;
    if (isRestricted) {
      programs = scope.isDean ? (scope.programs || []) : [scope.program];
    } else {
      const [allProgs] = await pool.query(
        'SELECT * FROM programs WHERE institution_id = ? ORDER BY program_name ASC',
        [inst.institution_id]
      );
      programs = allProgs;
    }

    // 6. Active OJT Supervisors / Advisers for Passcode Assignment and Supervision
    const [supervisors] = await pool.query(
      `SELECT isf.staff_id, isf.user_id, isf.first_name, isf.last_name, isf.position, isf.department, isf.program_id,
              isf.employee_id, isf.staff_number, isf.contact_number, u.email,
              p.program_name, p.program_code, p.department as prog_dept
       FROM institution_staff isf
       JOIN users u ON isf.user_id = u.user_id
       LEFT JOIN programs p ON isf.program_id = p.program_id
       WHERE isf.institution_id = ?
         AND isf.position IN ('ojt_supervisor', 'ojt_coordinator', 'Internship Practicum Supervisor', 'College OJT Coordinator')
         AND isf.is_active = 1
       ORDER BY isf.first_name ASC, isf.last_name ASC`,
      [inst.institution_id]
    );

    const staffAssignment = isRestricted ? {
      is_restricted: true,
      is_dean: scope.isDean,
      department: scope.department,
      program_id: scope.programId,
      program_name: scope.program?.program_name,
      program_code: scope.program?.program_code,
      position: scope.position,
      allowed_programs: scope.isDean ? (scope.programs || []) : [scope.program]
    } : {
      is_restricted: false
    };

    return res.json({
      success: true,
      data: {
        pendingStudents: pendingMapped,
        verifiedStudents: verifiedMapped,
        rejectedStudents: rejectedMapped,
        accessCodes,
        programs,
        supervisors,
        staff_scope: scope,
        staff_assignment: staffAssignment,
        pagination: {
          page,
          limit,
          total: totalFilteredVerified,
          totalPages: Math.max(1, Math.ceil(totalFilteredVerified / limit))
        },
        counts: {
          pending: pendingStudents.length,
          verified: overallVerifiedCount,
          rejected: rejectedStudents.length,
          codes: accessCodes.length
        }
      }
    });
  } catch (error) {
    console.error('Fetch institution students error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch students.' });
  }
});

// POST /api/inst/staff/access-code
router.post('/staff/access-code', async (req, res) => {
  const { staff_number, position, program_id, department, intended_email, staff_email, permissions, expires_at, expiration_date } = req.body;
  const rawEmail = (intended_email || staff_email || '').trim();

  if (rawEmail && !isValidEmail(rawEmail)) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address, like name@university.edu.ph.' });
  }

  const emailToSave = rawEmail ? normalizeEmail(rawEmail) : null;

  if (!staff_number || !staff_number.trim()) {
    return res.status(400).json({ success: false, message: 'Staff / Employee ID is required.' });
  }

  const cleanStaffNumber = staff_number.trim().toUpperCase();

  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    // 1. Prevent duplicate Target Staff ID: check if an active, unused passcode exists for this Staff ID
    const [existingCodes] = await pool.query(
      `SELECT code_id, code_hash, expires_at 
       FROM access_codes 
       WHERE institution_id = ? 
         AND recipient_type = 'institution_staff' 
         AND target_identifier = ? 
         AND is_used = 0 
         AND expires_at > NOW()`,
      [inst.institution_id, cleanStaffNumber]
    );

    if (existingCodes.length > 0) {
      const expDate = new Date(existingCodes[0].expires_at).toLocaleDateString();
      return res.status(400).json({
        success: false,
        message: `An active staff passcode (${existingCodes[0].code_hash}) already exists for Staff ID "${cleanStaffNumber}" (expires on ${expDate}). Staff IDs cannot be duplicated.`
      });
    }

    // 2. Prevent duplicate Target Staff ID: check if this Staff ID is already assigned to a registered staff member
    const [existingStaff] = await pool.query(
      `SELECT staff_id, first_name, last_name, employee_id, staff_number 
       FROM institution_staff 
       WHERE institution_id = ? 
         AND (employee_id = ? OR staff_number = ?)`,
      [inst.institution_id, cleanStaffNumber, cleanStaffNumber]
    );

    if (existingStaff.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Staff coordinator "${existingStaff[0].first_name} ${existingStaff[0].last_name}" is already registered with Staff ID "${cleanStaffNumber}". Duplicate Staff IDs are not allowed.`
      });
    }

    // 3. Resolve Program & Department Scope
    const scope = await getStaffProgramScope(req.user.user_id, req.user.role, inst.institution_id);
    let resolvedProgramId = program_id ? Number(program_id) : null;
    let resolvedDept = (department || req.body.intended_department || '').trim() || null;

    const isCallerDean = (req.user.role === 'institution_staff' && (scope.isDean || req.user.position === 'dean' || scope.position === 'dean'));
    const isCallerRestricted = (req.user.role === 'institution_staff' && scope.isRestricted);
    const isDeanOrRestricted = isCallerDean || isCallerRestricted;

    if (isCallerDean) {
      if (position === 'dean') {
        return res.status(403).json({
          success: false,
          message: 'Access Denied: Only the Institution Director can appoint College Deans.'
        });
      }
      // Dean can only generate passcodes for their assigned department
      resolvedDept = scope.department;
      if (resolvedProgramId) {
        if (scope.programIds && scope.programIds.length > 0 && !scope.programIds.includes(Number(resolvedProgramId))) {
          return res.status(403).json({
            success: false,
            message: `Access Denied: Program does not belong to your department (${scope.department}).`
          });
        }
      }
    } else if (isCallerRestricted) {
      const assignedId = scope.programId || req.user.program_id;
      if (!assignedId) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied: You must be assigned to an active degree program to generate staff passcodes.'
        });
      }
      resolvedProgramId = assignedId;
    }

    // When appointing a Dean:
    // The user specified: "the dean should be assign to Assigned Department not to a just 1 program, the dean will handle the departments programs"
    if (position === 'dean') {
      resolvedProgramId = null; // Dean handles the whole department, not just 1 program!
      if (!resolvedDept && program_id) {
        const [pRows] = await pool.query('SELECT department FROM programs WHERE program_id = ?', [program_id]);
        if (pRows.length > 0 && pRows[0].department) resolvedDept = pRows[0].department;
      }
      if (!resolvedDept) {
        return res.status(400).json({
          success: false,
          message: 'Please select an Assigned Department for the College Dean. The Dean will oversee all programs in this department.'
        });
      }
    } else if (resolvedProgramId && !resolvedDept) {
      const [pRows] = await pool.query('SELECT department FROM programs WHERE program_id = ?', [resolvedProgramId]);
      if (pRows.length > 0 && pRows[0].department) {
        resolvedDept = pRows[0].department;
      }
    }

    // 4. Validate and resolve expiration date
    let formattedExpiresAt = null;
    const rawExp = expiration_date || expires_at;
    if (rawExp) {
      const expDateObj = new Date(rawExp);
      if (isNaN(expDateObj.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid expiration date provided.' });
      }
      if (expDateObj <= new Date()) {
        return res.status(400).json({ success: false, message: 'Expiration date must be in the future.' });
      }
      if (typeof rawExp === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawExp.trim())) {
        formattedExpiresAt = `${rawExp.trim()} 23:59:59`;
      } else {
        formattedExpiresAt = expDateObj.toISOString().slice(0, 19).replace('T', ' ');
      }
    }

    const prefixMap = {
      ojt_supervisor: 'SUP',
      registrar: 'REG',
      guidance_counselor: 'GND',
      dean: 'DEN',
      director: 'DIR'
    };
    const prefix = prefixMap[position] || 'STF';
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    const codeRaw = `INST-${prefix}-${rand}`;

    const insertSql = formattedExpiresAt
      ? `INSERT INTO access_codes (
          code_hash, recipient_type, institution_id, program_id, intended_department, target_identifier,
          intended_position, intended_email, assigned_permissions, created_by, expires_at
        ) VALUES (?, 'institution_staff', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      : `INSERT INTO access_codes (
          code_hash, recipient_type, institution_id, program_id, intended_department, target_identifier,
          intended_position, intended_email, assigned_permissions, created_by, expires_at
        ) VALUES (?, 'institution_staff', ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 14 DAY))`;

    const insertParams = [
      codeRaw,
      inst.institution_id,
      resolvedProgramId,
      resolvedDept,
      cleanStaffNumber,
      position || 'ojt_supervisor',
      emailToSave,
      permissions ? JSON.stringify(permissions) : null,
      req.user.user_id
    ];
    if (formattedExpiresAt) insertParams.push(formattedExpiresAt);

    await pool.query(insertSql, insertParams);

    emitUpdate('access_code_generated', { institution_id: inst.institution_id, type: 'institution_staff' });

    return res.status(201).json({
      success: true,
      message: `${isDeanOrRestricted ? 'Department' : 'Staff'} Access Code generated for Employee ID ${cleanStaffNumber}!`,
      data: {
        access_code: codeRaw,
        staff_number: cleanStaffNumber,
        position: position || 'ojt_supervisor',
        program_id: resolvedProgramId,
        intended_department: resolvedDept,
        intended_email: emailToSave,
        expires_at: formattedExpiresAt || '14 days from now'
      }
    });
  } catch (error) {
    console.error('Generate staff code error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate staff passcode.' });
  }
});

// DELETE /api/inst/staff/access-code/:codeId - Delete and invalidate staff passcode
router.delete('/staff/access-code/:codeId', async (req, res) => {
  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    const { codeId } = req.params;

    // Verify passcode exists and belongs to this institution
    const [codes] = await pool.query(
      `SELECT * FROM access_codes 
       WHERE code_id = ? AND institution_id = ? AND recipient_type = 'institution_staff'`,
      [codeId, inst.institution_id]
    );

    if (codes.length === 0) {
      return res.status(404).json({ success: false, message: 'Passcode not found or unauthorized.' });
    }

    const code = codes[0];

    // Delete the passcode
    await pool.query('DELETE FROM access_codes WHERE code_id = ?', [codeId]);

    // Record audit log
    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, created_at)
         VALUES (?, 'DELETE_STAFF_PASSCODE', 'access_codes', ?, ?, NOW())`,
        [
          req.user.user_id,
          codeId,
          JSON.stringify({
            code_id: codeId,
            code_hash: code.code_hash,
            target_identifier: code.target_identifier,
            intended_position: code.intended_position,
            was_used: code.is_used
          })
        ]
      );
    } catch (auditErr) {
      console.warn('Audit log error on passcode deletion:', auditErr.message);
    }

    emitUpdate('staff_passcode_deleted', { institution_id: inst.institution_id, code_id: codeId, code_hash: code.code_hash });

    return res.json({
      success: true,
      message: `Staff Passcode [${code.code_hash}] deleted and deactivated successfully.`
    });
  } catch (error) {
    console.error('Delete staff passcode error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete staff passcode: ' + error.message });
  }
});

// POST /api/inst/staff/access-code/:codeId/deactivate - Deactivate/expire staff passcode immediately
router.post('/staff/access-code/:codeId/deactivate', async (req, res) => {
  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    const { codeId } = req.params;

    const [codes] = await pool.query(
      `SELECT * FROM access_codes 
       WHERE code_id = ? AND institution_id = ? AND recipient_type = 'institution_staff'`,
      [codeId, inst.institution_id]
    );

    if (codes.length === 0) {
      return res.status(404).json({ success: false, message: 'Passcode not found or unauthorized.' });
    }

    const code = codes[0];
    if (code.is_used) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate an already used passcode.' });
    }

    // Set expires_at to NOW() so it is immediately expired and invalid for registration
    await pool.query('UPDATE access_codes SET expires_at = NOW() WHERE code_id = ?', [codeId]);

    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, created_at)
         VALUES (?, 'DEACTIVATE_STAFF_PASSCODE', 'access_codes', ?, ?, NOW())`,
        [
          req.user.user_id,
          codeId,
          JSON.stringify({
            code_id: codeId,
            code_hash: code.code_hash,
            target_identifier: code.target_identifier
          })
        ]
      );
    } catch (auditErr) {
      console.warn('Audit log error on passcode deactivation:', auditErr.message);
    }

    emitUpdate('staff_passcode_deactivated', { institution_id: inst.institution_id, code_id: codeId, code_hash: code.code_hash });

    return res.json({
      success: true,
      message: `Staff Passcode [${code.code_hash}] has been deactivated and expired.`
    });
  } catch (error) {
    console.error('Deactivate staff passcode error:', error);
    return res.status(500).json({ success: false, message: 'Failed to deactivate staff passcode: ' + error.message });
  }
});

// POST /api/inst/students/:id/verify
router.post('/students/:id/verify', async (req, res) => {
  const regId = req.params.id;
  const { action, reason } = req.body; // 'verify' or 'reject'

  if (!['verify', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Invalid action.' });
  }

  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    const scope = await getStaffProgramScope(req.user.user_id, req.user.role, inst.institution_id);
    const regAccess = await verifyRegistrationAccess(scope, regId, inst.institution_id);
    if (!regAccess.allowed) {
      return res.status(regAccess.status).json({ success: false, message: regAccess.message });
    }
  } catch (err) {
    console.error('Verify registration auth check error:', err);
    return res.status(500).json({ success: false, message: 'Authorization check failed.' });
  }

  const connection = await pool.getConnection();
  let released = false;
  const safeRelease = () => {
    if (!released) {
      released = true;
      try { connection.release(); } catch (_) { }
    }
  };
  try {
    await connection.beginTransaction();

    const [regRows] = await connection.query(
      `SELECT sr.*, s.student_id, s.institution_id, s.user_id, s.student_number, s.first_name, s.last_name, s.passcode_used 
       FROM student_registrations sr
       JOIN students s ON sr.student_id = s.student_id
       WHERE sr.registration_id = ?`,
      [regId]
    );

    if (regRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Registration record not found.' });
    }

    const reg = regRows[0];
    const studentId = reg.student_id;
    const userId = reg.user_id;
    const instId = reg.institution_id;
    const studentNumber = reg.student_number;

    if (action === 'verify') {
      await connection.query(
        'UPDATE student_registrations SET status = \'verified\', verified_by = ?, verification_notes = ?, verified_at = CURRENT_TIMESTAMP WHERE registration_id = ?',
        [req.user.user_id, reason || null, regId]
      );
      await connection.query(
        'UPDATE entity_registrations SET status = \'verified\', reviewer_user_id = ?, reviewed_at = CURRENT_TIMESTAMP WHERE entity_type = \'student\' AND entity_id = ?',
        [req.user.user_id, studentId]
      );
      await connection.query('UPDATE users SET is_verified = 1, is_active = 1 WHERE user_id = ?', [userId]);
      await connection.query('UPDATE students SET is_verified = 1, is_active = 1 WHERE student_id = ?', [studentId]);

      await connection.commit();

      emitUpdate('student_verified', { institution_id: instId, student_id: studentId, user_id: userId, action: 'verified' });

      await sendNotification({
        userId,
        title: 'Registration Approved & Activated',
        message: 'Your student account has been approved and verified by your institution registrar. You can now access all portal features and apply for OJT opportunities.',
        type: 'system'
      });

      return res.json({
        success: true,
        message: `Student ${reg.first_name} ${reg.last_name} (${studentNumber}) approved and account activated.`
      });
    } else if (action === 'reject') {
      await connection.query(
        `UPDATE access_codes 
         SET is_used = 0, used_by_user_id = NULL, used_at = NULL 
         WHERE used_by_user_id = ? OR (recipient_type = 'student' AND target_identifier = ? AND is_used = 1)`,
        [userId, studentNumber]
      );

      // Clean up all related child rows in dependency order
      await connection.query('DELETE FROM ojt_attendance_logs WHERE student_id = ?', [studentId]);
      await connection.query(
        'DELETE FROM ojt_student_requirements WHERE ojt_id IN (SELECT ojt_id FROM ojt_records WHERE student_id = ?)',
        [studentId]
      );
      await connection.query('DELETE FROM ojt_records WHERE student_id = ?', [studentId]);
      await connection.query('DELETE FROM job_applications WHERE student_id = ?', [studentId]);
      await connection.query('DELETE FROM complaints WHERE student_id = ?', [studentId]);
      await connection.query(
        'DELETE FROM portfolio_items WHERE portfolio_id IN (SELECT portfolio_id FROM student_portfolios WHERE student_id = ?)',
        [studentId]
      );
      await connection.query('DELETE FROM student_portfolios WHERE student_id = ?', [studentId]);
      await connection.query('DELETE FROM student_achievements WHERE student_id = ?', [studentId]);
      await connection.query('DELETE FROM student_documents WHERE student_id = ?', [studentId]);
      await connection.query('DELETE FROM student_resumes WHERE student_id = ?', [studentId]);
      await connection.query('DELETE FROM student_skills WHERE student_id = ?', [studentId]);
      await connection.query('DELETE FROM student_staff_assignments WHERE student_id = ?', [studentId]);
      await connection.query('DELETE FROM student_registrations WHERE student_id = ?', [studentId]);
      await connection.query('DELETE FROM entity_registrations WHERE entity_type = \'student\' AND entity_id = ?', [studentId]);
      await connection.query('DELETE FROM notifications WHERE user_id = ?', [userId]);
      await connection.query('DELETE FROM audit_logs WHERE user_id = ?', [userId]);
      await connection.query('DELETE FROM students WHERE student_id = ?', [studentId]);
      await connection.query('DELETE FROM users WHERE user_id = ?', [userId]);

      await connection.commit();

      emitUpdate('student_verified', { institution_id: instId, student_id: studentId, user_id: userId, action: 'rejected' });

      return res.json({
        success: true,
        message: `Student registration for ${reg.first_name} ${reg.last_name} rejected. The record has been deleted so the student can re-register.`
      });
    }
  } catch (error) {
    try { await connection.rollback(); } catch (_) { }
    console.error('Verify/reject student error:', error);
    return res.status(500).json({ success: false, message: 'Verification action failed: ' + error.message });
  } finally {
    safeRelease();
  }
});

// POST /api/inst/students/:studentId/toggle-status
router.post('/students/:studentId/toggle-status', async (req, res) => {
  const studentId = req.params.studentId;
  const { is_active } = req.body;

  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    const scope = await getStaffProgramScope(req.user.user_id, req.user.role, inst.institution_id);
    const access = await verifyStudentAccess(scope, studentId, inst.institution_id);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const student = access.student;
    const newActiveState = is_active ? 1 : 0;

    await pool.query('UPDATE users SET is_active = ? WHERE user_id = ?', [newActiveState, student.user_id]);
    await pool.query('UPDATE students SET is_active = ? WHERE student_id = ?', [newActiveState, studentId]);

    if (newActiveState === 1) {
      await pool.query(
        'UPDATE student_registrations SET status = \'verified\', verified_by = ?, verified_at = CURRENT_TIMESTAMP WHERE student_id = ?',
        [req.user.user_id, studentId]
      );
      await pool.query('UPDATE users SET is_verified = 1 WHERE user_id = ?', [student.user_id]);
      await pool.query('UPDATE students SET is_verified = 1 WHERE student_id = ?', [studentId]);
    }

    emitUpdate('student_verified', { institution_id: inst.institution_id, student_id: studentId, user_id: student.user_id, is_active: newActiveState });

    await sendNotification({
      userId: student.user_id,
      title: newActiveState === 1 ? 'Account Activated' : 'Account Deactivated',
      message: newActiveState === 1
        ? 'Your student account status has been reactivated by your institution.'
        : 'Your student account has been temporarily deactivated by your institution administrator.',
      type: 'system'
    });

    return res.json({
      success: true,
      message: `Student account ${newActiveState === 1 ? 'activated' : 'deactivated'} successfully.`
    });
  } catch (error) {
    console.error('Toggle student status error:', error);
    return res.status(500).json({ success: false, message: 'Could not toggle student status: ' + error.message });
  }
});

// GET /api/inst/staff - List pending and active staff for Director's institution
router.get('/staff', async (req, res) => {
  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    const [staffRows] = await pool.query(
      `SELECT s.*, u.email, u.is_active, u.created_at as user_created_at,
              p.program_name, p.program_code, p.department as program_department,
              er.status as reg_status, er.submitted_at as registration_submitted_at,
              ac.intended_position as passcode_intended_position,
              ac.program_id as passcode_intended_program_id,
              ac.intended_email as passcode_intended_email,
              ac.target_identifier as passcode_target_identifier,
              ac.code_hash as passcode_code_hash,
              ac_p.program_name as passcode_intended_program_name,
              ac_p.program_code as passcode_intended_program_code,
              COALESCE(ac.intended_department, ac_p.department) as passcode_intended_department
       FROM institution_staff s
       JOIN users u ON s.user_id = u.user_id
       LEFT JOIN programs p ON s.program_id = p.program_id
       LEFT JOIN entity_registrations er ON er.entity_type = 'institution_staff' AND er.entity_id = s.staff_id
       LEFT JOIN access_codes ac ON (ac.used_by_user_id = s.user_id OR (ac.recipient_type = 'institution_staff' AND ac.institution_id = s.institution_id AND (ac.target_identifier = s.employee_id OR ac.target_identifier = s.staff_number)))
       LEFT JOIN programs ac_p ON ac.program_id = ac_p.program_id
       WHERE s.institution_id = ?
       ORDER BY s.created_at DESC`,
      [inst.institution_id]
    );

    const allStaff = staffRows.map(row => {
      let extra = {};
      try {
        if (typeof row.permissions === 'string') {
          extra = JSON.parse(row.permissions);
        } else if (typeof row.permissions === 'object' && row.permissions !== null) {
          extra = row.permissions;
        }
      } catch (e) {}

      const intendedPos = row.passcode_intended_position || extra.passcode_intended_position || null;
      const intendedProgId = row.passcode_intended_program_id || extra.passcode_intended_program_id || null;
      const intendedEmail = row.passcode_intended_email || extra.passcode_intended_email || null;
      const intendedDept = row.passcode_intended_department || extra.passcode_intended_department || row.department || null;

      const positionMismatch = Boolean(intendedPos && row.position && intendedPos.toLowerCase() !== row.position.toLowerCase());
      const programMismatch = Boolean(intendedProgId && row.program_id && String(intendedProgId) !== String(row.program_id));
      const emailMismatch = Boolean(intendedEmail && row.email && intendedEmail.trim().toLowerCase() !== row.email.trim().toLowerCase());
      const hasDiscrepancy = Boolean(positionMismatch || programMismatch || emailMismatch);

      return {
        ...row,
        salutation: extra.salutation || 'Prof.',
        middle_name: extra.middle_name || '',
        suffix: extra.suffix || '',
        department_name: extra.department_name || row.department || '',
        passcode_used: extra.passcode_used || row.passcode_code_hash || '',
        director_assigned_permissions: extra.director_assigned_permissions || null,
        passcode_intended_position: intendedPos,
        passcode_intended_program_id: intendedProgId,
        passcode_intended_program_name: row.passcode_intended_program_name || '',
        passcode_intended_program_code: row.passcode_intended_program_code || '',
        passcode_intended_department: intendedDept,
        passcode_intended_email: intendedEmail,
        position_mismatch: positionMismatch,
        program_mismatch: programMismatch,
        email_mismatch: emailMismatch,
        has_discrepancy: hasDiscrepancy
      };
    });

    const [accessCodes] = await pool.query(
      `SELECT ac.*, u.email as used_by_email, p.program_name
       FROM access_codes ac
       LEFT JOIN users u ON ac.used_by_user_id = u.user_id
       LEFT JOIN programs p ON ac.program_id = p.program_id
       WHERE ac.institution_id = ? AND ac.recipient_type = 'institution_staff'
       ORDER BY ac.created_at DESC`,
      [inst.institution_id]
    );

    const [deptRows] = await pool.query(
      `SELECT DISTINCT department FROM programs WHERE institution_id = ? AND department IS NOT NULL AND department != '' ORDER BY department ASC`,
      [inst.institution_id]
    );
    const departments = deptRows.map(d => d.department);

    const scope = await getStaffProgramScope(req.user.user_id, req.user.role, inst.institution_id);

    // If caller is a College Dean, scope the staff list and pending staff to the Dean's department
    let scopedStaff = allStaff;
    let scopedCodes = accessCodes;

    if (scope.isDean && scope.department) {
      const deanDept = scope.department.trim().toLowerCase();
      scopedStaff = allStaff.filter(s => {
        const staffDept = (s.department || s.program_department || s.department_name || s.passcode_intended_department || '').trim().toLowerCase();
        const matchesDept = Boolean(staffDept && staffDept === deanDept);
        const matchesProg = Boolean(s.program_id && scope.programIds && scope.programIds.includes(Number(s.program_id)));
        const isSelf = Number(s.user_id) === Number(req.user.user_id);
        return matchesDept || matchesProg || isSelf;
      });

      scopedCodes = accessCodes.filter(c => {
        const codeDept = (c.intended_department || '').trim().toLowerCase();
        const matchesDept = Boolean(codeDept && codeDept === deanDept);
        const matchesProg = Boolean(c.program_id && scope.programIds && scope.programIds.includes(Number(c.program_id)));
        const createdByDean = Boolean(c.created_by && Number(c.created_by) === Number(req.user.user_id));
        return matchesDept || matchesProg || createdByDean;
      });
    }

    const pendingStaff = scopedStaff.filter(s => !s.is_verified || s.reg_status === 'pending');
    const verifiedStaff = scopedStaff.filter(s => s.is_verified && s.reg_status !== 'pending' && s.reg_status !== 'rejected');
    const rejectedStaff = scopedStaff.filter(s => s.reg_status === 'rejected' || (!s.is_active && !s.is_verified));

    return res.json({
      success: true,
      data: {
        staff: scopedStaff,
        pendingStaff,
        verifiedStaff,
        rejectedStaff,
        accessCodes: scopedCodes,
        departments,
        staff_scope: scope
      }
    });
  } catch (error) {
    console.error('Fetch institution staff error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch institution staff.' });
  }
});



// PUT /api/inst/staff/:id/verify
router.put('/staff/:id/verify', async (req, res) => {
  const staffId = req.params.id;
  const { action } = req.body; // 'approve' or 'reject'

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Invalid action. Must be approve or reject.' });
  }

  const connection = await pool.getConnection();
  let released = false;
  const safeRelease = () => {
    if (!released) {
      released = true;
      try { connection.release(); } catch (_) { }
    }
  };
  try {
    await connection.beginTransaction();

    const inst = await getInstId(req.user.user_id);
    if (!inst) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Institution not found.' });
    }

    const scope = await getStaffProgramScope(req.user.user_id, req.user.role, inst.institution_id);

    // If caller is regular staff without dean authority, reject
    if (req.user.role === 'institution_staff' && !scope.isDean) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'Only the Institution Director or College Dean can verify staff accounts.' });
    }

    const [staffRows] = await connection.query(
      `SELECT s.*, u.user_id, u.email, p.department as program_department 
       FROM institution_staff s 
       JOIN users u ON s.user_id = u.user_id 
       LEFT JOIN programs p ON s.program_id = p.program_id
       WHERE s.staff_id = ? AND s.institution_id = ?`,
      [staffId, inst.institution_id]
    );

    if (staffRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Staff member record not found.' });
    }

    const staffMember = staffRows[0];

    // If caller is College Dean, verify that the staff member belongs to their collegiate department
    if (scope.isDean && scope.department) {
      const staffDept = (staffMember.department || staffMember.program_department || '').trim().toLowerCase();
      const deanDept = scope.department.trim().toLowerCase();
      const inProgScope = Boolean(staffMember.program_id && scope.programIds && scope.programIds.includes(Number(staffMember.program_id)));

      if (staffDept !== deanDept && !inProgScope) {
        await connection.rollback();
        return res.status(403).json({
          success: false,
          message: `As College Dean of ${scope.department}, you can only verify staff members assigned to your department.`
        });
      }
    }

    if (action === 'approve') {
      await connection.query('UPDATE users SET is_verified = 1, is_active = 1 WHERE user_id = ?', [staffMember.user_id]);
      await connection.query('UPDATE institution_staff SET is_verified = 1 WHERE staff_id = ?', [staffId]);
      await connection.query(
        `UPDATE entity_registrations 
         SET status = 'verified', reviewer_user_id = ?, reviewed_at = CURRENT_TIMESTAMP 
         WHERE entity_type = 'institution_staff' AND entity_id = ?`,
        [req.user.user_id, staffId]
      );
    } else {
      await connection.query(
        `UPDATE access_codes 
         SET is_used = 0, used_by_user_id = NULL, used_at = NULL 
         WHERE used_by_user_id = ? OR (recipient_type = 'institution_staff' AND target_identifier = ? AND is_used = 1)`,
        [staffMember.user_id, staffMember.employee_id || staffMember.staff_number]
      );

      await connection.query('DELETE FROM entity_registrations WHERE entity_type = \'institution_staff\' AND entity_id = ?', [staffId]);
      await connection.query('DELETE FROM notifications WHERE user_id = ?', [staffMember.user_id]);
      await connection.query('DELETE FROM audit_logs WHERE user_id = ?', [staffMember.user_id]);
      await connection.query('DELETE FROM institution_staff WHERE staff_id = ?', [staffId]);
      await connection.query('DELETE FROM users WHERE user_id = ?', [staffMember.user_id]);
    }

    await connection.commit();

    emitUpdate('staff_verified', { institution_id: inst.institution_id, staff_id: staffId, user_id: staffMember.user_id, action });

    // Mark staff verification notification as read
    try {
      await pool.query(
        'UPDATE notifications SET is_read = 1 WHERE related_type = \'institution_staff\' AND related_id = ?',
        [staffId]
      );
    } catch (_) { }

    if (action === 'approve') {
      try {
        const verifierTitle = scope.isDean ? 'College Dean' : 'Institution Director';
        await sendNotification({
          userId: staffMember.user_id,
          title: 'Staff Account Verified & Activated',
          message: `Your staff account at ${inst.institution_name} has been approved and activated by the ${verifierTitle}. You can now access all departmental features.`,
          type: 'verification',
          link: '/dashboard/institution'
        });
      } catch (_) { }
    }

    return res.json({
      success: true,
      message: action === 'approve'
        ? `Staff ${staffMember.first_name} ${staffMember.last_name} approved and activated successfully!`
        : `Staff registration for ${staffMember.first_name} ${staffMember.last_name} rejected.`
    });
  } catch (error) {
    try { await connection.rollback(); } catch (_) { }
    console.error('Verify staff error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify staff member.' });
  } finally {
    safeRelease();
  }
});

// GET /api/inst/catalog-programs
router.get('/catalog-programs', async (req, res) => {
  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    const scope = await getStaffProgramScope(req.user.user_id, req.user.role, inst.institution_id);

    let catSql = `SELECT mp.*,
              p.program_id as institution_program_id,
              IF(p.program_id IS NOT NULL, 1, 0) as is_active_in_institution,
              COALESCE(p.required_ojt_hours, mp.default_ojt_hours) as current_ojt_hours,
              COALESCE((SELECT COUNT(*) FROM students s WHERE s.program_id = p.program_id), 0) as enrolled_students
       FROM master_programs mp
       LEFT JOIN programs p ON p.program_id = (
           SELECT p2.program_id FROM programs p2 
           WHERE p2.institution_id = ? 
             AND (TRIM(p2.program_code) = TRIM(mp.program_code) OR LOWER(TRIM(p2.program_name)) = LOWER(TRIM(mp.program_name)))
           ORDER BY (TRIM(p2.program_code) = TRIM(mp.program_code) AND LOWER(TRIM(p2.program_name)) = LOWER(TRIM(mp.program_name))) DESC,
                    (TRIM(p2.program_code) = TRIM(mp.program_code)) DESC
           LIMIT 1
       )`;
    const catParams = [inst.institution_id];

    if (scope.isRestricted && scope.department) {
      catSql += ` WHERE (
        mp.discipline = ? OR 
        mp.discipline LIKE ? OR 
        ? LIKE CONCAT('%', mp.discipline, '%')
      )`;
      catParams.push(scope.department, `%${scope.department}%`, scope.department);
    }

    catSql += ` ORDER BY mp.discipline ASC, mp.program_name ASC`;
    const [catalog] = await pool.query(catSql, catParams);

    return res.json({ success: true, data: catalog, staff_scope: scope });
  } catch (error) {
    console.error('Fetch catalog programs error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch catalog programs.' });
  }
});

// GET /api/inst/programs
router.get('/programs', async (req, res) => {
  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    const scope = await getStaffProgramScope(req.user.user_id, req.user.role, inst.institution_id);

    let progSql = `SELECT p.*, 
            COALESCE(mp.discipline, p.department, 'General Academic') as discipline,
            COALESCE(mp.description, '') as description,
            (SELECT COUNT(*) FROM students s WHERE s.program_id = p.program_id) as student_count
     FROM programs p
     LEFT JOIN master_programs mp ON mp.master_program_id = (
         SELECT mp2.master_program_id FROM master_programs mp2
         WHERE TRIM(p.program_code) = TRIM(mp2.program_code) OR LOWER(TRIM(p.program_name)) = LOWER(TRIM(mp2.program_name))
         ORDER BY (TRIM(p.program_code) = TRIM(mp2.program_code) AND LOWER(TRIM(p.program_name)) = LOWER(TRIM(mp2.program_name))) DESC,
                  (TRIM(p.program_code) = TRIM(mp2.program_code)) DESC
         LIMIT 1
     )
     WHERE p.institution_id = ?`;
    const progParams = [inst.institution_id];
    if (scope.isRestricted) {
      if (scope.isDean) {
        progSql += ' AND p.department = ?';
        progParams.push(scope.department);
      } else {
        progSql += ' AND p.program_id = ?';
        progParams.push(scope.programId);
      }
    }
    progSql += ' ORDER BY p.program_name ASC';
    const [programs] = await pool.query(progSql, progParams);

    return res.json({ success: true, data: programs, staff_scope: scope });
  } catch (error) {
    console.error('Fetch institution programs error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch programs.' });
  }
});

// POST /api/inst/programs
router.post('/programs', async (req, res) => {
  const { master_program_ids, master_program_id, required_ojt_hours, custom_hours, program_name, program_code } = req.body;

  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    const scope = await getStaffProgramScope(req.user.user_id, req.user.role, inst.institution_id);

    const matchesDept = (discipline, targetDept) => {
      if (!discipline || !targetDept) return false;
      const d1 = discipline.toLowerCase().trim();
      const d2 = targetDept.toLowerCase().trim();
      return d1 === d2 || d1.includes(d2) || d2.includes(d1);
    };

    if (Array.isArray(master_program_ids) && master_program_ids.length > 0) {
      const [selectedFromMaster] = await pool.query(
        'SELECT * FROM master_programs WHERE master_program_id IN (?)',
        [master_program_ids]
      );

      if (scope.isRestricted && scope.department) {
        const unauthorized = selectedFromMaster.filter(mp => !matchesDept(mp.discipline, scope.department));
        if (unauthorized.length > 0) {
          return res.status(403).json({
            success: false,
            message: `Access Denied: You are restricted to the "${scope.department}" department and cannot activate "${unauthorized[0].program_name}" (${unauthorized[0].discipline}).`
          });
        }
      }

      let activatedCount = 0;
      for (const mp of selectedFromMaster) {
        const hours = (custom_hours && custom_hours[mp.master_program_id])
          ? parseInt(custom_hours[mp.master_program_id])
          : (required_ojt_hours ? parseInt(required_ojt_hours) : mp.default_ojt_hours);

        const [existing] = await pool.query(
          `SELECT program_id FROM programs 
           WHERE institution_id = ? 
             AND (TRIM(program_code) = TRIM(?) OR LOWER(TRIM(program_name)) = LOWER(TRIM(?)))
           ORDER BY (TRIM(program_code) = TRIM(?) AND LOWER(TRIM(program_name)) = LOWER(TRIM(?))) DESC,
                    (TRIM(program_code) = TRIM(?)) DESC
           LIMIT 1`,
          [inst.institution_id, mp.program_code, mp.program_name, mp.program_code, mp.program_name, mp.program_code]
        );

        if (existing.length > 0) {
          await pool.query(
            `UPDATE programs 
             SET program_name = ?, program_code = ?, required_ojt_hours = ?, department = ?, updated_at = NOW() 
             WHERE program_id = ?`,
            [mp.program_name, mp.program_code, hours, mp.discipline, existing[0].program_id]
          );
          await cascadeProgramHoursUpdate(existing[0].program_id, inst.institution_id, hours);
        } else {
          await pool.query(
            `INSERT INTO programs (institution_id, program_name, program_code, department, required_ojt_hours, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE 
               program_name = VALUES(program_name), 
               department = VALUES(department), 
               required_ojt_hours = VALUES(required_ojt_hours), 
               updated_at = NOW()`,
            [inst.institution_id, mp.program_name, mp.program_code, mp.discipline, hours]
          );
        }
        activatedCount++;
      }

      emitUpdate('programs_updated', { institution_id: inst.institution_id });

      return res.status(201).json({
        success: true,
        message: `Successfully activated ${activatedCount} degree program(s) from the catalog for ${inst.institution_name}!`
      });
    }

    if (master_program_id) {
      const [masterRows] = await pool.query('SELECT * FROM master_programs WHERE master_program_id = ?', [master_program_id]);
      if (masterRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Program not found in nationwide catalog.' });
      }
      const mp = masterRows[0];

      if (scope.isRestricted && scope.department) {
        if (!matchesDept(mp.discipline, scope.department)) {
          return res.status(403).json({
            success: false,
            message: `Access Denied: You are restricted to the "${scope.department}" department and cannot activate "${mp.program_name}" (${mp.discipline}).`
          });
        }
      }

      const hours = required_ojt_hours ? parseInt(required_ojt_hours) : mp.default_ojt_hours;

      const [existing] = await pool.query(
        `SELECT program_id FROM programs 
         WHERE institution_id = ? 
           AND (TRIM(program_code) = TRIM(?) OR LOWER(TRIM(program_name)) = LOWER(TRIM(?)))
         ORDER BY (TRIM(program_code) = TRIM(?) AND LOWER(TRIM(program_name)) = LOWER(TRIM(?))) DESC,
                  (TRIM(program_code) = TRIM(?)) DESC
         LIMIT 1`,
        [inst.institution_id, mp.program_code, mp.program_name, mp.program_code, mp.program_name, mp.program_code]
      );

      if (existing.length > 0) {
        await pool.query(
          `UPDATE programs 
           SET program_name = ?, program_code = ?, required_ojt_hours = ?, department = ?, updated_at = NOW() 
           WHERE program_id = ?`,
          [mp.program_name, mp.program_code, hours, mp.discipline, existing[0].program_id]
        );
        await cascadeProgramHoursUpdate(existing[0].program_id, inst.institution_id, hours);
      } else {
        await pool.query(
          `INSERT INTO programs (institution_id, program_name, program_code, department, required_ojt_hours, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE 
             program_name = VALUES(program_name), 
             department = VALUES(department), 
             required_ojt_hours = VALUES(required_ojt_hours), 
             updated_at = NOW()`,
          [inst.institution_id, mp.program_name, mp.program_code, mp.discipline, hours]
        );
      }

      emitUpdate('programs_updated', { institution_id: inst.institution_id });

      return res.status(201).json({
        success: true,
        message: `${mp.program_name} (${mp.program_code}) activated with ${hours} required training hours!`
      });
    }

    if (program_name && program_code) {
      const [existingMaster] = await pool.query(
        'SELECT * FROM master_programs WHERE LOWER(TRIM(program_name)) = LOWER(TRIM(?)) OR TRIM(program_code) = TRIM(?)',
        [program_name, program_code]
      );

      const discipline = existingMaster[0]?.discipline || 'General Academic';

      if (scope.isRestricted && scope.department) {
        if (!matchesDept(discipline, scope.department)) {
          return res.status(403).json({
            success: false,
            message: `Access Denied: You are restricted to the "${scope.department}" department and cannot activate programs under "${discipline}".`
          });
        }
      }

      const hours = required_ojt_hours ? parseInt(required_ojt_hours) : (existingMaster[0]?.default_ojt_hours || 600);

      const [existing] = await pool.query(
        `SELECT program_id FROM programs 
         WHERE institution_id = ? 
           AND (TRIM(program_code) = TRIM(?) OR LOWER(TRIM(program_name)) = LOWER(TRIM(?)))
         ORDER BY (TRIM(program_code) = TRIM(?) AND LOWER(TRIM(program_name)) = LOWER(TRIM(?))) DESC,
                  (TRIM(program_code) = TRIM(?)) DESC
         LIMIT 1`,
        [inst.institution_id, program_code.trim(), program_name.trim(), program_code.trim(), program_name.trim(), program_code.trim()]
      );

      if (existing.length > 0) {
        await pool.query(
          `UPDATE programs 
           SET program_name = ?, program_code = ?, required_ojt_hours = ?, department = ?, updated_at = NOW() 
           WHERE program_id = ?`,
          [program_name.trim(), program_code.trim(), hours, discipline, existing[0].program_id]
        );
        await cascadeProgramHoursUpdate(existing[0].program_id, inst.institution_id, hours);
      } else {
        await pool.query(
          `INSERT INTO programs (institution_id, program_name, program_code, department, required_ojt_hours, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE 
             program_name = VALUES(program_name), 
             department = VALUES(department), 
             required_ojt_hours = VALUES(required_ojt_hours), 
             updated_at = NOW()`,
          [inst.institution_id, program_name.trim(), program_code.trim(), discipline, hours]
        );
      }

      emitUpdate('programs_updated', { institution_id: inst.institution_id });

      return res.status(201).json({
        success: true,
        message: `${program_name} (${program_code}) activated successfully!`
      });
    }

    return res.status(400).json({ success: false, message: 'Please select a valid degree program.' });
  } catch (error) {
    console.error('Create/activate program error:', error);
    return res.status(500).json({ success: false, message: 'Failed to activate program: ' + error.message });
  }
});

// Helper to cascade program hours update to enrolled students and active OJT records
async function cascadeProgramHoursUpdate(programId, institutionId, newHours) {
  const parsedHours = parseInt(newHours, 10);
  if (isNaN(parsedHours) || parsedHours <= 0) return;

  try {
    // 1. Fetch all affected students and active OJT records
    const [affected] = await pool.query(
      `SELECT DISTINCT s.student_id, s.user_id as student_user_id, s.completed_ojt_hours,
              o.ojt_id, o.organization_id, o.rendered_hours
       FROM students s
       LEFT JOIN ojt_records o ON s.student_id = o.student_id AND o.status = 'ongoing'
       WHERE s.program_id = ? AND s.institution_id = ?`,
      [programId, institutionId]
    );

    // 2. Update students table: required_ojt_hours for non-graduated/non-completed students
    await pool.query(
      `UPDATE students 
       SET required_ojt_hours = ?, updated_at = NOW() 
       WHERE program_id = ? AND institution_id = ? 
         AND (ojt_status IS NULL OR ojt_status NOT IN ('graduated', 'completed', 'completed_ojt'))`,
      [parsedHours, programId, institutionId]
    );

    // Auto-complete any students whose completed hours now satisfy or exceed new requirement
    await pool.query(
      `UPDATE students 
       SET ojt_status = 'completed_ojt', status_id = 4, updated_at = NOW() 
       WHERE program_id = ? AND institution_id = ? 
         AND (ojt_status IS NULL OR ojt_status NOT IN ('graduated', 'completed', 'completed_ojt'))
         AND completed_ojt_hours >= ?`,
      [programId, institutionId, parsedHours]
    );

    // 3. Update ojt_records table: required_hours for active/ongoing OJT placements
    await pool.query(
      `UPDATE ojt_records o
       JOIN students s ON o.student_id = s.student_id
       SET o.required_hours = ?, o.updated_at = NOW()
       WHERE s.program_id = ? AND s.institution_id = ? AND o.status = 'ongoing'`,
      [parsedHours, programId, institutionId]
    );

    // Auto-complete active OJT records where rendered_hours >= new requirement
    await pool.query(
      `UPDATE ojt_records o
       JOIN students s ON o.student_id = s.student_id
       SET o.status = 'completed', o.updated_at = NOW()
       WHERE s.program_id = ? AND s.institution_id = ? AND o.status = 'ongoing'
         AND o.rendered_hours >= ?`,
      [programId, institutionId, parsedHours]
    );

    // 4. Real-time Socket Event Dispatches
    emitUpdate('programs_updated', { institution_id: institutionId, program_id: programId, required_ojt_hours: parsedHours });

    // Broadcast OJT & DTR changes to targeted student & organization rooms
    const studentIds = new Set();
    const userIds = new Set();
    const orgIds = new Set();

    affected.forEach(r => {
      if (r.student_id) studentIds.add(r.student_id);
      if (r.student_user_id) userIds.add(r.student_user_id);
      if (r.organization_id) orgIds.add(r.organization_id);
    });

    for (const orgId of orgIds) {
      emitUpdate('ojt_updated', { organization_id: orgId, program_id: programId, required_hours: parsedHours });
      emitUpdate('attendance_verified', { organization_id: orgId });
    }

    for (const sId of studentIds) {
      emitUpdate('ojt_updated', { student_id: sId, required_hours: parsedHours });
    }

    for (const uId of userIds) {
      emitUpdate('student_updated', { user_id: uId, required_hours: parsedHours });
    }

    // Global trigger so all dashboards and open DTR tables auto-refresh cleanly
    emitUpdate('data_updated', { type: 'ojt_records_updated', program_id: programId, required_hours: parsedHours });
  } catch (cascadeErr) {
    console.error('Error cascading program hours update:', cascadeErr);
  }
}

// PUT /api/inst/programs/:id
router.put('/programs/:id', async (req, res) => {
  const { required_ojt_hours } = req.body;
  const programId = req.params.id;

  const parsedHours = parseInt(required_ojt_hours, 10);
  if (isNaN(parsedHours) || parsedHours <= 0) {
    return res.status(400).json({ success: false, message: 'Please enter a valid number of required training hours.' });
  }

  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    const [progRows] = await pool.query(
      'SELECT program_id, program_name FROM programs WHERE program_id = ? AND institution_id = ?',
      [programId, inst.institution_id]
    );
    if (progRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Degree program not found for your institution.' });
    }

    await pool.query(
      'UPDATE programs SET required_ojt_hours = ?, updated_at = NOW() WHERE program_id = ? AND institution_id = ?',
      [parsedHours, programId, inst.institution_id]
    );

    // Cascade update to all students and active OJT records in this degree program
    await cascadeProgramHoursUpdate(programId, inst.institution_id, parsedHours);

    return res.json({
      success: true,
      message: `Curricular training hours updated to ${parsedHours} hrs! Affected student profiles and active internship records have been synchronized.`
    });
  } catch (error) {
    console.error('Update program error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update program: ' + error.message });
  }
});

// DELETE /api/inst/programs/:id
router.delete('/programs/:id', async (req, res) => {
  const programId = req.params.id;

  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    const [[{ studentCount }]] = await pool.query(
      'SELECT COUNT(*) as studentCount FROM students WHERE program_id = ? AND institution_id = ?',
      [programId, inst.institution_id]
    );

    if (studentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot remove this program because there are currently ${studentCount} student(s) enrolled in it.`
      });
    }

    await pool.query(
      'DELETE FROM programs WHERE program_id = ? AND institution_id = ?',
      [programId, inst.institution_id]
    );

    emitUpdate('programs_updated', { institution_id: inst.institution_id });

    return res.json({ success: true, message: 'Program removed from university offerings.' });
  } catch (error) {
    console.error('Delete program error:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove program.' });
  }
});

// GET /api/inst/monitoring
router.get('/monitoring', async (req, res) => {
  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    const scope = await getStaffProgramScope(req.user.user_id, req.user.role, inst.institution_id);

    let depSql = `SELECT o.*, s.first_name, s.last_name, s.student_number, s.required_ojt_hours,
              p.program_name, p.program_code, ho.organization_name, ho.contact_email as org_email,
              (SELECT rating FROM ojt_performance_records WHERE ojt_id = o.ojt_id ORDER BY evaluated_at DESC LIMIT 1) as evaluation_rating,
              (SELECT record_id FROM ojt_performance_records WHERE ojt_id = o.ojt_id ORDER BY evaluated_at DESC LIMIT 1) as evaluation_id,
              cert.certificate_id, cert.certificate_code, cert.issued_at as certificate_issued_at, cert.certificate_data
       FROM ojt_records o
       JOIN students s ON o.student_id = s.student_id
       LEFT JOIN hiring_organizations ho ON o.organization_id = ho.organization_id
       LEFT JOIN programs p ON s.program_id = p.program_id
       LEFT JOIN ojt_certificates cert ON o.ojt_id = cert.ojt_id
       WHERE s.institution_id = ?`;
    const depParams = [inst.institution_id];
    depSql = appendProgramScopeSql(depSql, depParams, scope, 's.program_id');
    depSql += ' ORDER BY o.created_at DESC';
    const [deployments] = await pool.query(depSql, depParams);

    // Auto-generate certificate for any completed and evaluated intern that does not have one yet
    for (const dep of deployments) {
      const isCompleted = dep.status === 'completed' || Number(dep.rendered_hours) >= Number(dep.required_hours || dep.required_ojt_hours || 600);
      if (isCompleted && dep.evaluation_id && !dep.certificate_id) {
        try {
          const certRes = await checkAndGenerateCertificate(dep.ojt_id);
          if (certRes.success && certRes.certificate) {
            dep.certificate_id = certRes.certificate.certificate_id;
            dep.certificate_code = certRes.certificate.certificate_code;
            dep.certificate_issued_at = certRes.certificate.issued_at || new Date();
            dep.certificate_data = certRes.certificate.certificate_data;
          }
        } catch (e) {
          console.error('Certificate generation sweep error for ojt #' + dep.ojt_id, e);
        }
      }
    }

    let compSql = `SELECT c.*, c.subject as title, s.first_name, s.last_name, s.student_number,
              CONCAT(s.first_name, ' ', s.last_name) as student_name,
              ho.organization_name,
              cc.category_name,
              ar.accident_id, ar.incident_datetime, ar.location as accident_location,
              ar.location as incident_location,
              ar.severity as accident_severity, ar.injury_description,
              ar.injury_description as injuries_sustained,
              ar.medical_attention_given,
              CASE WHEN ar.medical_attention_given IS NOT NULL AND ar.medical_attention_given != '' AND ar.medical_attention_given != 'No external medical attention required' THEN 1 ELSE 0 END as medical_attention_required,
              ar.witnesses, ar.immediate_action_taken,
              ar.immediate_action_taken as emergency_actions_taken,
              ar.preventive_measures,
              (SELECT COUNT(*) FROM institution_reports ir WHERE ir.complaint_id = c.complaint_id) as is_escalated_to_admin
       FROM complaints c
       JOIN students s ON c.student_id = s.student_id
       LEFT JOIN complaint_categories cc ON c.category_id = cc.category_id
       LEFT JOIN hiring_organizations ho ON c.organization_id = ho.organization_id
       LEFT JOIN accident_reports ar ON c.complaint_id = ar.complaint_id
       WHERE s.institution_id = ? AND (c.complainant_type = 'student' OR c.complainant_type IS NULL)`;
    const compParams = [inst.institution_id];
    compSql = appendProgramScopeSql(compSql, compParams, scope, 's.program_id');
    compSql += ' ORDER BY c.created_at DESC';
    const [complaints] = await pool.query(compSql, compParams);

    let empCompSql = `SELECT c.*, c.subject as title, s.first_name, s.last_name, s.student_number,
              CONCAT(s.first_name, ' ', s.last_name) as student_name,
              ho.organization_name,
              COALESCE(c.incident_category, cc.category_name) as category_name,
              c.incident_category,
              c.evidence_url,
              ar.accident_id, ar.incident_datetime, ar.location as accident_location,
              ar.location as incident_location,
              ar.severity as accident_severity, ar.injury_description,
              ar.injury_description as injuries_sustained,
              ar.medical_attention_given,
              CASE WHEN ar.medical_attention_given IS NOT NULL AND ar.medical_attention_given != '' AND ar.medical_attention_given != 'No external medical attention required' THEN 1 ELSE 0 END as medical_attention_required,
              ar.witnesses, ar.immediate_action_taken,
              ar.immediate_action_taken as emergency_actions_taken,
              ar.preventive_measures,
              (SELECT COUNT(*) FROM institution_reports ir WHERE ir.complaint_id = c.complaint_id) as is_escalated_to_admin
       FROM complaints c
       JOIN students s ON c.student_id = s.student_id
       LEFT JOIN complaint_categories cc ON c.category_id = cc.category_id
       LEFT JOIN hiring_organizations ho ON c.organization_id = ho.organization_id
       LEFT JOIN accident_reports ar ON c.complaint_id = ar.complaint_id
       WHERE s.institution_id = ? AND c.complainant_type = 'organization'`;
    const empCompParams = [inst.institution_id];
    empCompSql = appendProgramScopeSql(empCompSql, empCompParams, scope, 's.program_id');
    empCompSql += ' ORDER BY c.created_at DESC';
    const [rawEmployerComplaints] = await pool.query(empCompSql, empCompParams);
    const employerComplaints = rawEmployerComplaints.map(c => {
      let cat = c.incident_category || c.category_name;
      if (!cat || cat.toLowerCase().includes('allowance') || cat.toLowerCase().includes('stipend')) {
        if (c.is_accident || c.accident_id) {
          cat = 'Workplace Accident & Physical Injury';
        } else if ((c.title || c.subject || '').toLowerCase().includes('server') || (c.title || c.subject || '').toLowerCase().includes('damage')) {
          cat = 'Company Property Damage / Negligence';
        } else {
          cat = 'General Misconduct / Unprofessional Behavior';
        }
      }
      return { ...c, category_name: cat, incident_category: cat };
    });
    const conductComplaints = employerComplaints.filter(c => !c.is_accident && !c.accident_id);

    // Dedicated query for accident reports to ensure all recorded accidents for institution interns are found
    let accSql = `SELECT ar.accident_id, ar.complaint_id, ar.organization_id, ar.student_id,
              ar.incident_datetime, ar.location as accident_location, ar.location as incident_location,
              ar.severity as accident_severity, ar.severity,
              ar.injury_description, ar.injury_description as injuries_sustained,
              ar.medical_attention_given,
              CASE WHEN ar.medical_attention_given IS NOT NULL AND ar.medical_attention_given != '' AND ar.medical_attention_given != 'No external medical attention required' THEN 1 ELSE 0 END as medical_attention_required,
              ar.witnesses, ar.immediate_action_taken,
              ar.immediate_action_taken as emergency_actions_taken,
              ar.preventive_measures,
              ar.created_at, ar.created_at as filed_at,
              s.first_name, s.last_name, s.student_number,
              CONCAT(s.first_name, ' ', s.last_name) as student_name,
              ho.organization_name,
              COALESCE(c.subject, CONCAT('Workplace Incident - ', ar.severity)) as title,
              COALESCE(c.subject, CONCAT('Workplace Incident - ', ar.severity)) as subject,
              COALESCE(c.description, ar.injury_description, 'Workplace accident reported') as description,
              COALESCE(c.status, 'submitted') as status,
              (SELECT COUNT(*) FROM institution_reports ir WHERE (c.complaint_id IS NOT NULL AND ir.complaint_id = c.complaint_id) OR ir.title LIKE CONCAT('%', ar.accident_id, '%')) as is_escalated_to_admin
       FROM accident_reports ar
       JOIN students s ON ar.student_id = s.student_id
       LEFT JOIN hiring_organizations ho ON ar.organization_id = ho.organization_id
       LEFT JOIN complaints c ON ar.complaint_id = c.complaint_id
       WHERE s.institution_id = ?`;
    const accParams = [inst.institution_id];
    accSql = appendProgramScopeSql(accSql, accParams, scope, 's.program_id');
    accSql += ' ORDER BY ar.created_at DESC';
    const [directAccidents] = await pool.query(accSql, accParams);

    const seenAccidentIds = new Set();
    const seenComplaintIds = new Set();
    const combinedAccidents = [];

    for (const acc of directAccidents) {
      if (acc.accident_id) seenAccidentIds.add(Number(acc.accident_id));
      if (acc.complaint_id) seenComplaintIds.add(Number(acc.complaint_id));
      combinedAccidents.push(acc);
    }

    for (const c of employerComplaints.filter(item => item.is_accident || item.accident_id)) {
      if (c.accident_id && seenAccidentIds.has(Number(c.accident_id))) continue;
      if (c.complaint_id && seenComplaintIds.has(Number(c.complaint_id))) continue;
      combinedAccidents.push(c);
    }

    let instRepSql = `SELECT ir.*, ir.title as report_title,
              COALESCE(ir.action_taken, ir.status, 'submitted') as admin_action,
              ho.organization_name, cc.category_name,
              s.first_name, s.last_name, s.student_number,
              CONCAT(s.first_name, ' ', s.last_name) as student_name,
              p.program_name
       FROM institution_reports ir
       JOIN hiring_organizations ho ON ir.organization_id = ho.organization_id
       LEFT JOIN complaint_categories cc ON ir.category_id = cc.category_id
       LEFT JOIN complaints c ON ir.complaint_id = c.complaint_id
       LEFT JOIN students s ON c.student_id = s.student_id
       LEFT JOIN programs p ON s.program_id = p.program_id`;
    const instRepParams = [inst.institution_id];
    if (scope.isRestricted) {
      if (scope.isDean) {
        instRepSql += ` WHERE ir.institution_id = ? AND (s.program_id IN (?) OR c.complaint_id IS NULL OR s.program_id IS NULL)`;
        instRepParams.push(scope.programIds.length > 0 ? scope.programIds : [-1]);
      } else {
        instRepSql += ` WHERE ir.institution_id = ? AND (s.program_id = ? OR c.complaint_id IS NULL OR s.program_id IS NULL)`;
        instRepParams.push(scope.programId);
      }
    } else {
      instRepSql += ' WHERE ir.institution_id = ?';
    }
    instRepSql += ' ORDER BY ir.created_at DESC';
    const [institutionReports] = await pool.query(instRepSql, instRepParams);

    return res.json({
      success: true,
      data: {
        deployments,
        complaints,
        employerComplaints: conductComplaints,
        conductComplaints,
        accidentReports: combinedAccidents,
        institutionReports,
        staff_scope: scope
      }
    });
  } catch (error) {
    console.error('Fetch monitoring error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch monitoring data.' });
  }
});

// GET /api/inst/requirements
router.get('/requirements', async (req, res) => {
  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    const scope = await getStaffProgramScope(req.user.user_id, req.user.role, inst.institution_id);

    let reqSubCondition = '';
    let reqProgCondition = '';
    let reqSubParams = [inst.institution_id];

    if (scope.isRestricted) {
      if (scope.isDean) {
        reqSubCondition = ' AND s.program_id IN (?)';
        reqProgCondition = ' AND (r.program_id IS NULL OR r.program_id IN (?))';
        const pIds = scope.programIds.length > 0 ? scope.programIds : [-1];
        reqSubParams = [pIds, inst.institution_id, pIds];
      } else {
        reqSubCondition = ' AND s.program_id = ?';
        reqProgCondition = ' AND (r.program_id IS NULL OR r.program_id = ?)';
        reqSubParams = [scope.programId, inst.institution_id, scope.programId];
      }
    }

    let reqSql = `SELECT r.*, p.program_name, p.program_code,
            (SELECT COUNT(*) 
             FROM ojt_student_requirements sr 
             JOIN ojt_records o ON sr.ojt_id = o.ojt_id
             JOIN students s ON o.student_id = s.student_id
             WHERE sr.requirement_id = r.requirement_id AND sr.status = 'submitted' ${reqSubCondition}
            ) as pending_submissions
     FROM ojt_requirements r
     LEFT JOIN programs p ON r.program_id = p.program_id
     WHERE r.institution_id = ? ${reqProgCondition}
     ORDER BY r.is_mandatory DESC, r.created_at DESC`;
    const [requirements] = await pool.query(reqSql, reqSubParams);

    let subSql = `SELECT sr.*, r.requirement_name, r.document_template_url, s.first_name, s.last_name, s.student_number, p.program_name, p.program_code
     FROM ojt_student_requirements sr
     JOIN ojt_requirements r ON sr.requirement_id = r.requirement_id
     JOIN ojt_records o ON sr.ojt_id = o.ojt_id
     JOIN students s ON o.student_id = s.student_id
     LEFT JOIN programs p ON s.program_id = p.program_id
     WHERE r.institution_id = ? AND sr.status != 'draft'`;
    const subParams = [inst.institution_id];
    subSql = appendProgramScopeSql(subSql, subParams, scope, 's.program_id');
    subSql += ' ORDER BY sr.submitted_at DESC';
    const [submissions] = await pool.query(subSql, subParams);

    return res.json({ success: true, data: { requirements, submissions, staff_scope: scope } });
  } catch (error) {
    console.error('Fetch requirements error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch requirements.' });
  }
});

// POST /api/inst/requirements/upload - Upload template form/document for students to download
router.post('/requirements/upload', (req, res, next) => {
  reqUpload.single('file')(req, res, (err) => {
    if (err) {
      console.error('[Inst Req Multer Error]', err);
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
  try {
    const fileUrl = await saveUploadedFile(req.file, 'requirements');
    if (!fileUrl) {
      return res.status(500).json({ success: false, message: 'Failed to process and store requirement template.' });
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
  } catch (err) {
    console.error('[Inst Req Upload Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to upload template file.' });
  }
});

// POST /api/inst/requirements - Create requirement and notify affected students
router.post('/requirements', async (req, res) => {
  const { requirement_name, description, is_mandatory, document_template_url, program_id } = req.body;
  if (!requirement_name) return res.status(400).json({ success: false, message: 'Requirement name is required.' });

  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    const scope = await getStaffProgramScope(req.user.user_id, req.user.role, inst.institution_id);
    let targetProgramId = program_id ? Number(program_id) : null;

    if (scope.isRestricted) {
      if (scope.isDean) {
        if (targetProgramId && !isProgramAllowed(scope, targetProgramId)) {
          return res.status(403).json({
            success: false,
            message: `Access Denied: Selected program does not belong to your department (${scope.department}).`
          });
        }
      } else {
        targetProgramId = scope.programId;
      }
    }

    const [insertRes] = await pool.query(
      `INSERT INTO ojt_requirements (institution_id, program_id, requirement_name, description, document_template_url, is_mandatory, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [inst.institution_id, targetProgramId, requirement_name.trim(), description ? description.trim() : '', document_template_url || null, is_mandatory ? 1 : 0]
    );

    const newReqId = insertRes.insertId;

    // Send notifications to affected students
    let stuSql = 'SELECT user_id, first_name, last_name FROM students WHERE institution_id = ?';
    const stuParams = [inst.institution_id];
    if (targetProgramId) {
      stuSql += ' AND program_id = ?';
      stuParams.push(targetProgramId);
    } else if (scope.isRestricted && scope.isDean && scope.programIds.length > 0) {
      stuSql += ' AND program_id IN (?)';
      stuParams.push(scope.programIds);
    }

    const [affectedStudents] = await pool.query(stuSql, stuParams);
    for (const stu of affectedStudents) {
      if (stu.user_id) {
        await sendNotification({
          userId: stu.user_id,
          senderId: req.user.user_id,
          senderName: inst.institution_name,
          title: 'New OJT Clearance Requirement Published',
          message: `Your institution has published a new OJT clearance requirement: "${requirement_name}". Please view and complete the required document.`,
          type: 'requirement',
          link: '/dashboard/student/ojt?tab=requirements'
        });
      }
    }

    emitUpdate('requirement_updated', { institution_id: inst.institution_id });

    return res.status(201).json({ success: true, message: 'Requirement created successfully.', data: { requirement_id: newReqId } });
  } catch (error) {
    console.error('Create requirement error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create requirement: ' + error.message });
  }
});

// DELETE /api/inst/requirements/:id
router.delete('/requirements/:id', async (req, res) => {
  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    const scope = await getStaffProgramScope(req.user.user_id, req.user.role, inst.institution_id);
    const [reqRows] = await pool.query(
      'SELECT * FROM ojt_requirements WHERE requirement_id = ? AND institution_id = ?',
      [req.params.id, inst.institution_id]
    );

    if (reqRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Requirement not found.' });
    }

    if (scope.isRestricted && reqRows[0].program_id && !isProgramAllowed(scope, reqRows[0].program_id)) {
      return res.status(403).json({
        success: false,
        message: `Access Denied: You can only delete requirements belonging to your assigned ${scope.isDean ? 'department' : 'program'}.`
      });
    }

    await pool.query('DELETE FROM ojt_requirements WHERE requirement_id = ?', [req.params.id]);
    emitUpdate('requirement_updated', { institution_id: inst.institution_id });

    return res.json({ success: true, message: 'Requirement deleted successfully.' });
  } catch (error) {
    console.error('Delete requirement error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete requirement: ' + error.message });
  }
});

// POST /api/inst/requirements/submissions/:id/verify
router.post('/requirements/submissions/:id/verify', async (req, res) => {
  const { status } = req.body;
  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    const scope = await getStaffProgramScope(req.user.user_id, req.user.role, inst.institution_id);
    const [subRows] = await pool.query(
      `SELECT sr.id, s.student_id, s.institution_id, s.program_id
       FROM ojt_student_requirements sr
       JOIN ojt_records o ON sr.ojt_id = o.ojt_id
       JOIN students s ON o.student_id = s.student_id
       WHERE sr.id = ? AND s.institution_id = ?`,
      [req.params.id, inst.institution_id]
    );

    if (subRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Submission record not found in your institution.' });
    }

    if (scope.isRestricted && !isProgramAllowed(scope, subRows[0].program_id)) {
      return res.status(403).json({
        success: false,
        message: `Access Denied: You can only verify requirement submissions for students in your assigned ${scope.isDean ? 'department' : 'program'}.`
      });
    }

    await pool.query(
      'UPDATE ojt_student_requirements SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status || 'approved', req.params.id]
    );

    emitUpdate('requirement_updated', {});

    return res.json({ success: true, message: `Submission marked as ${status}.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update submission status.' });
  }
});

// GET /api/inst/certificates/ojt/:ojtId - Get certificate for OJT record
router.get('/certificates/ojt/:ojtId', async (req, res) => {
  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    const [certs] = await pool.query(
      `SELECT c.*, o.start_date, o.end_date, s.first_name, s.last_name, s.student_number
       FROM ojt_certificates c
       JOIN ojt_records o ON c.ojt_id = o.ojt_id
       JOIN students s ON c.student_id = s.student_id
       WHERE c.ojt_id = ? AND c.institution_id = ?`,
      [req.params.ojtId, inst.institution_id]
    );

    if (!certs.length) {
      // Try generating if completed + evaluated
      const genRes = await checkAndGenerateCertificate(req.params.ojtId);
      if (genRes.success && genRes.certificate) {
        return res.json({ success: true, data: genRes.certificate });
      }
      return res.status(404).json({ success: false, message: genRes.message || 'Certificate not yet eligible or generated.' });
    }

    return res.json({ success: true, data: certs[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load certificate: ' + err.message });
  }
});

// POST /api/inst/complaints/:id/review - Internal review findings
router.post('/complaints/:id/review', async (req, res) => {
  const complaintId = req.params.id;
  const { findings, recommendation, action_taken } = req.body;

  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    const scope = await getStaffProgramScope(req.user.user_id, req.user.role, inst.institution_id);
    const compAccess = await verifyComplaintAccess(scope, complaintId, inst.institution_id);
    if (!compAccess.allowed) {
      return res.status(compAccess.status).json({ success: false, message: compAccess.message });
    }

    const [compCheck] = await pool.query(
      `SELECT c.is_accident, (SELECT COUNT(*) FROM accident_reports ar WHERE ar.complaint_id = c.complaint_id) as has_accident
       FROM complaints c WHERE c.complaint_id = ?`,
      [complaintId]
    );
    if (compCheck.length > 0 && (compCheck[0].is_accident || compCheck[0].has_accident > 0)) {
      return res.status(400).json({
        success: false,
        message: 'Review findings cannot be filed on workplace accident reports. Use safety escalation if required.'
      });
    }

    await pool.query(
      `INSERT INTO complaint_reviews (complaint_id, reviewed_by, reviewer_role, findings, recommendation, action_taken, reviewed_at, created_at, updated_at)
       VALUES (?, ?, 'institution', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [complaintId, req.user.user_id, findings || '', recommendation || '', action_taken || 'Internal Review Recorded']
    );

    await pool.query(
      'UPDATE complaints SET status = \'institution_review\', updated_at = CURRENT_TIMESTAMP WHERE complaint_id = ?',
      [complaintId]
    );

    emitUpdate('complaint_updated', { complaint_id: complaintId });

    return res.json({ success: true, message: 'Institution review findings recorded.' });
  } catch (error) {
    console.error('Submit complaint review error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit review.' });
  }
});

// POST /api/inst/complaints/:id/forward-org - Step 3: Forward sanitized notice to Organization
router.post('/complaints/:id/forward-org', async (req, res) => {
  const complaintId = req.params.id;
  const { notice_summary, summary, include_student_details } = req.body;
  const finalSummary = notice_summary || summary;

  if (!finalSummary) {
    return res.status(400).json({ success: false, message: 'Notice summary for the organization is required.' });
  }

  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    const scope = await getStaffProgramScope(req.user.user_id, req.user.role, inst.institution_id);
    const compAccess = await verifyComplaintAccess(scope, complaintId, inst.institution_id);
    if (!compAccess.allowed) {
      return res.status(compAccess.status).json({ success: false, message: compAccess.message });
    }

    const [rows] = await pool.query(
      `SELECT c.*, ho.organization_name
       FROM complaints c
       JOIN hiring_organizations ho ON c.organization_id = ho.organization_id
       WHERE c.complaint_id = ?`,
      [complaintId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Complaint not found.' });
    const complaint = rows[0];

    await pool.query(
      `UPDATE complaints
       SET forwarded_to_org = 1,
           forwarded_to_org_at = NOW(),
           org_notice_summary = ?,
           include_student_details = ?,
           updated_at = NOW()
       WHERE complaint_id = ?`,
      [finalSummary, include_student_details ? 1 : 0, complaintId]
    );

    // Notify organization representatives
    const [orgUsers] = await pool.query(
      `SELECT submitted_by as user_id FROM organization_registrations WHERE organization_id = ?
       UNION
       SELECT user_id FROM organization_staff WHERE organization_id = ?`,
      [complaint.organization_id, complaint.organization_id]
    );

    for (const orgUser of orgUsers) {
      if (orgUser.user_id) {
        await sendNotification({
          userId: orgUser.user_id,
          senderId: req.user.user_id,
          senderName: inst.institution_name,
          title: 'Official Grievance Notice from Partner Institution',
          message: `${inst.institution_name} has issued an inquiry regarding a student grievance: "${complaint.subject}".`,
          type: 'complaint',
          link: '/dashboard/organization/grievances',
          relatedType: 'grievance',
          relatedId: complaintId
        });
      }
    }

    emitUpdate('complaint_updated', { complaint_id: complaintId });

    return res.json({
      success: true,
      message: `Grievance notice forwarded to ${complaint.organization_name}. Organization has been notified.`
    });
  } catch (error) {
    console.error('Forward to org error:', error);
    return res.status(500).json({ success: false, message: 'Failed to forward notice to organization: ' + error.message });
  }
});

// POST /api/inst/complaints/:id/warn-student - Step 4: Issue official Warning Note to Student
router.post('/complaints/:id/warn-student', async (req, res) => {
  const complaintId = req.params.id;
  const { warning_note } = req.body;

  if (!warning_note) {
    return res.status(400).json({ success: false, message: 'Warning note content is required.' });
  }

  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    const scope = await getStaffProgramScope(req.user.user_id, req.user.role, inst.institution_id);
    const compAccess = await verifyComplaintAccess(scope, complaintId, inst.institution_id);
    if (!compAccess.allowed) {
      return res.status(compAccess.status).json({ success: false, message: compAccess.message });
    }

    const [rows] = await pool.query(
      `SELECT c.*, s.user_id as student_user_id, s.first_name, s.last_name, ho.organization_name
       FROM complaints c
       JOIN students s ON c.student_id = s.student_id
       LEFT JOIN hiring_organizations ho ON c.organization_id = ho.organization_id
       WHERE c.complaint_id = ?`,
      [complaintId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Complaint not found.' });
    const complaint = rows[0];

    // Check if complaint is an accident or workplace injury report
    const [accCheck] = await pool.query(
      `SELECT accident_id FROM accident_reports WHERE complaint_id = ? LIMIT 1`,
      [complaintId]
    );
    if (complaint.is_accident || accCheck.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Disciplinary warnings cannot be issued to students for accident or workplace injury reports.'
      });
    }

    if (complaint.warning_note_to_student) {
      return res.status(400).json({
        success: false,
        message: 'An official warning note has already been issued for this complaint.'
      });
    }

    await pool.query(
      `UPDATE complaints
       SET warning_note_to_student = ?,
           warning_sent_at = NOW(),
           updated_at = NOW()
       WHERE complaint_id = ?`,
      [warning_note, complaintId]
    );

    // Send notification to the student
    if (complaint.student_user_id) {
      await sendNotification({
        userId: complaint.student_user_id,
        senderId: req.user.user_id,
        senderName: inst.institution_name,
        title: 'Official Institution Warning Note Issued',
        message: `Your institution has issued an official warning note regarding incident: "${complaint.subject}".`,
        type: 'complaint',
        link: '/dashboard/student/complaints',
        relatedType: 'warning',
        relatedId: complaintId
      });
    }

    emitUpdate('complaint_updated', { complaint_id: complaintId });

    return res.json({
      success: true,
      message: `Official warning note issued to student ${complaint.first_name} ${complaint.last_name}.`
    });
  } catch (error) {
    console.error('Warn student error:', error);
    return res.status(500).json({ success: false, message: 'Failed to issue warning to student: ' + error.message });
  }
});

// POST /api/inst/complaints/:id/escalate-admin - Step 3 & 5: Formal Institution Escalation Report to System Admin
router.post('/complaints/:id/escalate-admin', async (req, res) => {
  const complaintId = req.params.id;
  const { title, report_title, findings, recommendation, recommendations, action_taken } = req.body;
  const finalTitle = title || report_title;
  const finalRecommendation = recommendation || recommendations;

  if (!finalTitle || !findings || !finalRecommendation) {
    return res.status(400).json({ success: false, message: 'Report title, findings, and recommendation are required.' });
  }

  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    const scope = await getStaffProgramScope(req.user.user_id, req.user.role, inst.institution_id);
    const compAccess = await verifyComplaintAccess(scope, complaintId, inst.institution_id);
    if (!compAccess.allowed) {
      return res.status(compAccess.status).json({ success: false, message: compAccess.message });
    }

    const [rows] = await pool.query(
      `SELECT c.*, ho.organization_name
       FROM complaints c
       JOIN hiring_organizations ho ON c.organization_id = ho.organization_id
       WHERE c.complaint_id = ?`,
      [complaintId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Complaint not found.' });
    const complaint = rows[0];

    // Verify 1-time escalation rule
    const [existingReports] = await pool.query(
      'SELECT report_id FROM institution_reports WHERE complaint_id = ?',
      [complaintId]
    );

    const [accRows] = await pool.query(
      'SELECT accident_id FROM accident_reports WHERE complaint_id = ?',
      [complaintId]
    );
    const isAccident = Boolean(complaint.is_accident || accRows.length > 0);

    if (existingReports.length > 0) {
      return res.status(400).json({
        success: false,
        message: isAccident
          ? 'This safety issue has already been escalated to the System Administrator. Escalation is permitted 1 time only.'
          : 'A formal escalation report for this complaint has already been submitted to the System Administrator.'
      });
    }

    const [reportRes] = await pool.query(
      `INSERT INTO institution_reports (
         institution_id, organization_id, complaint_id, category_id,
         title, findings, recommendation, action_taken, reported_by, status, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', NOW(), NOW())`,
      [
        inst.institution_id,
        complaint.organization_id,
        complaintId,
        complaint.category_id || 1,
        finalTitle,
        findings,
        finalRecommendation,
        action_taken || '',
        req.user.user_id
      ]
    );

    await pool.query(
      'UPDATE complaints SET status = \'admin_review\', updated_at = NOW() WHERE complaint_id = ?',
      [complaintId]
    );

    // Step 3 & 5: Alert System Administrators of the formal Institution Report
    const [admins] = await pool.query('SELECT user_id FROM users WHERE role_id = 1');
    const adminNotifTitle = isAccident
      ? 'Formal Safety Escalation: Workplace Accident Reported'
      : 'Formal Institution Report Filed Against Organization';
    const adminNotifMsg = isAccident
      ? `${inst.institution_name} escalated a workplace accident safety issue regarding ${complaint.organization_name}: "${finalTitle}".`
      : `${inst.institution_name} filed a formal escalation report regarding ${complaint.organization_name}: "${finalTitle}".`;

    for (const admin of admins) {
      if (admin.user_id) {
        await sendNotification({
          userId: admin.user_id,
          senderId: req.user.user_id,
          senderName: inst.institution_name,
          title: adminNotifTitle,
          message: adminNotifMsg,
          type: 'complaint',
          link: '/dashboard/admin/complaints',
          relatedType: 'institution_report',
          relatedId: reportRes.insertId
        });
      }
    }

    emitUpdate('complaint_updated', { complaint_id: complaintId });

    return res.status(201).json({
      success: true,
      message: isAccident
        ? 'Workplace safety issue escalated to System Administrator for priority review.'
        : 'Formal Institution Escalation Report filed with System Administrator for review.'
    });
  } catch (error) {
    console.error('Escalate to admin error:', error);
    return res.status(500).json({ success: false, message: 'Failed to escalate report to admin: ' + error.message });
  }
});

// GET /api/inst/ojt-offers - List OJT, Career, and On-Call opportunities dispatched to this institution
router.get('/ojt-offers', async (req, res) => {
  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    const [offers] = await pool.query(
      `SELECT ija.*, 
              jp.title, jp.description, jp.requirements, jp.deliverables, jp.location, jp.workplace_area,
              jp.flyer_image_url, jp.slots_available, jp.posting_type, jp.job_type, jp.work_setup,
              jp.start_time, jp.finish_time, jp.on_call_days, jp.salary_rate, jp.salary_rate_type, jp.target_audience,
              jp.created_at as job_created_at, jp.posted_at, jp.expires_at,
              ho.organization_name, ho.business_structure, ho.industry, ho.contact_email, ho.contact_phone, ho.website,
              ho.address as org_address, ho.city as org_city, ho.province as org_province, ho.sec_dti_number, ho.bir_tin,
              ho.google_map_link,
              os.first_name as mentor_first_name, os.last_name as mentor_last_name,
              os.job_title as mentor_job_title, os.department as mentor_department,
              os.contact_number as mentor_contact, os.staff_number as mentor_staff_number
       FROM institution_job_approvals ija
       JOIN job_postings jp ON ija.job_id = jp.job_id
       JOIN hiring_organizations ho ON jp.organization_id = ho.organization_id
       LEFT JOIN organization_staff os ON jp.mentor_id = os.org_staff_id
       WHERE ija.institution_id = ?
       ORDER BY ija.created_at DESC`,
      [inst.institution_id]
    );

    const jobIds = offers.map(o => o.job_id);
    let programsMap = {};
    if (jobIds.length > 0) {
      const [targetPrograms] = await pool.query(
        `SELECT jrp.job_id, MIN(p.program_id) as program_id, TRIM(p.program_name) as program_name, TRIM(p.program_code) as program_code
         FROM job_required_programs jrp
         JOIN programs p ON jrp.program_id = p.program_id
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

    const enrichedOffers = offers.map(o => ({
      ...o,
      target_programs: programsMap[o.job_id] || []
    }));

    const scope = await getStaffProgramScope(req.user.user_id, req.user.role, inst.institution_id);
    const finalOffers = scope.isRestricted
      ? enrichedOffers.filter(o => o.target_programs.length === 0 || o.target_programs.some(tp => isProgramAllowed(scope, tp.program_id)))
      : enrichedOffers;

    return res.json({ success: true, data: finalOffers, staff_scope: scope });
  } catch (error) {
    console.error('Fetch OJT offers error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch OJT offers.' });
  }
});

// PUT /api/inst/ojt-offers/:id - Accept or reject an OJT offer
router.put('/ojt-offers/:id', async (req, res) => {
  const { approval_status } = req.body; // 'approved' or 'rejected'

  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    await pool.query(
      `UPDATE institution_job_approvals 
       SET approval_status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP 
       WHERE approval_id = ? AND institution_id = ?`,
      [approval_status, req.user.user_id, req.params.id, inst.institution_id]
    );

    emitUpdate('ojt_offer_updated', { institution_id: inst.institution_id, approval_id: req.params.id, approval_status });

    return res.json({ success: true, message: `OJT offer ${approval_status}.` });
  } catch (error) {
    console.error('Update OJT offer status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update OJT offer.' });
  }
});

// POST /api/inst/students/access-code - Generate program-level shared access code for student registration
router.post('/students/access-code', async (req, res) => {
  const {
    program_id,
    expiration_date,
    validity_days,
    force,
    supersede,
    intended_classification,
    intended_status,
    assigned_staff_id
  } = req.body;

  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    // ── 1. Determine and Validate Target Program ──
    let targetProgramId = program_id ? parseInt(program_id, 10) : null;
    let intendedDepartment = null;

    const scope = await getStaffProgramScope(req.user.user_id, req.user.role, inst.institution_id);
    if (scope.isRestricted) {
      if (scope.isDean) {
        if (targetProgramId && !isProgramAllowed(scope, targetProgramId)) {
          return res.status(403).json({
            success: false,
            message: `Access Denied: Program does not belong to your assigned department (${scope.department}).`
          });
        }
        if (!targetProgramId && scope.programIds.length > 0) {
          targetProgramId = scope.programIds[0];
        }
        intendedDepartment = scope.department;
      } else {
        if (targetProgramId && targetProgramId !== scope.programId) {
          return res.status(403).json({
            success: false,
            message: `Access Denied: You are assigned to ${scope.program?.program_name || 'your degree program'} and can ONLY generate access codes for your assigned program.`
          });
        }
        targetProgramId = scope.programId;
        intendedDepartment = scope.program?.department || null;
      }
    }

    if (!targetProgramId) {
      return res.status(400).json({ success: false, message: 'Please select an academic degree program to generate an access code.' });
    }

    // Verify program exists under this institution
    const [progRows] = await pool.query(
      'SELECT program_id, program_name, program_code, department FROM programs WHERE program_id = ? AND institution_id = ?',
      [targetProgramId, inst.institution_id]
    );
    if (progRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Program not found in this institution.' });
    }
    const prog = progRows[0];
    intendedDepartment = prog.department || intendedDepartment;

    // ── 2. Determine Expiration Date ──
    let expiresAt;
    if (expiration_date) {
      const parsed = new Date(expiration_date);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid expiration date provided.' });
      }
      // If date only (e.g. YYYY-MM-DD), set to end of day 23:59:59
      if (typeof expiration_date === 'string' && expiration_date.length === 10) {
        parsed.setHours(23, 59, 59, 999);
      }
      if (parsed <= new Date()) {
        return res.status(400).json({ success: false, message: 'Expiration date must be in the future.' });
      }
      expiresAt = parsed;
    } else if (validity_days) {
      const days = parseInt(validity_days, 10);
      if (isNaN(days) || days < 1) {
        return res.status(400).json({ success: false, message: 'Validity days must be a positive integer.' });
      }
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    } else {
      // Default: 14 days
      expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    }

    const formattedExpiresAt = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

    // ── 3. Determine Assigned OJT Supervisor / Adviser if starting_ojt ──
    let targetStaffId = null;
    let supervisorInfo = null;
    const studentStatus = intended_status || 'starting_ojt';

    if (studentStatus === 'starting_ojt') {
      if (assigned_staff_id) {
        const [sRows] = await pool.query(
          `SELECT staff_id, first_name, last_name, position, department, employee_id
           FROM institution_staff
           WHERE staff_id = ? AND institution_id = ? AND is_active = 1
             AND position IN ('ojt_supervisor', 'ojt_coordinator', 'Internship Practicum Supervisor', 'College OJT Coordinator')`,
          [assigned_staff_id, inst.institution_id]
        );
        if (sRows.length > 0) {
          targetStaffId = sRows[0].staff_id;
          supervisorInfo = sRows[0];
        }
      }

      // If not explicitly provided, check if department/program has exactly 1 supervisor and auto-assign
      if (!targetStaffId) {
        const [deptSups] = await pool.query(
          `SELECT staff_id, first_name, last_name, position, department, employee_id
           FROM institution_staff
           WHERE institution_id = ?
             AND position IN ('ojt_supervisor', 'ojt_coordinator', 'Internship Practicum Supervisor', 'College OJT Coordinator')
             AND is_active = 1
             AND (program_id = ? OR department = ?)`,
          [inst.institution_id, targetProgramId, intendedDepartment]
        );
        if (deptSups.length === 1) {
          targetStaffId = deptSups[0].staff_id;
          supervisorInfo = deptSups[0];
        }
      }
    }

    // ── 4. Check for existing active code for this program (Late registration / renewal check) ──
    const [activeCodes] = await pool.query(
      `SELECT code_id, code_hash, expires_at, created_at
       FROM access_codes
       WHERE program_id = ? AND institution_id = ? AND recipient_type = 'student'
         AND is_used = 0 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [targetProgramId, inst.institution_id]
    );

    const isForce = Boolean(force || supersede);

    if (activeCodes.length > 0 && !isForce) {
      const active = activeCodes[0];
      const activeExp = new Date(active.expires_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      return res.status(409).json({
        success: false,
        requires_confirmation: true,
        message: `An active access code [${active.code_hash}] already exists for ${prog.program_name} (${prog.program_code || ''}), valid until ${activeExp}. Generating a new access code will supersede the current code for late registrations. Confirm to proceed.`,
        data: {
          existing_code: active.code_hash,
          expires_at: active.expires_at,
          program_id: targetProgramId,
          program_name: prog.program_name,
          program_code: prog.program_code
        }
      });
    }

    // If superseding an active code, deactivate previous active codes for this program
    if (activeCodes.length > 0 && isForce) {
      await pool.query(
        `UPDATE access_codes
         SET is_used = 1, used_at = NOW()
         WHERE program_id = ? AND institution_id = ? AND recipient_type = 'student'
           AND is_used = 0 AND expires_at > NOW()`,
        [targetProgramId, inst.institution_id]
      );
    }

    // ── 5. Generate Program Access Code ──
    const cleanProgCode = (prog.program_code || 'PROG').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const codeRaw = `INST-${cleanProgCode}-${rand}`;

    await pool.query(
      `INSERT INTO access_codes (
        code_hash, recipient_type, institution_id, program_id, assigned_staff_id, target_identifier,
        intended_department, intended_classification, intended_status, created_by, expires_at, is_used
      ) VALUES (?, 'student', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        codeRaw,
        inst.institution_id,
        targetProgramId,
        targetStaffId,
        cleanProgCode || 'PROGRAM_STUDENTS',
        intendedDepartment,
        intended_classification || 'regular',
        studentStatus,
        req.user.user_id,
        formattedExpiresAt
      ]
    );

    emitUpdate('access_code_generated', {
      institution_id: inst.institution_id,
      program_id: targetProgramId,
      type: 'student'
    });

    const supervisorMsg = supervisorInfo
      ? ` with assigned OJT Supervisor/Adviser ${supervisorInfo.first_name} ${supervisorInfo.last_name}`
      : '';

    return res.status(201).json({
      success: true,
      message: `Program Access Code [${codeRaw}] generated for ${prog.program_name} (${prog.program_code})${supervisorMsg}!`,
      data: {
        access_code: codeRaw,
        program_id: targetProgramId,
        program_name: prog.program_name,
        program_code: prog.program_code,
        intended_department: intendedDepartment,
        assigned_staff_id: targetStaffId,
        supervisor_name: supervisorInfo ? `${supervisorInfo.first_name} ${supervisorInfo.last_name}` : null,
        supervisor_position: supervisorInfo?.position || null,
        expires_at: formattedExpiresAt,
        recipient_type: 'student',
        is_superseded_previous: Boolean(activeCodes.length > 0 && isForce)
      }
    });
  } catch (error) {
    console.error('Generate student program access code error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate program access code.' });
  }
});

// GET /api/inst/access-codes
router.get('/access-codes', async (req, res) => {
  try {
    const inst = await getInstId(req.user.user_id);
    if (!inst) return res.status(404).json({ success: false, message: 'Institution not found.' });

    let sql = `SELECT ac.*, u.email as used_by_email, p.program_name, p.program_code, p.department as program_department,
                      isf.first_name as supervisor_first_name, isf.last_name as supervisor_last_name,
                      isf.position as supervisor_position, isf.employee_id as supervisor_employee_id,
                      (SELECT COUNT(*) FROM students s WHERE s.passcode_used = ac.code_hash) as registered_count
       FROM access_codes ac
       LEFT JOIN users u ON ac.used_by_user_id = u.user_id
       LEFT JOIN programs p ON ac.program_id = p.program_id
       LEFT JOIN institution_staff isf ON ac.assigned_staff_id = isf.staff_id
       WHERE ac.institution_id = ?`;
    const params = [inst.institution_id];

    if (req.user.role === 'institution_staff') {
      const [staffRows] = await pool.query(
        'SELECT ist.program_id, ist.department, p.department as prog_dept FROM institution_staff ist LEFT JOIN programs p ON ist.program_id = p.program_id WHERE ist.user_id = ?',
        [req.user.user_id]
      );
      if (staffRows.length > 0) {
        const staff = staffRows[0];
        const dept = staff.department || staff.prog_dept;
        if (staff.program_id || dept) {
          sql += ' AND (ac.program_id = ? OR (ac.intended_department IS NOT NULL AND ac.intended_department = ?) OR ac.created_by = ?)';
          params.push(staff.program_id, dept, req.user.user_id);
        }
      }
    }

    sql += ' ORDER BY ac.created_at DESC';
    const [codes] = await pool.query(sql, params);

    return res.json({ success: true, data: codes });
  } catch (error) {
    console.error('Fetch access codes error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch access codes.' });
  }
});

export default router;
