/**
 * Enterprise Mobile QR Attendance Cryptographic & Hardware Key Utility
 * - WebCrypto Non-Extractable ECDSA P-256 Keypair stored in IndexedDB
 * - Short-lived Offline Credential Vault in IndexedDB (72h TTL)
 * - 30-second Rolling HMAC-SHA256 TOTP + Single-Use Nonce + ECDSA Signature
 * - Client-side Haversine Geofence Telemetry Helper
 */

const DEVICE_STORAGE_KEY = 'internconph_attendance_device_token';
const IDB_NAME = 'InternConPH_SecurityDB';
const IDB_VERSION = 1;
const KEY_STORE = 'device_keys';
const CREDENTIAL_STORE = 'offline_credentials';
const PRIMARY_KEY_ID = 'primary_attendance_ecdsa_p256';
export const TOTP_STEP_SECONDS = 30;

/**
 * Open IndexedDB database for non-extractable CryptoKeyPair & offline credential storage
 */
function openSecurityDb() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported on this device.'));
    }
    const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(KEY_STORE)) {
        db.createObjectStore(KEY_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(CREDENTIAL_STORE)) {
        db.createObjectStore(CREDENTIAL_STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open Security IndexedDB.'));
  });
}

function idbGet(storeName, key) {
  return openSecurityDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      })
  );
}

function idbPut(storeName, value) {
  return openSecurityDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(value);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      })
  );
}

function idbDelete(storeName, key) {
  return openSecurityDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      })
  );
}

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Retrieve or generate a fallback localStorage device token
 */
export function getOrCreateDeviceToken() {
  try {
    let token = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (!token || token.length < 24) {
      const array = new Uint8Array(20);
      if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(array);
      } else {
        for (let i = 0; i < 20; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
      }
      token = 'dev_' + bufferToHex(array);
      localStorage.setItem(DEVICE_STORAGE_KEY, token);
    }
    return token;
  } catch (err) {
    console.warn('LocalStorage error reading device token:', err);
    return 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  }
}

/**
 * Clear local device token
 */
export function resetLocalDeviceToken() {
  try {
    localStorage.removeItem(DEVICE_STORAGE_KEY);
    return getOrCreateDeviceToken();
  } catch (_) {
    return null;
  }
}

/**
 * Human-readable Android / Browser device label
 */
export function getDeviceName() {
  const ua = navigator.userAgent || '';
  let os = 'Unknown Device';
  if (/Android/i.test(ua)) {
    const match = ua.match(/Android\s+([\d.]+);\s*([^;)]+)/i);
    if (match && match[2]) {
      os = `Android ${match[1]} (${match[2].trim()})`;
    } else {
      os = 'Android Mobile';
    }
  } else if (/Windows/i.test(ua)) os = 'Windows PC';
  else if (/Macintosh|Mac OS/i.test(ua)) os = 'Mac Desktop';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS Device';
  else if (/Linux/i.test(ua)) os = 'Linux Device';

  let browser = 'Browser';
  if (/Chrome|CriOS/i.test(ua) && !/Edge|Edg/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Edge|Edg/i.test(ua)) browser = 'Edge';

  return `${os} • ${browser}`;
}

/**
 * Generate or load a non-extractable WebCrypto ECDSA P-256 hardware-bound keypair from IndexedDB.
 * The privateKey is marked extractable: false so it can never be exported or copied off the phone.
 */
