import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';
import { emitUpdate } from '../config/socket.js';
import { sendNotification } from '../utils/notification.helper.js';
import { createSession, revokeSession, getSessionCookieOptions } from '../utils/session.js';

const router = express.Router();

import { getUploadStorage, saveUploadedFile } from '../utils/upload.helper.js';

const documentFileFilter = (req, file, cb) => {
  const allowedExtensions = /pdf|doc|docx|xls|xlsx|jpg|jpeg|png|webp/;
  const ext = path.extname(file.originalname).toLowerCase().replace(/^\./, '');
  if (allowedExtensions.test(ext)) {
    return cb(null, true);
  }
  cb(new Error('Invalid file type. Only PDF, Word documents, Excel sheets, and images are permitted.'));
};

const orgUpload = multer({
  storage: getUploadStorage('orgs'),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit per file
  fileFilter: documentFileFilter
}).fields([
  { name: 'sec_dti_file', maxCount: 1 },
  { name: 'mayors_permit_file', maxCount: 1 },
  { name: 'bir_tin_file', maxCount: 1 },
  { name: 'dole_file', maxCount: 1 },
  { name: 'other_doc_file', maxCount: 1 }
]);

const instUpload = multer({
  storage: getUploadStorage('institutions'),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit per file
  fileFilter: documentFileFilter
}).fields([
  { name: 'accreditation_file', maxCount: 1 },
  { name: 'other_doc_file', maxCount: 1 }
]);

// Helper to generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'internconph_jwt_secret_2026_super_key', {
    expiresIn: '7d'
  });
};

/**
 * Validates whether a phone number adheres to Philippine standards.
 * Mobile: +63 9XX XXX XXXX (10 digits starting with 9)
 * Landline (optional): Area code + 7-8 digits
 */
