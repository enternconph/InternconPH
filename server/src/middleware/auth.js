import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { validateSession, getSessionCookieOptions } from '../utils/session.js';

export const verifyToken = async (req, res, next) => {
  // Prevent any browser/proxy caching of authenticated session requests
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  let token = null;

  // 1. Primary: HttpOnly Session Cookie
  if (req.cookies && req.cookies.interncon_session) {
    token = req.cookies.interncon_session;
  }
  // 2. Secondary: Authorization: Bearer <token> header
  else if (req.headers['authorization'] && req.headers['authorization'].startsWith('Bearer ')) {
    token = req.headers['authorization'].split(' ')[1];
  }
  // 3. Fallback: Query parameter
  else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  try {
    // Attempt database-backed session validation first
    const sessionResult = await validateSession(token, req);

    let authUser = null;
    let decodedFallback = null;

    if (sessionResult.valid) {
      authUser = sessionResult.user;
      req.sessionId = sessionResult.session.session_id;
      req.sessionToken = token;
    } else if (
      sessionResult.code === 'SESSION_REVOKED' || 
      sessionResult.code === 'SESSION_EXPIRED' || 
      sessionResult.code === 'SESSION_INACTIVE'
    ) {
      res.clearCookie('interncon_session', getSessionCookieOptions(req));
      return res.status(401).json({ success: false, message: sessionResult.message });
    } else if (sessionResult.code === 'USER_DEACTIVATED') {
      return res.status(403).json({ success: false, message: sessionResult.message });
    } else {
      // If token was not found in user_sessions, verify if it's a valid legacy JWT (migration fallback)
      try {
        decodedFallback = jwt.verify(token, process.env.JWT_SECRET || 'internconph_jwt_secret_2026_super_key');
        if (decodedFallback && decodedFallback.user_id) {
          const [userRows] = await pool.query(
            `SELECT u.user_id, u.email, u.avatar_url, u.display_name, u.is_active, u.is_verified, r.role_id, r.role_name
             FROM users u
             JOIN roles r ON u.role_id = r.role_id
             WHERE u.user_id = ?`,
            [decodedFallback.user_id]
          );
          if (userRows.length > 0) {
            authUser = userRows[0];
          }
        }
      } catch (_) {
        // Not a valid JWT either
      }

      if (!authUser) {
        res.clearCookie('interncon_session', getSessionCookieOptions(req));
        return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
      }
    }

    if (!authUser.is_active) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated or suspended.' });
    }

    // Role-specific scoping and security checks
    let roleName = authUser.role_name;
    let studentId = decodedFallback?.student_id || null;
    let orgId = decodedFallback?.org_id || null;
    let institutionId = decodedFallback?.institution_id || null;
    let programId = null;
    let department = null;
    let position = null;
    let permissions = null;
    let fullName = authUser.display_name || authUser.email;

    if (roleName === 'student') {
      const [students] = await pool.query(
        `SELECT s.student_id, s.institution_id, s.program_id, s.classification, s.ojt_status,
                s.first_name, s.last_name, s.is_active, s.is_verified,
                i.status AS inst_status, i.institution_name,
                sr.status AS reg_status
         FROM students s
         LEFT JOIN institutions i ON s.institution_id = i.institution_id
         LEFT JOIN student_registrations sr ON s.student_id = sr.student_id
         WHERE s.user_id = ?
         ORDER BY sr.registration_id DESC
         LIMIT 1`,
        [authUser.user_id]
      );
      if (students.length > 0) {
        const s = students[0];
        studentId = s.student_id;
        institutionId = s.institution_id;
        programId = s.program_id;
        fullName = `${s.first_name} ${s.last_name}`.trim();

        if (s.inst_status === 'deactivated' || s.inst_status === 'suspended' || s.inst_status === 'rejected') {
          return res.status(403).json({
            success: false,
            message: `Institution access is restricted (${s.inst_status}). Student portal access is temporarily unavailable.`
          });
        }
        if (s.reg_status === 'rejected' || !s.is_active) {
          return res.status(403).json({
            success: false,
            message: 'Your student account is inactive or was rejected.'
          });
        }
      }
    } else if (roleName === 'hiring_organization') {
      const [orgs] = await pool.query(
        `SELECT ho.organization_id, ho.organization_name, ho.status
         FROM hiring_organizations ho
         JOIN organization_registrations oreg ON ho.organization_id = oreg.organization_id
         WHERE oreg.submitted_by = ?`,
        [authUser.user_id]
      );
      if (orgs.length > 0) {
        orgId = orgs[0].organization_id;
        fullName = orgs[0].organization_name;
        if (['deactivated', 'suspended', 'rejected'].includes(orgs[0].status)) {
          return res.status(403).json({
            success: false,
            message: `Your organization has been ${orgs[0].status}.`
          });
        }
      }
    } else if (roleName === 'institution') {
      const [insts] = await pool.query(
        `SELECT i.institution_id, i.institution_name, i.status
         FROM institutions i
         JOIN institution_registrations ireg ON i.institution_id = ireg.institution_id
         WHERE ireg.submitted_by = ?`,
        [authUser.user_id]
      );
      if (insts.length > 0) {
        institutionId = insts[0].institution_id;
        fullName = insts[0].institution_name;
        position = 'director';
        if (['deactivated', 'suspended', 'rejected'].includes(insts[0].status)) {
          return res.status(403).json({
            success: false,
            message: `Your institution has been ${insts[0].status}.`
          });
        }
      }
    } else if (roleName === 'institution_staff') {
      const [staff] = await pool.query(
        `SELECT ist.staff_id, ist.institution_id, ist.program_id, ist.position, ist.permissions,
                ist.first_name, ist.last_name, ist.is_active, ist.is_verified,
                COALESCE(ist.department, p.department) as resolved_department,
                i.status AS inst_status, i.institution_name
         FROM institution_staff ist
         JOIN institutions i ON ist.institution_id = i.institution_id
         LEFT JOIN programs p ON ist.program_id = p.program_id
         WHERE ist.user_id = ?`,
        [authUser.user_id]
      );
      if (staff.length > 0) {
        const st = staff[0];
        institutionId = st.institution_id;
        programId = st.program_id;
        department = st.resolved_department;
        position = st.position;
        fullName = `${st.first_name || ''} ${st.last_name || ''}`.trim() || st.institution_name;
        try {
          permissions = typeof st.permissions === 'string' ? JSON.parse(st.permissions) : st.permissions;
        } catch {
          permissions = null;
        }

        if (['deactivated', 'suspended', 'rejected'].includes(st.inst_status)) {
          return res.status(403).json({
            success: false,
            message: `Institution access is restricted (${st.inst_status}).`
          });
        }
      }
    }

    // Check organization_staff (mentors or hr_staff)
    const [orgStaff] = await pool.query(
      `SELECT os.org_staff_id, os.organization_id, os.first_name, os.last_name, os.position, os.is_verified,
              ho.status AS org_status, ho.organization_name
       FROM organization_staff os
       JOIN hiring_organizations ho ON os.organization_id = ho.organization_id
       WHERE os.user_id = ?`,
      [authUser.user_id]
    );
    if (orgStaff.length > 0) {
      const os = orgStaff[0];
      orgId = os.organization_id;
      fullName = `${os.first_name || ''} ${os.last_name || ''}`.trim();
      position = os.position;
      if (os.position === 'workplace_mentor' || os.position === 'mentor') {
        roleName = 'workplace_mentor';
      } else if (os.position === 'hr_staff' || os.position === 'hr') {
        roleName = 'hr_staff';
      }

      if (['deactivated', 'suspended', 'rejected'].includes(os.org_status)) {
        return res.status(403).json({
          success: false,
          message: `Your organization (${os.organization_name}) has been ${os.org_status}.`
        });
      }
    }

    req.user = {
      user_id: authUser.user_id,
      email: authUser.email,
      avatar_url: authUser.avatar_url || null,
      display_name: authUser.display_name || null,
      role_name: roleName,
      role: roleName,
      student_id: studentId,
      org_id: orgId,
      institution_id: institutionId,
      program_id: programId,
      department: department,
      position: position,
      permissions: permissions,
      full_name: fullName,
      is_active: authUser.is_active,
      is_verified: authUser.is_verified
    };

    next();
  } catch (error) {
    console.error('[Auth Middleware Error]', error);
    return res.status(500).json({ success: false, message: 'Authentication verification service error.' });
  }
};

export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(req.user.role_name)) {
      return res.status(403).json({ 
        success: false, 
        message: `Forbidden: Requires one of [${roles.join(', ')}] role.` 
      });
    }

    next();
  };
};
