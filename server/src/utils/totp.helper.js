import crypto from 'crypto';

/**
 * Time-Bound Dynamic QR Cryptographic Helper
 * Implements TOTP-style time-window signing and Hardware Device Token verification.
 */

const DEFAULT_TIME_WINDOW_SECONDS = 30;

/**
 * Generate a cryptographically secure random secret for TOTP/HMAC signing
 */
export function generateTotpSecret() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a persistent hardware device token
 */
export function generateDeviceToken() {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Sign payload: studentId + deviceToken + timestamp using student's secret key
 */
export function createPayloadSignature(secret, studentId, deviceToken, timestamp) {
  const message = `${studentId}:${deviceToken}:${timestamp}`;
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

/**
 * Parse and verify QR payload sent from HR Scanner
 * @param {string} rawPayload - JSON string or base64 JSON string
 * @param {string} expectedSecret - Stored TOTP secret for the student
 * @param {string} expectedDeviceToken - Stored Hardware Device Token for the student
 * @param {number} windowSeconds - Allowed clock drift / validity window (default 30s)
 */
export function verifyTotpPayload(rawPayload, expectedSecret, expectedDeviceToken, windowSeconds = DEFAULT_TIME_WINDOW_SECONDS) {
  if (!rawPayload || typeof rawPayload !== 'string') {
    return { valid: false, reason: 'Invalid or empty QR payload.' };
  }

  let data;
  try {
    let jsonStr = rawPayload.trim();
    if (jsonStr.startsWith('{') && jsonStr.endsWith('}')) {
      data = JSON.parse(jsonStr);
    } else {
      // Try base64 decoding
      const decoded = Buffer.from(jsonStr, 'base64').toString('utf8');
      data = JSON.parse(decoded);
    }
  } catch (err) {
    return { valid: false, reason: 'Malformed QR payload format.' };
  }

  const { sid, dt, ts, sig } = data;

  if (!sid || !dt || !ts || !sig) {
    return { valid: false, reason: 'Incomplete cryptographic payload (missing identifier, token, timestamp, or signature).' };
  }

  const clientTimestamp = parseInt(ts, 10);
  if (isNaN(clientTimestamp)) {
    return { valid: false, reason: 'Invalid payload timestamp format.' };
  }

  const currentServerTime = Math.floor(Date.now() / 1000);
  const timeDifference = Math.abs(currentServerTime - clientTimestamp);

  // Time-window check: reject expired screenshots (valid only for <= windowSeconds)
  if (timeDifference > windowSeconds) {
    return {
      valid: false,
      reason: `QR code expired (${timeDifference}s elapsed, limit is ${windowSeconds}s). Screenshots are strictly prohibited. Please scan a live dynamic QR code.`
    };
  }

  // Hardware Token verification: match against student's locked device
  if (dt !== expectedDeviceToken) {
    return {
      valid: false,
      reason: 'Device Hardware Token mismatch. The student must present their QR from their officially locked device.'
    };
  }

  // Re-compute HMAC-SHA256 signature
  const expectedSignature = createPayloadSignature(expectedSecret, sid, dt, clientTimestamp);
  
  try {
    const receivedSigBuf = Buffer.from(sig, 'hex');
    const expectedSigBuf = Buffer.from(expectedSignature, 'hex');

    if (receivedSigBuf.length !== expectedSigBuf.length || !crypto.timingSafeEqual(receivedSigBuf, expectedSigBuf)) {
      return {
        valid: false,
        reason: 'Cryptographic signature verification failed. Forged or corrupted QR code.'
      };
    }
  } catch (sigErr) {
    return { valid: false, reason: 'Cryptographic verification error: ' + sigErr.message };
  }

  return {
    valid: true,
    studentId: parseInt(sid, 10),
    deviceToken: dt,
    timestamp: clientTimestamp,
    timeDifference
  };
}
