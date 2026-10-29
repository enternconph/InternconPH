import crypto from 'crypto';

/**
 * Enterprise Mobile QR Attendance Cryptographic & Geofence Helper
 * - Hardware-bound WebCrypto ECDSA P-256 signature verification
 * - 30-second rolling HMAC-SHA256 TOTP verification with clock-drift tolerance
 * - Single-use Nonce hashing for anti-replay protection
 * - Haversine geofence distance & impossible-velocity anti-spoofing checks
 */

export const DEFAULT_TIME_WINDOW_SECONDS = 35; // 30s step + 5s network/render grace
export const TOTP_STEP_SECONDS = 30;
export const DEFAULT_GEOFENCE_RADIUS_METERS = 100;
export const MAX_ALLOWED_GPS_ACCURACY_METERS = 150;
export const MAX_REALISTIC_VELOCITY_MPS = 55; // ~200 km/h impossible jump threshold

/**
 * Generate a cryptographically secure random 256-bit secret for TOTP/HMAC signing
 */
export function generateTotpSecret() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a persistent hardware device token / ID
 */
export function generateDeviceToken() {
  return 'dev_' + crypto.randomBytes(20).toString('hex');
}

/**
 * Hash a nonce + studentId for replay-protection storage
 */
export function hashAttendanceNonce(studentId, nonce) {
  return crypto
    .createHash('sha256')
    .update(`${studentId}:${String(nonce).trim()}`)
    .digest('hex');
}

/**
 * Deterministically compute a 6-digit TOTP code for a given 30-second time step
 */
export function computeTotpCodeForStep(secret, timeStep) {
  const hmacHex = crypto
    .createHmac('sha256', String(secret))
    .update(`totp:${timeStep}`)
    .digest('hex');
  const num = parseInt(hmacHex.slice(0, 8), 16) % 1000000;
  return String(num).padStart(6, '0');
}

/**
 * Verify a 6-digit TOTP code against a reference Unix timestamp (in seconds)
 * allowing +/- windowSteps (default 1 step = ±30s) for minor clock drift.
 */
export function verifyTotpWindow(secret, code, referenceUnixSec, windowSteps = 1) {
  if (!secret || !code) return { valid: false };
  const cleanCode = String(code).trim();
  const baseStep = Math.floor(referenceUnixSec / TOTP_STEP_SECONDS);

  for (let offset = -windowSteps; offset <= windowSteps; offset++) {
    const candidate = computeTotpCodeForStep(secret, baseStep + offset);
    const a = Buffer.from(cleanCode, 'utf8');
    const b = Buffer.from(candidate, 'utf8');
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return { valid: true, matchedStep: baseStep + offset, driftSteps: offset };
    }
  }
  return { valid: false };
}

/**
 * Build canonical string signed by the student device's non-extractable ECDSA P-256 private key
 */
export function buildCanonicalQrSigningString({
  sid,
  did,
  totp,
  ts,
  nonce,
  mode = 'online',
  loc = null
}) {
  const latStr = loc && loc.lat != null && !isNaN(Number(loc.lat)) ? Number(loc.lat).toFixed(6) : 'none';
  const lngStr = loc && loc.lng != null && !isNaN(Number(loc.lng)) ? Number(loc.lng).toFixed(6) : 'none';
  const accStr = loc && loc.acc != null && !isNaN(Number(loc.acc)) ? String(Math.round(Number(loc.acc))) : 'none';
  return `v2|${sid}|${did}|${totp}|${ts}|${nonce}|${mode}|${latStr},${lngStr},${accStr}`;
}

/**
 * Verify WebCrypto ECDSA P-256 IEEE-P1363 signature against SPKI base64 public key
 */
export function verifyDeviceEcdsaSignature(publicKeySpkiBase64, canonicalMessage, signatureHex) {
  try {
    if (!publicKeySpkiBase64 || !canonicalMessage || !signatureHex) return false;
    const spkiDer = Buffer.from(publicKeySpkiBase64, 'base64');
    const pubKeyObj = crypto.createPublicKey({
      key: spkiDer,
      format: 'der',
      type: 'spki'
    });
    const sigBuf = Buffer.from(signatureHex, 'hex');
    return crypto.verify(
      'sha256',
      Buffer.from(canonicalMessage, 'utf8'),
      { key: pubKeyObj, dsaEncoding: 'ieee-p1363' },
      sigBuf
    );
  } catch (err) {
    console.warn('[ECDSA Verify Warning]', err.message);
    return false;
  }
}