export function validatePhPhoneNumber(phone, allowLandline = false) {
  if (!phone || !String(phone).trim()) return { valid: true, normalized: null };
  const raw = String(phone).trim();
  const digits = raw.replace(/\D/g, '');

  let mobileDigits = null;
  if (digits.length === 10 && digits.startsWith('9')) {
    mobileDigits = digits;
  } else if (digits.length === 11 && digits.startsWith('09')) {
    mobileDigits = digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith('639')) {
    mobileDigits = digits.slice(2);
  }

  if (mobileDigits) {
    const formatted = `+63 ${mobileDigits.slice(0, 3)} ${mobileDigits.slice(3, 6)} ${mobileDigits.slice(6)}`;
    return { valid: true, type: 'mobile', normalized: formatted };
  }

  if (allowLandline) {
    if (digits.length >= 8 && digits.length <= 12) {
      return { valid: true, type: 'landline', normalized: raw };
    }
  }

  return { valid: false, normalized: null };
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const [users] = await pool.query(
      `SELECT u.user_id, u.email, u.avatar_url, u.display_name, u.password_hash, u.is_active, u.is_verified, r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.email = ?`,
      [email.trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated or rejected. Please contact support.'
      });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Role-specific payload details
    let roleData = {
      user_id: user.user_id,
      email: user.email,
      avatar_url: user.avatar_url || null,
      display_name: user.display_name || null,
      role: user.role_name,
      role_name: user.role_name,
      is_verified: user.is_verified,
      student_id: null,
      org_id: null,
      institution_id: null,
      position: null,
      permissions: null,
      full_name: user.display_name || user.email
    };

    if (user.role_name === 'student') {
      const [students] = await pool.query(
        `SELECT s.*, p.program_name, p.program_code, i.institution_name, i.status AS inst_status,
                sr.status AS reg_status
         FROM students s
         LEFT JOIN programs p ON s.program_id = p.program_id
         LEFT JOIN institutions i ON s.institution_id = i.institution_id
         LEFT JOIN student_registrations sr ON s.student_id = sr.student_id
         WHERE s.user_id = ?
         ORDER BY sr.registration_id DESC
         LIMIT 1`,
        [user.user_id]
      );
      if (students.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Student account record not found. Please contact your institution coordinator.'
        });
      }

      const s = students[0];
      roleData.student_id = s.student_id;
      roleData.institution_id = s.institution_id;
      roleData.program_id = s.program_id;
      roleData.program_name = s.program_name;
      roleData.classification = s.classification;
      roleData.ojt_status = s.ojt_status;
      roleData.full_name = `${s.first_name} ${s.last_name}`;

      // Block login if institution is deactivated, suspended, or rejected
      if (s.inst_status === 'deactivated' || s.inst_status === 'suspended' || s.inst_status === 'rejected') {
        return res.status(403).json({
          success: false,
          message: `Your institution (${s.institution_name || 'Institution'}) has been ${s.inst_status}. Student portal access is temporarily unavailable.`
        });
      }

      // Block login if student account was rejected or deactivated
      if (s.reg_status === 'rejected' || !s.is_active || user.is_active === 0) {
        return res.status(403).json({
          success: false,
          message: 'Your student registration was rejected or your account has been deactivated by your institution.'
        });
      }

      // Block login if student is not verified yet by their institution coordinator or registrar
      if (!s.is_verified || user.is_verified === 0 || s.reg_status === 'pending') {
        return res.status(403).json({
          success: false,
          message: 'Your student account is pending approval by your institution coordinator or registrar. You cannot log in until your account has been verified and approved.'
        });
      }
    } else if (user.role_name === 'hiring_organization') {
      const [orgs] = await pool.query(
        `SELECT ho.* FROM hiring_organizations ho
         JOIN organization_registrations oreg ON ho.organization_id = oreg.organization_id
         WHERE oreg.submitted_by = ?`,
        [user.user_id]
      );
      if (orgs.length > 0) {
        const org = orgs[0];
        roleData.org_id = org.organization_id;
        roleData.full_name = org.organization_name;

        // Block login if org is deactivated, suspended, or rejected
        if (org.status === 'deactivated' || org.status === 'suspended' || org.status === 'rejected') {
          return res.status(403).json({
            success: false,
            message: org.status === 'suspended'
              ? 'Your organization account has been suspended by the System Administrator.'
              : 'Your organization account has been deactivated or rejected by the System Administrator.'
          });
        }
        // Block login if org is still pending admin verification
        if (org.status === 'pending') {
          return res.status(403).json({
            success: false,
            message: 'Your organization account is still pending verification by the System Administrator.'
          });
        }
      }
    } else if (user.role_name === 'institution') {
      const [insts] = await pool.query(
        `SELECT i.* FROM institutions i
         JOIN institution_registrations ireg ON i.institution_id = ireg.institution_id
         WHERE ireg.submitted_by = ?`,
        [user.user_id]
      );
      if (insts.length > 0) {
        const inst = insts[0];
        roleData.institution_id = inst.institution_id;
        roleData.full_name = inst.institution_name;
        roleData.position = 'director';

        if (inst.status === 'deactivated' || inst.status === 'suspended' || inst.status === 'rejected') {
          return res.status(403).json({
            success: false,
            message: `Your institution account has been ${inst.status} by the System Administrator.`
          });
        }
        if (inst.status === 'pending') {
          return res.status(403).json({
            success: false,
            message: 'Your institution account is still pending verification by the System Administrator.'
          });
        }
      }
    } else if (user.role_name === 'institution_staff') {
      const [staffRows] = await pool.query(
        `SELECT ist.*, i.status as inst_status, i.institution_name, p.program_name, p.program_code,
                COALESCE(ist.department, p.department) as resolved_department
         FROM institution_staff ist
         JOIN institutions i ON ist.institution_id = i.institution_id
         LEFT JOIN programs p ON ist.program_id = p.program_id
         WHERE ist.user_id = ?`,
        [user.user_id]
      );
      if (staffRows.length > 0) {
        const staff = staffRows[0];
        roleData.institution_id = staff.institution_id;
        roleData.staff_id = staff.staff_id;
        roleData.position = staff.position;
        roleData.program_id = staff.program_id;
        roleData.program_name = staff.program_name;
        roleData.department = staff.resolved_department || staff.department || null;
        roleData.full_name = `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || staff.institution_name;
        try {
          roleData.permissions = typeof staff.permissions === 'string' ? JSON.parse(staff.permissions) : staff.permissions;
        } catch {
          roleData.permissions = null;
        }

        if (staff.inst_status === 'deactivated' || staff.inst_status === 'suspended' || staff.inst_status === 'rejected') {
          return res.status(403).json({
            success: false,
            message: `Your institution (${staff.institution_name}) has been ${staff.inst_status}. Staff access is temporarily unavailable.`
          });
        }

        if (!staff.is_verified || user.is_verified === 0) {
          return res.status(403).json({
            success: false,
            message: 'Your staff account is currently pending verification by the Institution Director.'
          });
        }
      }
    }

    // Also check if user is in organization_staff (Workplace Mentor or HR Staff)
    const [orgStaffRows] = await pool.query(
      `SELECT os.*, ho.status as org_status, ho.organization_name
       FROM organization_staff os
       JOIN hiring_organizations ho ON os.organization_id = ho.organization_id
       WHERE os.user_id = ?`,
      [user.user_id]
    );
    if (orgStaffRows.length > 0) {
      const parentOrg = orgStaffRows[0];
      roleData.org_id = parentOrg.organization_id;
      roleData.full_name = `${parentOrg.first_name} ${parentOrg.last_name}`;

      if (parentOrg.position === 'workplace_mentor' || parentOrg.position === 'mentor') {
        roleData.role = 'workplace_mentor';
        roleData.role_name = 'workplace_mentor';
        roleData.position = 'workplace_mentor';

        if (!parentOrg.is_verified || user.is_verified === 0) {
          return res.status(403).json({
            success: false,
            message: 'Your Workplace Mentor account is pending verification and approval by HR.'
          });
        }
      } else if (parentOrg.position === 'hr_staff' || parentOrg.position === 'hr') {
        roleData.role = 'hr_staff';
        roleData.role_name = 'hr_staff';
        roleData.position = 'hr_staff';
      }

      if (parentOrg.org_status === 'deactivated' || parentOrg.org_status === 'suspended' || parentOrg.org_status === 'rejected') {
        return res.status(403).json({
          success: false,
          message: `Your organization (${parentOrg.organization_name}) has been ${parentOrg.org_status}.`
        });
      }
    }

    // Update last_login_at
    await pool.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE user_id = ?', [user.user_id]);

    // Log login event in audit trail
    const rawIp = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
    const clientIp = (typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '127.0.0.1').substring(0, 45);
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, created_at)
       VALUES (?, 'user_login', 'users', ?, ?, ?, CURRENT_TIMESTAMP)`,
      [user.user_id, user.user_id, JSON.stringify({ role: roleData.role_name || roleData.role, email: user.email }), clientIp]
    ).catch(e => console.error('[Audit Log Error on Login]', e.message));

    // Ensure latest avatar and display name are preserved on returned user object
    roleData.avatar_url = user.avatar_url || null;
    roleData.display_name = user.display_name || null;

    // Session Rotation & Multi-Login Conflict Protection:
    // If this client had an existing session cookie from a previous user, revoke it immediately
    if (req.cookies && req.cookies.interncon_session) {
      await revokeSession(req.cookies.interncon_session, 'session_rotation');
    }

    // Create server-side session and persist to database
    const session = await createSession({
      userId: user.user_id,
      req
    });

    // Set secure HttpOnly cookie
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie('interncon_session', session.rawToken, cookieOptions);

    // Generate JWT token as well for dual compatibility / API clients
    const token = generateToken({
      ...roleData,
      session_id: session.sessionId
    });

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      session_token: session.rawToken,
      session_id: session.sessionId,
      user: roleData
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    let token = null;
    if (req.cookies && req.cookies.interncon_session) {
      token = req.cookies.interncon_session;
    } else if (req.headers['authorization'] && req.headers['authorization'].startsWith('Bearer ')) {
      token = req.headers['authorization'].split(' ')[1];
    }

    if (token) {
      // Invalidate server-side session in database
      await revokeSession(token, 'logout');

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'internconph_jwt_secret_2026_super_key');
        if (decoded && decoded.user_id) {
          const rawIp = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
          const clientIp = (typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '127.0.0.1').substring(0, 45);
          await pool.query(
            `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, created_at)
             VALUES (?, 'user_logout', 'users', ?, ?, ?, CURRENT_TIMESTAMP)`,
            [decoded.user_id, decoded.user_id, JSON.stringify({ email: decoded.email, role: decoded.role }), clientIp]
          ).catch(e => console.error('[Audit Log Error on Logout]', e.message));
        }
      } catch (_) {
        // Fallback for non-jwt session token
      }
    }

    // Clear session cookie
    res.clearCookie('interncon_session', getSessionCookieOptions(req));

    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    res.clearCookie('interncon_session', getSessionCookieOptions(req));
    return res.json({ success: true, message: 'Logged out successfully.' });
  }
});