export async function getOrCreateHardwareKeyPair(forceRotate = false) {
  if (!window.crypto || !window.crypto.subtle) {
    const fallbackId = getOrCreateDeviceToken();
    return {
      deviceId: fallbackId,
      publicKeySpki: null,
      publicKeyJwk: null,
      privateKey: null,
      publicKey: null
    };
  }

  try {
    if (!forceRotate) {
      const existing = await idbGet(KEY_STORE, PRIMARY_KEY_ID);
      if (
        existing &&
        existing.deviceId &&
        existing.publicKeySpki &&
        existing.privateKey &&
        existing.publicKey
      ) {
        try {
          localStorage.setItem(DEVICE_STORAGE_KEY, existing.deviceId);
        } catch (_) {}
        return existing;
      }
    }

    // Generate non-extractable ECDSA P-256 keypair
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      false, // non-extractable private key!
      ['sign', 'verify']
    );

    const spkiBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
    const jwkObj = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const publicKeySpki = bufferToBase64(spkiBuffer);

    // Deterministically derive a unique device_id from SHA-256(publicKeySpki)
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', spkiBuffer);
    const deviceId = 'dev_' + bufferToHex(hashBuffer).slice(0, 32);

    const record = {
      id: PRIMARY_KEY_ID,
      deviceId,
      publicKeySpki,
      publicKeyJwk: JSON.stringify(jwkObj),
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      createdAt: new Date().toISOString()
    };

    await idbPut(KEY_STORE, record);
    try {
      localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
    } catch (_) {}

    return record;
  } catch (err) {
    console.warn('IndexedDB WebCrypto keypair fallback:', err);
    const fallbackId = getOrCreateDeviceToken();
    return {
      deviceId: fallbackId,
      publicKeySpki: null,
      publicKeyJwk: null,
      privateKey: null,
      publicKey: null
    };
  }
}

/**
 * Force-generate a fresh hardware-bound ECDSA P-256 keypair
 */
export async function rotateHardwareKeyPair() {
  return getOrCreateHardwareKeyPair(true);
}

/**
 * Save short-lived, device-bound offline TOTP credential bundle in IndexedDB
 */
export async function saveOfflineCredentialBundle(bundle) {
  if (!bundle || !bundle.totp_secret || !bundle.student_id) return false;
  try {
    const expiresAt =
      bundle.secret_expires_at ||
      new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    const record = {
      key: 'active_student_bundle',
      student_id: bundle.student_id,
      student_number: bundle.student_number || '',
      full_name: bundle.full_name || '',
      device_id: bundle.device_id || bundle.device_token,
      device_token: bundle.device_token || bundle.device_id,
      registered_device_name: bundle.registered_device_name || getDeviceName(),
      totp_secret: bundle.totp_secret,
      secret_expires_at: expiresAt,
      workplaceGeofence: bundle.workplaceGeofence || null,
      cachedAt: new Date().toISOString()
    };
    await idbPut(CREDENTIAL_STORE, record);
    return true;
  } catch (err) {
    console.warn('Failed to save offline credential bundle:', err);
    return false;
  }
}

/**
 * Load short-lived offline credential bundle from IndexedDB and verify TTL + device binding
 */
export async function getOfflineCredentialBundle(currentDeviceId) {
  try {
    const record = await idbGet(CREDENTIAL_STORE, 'active_student_bundle');
    if (!record || !record.totp_secret) return null;

    if (currentDeviceId && record.device_id && record.device_id !== currentDeviceId) {
      return {
        expired: false,
        deviceMismatch: true,
        record
      };
    }

    if (record.secret_expires_at) {
      const expMs = new Date(record.secret_expires_at).getTime();
      if (!isNaN(expMs) && Date.now() > expMs) {
        await idbDelete(CREDENTIAL_STORE, 'active_student_bundle');
        return {
          expired: true,
          deviceMismatch: false,
          record: null
        };
      }
    }

    return {
      expired: false,
      deviceMismatch: false,
      record
    };
  } catch (_) {
    return null;
  }
}

/**
 * Clear stored offline credential bundle (e.g., on device unbind or logout)
 */
export async function clearOfflineCredentialBundle() {
  try {
    await idbDelete(CREDENTIAL_STORE, 'active_student_bundle');
  } catch (_) {}
}

/**
 * Compute 6-digit rolling TOTP code for a 30-second time step using WebCrypto HMAC-SHA256
 * Matches server computeTotpCodeForStep(secret, timeStep)
 */