/**
 * Legacy v1 HMAC signature helper for backward compatibility
 */
export function createPayloadSignature(secret, studentId, deviceToken, timestamp) {
  const message = `${studentId}:${deviceToken}:${timestamp}`;
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

/**
 * Parse and verify QR payload (supports v2 ECDSA + TOTP + Nonce + Location, and v1 fallback)
 * @param {string} rawPayload - JSON string or base64 JSON string
 * @param {object} deviceRecord - Row from student_attendance_devices
 * @param {object} options - { windowSeconds, isOfflineSync, offlineScannedAtMs }
 */
/**
 * Universal attendance QR payload parser: supports compact pipe format, JSON, and base64
 */
export function parseAttendancePayload(rawPayload) {
  if (!rawPayload || typeof rawPayload !== 'string') return null;
  const str = rawPayload.trim();

  // 1. Compact pipe-delimited format: v2|sid|did|c|ts|n|mode|lat,lng,acc|sig|hmac
  if (str.startsWith('v2|')) {
    const parts = str.split('|');
    const sid = parseInt(parts[1], 10);
    const did = parts[2] || '';
    const c = parts[3] || '';
    const ts = parseInt(parts[4], 10);
    const n = parts[5] || '';
    const mode = parts[6] || 'online';
    const locStr = parts[7] || '';
    let loc = null;
    if (locStr && locStr !== 'none') {
      const locParts = locStr.split(',');
      if (locParts.length >= 2 && !isNaN(Number(locParts[0])) && !isNaN(Number(locParts[1]))) {
        loc = {
          lat: Number(Number(locParts[0]).toFixed(6)),
          lng: Number(Number(locParts[1]).toFixed(6)),
          acc: locParts[2] && !isNaN(Number(locParts[2])) ? Math.round(Number(locParts[2])) : null,
          ts: locParts[3] && !isNaN(Number(locParts[3])) ? parseInt(locParts[3], 10) : ts
        };
      }
    }
    const sig = parts[8] || null;
    const hmac = parts[9] || null;
    return {
      v: 2,
      sid,
      did,
      dt: did,
      c,
      ts,
      n,
      mode,
      loc,
      sig: sig || null,
      hmac: hmac || null
    };
  }

  // 2. Standard JSON object
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      return JSON.parse(str);
    } catch (_) {
      return null;
    }
  }

  // 3. Base64 encoded payload fallback
  try {
    const decoded = Buffer.from(str, 'base64').toString('utf8');
    if (decoded.startsWith('v2|')) return parseAttendancePayload(decoded);
    return JSON.parse(decoded);
  } catch (_) {
    return null;
  }
}

