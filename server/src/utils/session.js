import crypto from 'crypto';
import pool from '../config/db.js';

// Configuration parameters with environment overrides
export const COOKIE_NAME = 'interncon_session';
export const INACTIVITY_TIMEOUT_MINUTES = parseInt(process.env.SESSION_INACTIVITY_TIMEOUT_MINUTES, 10) || 120; // 2 hours
export const ABSOLUTE_LIFETIME_DAYS = parseInt(process.env.SESSION_ABSOLUTE_LIFETIME_DAYS, 10) || 7; // 7 days
export const ACTIVITY_THROTTLE_MINUTES = parseInt(process.env.SESSION_ACTIVITY_THROTTLE_MINUTES, 10) || 5; // 5 minutes

/**
 * Generate a cryptographically secure 256-bit random session token
 */
export function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Compute SHA-256 hash of a session token for secure database storage
 */
export function hashSessionToken(token) {
  if (!token || typeof token !== 'string') return '';
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Resolve client IP address safely
 */
export function getClientIp(req) {
  if (!req) return '127.0.0.1';
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim().substring(0, 45);
  }
  const addr = req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip || '127.0.0.1';
  return String(addr).substring(0, 45);
}

/**
 * Resolve client User-Agent safely
 */
export function getUserAgent(req) {
  if (!req) return 'Unknown';
  return String(req.headers['user-agent'] || 'Unknown').substring(0, 500);
}

/**
 * Get standard cookie configuration
 */
export function getSessionCookieOptions(req) {
  const isSecure = process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true' || Boolean(req && (req.secure || req.headers?.['x-forwarded-proto'] === 'https'));

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: ABSOLUTE_LIFETIME_DAYS * 24 * 60 * 60 * 1000 // 7 days in ms
  };
}

/**
 * Create a new server-side session and persist to database
 */
export async function createSession({ userId, req }) {
  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);

  const ipAddress = getClientIp(req);
  const userAgent = getUserAgent(req);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + INACTIVITY_TIMEOUT_MINUTES * 60 * 1000);
  const absoluteExpiresAt = new Date(now.getTime() + ABSOLUTE_LIFETIME_DAYS * 24 * 60 * 60 * 1000);

  const [result] = await pool.query(
    `INSERT INTO user_sessions (
      session_token_hash, user_id, ip_address, user_agent,
      created_at, last_activity_at, expires_at, absolute_expires_at
    ) VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?)`,
    [tokenHash, userId, ipAddress, userAgent, expiresAt, absoluteExpiresAt]
  );

  return {
    sessionId: result.insertId,
    rawToken,
    expiresAt,
    absoluteExpiresAt
  };
}

/**
 * Validate an active session token against user_sessions and users
 */
export async function validateSession(rawToken, req) {
  if (!rawToken) {
    return { valid: false, code: 'AUTH_REQUIRED', message: 'Authentication required.' };
  }

  const tokenHash = hashSessionToken(rawToken);

  const [rows] = await pool.query(
    `SELECT s.*, 
            u.user_id, u.email, u.avatar_url, u.display_name, u.is_active, u.is_verified, 
            r.role_id, r.role_name
     FROM user_sessions s
     JOIN users u ON s.user_id = u.user_id
     JOIN roles r ON u.role_id = r.role_id
     WHERE s.session_token_hash = ?`,
    [tokenHash]
  );

  if (rows.length === 0) {
    return { valid: false, code: 'SESSION_INVALID', message: 'Invalid session. Please log in again.' };
  }

  const session = rows[0];

  // Check revocation
  if (session.revoked_at !== null) {
    return { valid: false, code: 'SESSION_REVOKED', message: 'Session revoked. Please log in again.' };
  }

  const now = new Date();

  // Check absolute expiration (hard limit)
  if (now > new Date(session.absolute_expires_at)) {
    await pool.query(
      'UPDATE user_sessions SET revoked_at = NOW(), revoked_reason = "absolute_timeout" WHERE session_id = ?',
      [session.session_id]
    ).catch(() => {});
    return { valid: false, code: 'SESSION_EXPIRED', message: 'Session expired. Please log in again.' };
  }

  // Check inactivity expiration (idle limit)
  if (now > new Date(session.expires_at)) {
    await pool.query(
      'UPDATE user_sessions SET revoked_at = NOW(), revoked_reason = "inactivity_timeout" WHERE session_id = ?',
      [session.session_id]
    ).catch(() => {});
    return { valid: false, code: 'SESSION_INACTIVE', message: 'Session expired due to inactivity. Please log in again.' };
  }

  // Check user active status
  if (!session.is_active) {
    return { valid: false, code: 'USER_DEACTIVATED', message: 'Your account has been deactivated or suspended.' };
  }

  // Throttled activity timestamp update (update at most once every ACTIVITY_THROTTLE_MINUTES)
  const lastActTime = new Date(session.last_activity_at).getTime();
  const throttleMs = ACTIVITY_THROTTLE_MINUTES * 60 * 1000;
  if (Date.now() - lastActTime > throttleMs) {
    const newExpiresAt = new Date(Date.now() + INACTIVITY_TIMEOUT_MINUTES * 60 * 1000);
    // Do not exceed absolute_expires_at
    const finalExpiresAt = newExpiresAt > new Date(session.absolute_expires_at) 
      ? new Date(session.absolute_expires_at) 
      : newExpiresAt;

    pool.query(
      'UPDATE user_sessions SET last_activity_at = NOW(), expires_at = ? WHERE session_id = ?',
      [finalExpiresAt, session.session_id]
    ).catch((err) => console.error('[Session Touch Error]', err.message));
  }

  return {
    valid: true,
    session,
    user: session
  };
}

/**
 * Revoke a session token in the database
 */
export async function revokeSession(rawToken, reason = 'logout') {
  if (!rawToken) return false;
  const tokenHash = hashSessionToken(rawToken);
  const [result] = await pool.query(
    'UPDATE user_sessions SET revoked_at = NOW(), revoked_reason = ? WHERE session_token_hash = ? AND revoked_at IS NULL',
    [reason, tokenHash]
  );
  return result.affectedRows > 0;
}

/**
 * Revoke all active sessions for a user (useful for password resets or security deactivation)
 */
export async function revokeAllUserSessions(userId, reason = 'revoked_all') {
  if (!userId) return false;
  const [result] = await pool.query(
    'UPDATE user_sessions SET revoked_at = NOW(), revoked_reason = ? WHERE user_id = ? AND revoked_at IS NULL',
    [reason, userId]
  );
  return result.affectedRows > 0;
}

/**
 * Prune stale sessions older than 30 days
 */
export async function pruneStaleSessions() {
  try {
    await pool.query(`
      DELETE FROM user_sessions 
      WHERE (revoked_at IS NOT NULL AND revoked_at < DATE_SUB(NOW(), INTERVAL 30 DAY))
         OR (expires_at < DATE_SUB(NOW(), INTERVAL 30 DAY))
    `);
  } catch (err) {
    console.error('[Session Pruning Error]', err.message);
  }
}