// Handler for GET /me and GET /session
const getSessionProfileHandler = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const user = req.user;
    let details = {};

    if (user.role_name === 'student') {
      const [rows] = await pool.query(
        `SELECT s.*, p.program_name, p.program_code, i.institution_name, i.status AS inst_status,
                sr.status AS reg_status
         FROM students s
         LEFT JOIN programs p ON s.program_id = p.program_id
         LEFT JOIN institutions i ON s.institution_id = i.institution_id
         LEFT JOIN student_registrations sr ON s.student_id = sr.student_id
         WHERE s.user_id = ?
         ORDER BY sr.registration_id DESC
         LIMIT 1`,
        [user.user_id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Student record not found.' });
      }
      const s = rows[0];
      if (s.inst_status === 'deactivated' || s.inst_status === 'suspended' || s.inst_status === 'rejected') {
        return res.status(403).json({
          success: false,
          message: 'Institution access is restricted. Student portal access is temporarily unavailable.'
        });
      }
      if (s.reg_status === 'rejected' || !s.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Your student registration was rejected or your account has been deactivated.'
        });
      }
      if (!s.is_verified || s.reg_status === 'pending') {
        return res.status(403).json({
          success: false,
          message: 'Your student account is pending approval by your institution coordinator or registrar.'
        });
      }
      details = s;
    } else if (user.role_name === 'hiring_organization') {
      const [rows] = await pool.query(
        `SELECT ho.* FROM hiring_organizations ho
         JOIN organization_registrations oreg ON ho.organization_id = oreg.organization_id
         WHERE oreg.submitted_by = ?`,
        [user.user_id]
      );
      if (rows.length > 0) details = rows[0];
    } else if (user.role_name === 'workplace_mentor' || user.role_name === 'hr_staff') {
      const [rows] = await pool.query(
        `SELECT os.*, ho.organization_name, ho.industry
         FROM organization_staff os
         JOIN hiring_organizations ho ON os.organization_id = ho.organization_id
         WHERE os.user_id = ?`,
        [user.user_id]
      );
      if (rows.length > 0) details = rows[0];
    } else if (user.role_name === 'institution') {
      const [rows] = await pool.query(
        `SELECT i.* FROM institutions i
         JOIN institution_registrations ireg ON i.institution_id = ireg.institution_id
         WHERE ireg.submitted_by = ?`,
        [user.user_id]
      );
      if (rows.length > 0) details = rows[0];
    } else if (user.role_name === 'institution_staff') {
      const [rows] = await pool.query(
        `SELECT ist.*, i.institution_name, i.institution_code, p.program_name, p.program_code,
                COALESCE(ist.department, p.department) as department
         FROM institution_staff ist
         JOIN institutions i ON ist.institution_id = i.institution_id
         LEFT JOIN programs p ON ist.program_id = p.program_id
         WHERE ist.user_id = ?`,
        [user.user_id]
      );
      if (rows.length > 0) {
        details = rows[0];
        try {
          details.permissions = typeof details.permissions === 'string' ? JSON.parse(details.permissions) : details.permissions;
        } catch {
          // Keep raw
        }
      }
    }

    return res.json({
      success: true,
      user: {
        ...user,
        role: user.role_name,
        details
      },
      session: {
        session_id: req.sessionId,
        user_id: user.user_id,
        role: user.role_name
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

router.get('/me', verifyToken, getSessionProfileHandler);
router.get('/session', verifyToken, getSessionProfileHandler);

// GET /api/auth/socket-token & /api/socket-token - 12h JWT for Cross-Origin WebSockets
router.get('/socket-token', verifyToken, (req, res) => {
  const user = req.user;
  const token = jwt.sign(
    {
      user_id: user.user_id,
      role: user.role_name || user.role,
      role_name: user.role_name || user.role,
      institution_id: user.institution_id || null,
      org_id: user.org_id || null,
      student_id: user.student_id || null
    },
    process.env.JWT_SECRET || 'internconph_jwt_secret_2026_super_key',
    { expiresIn: '12h' }
  );

  return res.json({ success: true, token });
});

// POST /api/auth/register/student (Student via Institution Passcode)
router.post('/register/student', async (req, res) => {
  const {
    access_code,
    first_name,
    middle_name,
    last_name,
    student_number,
    institution_id,
    program_id,
    classification,
    ojt_status,
    email,
    contact_number,
    password,
    address
  } = req.body;

  if (!access_code || !first_name || !last_name || !student_number || !email || !password) {
    return res.status(400).json({ success: false, message: 'Institution Passcode, Student ID, Name, Email, and Password are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
  }

  let normalizedContact = null;
  if (contact_number && String(contact_number).trim()) {
    const phoneCheck = validatePhPhoneNumber(contact_number, false);
    if (!phoneCheck.valid) {
      return res.status(400).json({
        success: false,
        message: 'Contact Phone must be a valid 10-digit Philippine mobile number starting with 9 (e.g., +63 917 123 4567).'
      });
    }
    normalizedContact = phoneCheck.normalized;
  }

  const cleanAccessCode = access_code.trim().toUpperCase();
  const cleanStudentId = student_number.trim().toUpperCase();

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

    // 1. Check email uniqueness & clean up any unverified/rejected user
    const [existing] = await connection.query('SELECT user_id, is_verified FROM users WHERE email = ?', [email.trim()]);
    if (existing.length > 0) {
      const oldUser = existing[0];
      if (oldUser.is_verified === 1) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ success: false, message: 'This email is already registered and verified.' });
      } else {
        await connection.query("DELETE FROM student_registrations WHERE student_id IN (SELECT student_id FROM students WHERE user_id = ?)", [oldUser.user_id]);
        await connection.query("DELETE FROM entity_registrations WHERE user_id = ?", [oldUser.user_id]);
        await connection.query("DELETE FROM students WHERE user_id = ?", [oldUser.user_id]);
        await connection.query("DELETE FROM users WHERE user_id = ?", [oldUser.user_id]);
      }
    }

    // 2. Validate student access code strictly
    const [codes] = await connection.query(
      `SELECT ac.*, p.program_name, p.program_code 
       FROM access_codes ac
       LEFT JOIN programs p ON ac.program_id = p.program_id
       WHERE ac.code_hash = ? AND ac.recipient_type = 'student'`,
      [cleanAccessCode]
    );

    if (codes.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'Invalid Institution Student Access Code. Please verify the code provided by your institution.'
      });
    }

    const codeRecord = codes[0];

    // Check expiration date
    if (new Date(codeRecord.expires_at) <= new Date()) {
      await connection.rollback();
      connection.release();
      const expFormatted = new Date(codeRecord.expires_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      return res.status(400).json({
        success: false,
        message: `This program access code expired on ${expFormatted}. Registration is currently closed. Please contact your Program Coordinator or Department Head to request a late registration access code.`
      });
    }

    // Check if code was superseded/deactivated
    if (codeRecord.is_used === 1) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'This access code is no longer active or has been superseded. Please contact your Program Coordinator for the latest active program access code.'
      });
    }

    // 3. Determine if code is program-level shared code vs individual code
    const isProgramShared = Boolean(
      codeRecord.program_id && (
        codeRecord.target_identifier === 'PROGRAM_STUDENTS' ||
        codeRecord.target_identifier === codeRecord.program_code ||
        !codeRecord.target_identifier
      )
    );

    // Verify Student ID matches target identifier ONLY if individual code
    if (!isProgramShared && codeRecord.target_identifier && cleanStudentId) {
      const expectedId = codeRecord.target_identifier.trim().toUpperCase();
      if (expectedId !== cleanStudentId) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: `Student ID "${student_number}" does not match the individual passcode invitation (expected ${codeRecord.target_identifier}). Registration rejected.`
        });
      }
    }

    const instId = codeRecord.institution_id || institution_id;
    let progId = codeRecord.program_id || program_id || null;
    const studentClassification = classification || codeRecord.intended_classification || 'regular';
    const studentOjtStatus = ojt_status || codeRecord.intended_status || 'starting_ojt';

    if (codeRecord.program_id) {
      if (program_id && String(program_id) !== String(codeRecord.program_id)) {
        const [progRows] = await connection.query('SELECT program_name, program_code FROM programs WHERE program_id = ?', [codeRecord.program_id]);
        const progLabel = progRows.length > 0 ? `${progRows[0].program_name} (${progRows[0].program_code})` : 'its assigned department program';
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: `This passcode was issued specifically for ${progLabel}. Registration must match the program assigned to this passcode.`
        });
      }
      progId = codeRecord.program_id;
    }

    if (!instId) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: 'Institution assignment is missing from access passcode.' });
    }

    // 4. Clean up any existing unverified student record with this Student ID
    const [existingStudent] = await connection.query(
      'SELECT student_id, user_id, is_verified FROM students WHERE institution_id = ? AND student_number = ?',
      [instId, cleanStudentId]
    );

    if (existingStudent.length > 0) {
      const oldStu = existingStudent[0];
      if (oldStu.is_verified === 1) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: `Student ID "${student_number}" is already registered and verified under this institution.`
        });
      } else {
        await connection.query('DELETE FROM student_registrations WHERE student_id = ?', [oldStu.student_id]);
        await connection.query("DELETE FROM entity_registrations WHERE entity_type = 'student' AND entity_id = ?", [oldStu.student_id]);
        await connection.query('DELETE FROM student_staff_assignments WHERE student_id = ?', [oldStu.student_id]);
        await connection.query('DELETE FROM student_skills WHERE student_id = ?', [oldStu.student_id]);
        await connection.query('DELETE FROM student_documents WHERE student_id = ?', [oldStu.student_id]);
        await connection.query('DELETE FROM student_resumes WHERE student_id = ?', [oldStu.student_id]);
        await connection.query('DELETE FROM student_portfolios WHERE student_id = ?', [oldStu.student_id]);
        await connection.query('DELETE FROM notifications WHERE user_id = ?', [oldStu.user_id]);
        await connection.query('DELETE FROM audit_logs WHERE user_id = ?', [oldStu.user_id]);
        await connection.query('DELETE FROM students WHERE student_id = ?', [oldStu.student_id]);
        await connection.query('DELETE FROM users WHERE user_id = ? AND is_verified = 0', [oldStu.user_id]);
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Get student role_id
    const [roles] = await connection.query("SELECT role_id FROM roles WHERE role_name = 'student' LIMIT 1");
    const roleId = roles[0].role_id;

    // 5. Insert user (pending verification)
    const [userRes] = await connection.query(
      'INSERT INTO users (role_id, email, password_hash, is_active, is_verified) VALUES (?, ?, ?, 1, 0)',
      [roleId, email.trim(), passwordHash]
    );
    const userId = userRes.insertId;

    // Resolve category_id based on student classification
    let catId = 1;
    let categorySearch = '%Regular%';
    if (studentClassification === 'returnee') {
      categorySearch = '%Returnee%';
    } else if (studentClassification === 'transferee') {
      categorySearch = '%Transferee%';
    }
    const [catRows] = await connection.query(
      'SELECT category_id FROM student_categories WHERE category_name LIKE ? LIMIT 1',
      [categorySearch]
    );
    if (catRows.length > 0) {
      catId = catRows[0].category_id;
    } else {
      const [firstCat] = await connection.query('SELECT category_id FROM student_categories LIMIT 1');
      if (firstCat.length > 0) catId = firstCat[0].category_id;
    }

    // Resolve status_id
    let statId = 1;
    const [statusRows] = await connection.query("SELECT status_id FROM student_statuses WHERE status_name = 'pending' LIMIT 1");
    if (statusRows.length > 0) {
      statId = statusRows[0].status_id;
    } else {
      const [firstStat] = await connection.query('SELECT status_id FROM student_statuses LIMIT 1');
      if (firstStat.length > 0) statId = firstStat[0].status_id;
    }

    // Resolve required OJT hours from the selected program if available
    let requiredHours = 600;
    if (progId) {
      const [progRows] = await connection.query('SELECT required_ojt_hours FROM programs WHERE program_id = ?', [progId]);
      if (progRows.length > 0 && progRows[0].required_ojt_hours) {
        requiredHours = parseInt(progRows[0].required_ojt_hours, 10);
      }
    }

    // 6. Insert student record
    const [studentRes] = await connection.query(
      `INSERT INTO students (
        user_id, institution_id, program_id, student_number,
        category_id, status_id, classification, ojt_status, passcode_used,
        first_name, middle_name, last_name, contact_number,
        required_ojt_hours, completed_ojt_hours, is_verified, is_active, address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 1, ?)`,
      [
        userId,
        instId,
        progId,
        cleanStudentId,
        catId,
        statId,
        studentClassification,
        studentOjtStatus,
        cleanAccessCode,
        first_name,
        middle_name || null,
        last_name,
        normalizedContact || null,
        requiredHours,
        address || null
      ]
    );
    const studentId = studentRes.insertId;

    // 7. Insert student_registration queue with routing notes
    let verificationNote = 'Standard OJT Student Verification';
    if (studentClassification === 'returnee' || studentClassification === 'transferee') {
      verificationNote = `Assigned to Registrar: Student is a ${studentClassification.toUpperCase()}`;
    } else if (studentOjtStatus === 'starting_ojt' || studentOjtStatus === 'ongoing_ojt') {
      verificationNote = 'Assigned to OJT Supervisor: Starting/Ongoing OJT Placement';
    } else if (studentOjtStatus === 'completed_ojt') {
      verificationNote = 'Assigned for OJT Completer Clearance';
    }

    const isClsMismatch = Boolean(
      codeRecord.intended_classification &&
      studentClassification &&
      codeRecord.intended_classification.toLowerCase().trim() !== studentClassification.toLowerCase().trim()
    );
    const isStatusMismatch = Boolean(
      codeRecord.intended_status &&
      studentOjtStatus &&
      codeRecord.intended_status.toLowerCase().trim() !== studentOjtStatus.toLowerCase().trim()
    );

    if (isClsMismatch || isStatusMismatch) {
      const mismatches = [];
      if (isClsMismatch) mismatches.push(`Classification (Passcode: ${codeRecord.intended_classification} vs Submitted: ${studentClassification})`);
      if (isStatusMismatch) mismatches.push(`OJT Status (Passcode: ${codeRecord.intended_status} vs Submitted: ${studentOjtStatus})`);
      verificationNote = `⚠️ Unmatched Data: ${mismatches.join('; ')}`;
    }

    await connection.query(
      `INSERT INTO student_registrations (student_id, status, verification_notes, submitted_at)
       VALUES (?, 'pending', ?, CURRENT_TIMESTAMP)`,
      [studentId, verificationNote]
    );

    // 8. Insert entity_registrations queue
    await connection.query(
      `INSERT INTO entity_registrations (entity_type, entity_id, user_id, status, submitted_at)
       VALUES ('student', ?, ?, 'pending', CURRENT_TIMESTAMP)`,
      [studentId, userId]
    );

    // 8.5. If an OJT supervisor/adviser was assigned to this access code, create student-staff assignment immediately
    if (codeRecord.assigned_staff_id) {
      const [staffCheck] = await connection.query(
        'SELECT staff_id FROM institution_staff WHERE staff_id = ? AND institution_id = ? AND is_active = 1',
        [codeRecord.assigned_staff_id, instId]
      );
      if (staffCheck.length > 0) {
        await connection.query(
          `INSERT INTO student_staff_assignments (student_id, staff_id, is_active, assigned_at)
           VALUES (?, ?, 1, CURRENT_TIMESTAMP)`,
          [studentId, codeRecord.assigned_staff_id]
        );
      }
    }

    // 9. If individual code, mark access code as used. If program-level shared code, leave active for other students!
    if (!isProgramShared) {
      await connection.query(
        'UPDATE access_codes SET is_used = 1, used_by_user_id = ?, used_at = NOW() WHERE code_id = ?',
        [userId, codeRecord.code_id]
      );
    }

    await connection.commit();
    connection.release();

    // Broadcast realtime event
    emitUpdate('student_registered', { institution_id: instId, student_id: studentId, user_id: userId });

    return res.status(201).json({
      success: true,
      message: 'Student account registered with Passcode! Your account is now pending review by your Institution Coordinator / Registrar.'
    });
  } catch (error) {
    try { await connection.rollback(); } catch (_) { }
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return res.status(409).json({ success: false, message: 'A student account with this email or student number already exists.' });
    }
    console.error('Student registration error:', error);
    return res.status(500).json({ success: false, message: 'Registration failed: ' + error.message });
  } finally {
    safeRelease();
  }
});