export function verifyTotpPayload(
  rawPayload,
  expectedSecretOrRecord,
  expectedDeviceToken = null,
  windowSeconds = DEFAULT_TIME_WINDOW_SECONDS,
  options = {}
) {
  if (!rawPayload || typeof rawPayload !== 'string') {
    return { valid: false, code: 'EMPTY_PAYLOAD', reason: 'Invalid or empty QR payload.' };
  }

  const data = parseAttendancePayload(rawPayload);
  if (!data) {
    return { valid: false, code: 'MALFORMED_PAYLOAD', reason: 'Malformed QR payload format.' };
  }

  const deviceRecord =
    typeof expectedSecretOrRecord === 'object' && expectedSecretOrRecord !== null
      ? expectedSecretOrRecord
      : {
          totp_secret: expectedSecretOrRecord,
          device_token: expectedDeviceToken,
          device_id: expectedDeviceToken,
          public_key_spki: null
        };

  const expectedSecret = deviceRecord.totp_secret;
  const boundDeviceId = deviceRecord.device_id || deviceRecord.device_token;

  // =========================================================================
  // V2 PROTOCOL: WebCrypto ECDSA P-256 Device Signature + Rolling TOTP + Nonce
  // =========================================================================
  if (Number(data.v) === 2) {
    const { sid, did, dt, c: totpCode, ts, n: nonce, mode = 'online', loc = null, sig, hmac } = data;
    const presentedDeviceId = did || dt;

    if (!sid || !presentedDeviceId || !totpCode || !ts || !nonce || (!sig && !hmac)) {
      return {
        valid: false,
        code: 'INCOMPLETE_PAYLOAD',
        reason: 'Incomplete v2 cryptographic QR payload (missing device ID, TOTP, nonce, timestamp, or signature).'
      };
    }

    const clientTimestamp = parseInt(ts, 10);
    if (isNaN(clientTimestamp)) {
      return { valid: false, code: 'INVALID_TIMESTAMP', reason: 'Invalid QR payload timestamp.' };
    }

    // 1. Device Binding Check
    if (boundDeviceId && presentedDeviceId !== boundDeviceId && presentedDeviceId !== deviceRecord.device_token) {
      return {
        valid: false,
        code: 'DEVICE_MISMATCH',
        reason: 'Unregistered Device Detected: This QR code was generated on a different phone than the student’s bound device. The student must verify via 6-digit Gmail OTP to re-bind their new device.'
      };
    }

    // 2. Time Window & Offline Sync Reference Check
    const isOfflineSync = Boolean(options.isOfflineSync);
    const serverNowSec = Math.floor(Date.now() / 1000);
    let referenceTimeSec = serverNowSec;

    if (isOfflineSync) {
      const scannedAtSec = options.offlineScannedAtMs
        ? Math.floor(Number(options.offlineScannedAtMs) / 1000)
        : clientTimestamp;

      // Reject offline scans with future timestamps or older than 72 hours
      if (scannedAtSec > serverNowSec + 120) {
        return {
          valid: false,
          code: 'CLOCK_DRIFT_FUTURE',
          reason: 'Offline scan timestamp is in the future. Please check the HR scanner device clock.'
        };
      }
      if (serverNowSec - scannedAtSec > 72 * 3600) {
        return {
          valid: false,
          code: 'OFFLINE_SCAN_TOO_OLD',
          reason: 'Offline scan is older than 72 hours and has expired.'
        };
      }

      const scanToQrDiff = Math.abs(scannedAtSec - clientTimestamp);
      if (scanToQrDiff > 90) {
        return {
          valid: false,
          code: 'EXPIRED_AT_SCAN_TIME',
          reason: `QR code was already expired when captured offline (${scanToQrDiff}s difference between QR generation and HR scan).`
        };
      }
      referenceTimeSec = clientTimestamp;
    } else {
      const timeDifference = Math.abs(serverNowSec - clientTimestamp);
      if (timeDifference > windowSeconds) {
        return {
          valid: false,
          code: 'QR_EXPIRED',
          reason: `QR code expired (${timeDifference}s elapsed; max window is ${windowSeconds}s). Screenshots and delayed codes are rejected.`
        };
      }
    }

    // 3. Verify 6-digit TOTP code against student's secret
    const totpCheck = verifyTotpWindow(expectedSecret, totpCode, referenceTimeSec, 1);
    if (!totpCheck.valid) {
      return {
        valid: false,
        code: 'INVALID_TOTP',
        reason: 'Invalid or expired TOTP security code. If the student recently re-bound their device, please refresh the QR modal.'
      };
    }

    // 4. Verify Device-Bound ECDSA P-256 Signature (or HMAC fallback if browser lacked ECDSA IndexedDB support)
    const canonicalStr = buildCanonicalQrSigningString({
      sid,
      did: presentedDeviceId,
      totp: totpCode,
      ts: clientTimestamp,
      nonce,
      mode,
      loc
    });

    if (deviceRecord.public_key_spki && sig) {
      const ecdsaValid = verifyDeviceEcdsaSignature(deviceRecord.public_key_spki, canonicalStr, sig);
      if (!ecdsaValid) {
        return {
          valid: false,
          code: 'INVALID_DEVICE_SIGNATURE',
          reason: 'Hardware device signature verification failed. The QR payload was not signed by the student’s registered phone keypair.'
        };
      }
    } else if (hmac) {
      const expectedHmac = crypto.createHmac('sha256', String(expectedSecret)).update(canonicalStr).digest('hex');
      const a = Buffer.from(String(hmac), 'hex');
      const b = Buffer.from(expectedHmac, 'hex');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return {
          valid: false,
          code: 'INVALID_HMAC_SIGNATURE',
          reason: 'Cryptographic signature verification failed.'
        };
      }
    } else if (deviceRecord.public_key_spki && !sig) {
      return {
        valid: false,
        code: 'MISSING_DEVICE_SIGNATURE',
        reason: 'Missing hardware ECDSA signature from registered device.'
      };
    }

    return {
      valid: true,
      version: 2,
      studentId: parseInt(sid, 10),
      deviceId: presentedDeviceId,
      deviceToken: presentedDeviceId,
      timestamp: clientTimestamp,
      nonce: String(nonce),
      nonceHash: hashAttendanceNonce(sid, nonce),
      mode: mode === 'offline' ? 'offline' : 'online',
      location: loc || null,
      timeDifference: Math.abs(serverNowSec - clientTimestamp)
    };
  }

  // =========================================================================
  // V1 LEGACY FALLBACK
  // =========================================================================
  const { sid, dt, ts, sig } = data;
  if (!sid || !dt || !ts || !sig) {
    return {
      valid: false,
      code: 'INCOMPLETE_PAYLOAD',
      reason: 'Incomplete cryptographic payload (missing identifier, token, timestamp, or signature).'
    };
  }

  const clientTimestamp = parseInt(ts, 10);
  if (isNaN(clientTimestamp)) {
    return { valid: false, code: 'INVALID_TIMESTAMP', reason: 'Invalid payload timestamp format.' };
  }

  const currentServerTime = Math.floor(Date.now() / 1000);
  const timeDifference = Math.abs(currentServerTime - clientTimestamp);

  if (!options.isOfflineSync && timeDifference > windowSeconds) {
    return {
      valid: false,
      code: 'QR_EXPIRED',
      reason: `QR code expired (${timeDifference}s elapsed, limit is ${windowSeconds}s). Screenshots are strictly prohibited. Please scan a live dynamic QR code.`
    };
  }

  if (boundDeviceId && dt !== boundDeviceId && dt !== deviceRecord.device_token) {
    return {
      valid: false,
      code: 'DEVICE_MISMATCH',
      reason: 'Device Hardware Token mismatch. The student must present their QR from their officially locked device.'
    };
  }

  const expectedSignature = createPayloadSignature(expectedSecret, sid, dt, clientTimestamp);
  try {
    const receivedSigBuf = Buffer.from(sig, 'hex');
    const expectedSigBuf = Buffer.from(expectedSignature, 'hex');

    if (receivedSigBuf.length !== expectedSigBuf.length || !crypto.timingSafeEqual(receivedSigBuf, expectedSigBuf)) {
      return {
        valid: false,
        code: 'INVALID_SIGNATURE',
        reason: 'Cryptographic signature verification failed. Forged or corrupted QR code.'
      };
    }
  } catch (sigErr) {
    return { valid: false, code: 'INVALID_SIGNATURE', reason: 'Cryptographic verification error: ' + sigErr.message };
  }

  return {
    valid: true,
    version: 1,
    studentId: parseInt(sid, 10),
    deviceId: dt,
    deviceToken: dt,
    timestamp: clientTimestamp,
    nonce: `v1_${sid}_${clientTimestamp}`,
    nonceHash: hashAttendanceNonce(sid, `v1_${sid}_${clientTimestamp}`),
    mode: 'online',
    location: null,
    timeDifference
  };
}