export async function computeClientTotpCode(secret, timeStep) {
  const enc = new TextEncoder();
  const key = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(String(secret)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await window.crypto.subtle.sign('HMAC', key, enc.encode(`totp:${timeStep}`));
  const hex = bufferToHex(sigBuf);
  const num = parseInt(hex.slice(0, 8), 16) % 1000000;
  return String(num).padStart(6, '0');
}

/**
 * Build canonical string signed by the student device's non-extractable ECDSA P-256 private key
 * Matches server buildCanonicalQrSigningString
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
 * Legacy v1 HMAC signature helper
 */
export async function generateClientTotpSignature(secret, studentId, deviceToken, timestamp) {
  const message = `${studentId}:${deviceToken}:${timestamp}`;
  const enc = new TextEncoder();
  const key = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(String(secret)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await window.crypto.subtle.sign('HMAC', key, enc.encode(message));
  return bufferToHex(signatureBuffer);
}

/**
 * Generate a cryptographically random 96-bit single-use nonce
 */
function generateRandomNonce() {
  const bytes = new Uint8Array(12);
  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 12; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return bufferToHex(bytes);
}

/**
 * Generates the v2 dynamic QR payload signed by the device-bound non-extractable ECDSA P-256 private key.
 * Supports both:
 *   buildDynamicQrPayload({ secret, studentId, deviceId, mode, location })
 * and positional:
 *   buildDynamicQrPayload(secret, studentId, deviceToken, options)
 */
export async function buildDynamicQrPayload(secretOrOptions, studentIdArg, deviceTokenArg, extraOptions = {}) {
  let secret;
  let studentId;
  let deviceId;
  let mode = 'online';
  let location = null;

  if (typeof secretOrOptions === 'object' && secretOrOptions !== null) {
    secret = secretOrOptions.secret;
    studentId = secretOrOptions.studentId;
    deviceId = secretOrOptions.deviceId || secretOrOptions.deviceToken;
    mode = secretOrOptions.mode || 'online';
    location = secretOrOptions.location || null;
  } else {
    secret = secretOrOptions;
    studentId = studentIdArg;
    deviceId = deviceTokenArg;
    mode = extraOptions.mode || 'online';
    location = extraOptions.location || null;
  }

  if (!secret || !studentId || !deviceId) {
    throw new Error('Missing credentials for generating attendance QR code.');
  }

  const ts = Math.floor(Date.now() / 1000);
  const timeStep = Math.floor(ts / TOTP_STEP_SECONDS);
  const totpCode = await computeClientTotpCode(secret, timeStep);
  const nonce = generateRandomNonce();

  const normalizedLoc =
    location && location.lat != null && location.lng != null
      ? {
          lat: Number(Number(location.lat).toFixed(6)),
          lng: Number(Number(location.lng).toFixed(6)),
          acc: location.acc != null ? Math.round(Number(location.acc)) : null
        }
      : null;

  const canonicalStr = buildCanonicalQrSigningString({
    sid: studentId,
    did: deviceId,
    totp: totpCode,
    ts,
    nonce,
    mode,
    loc: normalizedLoc
  });

  const enc = new TextEncoder();
  let sigHex = null;

  // 1. Sign canonical payload with non-extractable ECDSA P-256 private key from IndexedDB
  try {
    const keyRecord = await getOrCreateHardwareKeyPair(false);
    if (keyRecord && keyRecord.privateKey) {
      const ecdsaSigBuf = await window.crypto.subtle.sign(
        { name: 'ECDSA', hash: { name: 'SHA-256' } },
        keyRecord.privateKey,
        enc.encode(canonicalStr)
      );
      sigHex = bufferToHex(ecdsaSigBuf);
    }
  } catch (err) {
    console.warn('ECDSA P-256 signing warning:', err);
  }

  // 2. Also compute HMAC-SHA256 authenticator
  const hmacKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(String(secret)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const hmacBuf = await window.crypto.subtle.sign('HMAC', hmacKey, enc.encode(canonicalStr));
  const hmacHex = bufferToHex(hmacBuf);

  return JSON.stringify({
    v: 2,
    sid: studentId,
    did: deviceId,
    dt: deviceId,
    c: totpCode,
    ts,
    n: nonce,
    mode,
    loc: normalizedLoc,
    sig: sigHex,
    hmac: hmacHex
  });
}

/**
 * Compute Haversine great-circle distance in meters between two GPS coordinates
 */
export function calculateHaversineMeters(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(Number(lat2) - Number(lat1));
  const dLon = toRad(Number(lon2) - Number(lon1));
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(Number(lat1))) *
      Math.cos(toRad(Number(lat2))) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