// POST /api/auth/register/organization
router.post('/register/organization', orgUpload, async (req, res) => {
  const {
    organization_name,
    business_structure,
    industry,
    website,
    address,
    contact_phone,
    email,
    password,
    sec_dti_number,
    bir_tin,
    mayors_permit_number,
    google_map_link
  } = req.body;

  if (!organization_name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Company name, email, and password are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
  }

  let normalizedOrgPhone = null;
  if (contact_phone && String(contact_phone).trim()) {
    const phoneCheck = validatePhPhoneNumber(contact_phone, true);
    if (!phoneCheck.valid) {
      return res.status(400).json({
        success: false,
        message: 'Contact Phone must be a valid Philippine mobile (+63 9XX...) or landline number.'
      });
    }
    normalizedOrgPhone = phoneCheck.normalized;
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

    const [existingUsers] = await connection.query('SELECT user_id, is_verified FROM users WHERE email = ?', [email.trim()]);
    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      if (existingUser.is_verified === 0) {
        const [linkedOrgs] = await connection.query(
          `SELECT organization_id FROM hiring_organizations WHERE contact_email = ? OR organization_id IN (
            SELECT organization_id FROM organization_registrations WHERE submitted_by = ?
          )`,
          [email.trim(), existingUser.user_id]
        );
        for (const lo of linkedOrgs) {
          await connection.query('DELETE FROM organization_documents WHERE organization_id = ?', [lo.organization_id]);
          await connection.query('DELETE FROM organization_registrations WHERE organization_id = ?', [lo.organization_id]);
          await connection.query('DELETE FROM entity_registrations WHERE entity_type = "organization" AND entity_id = ?', [lo.organization_id]);
          await connection.query('DELETE FROM hiring_organizations WHERE organization_id = ?', [lo.organization_id]);
        }
        await connection.query('DELETE FROM users WHERE user_id = ?', [existingUser.user_id]);
      } else {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ success: false, message: 'This email is already registered and verified.' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [roles] = await connection.query("SELECT role_id FROM roles WHERE role_name = 'hiring_organization'");
    const roleId = roles[0].role_id;

    // 1. Insert user
    const [userRes] = await connection.query(
      'INSERT INTO users (role_id, email, password_hash, is_active, is_verified) VALUES (?, ?, ?, 1, 0)',
      [roleId, email.trim(), passwordHash]
    );
    const userId = userRes.insertId;

    // 2. Insert hiring_organization
    const [orgRes] = await connection.query(
      `INSERT INTO hiring_organizations (
        organization_name, business_structure, industry, website, address, google_map_link,
        contact_email, contact_phone, sec_dti_number, bir_tin, mayors_permit_number, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        organization_name,
        business_structure || 'corporation',
        industry || 'Technology',
        website || null,
        address || null,
        google_map_link || null,
        email.trim(),
        normalizedOrgPhone || null,
        sec_dti_number || null,
        bir_tin || null,
        mayors_permit_number || null
      ]
    );
    const orgId = orgRes.insertId;

    // 3. Insert organization_registration
    await connection.query(
      "INSERT INTO organization_registrations (organization_id, submitted_by, status) VALUES (?, ?, 'pending')",
      [orgId, userId]
    );

    // 4. Save uploaded softcopy legal documents
    const docMapping = [
      {
        field: 'sec_dti_file',
        type: business_structure === 'sole_proprietorship' ? 'dti_registration' : 'sec_registration',
        name: business_structure === 'sole_proprietorship' ? 'DTI Certificate of Business Name Registration' : 'SEC Certificate of Registration'
      },
      {
        field: 'mayors_permit_file',
        type: 'business_permit',
        name: "Mayor's / Business Operating Permit"
      },
      {
        field: 'bir_tin_file',
        type: 'bir_registration',
        name: 'BIR Form 2303 Certificate of Registration (TIN Proof)'
      },
      {
        field: 'dole_file',
        type: 'dole_registration',
        name: 'DOLE Registration / Internship Clearance'
      },
      {
        field: 'other_doc_file',
        type: 'other',
        name: 'Additional Regulatory Proof Document'
      }
    ];

    if (req.files) {
      for (const item of docMapping) {
        if (req.files[item.field] && req.files[item.field][0]) {
          const file = req.files[item.field][0];
          const webPath = await saveUploadedFile(file, 'orgs');
          await connection.query(
            `INSERT INTO organization_documents (
              organization_id, document_type, document_name, file_path, file_name, verified, uploaded_at
            ) VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
            [orgId, item.type, item.name, webPath, file.originalname]
          );
        }
      }
    }

    await connection.commit();
    connection.release();

    emitUpdate('org_registered', { organization_id: orgId, user_id: userId });

    return res.status(201).json({
      success: true,
      message: 'Employer partner account and legal verification documents submitted! Pending review by Administrator.'
    });
  } catch (error) {
    try { await connection.rollback(); } catch (_) { }
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return res.status(409).json({ success: false, message: 'An organization with this email, name, or SEC/DTI number already exists.' });
    }
    console.error('Org registration error:', error);
    return res.status(500).json({ success: false, message: 'Registration failed: ' + error.message });
  } finally {
    safeRelease();
  }
});