/**
 * Compute Haversine great-circle distance in meters between two GPS coordinates
 */
export function calculateHaversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000; // Earth mean radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Validate student GPS telemetry against:
 * 1. Accuracy threshold (reject coarse cell-tower/IP fixes)
 * 2. Impossible velocity jump detection between consecutive scans (anti-GPS spoofing)
 * 3. Organization Haversine geofence radius (default 100m)
 */
export function verifyGeofenceAndTelemetry({
  studentLoc,
  scannerLoc = null,
  org,
  deviceRecord,
  scanTimestampSec = Math.floor(Date.now() / 1000),
  mode = 'online',
  deviceType = 'mobile'
}) {
  const orgHasCoords =
    org &&
    org.latitude !== null &&
    org.latitude !== undefined &&
    org.longitude !== null &&
    org.longitude !== undefined &&
    !isNaN(Number(org.latitude)) &&
    !isNaN(Number(org.longitude));

  const radiusMeters = Number(org?.geofence_radius_meters) || DEFAULT_GEOFENCE_RADIUS_METERS;
  const enforceGeofence = org?.enforce_geofence !== undefined ? Boolean(org.enforce_geofence) : true;

  // Check: Desktop/browser block or unverified mark
  const isDesktop = mode === 'web_unverified' || deviceType === 'desktop_browser';
  if (isDesktop && orgHasCoords && enforceGeofence) {
    const debugLog = {
      event: 'GEOFENCE_EVALUATION',
      timestamp: new Date().toISOString(),
      studentId: deviceRecord?.student_id || studentLoc?.sid,
      deviceType: 'desktop_browser',
      decision: 'REJECTED',
      reason: 'Desktop / Browser QR generation blocked. Mobile device with satellite GPS required.'
    };
    console.log('[GEOFENCE_AUDIT]', JSON.stringify(debugLog, null, 2));
    return {
      valid: false,
      code: 'DESKTOP_BLOCKED',
      reason: 'Mobile Device Required: Online attendance requires physical presence verified via the InternConPH Android App. Desktop web browsers cannot provide satellite GPS telemetry.'
    };
  }

  // In online mode, if the organization has configured office coordinates, GPS location is mandatory
  if (!studentLoc || studentLoc.lat == null || studentLoc.lng == null) {
    if (mode === 'online' && orgHasCoords && enforceGeofence) {
      const debugLog = {
        event: 'GEOFENCE_EVALUATION',
        timestamp: new Date().toISOString(),
        studentId: deviceRecord?.student_id || studentLoc?.sid,
        deviceType,
        decision: 'REJECTED',
        reason: 'Missing GPS telemetry in attendance payload'
      };
      console.log('[GEOFENCE_AUDIT]', JSON.stringify(debugLog, null, 2));
      return {
        valid: false,
        code: 'LOCATION_REQUIRED',
        reason: 'GPS Location Required: Online attendance requires high-accuracy GPS location enabled on the student’s Android phone to verify presence within the workplace geofence.'
      };
    }
    return {
      valid: true,
      distanceMeters: null,
      accuracyMeters: null,
      geofenceEnforced: false
    };
  }

  const lat = Number(studentLoc.lat);
  const lng = Number(studentLoc.lng);
  const acc = studentLoc.acc != null ? Number(studentLoc.acc) : null;
  const locTimestamp = studentLoc.ts ? parseInt(studentLoc.ts, 10) : scanTimestampSec;
  const locAgeSec = Math.max(0, scanTimestampSec - locTimestamp);

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return {
      valid: false,
      code: 'INVALID_COORDINATES',
      reason: 'Invalid GPS coordinates received in attendance payload.'
    };
  }

  // 1. Accuracy Threshold: Reject if accuracy is worse than 50m — UNLESS the entire
  // uncertainty circle (distance + accuracy) still lies inside the geofence.
  // In that case the student is provably inside regardless of the accuracy value,
  // so rejecting would only block genuine indoor users with weaker satellite lock.
  let certainlyInside = false;
  if (orgHasCoords && acc !== null && !isNaN(acc)) {
    const preDistance = calculateHaversineMeters(lat, lng, Number(org.latitude), Number(org.longitude));
    certainlyInside = preDistance + acc <= radiusMeters;
  }
  if (acc !== null && !isNaN(acc) && acc > 50 && !certainlyInside) {
    const debugLog = {
      event: 'GEOFENCE_EVALUATION',
      timestamp: new Date().toISOString(),
      studentId: deviceRecord?.student_id || studentLoc?.sid,
      deviceType,
      deviceCoords: { lat, lng },
      accuracyMeters: acc,
      locTimestamp,
      locAgeSec,
      decision: 'REJECTED',
      reason: `Accuracy ±${Math.round(acc)}m exceeds 50m limit`
    };
    console.log('[GEOFENCE_AUDIT]', JSON.stringify(debugLog, null, 2));
    return {
      valid: false,
      code: 'LOW_GPS_ACCURACY',
      reason: `GPS accuracy is too low (±${Math.round(acc)}m exceeds the 50m threshold). Please move near a window or outdoors and wait for a precise satellite fix.`
    };
  }

  // 2. Freshness Check: Reject if location fix is older than 30 seconds
  if (locAgeSec > 30) {
    const debugLog = {
      event: 'GEOFENCE_EVALUATION',
      timestamp: new Date().toISOString(),
      studentId: deviceRecord?.student_id || studentLoc?.sid,
      deviceType,
      deviceCoords: { lat, lng },
      accuracyMeters: acc,
      locTimestamp,
      locAgeSec,
      decision: 'REJECTED',
      reason: `Location fix is ${locAgeSec}s old (exceeds 30s limit)`
    };
    console.log('[GEOFENCE_AUDIT]', JSON.stringify(debugLog, null, 2));
    return {
      valid: false,
      code: 'STALE_GPS_LOCATION',
      reason: `Stale GPS reading (${locAgeSec}s old). Please refresh your dynamic QR code to acquire a fresh satellite fix.`
    };
  }

  // 3. Impossible Velocity Jump Check (anti-spoofing between consecutive scans)
  if (
    deviceRecord &&
    deviceRecord.last_latitude != null &&
    deviceRecord.last_longitude != null &&
    deviceRecord.last_location_at
  ) {
    const prevLat = Number(deviceRecord.last_latitude);
    const prevLng = Number(deviceRecord.last_longitude);
    const prevTimeSec = Math.floor(new Date(deviceRecord.last_location_at).getTime() / 1000);
    const elapsedSec = Math.abs(scanTimestampSec - prevTimeSec);

    if (!isNaN(prevLat) && !isNaN(prevLng) && elapsedSec > 0 && elapsedSec < 3600) {
      const jumpDistMeters = calculateHaversineMeters(prevLat, prevLng, lat, lng);
      // Only flag if jump distance is > 500m and speed exceeds 55 m/s (~200 km/h)
      if (jumpDistMeters > 500) {
        const velocityMps = jumpDistMeters / elapsedSec;
        if (velocityMps > MAX_REALISTIC_VELOCITY_MPS) {
          const debugLog = {
            event: 'GEOFENCE_EVALUATION',
            timestamp: new Date().toISOString(),
            studentId: deviceRecord?.student_id || studentLoc?.sid,
            deviceType,
            jumpDistMeters,
            velocityMps,
            decision: 'REJECTED',
            reason: `Impossible velocity jump: ${(jumpDistMeters / 1000).toFixed(2)} km in ${elapsedSec}s`
          };
          console.log('[GEOFENCE_AUDIT]', JSON.stringify(debugLog, null, 2));
          return {
            valid: false,
            code: 'IMPOSSIBLE_LOCATION_JUMP',
            reason: `Suspicious GPS jump detected (${(jumpDistMeters / 1000).toFixed(2)} km in ${elapsedSec}s). Mock locations and GPS spoofing apps are strictly prohibited.`
          };
        }
      }
    }
  }

  // 4. Haversine Distance & Tolerance Buffer Check:
  // Allowed if: (distance - min(accuracy, 50)) <= radiusMeters
  let rawDistanceMeters = null;
  let effectiveDistance = null;
  let accuracyTolerance = 0;
  let scannerDistanceMeters = null;
  let interDeviceDistanceMeters = null;

  if (orgHasCoords) {
    const orgLat = Number(org.latitude);
    const orgLng = Number(org.longitude);
    rawDistanceMeters = Math.round(calculateHaversineMeters(lat, lng, orgLat, orgLng) * 10) / 10;

    accuracyTolerance = Math.min(acc || 0, 50);
    effectiveDistance = Math.max(0, Math.round((rawDistanceMeters - accuracyTolerance) * 10) / 10);
    const isWithinOfficeGeofence = effectiveDistance <= radiusMeters;

    // Check scanner device location if provided by HR terminal
    let scannerInOffice = false;
    let studentNearScanner = false;
    if (
      scannerLoc &&
      scannerLoc.lat != null &&
      scannerLoc.lng != null &&
      !isNaN(Number(scannerLoc.lat)) &&
      !isNaN(Number(scannerLoc.lng))
    ) {
      scannerDistanceMeters = Math.round(calculateHaversineMeters(Number(scannerLoc.lat), Number(scannerLoc.lng), orgLat, orgLng) * 10) / 10;
      interDeviceDistanceMeters = Math.round(calculateHaversineMeters(lat, lng, Number(scannerLoc.lat), Number(scannerLoc.lng)) * 10) / 10;

      const scannerAcc = Number(scannerLoc.acc) || 0;
      const effectiveScannerDist = Math.max(0, scannerDistanceMeters - Math.min(scannerAcc, 50));
      scannerInOffice = effectiveScannerDist <= radiusMeters;
      studentNearScanner = interDeviceDistanceMeters <= 50; // Directly at the HR scanner desk
    }

    const passedGeofence = isWithinOfficeGeofence || (scannerInOffice && studentNearScanner);

    // Comprehensive Debug Logging on every attempt
    const debugLog = {
      event: 'GEOFENCE_EVALUATION',
      timestamp: new Date().toISOString(),
      studentId: deviceRecord?.student_id || studentLoc?.sid,
      deviceType,
      deviceCoords: { lat, lng },
      accuracyMeters: acc,
      locTimestamp,
      locAgeSec,
      orgCoords: { lat: orgLat, lng: orgLng, name: org.organization_name },
      rawDistanceMeters,
      accuracyTolerance,
      effectiveDistanceMeters: effectiveDistance,
      allowedRadiusMeters: radiusMeters,
      scannerCoords: scannerLoc ? { lat: scannerLoc.lat, lng: scannerLoc.lng, acc: scannerLoc.acc } : null,
      scannerDistanceMeters,
      interDeviceDistanceMeters,
      decision: passedGeofence ? 'PASSED' : 'REJECTED',
      reason: passedGeofence
        ? `Within perimeter: raw=${rawDistanceMeters}m - tolerance=${accuracyTolerance}m -> effective=${effectiveDistance}m <= ${radiusMeters}m`
        : `Outside perimeter: raw=${rawDistanceMeters}m - tolerance=${accuracyTolerance}m -> effective=${effectiveDistance}m > ${radiusMeters}m`
    };
    console.log('[GEOFENCE_AUDIT]', JSON.stringify(debugLog, null, 2));

    if (enforceGeofence && !passedGeofence) {
      return {
        valid: false,
        code: 'OUTSIDE_GEOFENCE',
        distanceMeters: rawDistanceMeters,
        effectiveDistanceMeters: effectiveDistance,
        radiusMeters,
        accuracyTolerance,
        scannerDistanceMeters,
        interDeviceDistanceMeters,
        reason: `Outside Workplace Geofence: Student is ${Math.round(rawDistanceMeters)}m away (effective: ${Math.round(effectiveDistance)}m with ±${Math.round(acc || 0)}m accuracy; allowed radius: ${radiusMeters}m). Attendance must be scanned on physical premises.`
      };
    }
  }

  return {
    valid: true,
    latitude: lat,
    longitude: lng,
    accuracyMeters: acc,
    distanceMeters: rawDistanceMeters,
    effectiveDistanceMeters: effectiveDistance,
    radiusMeters,
    scannerDistanceMeters,
    interDeviceDistanceMeters,
    geofenceEnforced: orgHasCoords && enforceGeofence
  };
}
