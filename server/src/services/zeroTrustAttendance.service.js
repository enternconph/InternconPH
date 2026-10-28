/**
 * Enterprise Zero-Trust Anti-Manipulation Attendance Service
 * Configured for MySQL 8.4 + Node.js (Express)
 */

import pool from '../config/db.js';
import crypto from 'crypto';

export const ZERO_TRUST_CONFIG = {
  GEOFENCE_RADIUS_METERS: 100,
  HEARTBEAT_INTERVAL_SECONDS: 30,
  ONLINE_TIMEOUT_SECONDS: 120, // 2 minutes without heartbeat = offline
  ONLINE_TOKEN_TTL_SECONDS: 30, // 30-60 seconds rotation
  OFFLINE_TOKEN_TTL_SECONDS: 600, // 10 minutes pre-issued validity
  SIGNING_SECRET: process.env.ATTENDANCE_SIGNING_SECRET || 'internconph_zero_trust_super_secret_2026'
};

/**
 * Initialize Schema Tables for Zero-Trust Model
 */
export async function ensureZeroTrustSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_device_sessions (
      session_id BIGINT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      device_id VARCHAR(100) NOT NULL,
      device_name VARCHAR(150) NOT NULL,
      platform ENUM('android', 'ios') NOT NULL,
      session_token_hash CHAR(64) NOT NULL,
      is_restricted BOOLEAN DEFAULT FALSE,
      restricted_reason VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_sds_student (student_id),
      INDEX idx_sds_device (device_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_device_heartbeats (
      heartbeat_id BIGINT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      session_id BIGINT NOT NULL,
      device_id VARCHAR(100) NOT NULL,
      latitude DECIMAL(10, 7) NOT NULL,
      longitude DECIMAL(10, 7) NOT NULL,
      accuracy_meters DECIMAL(6, 2) NOT NULL,
      is_mock_location BOOLEAN DEFAULT FALSE,
      mock_provider_details VARCHAR(255) NULL,
      last_heartbeat_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      client_timestamp TIMESTAMP NOT NULL,
      ip_address VARCHAR(45) NULL,
      INDEX idx_hb_student (student_id, last_heartbeat_at),
      INDEX idx_hb_session (session_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS attendance_qr_tokens (
      token_id BIGINT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      session_id BIGINT NOT NULL,
      device_id VARCHAR(100) NOT NULL,
      token_type ENUM('online', 'offline') NOT NULL,
      nonce CHAR(32) NOT NULL UNIQUE,
      token_signature TEXT NOT NULL,
      latitude DECIMAL(10, 7) NULL,
      longitude DECIMAL(10, 7) NULL,
      issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      is_used BOOLEAN DEFAULT FALSE,
      used_at TIMESTAMP NULL,
      scanner_device_id VARCHAR(100) NULL,
      INDEX idx_token_lookup (student_id, token_type, expires_at),
      INDEX idx_token_nonce (nonce)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS attendance_security_audit_logs (
      audit_id BIGINT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      session_id BIGINT NULL,
      device_id VARCHAR(100) NULL,
      event_type ENUM(
        'SCREENSHOT_ATTEMPT',
        'SCREEN_RECORDING_DETECTED',
        'MULTI_DEVICE_LOGIN',
        'OUT_OF_RANGE_ATTEMPT',
        'MOCK_GPS_DETECTED',
        'OFFLINE_ONLINE_CONFLICT',
        'REUSED_TOKEN_ATTEMPT',
        'EXPIRED_TOKEN_ATTEMPT',
        'RESTRICTED_DEVICE_ACCESS'
      ) NOT NULL,
      severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
      telemetry_payload JSON NOT NULL,
      ip_address VARCHAR(45) NULL,
      flagged_for_admin BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_audit_student (student_id, event_type),
      INDEX idx_audit_flagged (flagged_for_admin)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

/**
 * Spherical Haversine Distance in meters
 */
export function calculateHaversineMeters(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  const toRad = deg => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Record or update Device Heartbeat (every 30 seconds)
 */
export async function recordHeartbeat({
  studentId,
  sessionId,
  deviceId,
  latitude,
  longitude,
  accuracyMeters,
  isMockLocation = false,
  mockProviderDetails = null,
  ipAddress = '127.0.0.1'
}) {
  const [result] = await pool.query(
    `INSERT INTO student_device_heartbeats
     (student_id, session_id, device_id, latitude, longitude, accuracy_meters, is_mock_location, mock_provider_details, last_heartbeat_at, client_timestamp, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)`,
    [studentId, sessionId, deviceId, latitude, longitude, accuracyMeters, isMockLocation, mockProviderDetails, ipAddress]
  );
  return result.insertId;
}

/**
 * Log Anti-Manipulation Security Audit Incident
 */
export async function logSecurityAudit({
  studentId,
  sessionId = null,
  deviceId = null,
  eventType,
  severity = 'medium',
  telemetry = {},
  ip = '127.0.0.1'
}) {
  const [res] = await pool.query(
    `INSERT INTO attendance_security_audit_logs
     (student_id, session_id, device_id, event_type, severity, telemetry_payload, ip_address, flagged_for_admin)
     VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
    [studentId, sessionId, deviceId, eventType, severity, JSON.stringify(telemetry), ip]
  );
  return res.insertId;
}

/**
 * REQUIREMENT 4: ONLINE QR FLOW (Exact step-by-step enforcement)
 */
export async function processOnlineQrIssuance({
  studentId,
  sessionToken,
  deviceId,
  lat,
  lng,
  accuracyMeters = 10,
  isMockLocation = false,
  officeCoords = null,
  ip = '127.0.0.1'
}) {
  // Step 1: Session token valid? If not, force re-login.
  const [sessions] = await pool.query(
    `SELECT * FROM student_device_sessions 
     WHERE student_id = ? AND device_id = ?`,
    [studentId, deviceId]
  );

  if (sessions.length === 0) {
    throw { statusCode: 401, errorCode: 'INVALID_SESSION', message: 'Session expired or not found. Force re-login.' };
  }

  const currentSession = sessions[0];
  const hashedProvidedToken = crypto.createHash('sha256').update(sessionToken).digest('hex');
  if (currentSession.session_token_hash !== hashedProvidedToken) {
    throw { statusCode: 401, errorCode: 'SESSION_TOKEN_MISMATCH', message: 'Session token mismatch. Force re-login.' };
  }

  if (currentSession.is_restricted) {
    await logSecurityAudit({
      studentId,
      sessionId: currentSession.session_id,
      deviceId,
      eventType: 'RESTRICTED_DEVICE_ACCESS',
      severity: 'medium',
      telemetry: { reason: currentSession.restricted_reason },
      ip
    });
    throw {
      statusCode: 403,
      errorCode: 'SESSION_RESTRICTED',
      message: `Device restricted: ${currentSession.restricted_reason || 'Another active session exists.'}`
    };
  }

  const officeLat = officeCoords ? officeCoords.latitude : 14.554729;
  const officeLng = officeCoords ? officeCoords.longitude : 121.024445;

  // Step 2: Other active sessions? If none, skip to step 5.
  // Active session = heartbeat received within 2 minutes (120s)
  const [activeHeartbeats] = await pool.query(
    `SELECT h.*, s.is_restricted
     FROM student_device_heartbeats h
     JOIN student_device_sessions s ON h.session_id = s.session_id
     WHERE h.student_id = ? 
       AND h.last_heartbeat_at >= DATE_SUB(NOW(), INTERVAL ? SECOND)
     ORDER BY h.last_heartbeat_at DESC`,
    [studentId, ZERO_TRUST_CONFIG.ONLINE_TIMEOUT_SECONDS]
  );

  // Group by distinct active devices
  const activeDeviceMap = new Map();
  for (const hb of activeHeartbeats) {
    if (!activeDeviceMap.has(hb.device_id)) {
      activeDeviceMap.set(hb.device_id, hb);
    }
  }

  const otherActiveSessions = Array.from(activeDeviceMap.values()).filter(h => h.device_id !== deviceId);

  if (otherActiveSessions.length > 0) {
    // Step 3: Device within 100 m? If not, deny.
    const currentDistance = calculateHaversineMeters(lat, lng, officeLat, officeLng);
    if (currentDistance > ZERO_TRUST_CONFIG.GEOFENCE_RADIUS_METERS) {
      await logSecurityAudit({
        studentId,
        sessionId: currentSession.session_id,
        deviceId,
        eventType: 'OUT_OF_RANGE_ATTEMPT',
        severity: 'medium',
        telemetry: { distance: currentDistance, limit: ZERO_TRUST_CONFIG.GEOFENCE_RADIUS_METERS },
        ip
      });
      throw {
        statusCode: 403,
        errorCode: 'OUT_OF_RANGE',
        message: `Device outside workplace area (${currentDistance}m / ${ZERO_TRUST_CONFIG.GEOFENCE_RADIUS_METERS}m limit).`
      };
    }

    // Step 4: Is this the winning device if multiple are in range? If not, deny.
    // Contenders are all devices within 100m.
    const myHb = activeDeviceMap.get(deviceId);
    const myLastActiveMs = myHb ? new Date(myHb.last_heartbeat_at).getTime() : 0;

    const contenders = [];
    contenders.push({
      deviceId,
      sessionId: currentSession.session_id,
      distance: currentDistance,
      lastActiveMs: myLastActiveMs
    });

    for (const other of otherActiveSessions) {
      const otherDist = calculateHaversineMeters(other.latitude, other.longitude, officeLat, officeLng);
      if (otherDist <= ZERO_TRUST_CONFIG.GEOFENCE_RADIUS_METERS) {
        contenders.push({
          deviceId: other.device_id,
          sessionId: other.session_id,
          distance: otherDist,
          lastActiveMs: new Date(other.last_heartbeat_at).getTime()
        });
      }
    }

    contenders.sort((a, b) => b.lastActiveMs - a.lastActiveMs);
    const winner = contenders[0];

    if (winner.deviceId !== deviceId) {
      await pool.query(
        `UPDATE student_device_sessions 
         SET is_restricted = TRUE, restricted_reason = 'Superseded by more recently active device inside workplace.'
         WHERE session_id = ?`,
        [currentSession.session_id]
      );
      throw {
        statusCode: 403,
        errorCode: 'DEVICE_NOT_WINNER',
        message: 'Another active device for this account was more recently active in the workplace.'
      };
    }
  }

  // Step 5: GPS genuine (no mock location)? If not, deny and flag.
  if (isMockLocation === true) {
    await logSecurityAudit({
      studentId,
      sessionId: currentSession.session_id,
      deviceId,
      eventType: 'MOCK_GPS_DETECTED',
      severity: 'critical',
      telemetry: { lat, lng },
      ip
    });
    throw {
      statusCode: 403,
      errorCode: 'MOCK_GPS_FORBIDDEN',
      message: 'Mock GPS application detected. Access denied and incident flagged.'
    };
  }

  // Step 6: Issue the short-lived signed token (30-60s TTL).
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = new Date((now + ZERO_TRUST_CONFIG.ONLINE_TOKEN_TTL_SECONDS) * 1000);
  const nonce = crypto.randomBytes(16).toString('hex');
  const step = Math.floor(now / ZERO_TRUST_CONFIG.ONLINE_TOKEN_TTL_SECONDS);
  const totpHash = crypto.createHmac('sha256', ZERO_TRUST_CONFIG.SIGNING_SECRET).update(`${studentId}:${step}`).digest('hex');
  const totpCode = String(parseInt(totpHash.slice(0, 8), 16) % 1000000).padStart(6, '0');

  const locStr = `${Number(lat).toFixed(6)},${Number(lng).toFixed(6)},${Math.round(accuracyMeters)}`;
  const canonicalString = `v2|${studentId}|${deviceId}|${totpCode}|${now}|${nonce}|online|${locStr}`;
  const signature = crypto.createHmac('sha256', ZERO_TRUST_CONFIG.SIGNING_SECRET).update(canonicalString).digest('hex');

  const [tokenResult] = await pool.query(
    `INSERT INTO attendance_qr_tokens
     (student_id, session_id, device_id, token_type, nonce, token_signature, latitude, longitude, expires_at)
     VALUES (?, ?, ?, 'online', ?, ?, ?, ?, ?)`,
    [studentId, currentSession.session_id, deviceId, nonce, signature, lat, lng, expiresAt]
  );

  return {
    tokenId: tokenResult.insertId,
    tokenType: 'online',
    rotatesInSeconds: ZERO_TRUST_CONFIG.ONLINE_TOKEN_TTL_SECONDS,
    expiresAt: now + ZERO_TRUST_CONFIG.ONLINE_TOKEN_TTL_SECONDS,
    nonce,
    qrPayload: `${canonicalString}||${signature}`
  };
}

/**
 * Pre-issue Single-Use Offline QR Token (valid 5-10 minutes)
 */
export async function downloadOfflineToken({
  studentId,
  sessionToken,
  deviceId,
  lat,
  lng,
  accuracyMeters = 10,
  ip = '127.0.0.1'
}) {
  const [sessions] = await pool.query(
    `SELECT * FROM student_device_sessions WHERE student_id = ? AND device_id = ? AND is_restricted = FALSE`,
    [studentId, deviceId]
  );
  if (sessions.length === 0) {
    throw { statusCode: 401, errorCode: 'UNAUTHORIZED_DEVICE', message: 'Valid unrestricted session required.' };
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = new Date((now + ZERO_TRUST_CONFIG.OFFLINE_TOKEN_TTL_SECONDS) * 1000);
  const nonce = crypto.randomBytes(16).toString('hex');
  const totpCode = 'OFFLINE';

  const locStr = `${Number(lat).toFixed(6)},${Number(lng).toFixed(6)},${Math.round(accuracyMeters)}`;
  const canonicalString = `v2|${studentId}|${deviceId}|${totpCode}|${now}|${nonce}|offline|${locStr}`;
  const signature = crypto.createHmac('sha256', ZERO_TRUST_CONFIG.SIGNING_SECRET).update(canonicalString).digest('hex');

  const [tokenResult] = await pool.query(
    `INSERT INTO attendance_qr_tokens
     (student_id, session_id, device_id, token_type, nonce, token_signature, latitude, longitude, expires_at)
     VALUES (?, ?, ?, 'offline', ?, ?, ?, ?, ?)`,
    [studentId, sessions[0].session_id, deviceId, nonce, signature, lat, lng, expiresAt]
  );

  return {
    tokenId: tokenResult.insertId,
    tokenType: 'offline',
    validForSeconds: ZERO_TRUST_CONFIG.OFFLINE_TOKEN_TTL_SECONDS,
    expiresAt: now + ZERO_TRUST_CONFIG.OFFLINE_TOKEN_TTL_SECONDS,
    nonce,
    qrPayload: `${canonicalString}||${signature}`
  };
}

/**
 * REQUIREMENT 5: OFFLINE & ONLINE SCAN ADJUDICATION AT SCAN/SYNC TIME
 */
export async function verifyAndRecordAttendance({
  qrPayload,
  scannerLat,
  scannerLng,
  scannerUserId,
  scannedAtTimestamp = Math.floor(Date.now() / 1000),
  officeCoords = null,
  ip = '127.0.0.1'
}) {
  const parts = qrPayload.split('|');
  if (parts.length < 9) {
    throw { statusCode: 400, errorCode: 'MALFORMED_PAYLOAD', message: 'Malformed QR attendance format.' };
  }

  const [version, studentIdStr, deviceId, totpCode, tsStr, nonce, mode, locStr, , signature] = parts;
  const studentId = parseInt(studentIdStr, 10);
  const clientTs = parseInt(tsStr, 10);
  const scanTimeSec = Number(scannedAtTimestamp) || Math.floor(Date.now() / 1000);

  const locParts = locStr !== 'none' ? locStr.split(',').map(Number) : [null, null];
  const [stuLat, stuLng] = locParts;

  // Signature check
  const canonicalString = `v2|${studentId}|${deviceId}|${totpCode}|${clientTs}|${nonce}|${mode}|${locStr}`;
  const expectedSignature = crypto.createHmac('sha256', ZERO_TRUST_CONFIG.SIGNING_SECRET).update(canonicalString).digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
    throw { statusCode: 403, errorCode: 'SIGNATURE_INVALID', message: 'Forged or altered QR code signature.' };
  }

  // Token lookup
  const [tokens] = await pool.query(
    `SELECT * FROM attendance_qr_tokens WHERE nonce = ? AND student_id = ?`,
    [nonce, studentId]
  );

  if (tokens.length === 0) {
    throw { statusCode: 404, errorCode: 'TOKEN_NOT_FOUND', message: 'Unrecognized attendance token.' };
  }

  const tokenRecord = tokens[0];

  // Check 2: Token already used? Reject.
  if (tokenRecord.is_used) {
    await logSecurityAudit({
      studentId,
      sessionId: tokenRecord.session_id,
      deviceId,
      eventType: 'REUSED_TOKEN_ATTEMPT',
      severity: 'critical',
      telemetry: { nonce, used_at: tokenRecord.used_at },
      ip
    });
    throw { statusCode: 409, errorCode: 'TOKEN_ALREADY_USED', message: 'Security Alert: QR token was already scanned.' };
  }

  // Check 3: Token expired at scan time? Reject.
  const expirySec = Math.floor(new Date(tokenRecord.expires_at).getTime() / 1000);
  if (scanTimeSec > expirySec) {
    await logSecurityAudit({
      studentId,
      sessionId: tokenRecord.session_id,
      deviceId,
      eventType: 'EXPIRED_TOKEN_ATTEMPT',
      severity: 'medium',
      telemetry: { scanTimeSec, expirySec, elapsed: scanTimeSec - expirySec },
      ip
    });
    throw { statusCode: 400, errorCode: 'TOKEN_EXPIRED', message: 'Attendance QR code has expired.' };
  }

  // OFFLINE SPECIFIC CHECKS
  let attendanceStatus = 'verified';
  let flagNotes = null;

  if (mode === 'offline') {
    // Check 1: Was the account online on ANY other device during the scan time? If yes, reject.
    const [onlineElsewhere] = await pool.query(
      `SELECT h.* 
       FROM student_device_heartbeats h
       WHERE h.student_id = ?
         AND h.device_id != ?
         AND h.last_heartbeat_at BETWEEN DATE_SUB(FROM_UNIXTIME(?), INTERVAL ? SECOND)
                                     AND DATE_ADD(FROM_UNIXTIME(?), INTERVAL ? SECOND)`,
      [studentId, deviceId, scanTimeSec, ZERO_TRUST_CONFIG.ONLINE_TIMEOUT_SECONDS, scanTimeSec, ZERO_TRUST_CONFIG.ONLINE_TIMEOUT_SECONDS]
    );

    if (onlineElsewhere.length > 0) {
      await logSecurityAudit({
        studentId,
        sessionId: tokenRecord.session_id,
        deviceId,
        eventType: 'OFFLINE_ONLINE_CONFLICT',
        severity: 'critical',
        telemetry: {
          conflictingDevice: onlineElsewhere[0].device_id,
          heartbeatTime: onlineElsewhere[0].last_heartbeat_at
        },
        ip
      });
      throw {
        statusCode: 403,
        errorCode: 'OFFLINE_ONLINE_CONFLICT',
        message: 'Fraud Detected: Account was online on another device during this offline scan.'
      };
    }

    // Check 4: Recorded location within 100 m? If not, flag for admin review.
    const officeLat = officeCoords ? officeCoords.latitude : 14.554729;
    const officeLng = officeCoords ? officeCoords.longitude : 121.024445;
    const officeDist = calculateHaversineMeters(stuLat, stuLng, officeLat, officeLng);

    if (officeDist > ZERO_TRUST_CONFIG.GEOFENCE_RADIUS_METERS) {
      attendanceStatus = 'flagged_for_review';
      flagNotes = `Recorded offline GPS was ${officeDist}m from workplace (limit is ${ZERO_TRUST_CONFIG.GEOFENCE_RADIUS_METERS}m).`;
      await logSecurityAudit({
        studentId,
        sessionId: tokenRecord.session_id,
        deviceId,
        eventType: 'OUT_OF_RANGE_ATTEMPT',
        severity: 'high',
        telemetry: { officeDist, mode: 'offline' },
        ip
      });
    }
  }

  // Check 5: All passed: burn token and record attendance
  await pool.query(
    `UPDATE attendance_qr_tokens 
     SET is_used = TRUE, used_at = NOW(), scanner_device_id = ?
     WHERE token_id = ?`,
    [String(scannerUserId), tokenRecord.token_id]
  );

  return {
    success: true,
    studentId,
    deviceId,
    tokenId: tokenRecord.token_id,
    mode,
    status: attendanceStatus,
    flagNotes
  };
}