// POST /api/auth/register/institution
router.post('/register/institution', instUpload, async (req, res) => {
  const {
    institution_name,
    institution_code,
    institution_type,
    website,
    address,
    contact_phone,
    email,
    password,
    accreditation_number,
    director_name,
    director_title,
    google_map_link
  } = req.body;

  if (!institution_name || !institution_code || !email || !password) {
    return res.status(400).json({ success: false, message: 'Institution name, code, email, and password are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
  }

  let normalizedInstPhone = null;
  if (contact_phone && String(contact_phone).trim()) {
    const phoneCheck = validatePhPhoneNumber(contact_phone, true);
    if (!phoneCheck.valid) {
      return res.status(400).json({
        success: false,
        message: 'Campus Phone must be a valid Philippine mobile (+63 9XX...) or landline number.'
      });
    }
    normalizedInstPhone = phoneCheck.normalized;
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

    const [existingUsers] = await connection.query('SELECT user_id, is_verified FROM users WHERE email = ?', [email.trim()]);
    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      if (existingUser.is_verified === 0) {
        const [linkedInsts] = await connection.query(
          `SELECT institution_id FROM institutions WHERE contact_email = ? OR institution_id IN (
            SELECT institution_id FROM institution_registrations WHERE submitted_by = ?
          )`,
          [email.trim(), existingUser.user_id]
        );
        for (const li of linkedInsts) {
          await connection.query('DELETE FROM institution_documents WHERE institution_id = ?', [li.institution_id]);
          await connection.query('DELETE FROM institution_registrations WHERE institution_id = ?', [li.institution_id]);
          await connection.query('DELETE FROM entity_registrations WHERE entity_type = "institution" AND entity_id = ?', [li.institution_id]);
          await connection.query('DELETE FROM institutions WHERE institution_id = ?', [li.institution_id]);
        }
        await connection.query('DELETE FROM users WHERE user_id = ?', [existingUser.user_id]);
      } else {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ success: false, message: 'This email is already registered and verified.' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [roles] = await connection.query("SELECT role_id FROM roles WHERE role_name = 'institution'");
    const roleId = roles[0].role_id;

    // 1. Insert user
    const [userRes] = await connection.query(
      'INSERT INTO users (role_id, email, password_hash, is_active, is_verified) VALUES (?, ?, ?, 1, 0)',
      [roleId, email.trim(), passwordHash]
    );
    const userId = userRes.insertId;

    // 2. Insert institution
    const [instRes] = await connection.query(
      `INSERT INTO institutions (
        institution_name, institution_code, institution_type, website, address, google_map_link,
        contact_email, contact_phone, accreditation_number, director_name, director_title, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        institution_name,
        institution_code,
        institution_type || 'university',
        website || null,
        address || null,
        google_map_link || null,
        email.trim(),
        normalizedInstPhone || null,
        accreditation_number || null,
        director_name || null,
        director_title || 'Institution Director / President'
      ]
    );
    const instId = instRes.insertId;

    // 3. Insert institution_registration
    await connection.query(
      "INSERT INTO institution_registrations (institution_id, submitted_by, status) VALUES (?, ?, 'pending')",
      [instId, userId]
    );

    // 4. Save uploaded softcopy legal documents
    if (req.files && req.files.accreditation_file && req.files.accreditation_file[0]) {
      const file = req.files.accreditation_file[0];
      const webPath = await saveUploadedFile(file, 'institutions');
      await connection.query(
        `INSERT INTO institution_documents (
          institution_id, document_type, document_name, file_path, file_name, verified, uploaded_at
        ) VALUES (?, 'accreditation_certificate', ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
        [
          instId,
          `CHED GR / TESDA CTPR / DepEd Permit (${accreditation_number || 'Official'})`,
          webPath,
          file.originalname
        ]
      );
    } else if (accreditation_number) {
      await connection.query(
        `INSERT INTO institution_documents (
          institution_id, document_type, document_name, file_path, file_name, verified, uploaded_at
        ) VALUES (?, 'accreditation_certificate', 'Government Permit (Self-Declared)', ?, 'Self-Declared-Record', 0, CURRENT_TIMESTAMP)`,
        [instId, `Ref: ${accreditation_number} (Self-Declared)`]
      );
    }

    if (req.files && req.files.other_doc_file && req.files.other_doc_file[0]) {
      const otherFile = req.files.other_doc_file[0];
      const otherWebPath = await saveUploadedFile(otherFile, 'institutions');
      await connection.query(
        `INSERT INTO institution_documents (
          institution_id, document_type, document_name, file_path, file_name, verified, uploaded_at
        ) VALUES (?, 'other', 'Additional Institutional Accreditation Proof', ?, ?, 0, CURRENT_TIMESTAMP)`,
        [instId, otherWebPath, otherFile.originalname]
      );
    }

    await connection.commit();
    connection.release();

    emitUpdate('inst_registered', { institution_id: instId, user_id: userId });

    return res.status(201).json({
      success: true,
      message: 'Institution registered successfully! Legal softcopy submitted for verification by Administrator.'
    });
  } catch (error) {
    try { await connection.rollback(); } catch (_) { }
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return res.status(409).json({ success: false, message: 'An institution with this email, name, or code already exists.' });
    }
    console.error('Institution registration error:', error);
    return res.status(500).json({ success: false, message: 'Registration failed: ' + error.message });
  } finally {
    safeRelease();
  }
});

// POST /api/auth/register/staff (Institution Staff via Director Passcode)
router.post('/register/staff', async (req, res) => {
  const {
    access_code,
    institution_id,
    program_id,
    title,
    first_name,
    middle_name,
    last_name,
    suffix,
    employee_id,
    staff_position,
    department_name,
    office_location,
    contact_number,
    email,
    password,
    address
  } = req.body;

  if (!access_code || !first_name || !last_name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Director Passcode, Staff Name, Email, and Password are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
  }

  let normalizedStaffContact = null;
  if (contact_number && String(contact_number).trim()) {
    const phoneCheck = validatePhPhoneNumber(contact_number, false);
    if (!phoneCheck.valid) {
      return res.status(400).json({
        success: false,
        message: 'Contact number must be a valid 10-digit Philippine mobile number starting with 9 (e.g., +63 917 123 4567).'
      });
    }
    normalizedStaffContact = phoneCheck.normalized;
  }

  const cleanAccessCode = access_code.trim().toUpperCase();
  const cleanStaffId = employee_id ? employee_id.trim().toUpperCase() : '';

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

    // 1. Check email uniqueness
    const [existing] = await connection.query('SELECT user_id FROM users WHERE email = ?', [email.trim()]);
    if (existing.length > 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: 'This email is already registered.' });
    }

    // 2. Validate access code
    const [codes] = await connection.query(
      `SELECT * FROM access_codes 
       WHERE code_hash = ? AND recipient_type = 'institution_staff' AND is_used = 0 AND expires_at > NOW()`,
      [cleanAccessCode]
    );

    if (codes.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'Invalid, already used, or expired Director-Issued Access Passcode. No registration record was created for this institution.'
      });
    }

    const codeRecord = codes[0];

    // 3. Verify Staff ID / Employee ID match
    if (codeRecord.target_identifier && cleanStaffId) {
      const expectedId = codeRecord.target_identifier.trim().toUpperCase();
      if (expectedId !== cleanStaffId) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: `Staff ID "${employee_id}" does not match the Director-issued passcode invitation (expected ${codeRecord.target_identifier}). Registration rejected.`
        });
      }
    }

    const instId = codeRecord.institution_id || institution_id;
    const progId = codeRecord.program_id || program_id || null;
    const position = staff_position ? staff_position : (codeRecord.intended_position || 'ojt_supervisor');

    let resolvedDept = codeRecord.intended_department || department_name || null;
    if (progId && !resolvedDept) {
      const [pRows] = await connection.query('SELECT department FROM programs WHERE program_id = ?', [progId]);
      if (pRows.length > 0 && pRows[0].department) resolvedDept = pRows[0].department;
    }

    if (!instId) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: 'Institution assignment is missing from access passcode.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [roles] = await connection.query(
      "SELECT role_id FROM roles WHERE role_name = 'institution_staff' LIMIT 1"
    );
    let roleId = roles.length > 0 ? roles[0].role_id : 3;

    // 4. Insert user
    const [userRes] = await connection.query(
      'INSERT INTO users (role_id, email, password_hash, is_active, is_verified) VALUES (?, ?, ?, 1, 0)',
      [roleId, email.trim(), passwordHash]
    );
    const userId = userRes.insertId;

    const staffPermissions = {
      salutation: title || 'Prof.',
      first_name,
      middle_name: middle_name || '',
      last_name,
      suffix: suffix || '',
      department_name: resolvedDept || department_name || '',
      office_location: office_location || '',
      contact_number: normalizedStaffContact || '',
      passcode_used: cleanAccessCode,
      passcode_intended_position: codeRecord.intended_position || null,
      passcode_intended_program_id: codeRecord.program_id || null,
      passcode_intended_email: codeRecord.intended_email || null,
      passcode_target_identifier: codeRecord.target_identifier || null,
      director_assigned_permissions: codeRecord.assigned_permissions || null
    };

    // 5. Insert staff record
    const staffEmpId = cleanStaffId || `STF-${Date.now().toString().slice(-6)}`;
    const [staffRes] = await connection.query(
      `INSERT INTO institution_staff (
        user_id, institution_id, program_id, department, employee_id, staff_number, first_name, last_name,
        position, contact_number, permissions, is_verified, is_active, address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?)`,
      [
        userId,
        instId,
        progId,
        resolvedDept,
        staffEmpId,
        staffEmpId,
        first_name,
        last_name,
        position,
        normalizedStaffContact || null,
        JSON.stringify(staffPermissions),
        address || null
      ]
    );
    const staffId = staffRes.insertId;

    // 6. Insert into entity_registrations queue
    await connection.query(
      `INSERT INTO entity_registrations (
        entity_type, entity_id, user_id, status, submitted_at
      ) VALUES ('institution_staff', ?, ?, 'pending', CURRENT_TIMESTAMP)`,
      [staffId, userId]
    );

    // 7. Mark access code as used
    await connection.query(
      'UPDATE access_codes SET is_used = 1, used_by_user_id = ?, used_at = NOW() WHERE code_id = ?',
      [userId, codeRecord.code_id]
    );

    await connection.commit();
    connection.release();

    emitUpdate('staff_registered', { institution_id: instId, staff_id: staffId, user_id: userId });

    // Notify the main account(s) of the institution (Director)
    try {
      const mainAccountUserIds = new Set();
      if (codeRecord.created_by) {
        mainAccountUserIds.add(codeRecord.created_by);
      }
      const [instSubmitters] = await pool.query(
        'SELECT submitted_by as user_id FROM institution_registrations WHERE institution_id = ? AND submitted_by IS NOT NULL',
        [instId]
      );
      for (const row of instSubmitters) {
        if (row.user_id) mainAccountUserIds.add(row.user_id);
      }
      if (mainAccountUserIds.size === 0) {
        const [instUsers] = await pool.query(
          'SELECT u.user_id FROM institutions i JOIN users u ON u.email = i.contact_email WHERE i.institution_id = ?',
          [instId]
        );
        for (const row of instUsers) {
          if (row.user_id) mainAccountUserIds.add(row.user_id);
        }
      }

      const positionLabelMap = {
        ojt_supervisor: 'OJT Supervisor',
        ojt_coordinator: 'OJT Coordinator',
        registrar: 'Registrar',
        guidance_counselor: 'Guidance Counselor',
        dean: 'Dean'
      };
      const formattedPos = positionLabelMap[position] || (position ? position.replace(/_/g, ' ') : 'Staff Member');
      const staffFullName = `${title ? title + ' ' : ''}${first_name} ${last_name}`.trim();

      // Determine staff member's department (directly or via assigned degree program)
      let staffDepartment = resolvedDept || null;
      if (!staffDepartment && progId) {
        try {
          const [pRows] = await pool.query('SELECT department FROM programs WHERE program_id = ?', [progId]);
          if (pRows.length > 0 && pRows[0].department) {
            staffDepartment = pRows[0].department;
          }
        } catch (_) { }
      }

      // 1. Notify the main account(s) of the institution (Director)
      for (const directorUserId of mainAccountUserIds) {
        await sendNotification({
          userId: directorUserId,
          senderId: userId,
          senderName: `${first_name} ${last_name}`.trim(),
          title: 'New Staff Registration Pending Verification',
          message: `${staffFullName} (${formattedPos}) has registered with Employee ID ${staffEmpId} and is waiting for your verification.`,
          type: 'verification',
          link: '/dashboard/institution/staff',
          relatedType: 'institution_staff',
          relatedId: staffId,
          meta: {
            institution_id: instId,
            staff_id: staffId,
            staff_name: staffFullName,
            position,
            employee_id: staffEmpId,
            department: staffDepartment
          }
        });
      }

      // 2. Notify the College Dean of the department where the program/staff belongs
      if (staffDepartment) {
        try {
          const [deanRows] = await pool.query(
            `SELECT ist.user_id, ist.staff_id, ist.first_name, ist.last_name, ist.department, p.department as prog_department
             FROM institution_staff ist
             JOIN users u ON ist.user_id = u.user_id
             LEFT JOIN programs p ON ist.program_id = p.program_id
             WHERE ist.institution_id = ?
               AND ist.position = 'dean'
               AND ist.is_verified = 1
               AND ist.is_active = 1
               AND u.is_active = 1`,
            [instId]
          );

          const cleanStaffDept = staffDepartment.trim().toLowerCase();

          for (const dean of deanRows) {
            const deanDept = (dean.department || dean.prog_department || '').trim().toLowerCase();
            // Only the Dean assigned to the department where the program belongs will receive the notification
            if (deanDept && deanDept === cleanStaffDept) {
              if (mainAccountUserIds.has(dean.user_id)) continue; // Avoid duplicate notification if already sent

              await sendNotification({
                userId: dean.user_id,
                senderId: userId,
                senderName: `${first_name} ${last_name}`.trim(),
                title: 'New Staff Registration Pending Verification',
                message: `${staffFullName} (${formattedPos}) has registered for your department (${staffDepartment}) with Employee ID ${staffEmpId} and is waiting for verification.`,
                type: 'verification',
                link: '/dashboard/institution/staff',
                relatedType: 'institution_staff',
                relatedId: staffId,
                meta: {
                  institution_id: instId,
                  staff_id: staffId,
                  staff_name: staffFullName,
                  position,
                  employee_id: staffEmpId,
                  department: staffDepartment,
                  is_dean_notification: true
                }
              });
            }
          }
        } catch (deanNotifErr) {
          console.error('[AuthRoutes] Error sending staff registration notification to college dean:', deanNotifErr);
        }
      }
    } catch (notifErr) {
      console.error('[AuthRoutes] Error sending staff registration notification to institution director:', notifErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Staff account registered with Director Passcode! Your account is now pending review and verification by the Institution Director.'
    });
  } catch (error) {
    try { await connection.rollback(); } catch (_) { }
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return res.status(409).json({ success: false, message: 'A staff member with this email or employee ID already exists.' });
    }
    console.error('Staff registration error:', error);
    return res.status(500).json({ success: false, message: 'Staff registration failed: ' + error.message });
  } finally {
    safeRelease();
  }
});

// POST /api/auth/register/mentor (Workplace Mentor via HR Passcode)
router.post('/register/mentor', async (req, res) => {
  const {
    access_code,
    organization_id,
    title,
    first_name,
    middle_name,
    last_name,
    suffix,
    company_employee_id,
    job_title,
    department_name,
    work_location,
    years_of_experience,
    contact_number,
    email,
    password,
    address
  } = req.body;

  if (!access_code || !first_name || !last_name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Access code, name, email, and password are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
  }

  let normalizedMentorContact = null;
  if (contact_number && String(contact_number).trim()) {
    const phoneCheck = validatePhPhoneNumber(contact_number, false);
    if (!phoneCheck.valid) {
      return res.status(400).json({
        success: false,
        message: 'Mobile Number must be a valid 10-digit Philippine mobile number starting with 9 (e.g., +63 917 123 4567).'
      });
    }
    normalizedMentorContact = phoneCheck.normalized;
  }

  const cleanAccessCode = access_code.trim().toUpperCase();

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

    const [existing] = await connection.query('SELECT user_id FROM users WHERE email = ?', [email.trim()]);
    if (existing.length > 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: 'This email is already registered.' });
    }

    const [codes] = await connection.query(
      `SELECT * FROM access_codes 
       WHERE code_hash = ? AND recipient_type = 'workplace_mentor' AND is_used = 0 AND expires_at > NOW()`,
      [cleanAccessCode]
    );

    if (codes.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'Invalid, already used, or expired Workplace Mentor access code. Please check the code provided by your organization HR.'
      });
    }

    const codeRecord = codes[0];
    const codeId = codeRecord.code_id;
    const orgId = codeRecord.organization_id || organization_id;

    if (!orgId) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: 'Organization assignment is missing from this access code.' });
    }

    // Check Employee ID or Email against target_identifier
    const cleanEmpId = company_employee_id ? company_employee_id.trim().toUpperCase() : '';
    if (codeRecord.target_identifier) {
      const target = codeRecord.target_identifier.trim().toLowerCase();
      if (target.includes('@')) {
        if (email.trim().toLowerCase() !== target) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({
            success: false,
            message: `This passcode was issued specifically for email "${codeRecord.target_identifier}". Your registration email must match.`
          });
        }
      } else if (cleanEmpId) {
        if (target !== cleanEmpId.toLowerCase()) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({
            success: false,
            message: `Employee ID "${company_employee_id}" does not match the access passcode invitation (expected ${codeRecord.target_identifier}).`
          });
        }
      }
    }

    // Check intended email if specified
    if (codeRecord.intended_email && email.trim().toLowerCase() !== codeRecord.intended_email.trim().toLowerCase()) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        message: `This passcode was issued specifically for ${codeRecord.intended_email}. Registration email must match.`
      });
    }

    // Check if Employee ID is already in use within this organization
    if (cleanEmpId) {
      const [existingEmp] = await connection.query(
        'SELECT org_staff_id FROM organization_staff WHERE organization_id = ? AND LOWER(TRIM(staff_number)) = ?',
        [orgId, cleanEmpId.toLowerCase()]
      );
      if (existingEmp.length > 0) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: `Employee ID "${company_employee_id}" is already registered by another staff/mentor in this organization.`
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [roles] = await connection.query("SELECT role_id FROM roles WHERE role_name = 'hiring_organization' LIMIT 1");
    const roleId = roles[0].role_id;

    // 1. Insert user
    const [userRes] = await connection.query(
      'INSERT INTO users (role_id, email, password_hash, is_active, is_verified) VALUES (?, ?, ?, 1, 0)',
      [roleId, email.trim(), passwordHash]
    );
    const userId = userRes.insertId;

    // 2. Insert organization_staff record
    const [staffRes] = await connection.query(
      `INSERT INTO organization_staff (
        user_id, organization_id, staff_number, title, first_name, middle_name, last_name, suffix,
        position, job_title, department, work_location, years_of_experience, contact_number, passcode_used, is_verified, created_at, updated_at, address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'workplace_mentor', ?, ?, ?, ?, ?, ?, 0, NOW(), NOW(), ?)`,
      [
        userId,
        orgId,
        company_employee_id || null,
        title || 'Mr.',
        first_name,
        middle_name || null,
        last_name,
        suffix || null,
        job_title || 'Workplace Mentor',
        department_name || null,
        work_location || null,
        years_of_experience ? parseInt(years_of_experience, 10) : 1,
        normalizedMentorContact || null,
        cleanAccessCode,
        address || null
      ]
    );
    const mentorStaffId = staffRes.insertId;

    // 3. Mark code as used if matched
    if (codeId) {
      await connection.query(
        'UPDATE access_codes SET is_used = 1, used_by_user_id = ?, used_at = NOW() WHERE code_id = ?',
        [userId, codeId]
      );
    }

    // 4. Create entity registration tracking record
    await connection.query(
      `INSERT INTO entity_registrations (entity_type, entity_id, user_id, status, submitted_at)
       VALUES ('workplace_mentor', ?, ?, 'pending', NOW())`,
      [mentorStaffId, userId]
    );

    await connection.commit();
    connection.release();

    emitUpdate('mentor_registered', { organization_id: orgId, mentor_id: mentorStaffId, user_id: userId });

    // ── Notify HR Admin(s) about new mentor pending verification ──
    try {
      const hrAdminUserIds = new Set();
      const mentorFullName = `${title ? title + ' ' : ''}${first_name} ${last_name}`.trim();

      // 1. Find the main account (organization submitter)
      const [orgSubmitters] = await pool.query(
        `SELECT submitted_by as user_id FROM organization_registrations WHERE organization_id = ?
         UNION
         SELECT u.user_id FROM hiring_organizations ho JOIN users u ON u.email = ho.contact_email WHERE ho.organization_id = ?`,
        [orgId, orgId]
      );
      for (const row of orgSubmitters) {
        if (row.user_id) hrAdminUserIds.add(row.user_id);
      }

      // 2. Also find any HR staff in the organization
      const [hrStaffRows] = await pool.query(
        `SELECT os.user_id FROM organization_staff os
         JOIN users u ON os.user_id = u.user_id
         WHERE os.organization_id = ? AND os.position IN ('hr_staff', 'hr') AND os.is_verified = 1 AND u.is_active = 1`,
        [orgId]
      );
      for (const row of hrStaffRows) {
        if (row.user_id) hrAdminUserIds.add(row.user_id);
      }

      // Send notification to each HR admin / main account
      for (const hrUserId of hrAdminUserIds) {
        await sendNotification({
          userId: hrUserId,
          senderId: userId,
          senderName: `${first_name} ${last_name}`.trim(),
          title: 'New Workplace Mentor Pending Verification',
          message: `${mentorFullName} has registered as a Workplace Mentor${company_employee_id ? ` (Employee ID: ${company_employee_id})` : ''} and is waiting for your verification.`,
          type: 'verification',
          link: '/dashboard/organization/mentors',
          relatedType: 'organization_staff',
          relatedId: mentorStaffId,
          meta: {
            organization_id: orgId,
            mentor_staff_id: mentorStaffId,
            mentor_name: mentorFullName,
            employee_id: company_employee_id || null,
            department: department_name || null
          }
        });
      }
    } catch (notifErr) {
      console.error('[AuthRoutes] Error sending mentor registration notification to HR admin:', notifErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Workplace Mentor account registered! Pending verification by HR Administrator.'
    });
  } catch (error) {
    try { await connection.rollback(); } catch (_) { }
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return res.status(409).json({ success: false, message: 'A mentor with this email or company ID already exists.' });
    }
    console.error('Mentor registration error:', error);
    return res.status(500).json({ success: false, message: 'Mentor registration failed: ' + error.message });
  } finally {
    safeRelease();
  }
});

export default router;
