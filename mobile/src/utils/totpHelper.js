import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const DEVICE_STORAGE_KEY = '@internconph_attendance_device_token';
const CREDS_CACHE_KEY = '@internconph_qr_credentials';
export const TOTP_STEP_SECONDS = 30;

/**
 * Pure JavaScript SHA-256 implementation (FIPS 180-4)
 */
function sha256Bytes(bytes) {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const bitLength = bytes.length * 8;
  const paddingLength = (bytes.length % 64 < 56) ? (56 - bytes.length % 64) : (120 - bytes.length % 64);
  const totalLength = bytes.length + paddingLength + 8;
  const padded = new Uint8Array(totalLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const highBits = Math.floor(bitLength / 0x100000000);
  const lowBits = bitLength >>> 0;
  padded[totalLength - 8] = (highBits >>> 24) & 0xff;
  padded[totalLength - 7] = (highBits >>> 16) & 0xff;
  padded[totalLength - 6] = (highBits >>> 8) & 0xff;
  padded[totalLength - 5] = highBits & 0xff;
  padded[totalLength - 4] = (lowBits >>> 24) & 0xff;
  padded[totalLength - 3] = (lowBits >>> 16) & 0xff;
  padded[totalLength - 2] = (lowBits >>> 8) & 0xff;
  padded[totalLength - 1] = lowBits & 0xff;

  const W = new Int32Array(64);
  const view = new DataView(padded.buffer);

  for (let i = 0; i < totalLength; i += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = view.getInt32(i + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = (rightRotate(W[t - 15], 7) ^ rightRotate(W[t - 15], 18) ^ (W[t - 15] >>> 3));
      const s1 = (rightRotate(W[t - 2], 17) ^ rightRotate(W[t - 2], 19) ^ (W[t - 2] >>> 10));
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
    }

    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];

    for (let t = 0; t < 64; t++) {
      const S1 = (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25));
      const ch = ((e & f) ^ (~e & g));
      const temp1 = (h + S1 + ch + K[t] + W[t]) | 0;
      const S0 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22));
      const maj = ((a & b) ^ (a & c) ^ (b & c));
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    H[0] = (H[0] + a) | 0;
    H[1] = (H[1] + b) | 0;
    H[2] = (H[2] + c) | 0;
    H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0;
    H[5] = (H[5] + f) | 0;
    H[6] = (H[6] + g) | 0;
    H[7] = (H[7] + h) | 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) {
    outView.setInt32(i * 4, H[i], false);
  }
  return out;
}

function rightRotate(x, n) {
  return (x >>> n) | (x << (32 - n));
}

function stringToUtf8(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      i++;
      code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }
  return new Uint8Array(bytes);
}

/**
 * Pure JavaScript HMAC-SHA256 (RFC 2104)
 */
export function hmacSha256(keyStr, messageStr) {
  let key = stringToUtf8(String(keyStr));
  const message = stringToUtf8(String(messageStr));
  const blockSize = 64;

  if (key.length > blockSize) {
    key = sha256Bytes(key);
  }

  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(key);

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);

  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = paddedKey[i] ^ 0x5c;
    iKeyPad[i] = paddedKey[i] ^ 0x36;
  }

  const innerMsg = new Uint8Array(blockSize + message.length);
  innerMsg.set(iKeyPad, 0);
  innerMsg.set(message, blockSize);
  const innerHash = sha256Bytes(innerMsg);

  const outerMsg = new Uint8Array(blockSize + 32);
  outerMsg.set(oKeyPad, 0);
  outerMsg.set(innerHash, blockSize);
  const outerHash = sha256Bytes(outerMsg);

  return Array.from(outerHash).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a random hex string of given length
 */
function randomHex(charLen = 24) {
  const chars = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < charLen; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/**
 * Retrieve or generate a persistent hardware device ID on this Android handset
 */
export async function getOrCreateDeviceToken() {
  try {
    let token = await AsyncStorage.getItem(DEVICE_STORAGE_KEY);
    if (!token || token.length < 24) {
      token = `andr_${randomHex(40)}`;
      await AsyncStorage.setItem(DEVICE_STORAGE_KEY, token);
    }
    return token;
  } catch (err) {
    console.warn('AsyncStorage error reading device token:', err);
    return `dev_rn_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
  }
}

/**
 * Reset local device token (for device re-binding via 6-digit OTP)
 */
export async function resetLocalDeviceToken() {
  try {
    const newToken = `andr_${randomHex(40)}`;
    await AsyncStorage.setItem(DEVICE_STORAGE_KEY, newToken);
    return newToken;
  } catch (_) {
    return `andr_${randomHex(40)}`;
  }
}

/**
 * Save short-lived (72h TTL) device-bound offline credential bundle
 */
export async function saveOfflineCredentials(bundle) {
  try {
    const expiresAt =
      bundle.secret_expires_at ||
      new Date(Date.now() + 72 * 3600 * 1000).toISOString();
    await AsyncStorage.setItem(
      CREDS_CACHE_KEY,
      JSON.stringify({
        studentId: bundle.studentId || bundle.student_id,
        studentName: bundle.studentName || bundle.full_name || 'OJT Student',
        qrSecret: bundle.qrSecret || bundle.totp_secret,
        deviceToken: bundle.deviceToken || bundle.device_id || bundle.device_token,
        deviceBound: true,
        secretExpiresAt: expiresAt,
        workplaceGeofence: bundle.workplaceGeofence || null,
        savedAt: new Date().toISOString()
      })
    );
  } catch (_) {}
}

/**
 * Load and validate cached offline credentials (checks device binding and 72h expiry)
 */
export async function loadOfflineCredentials(currentDeviceToken) {
  try {
    const raw = await AsyncStorage.getItem(CREDS_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached || !cached.qrSecret || !cached.studentId) return null;

    if (currentDeviceToken && cached.deviceToken && cached.deviceToken !== currentDeviceToken) {
      return { deviceMismatch: true, expired: false, cached };
    }

    if (cached.secretExpiresAt) {
      const expMs = new Date(cached.secretExpiresAt).getTime();
      if (!isNaN(expMs) && Date.now() > expMs) {
        await AsyncStorage.removeItem(CREDS_CACHE_KEY);
        return { deviceMismatch: false, expired: true, cached: null };
      }
    }

    return { deviceMismatch: false, expired: false, cached };
  } catch (_) {
    return null;
  }
}

export async function clearOfflineCredentials() {
  try {
    await AsyncStorage.removeItem(CREDS_CACHE_KEY);
  } catch (_) {}
}

/**
 * Human-readable Android handset label
 */
export function getDeviceName() {
  const brand = Platform.constants?.Brand || Platform.constants?.Manufacturer || 'Android';
  const model = Platform.constants?.Model || 'Handset';
  const rel = Platform.Version ? `API ${Platform.Version}` : '';
  return `${brand} ${model} (${rel || 'React Native'})`.trim();
}

/**
 * Deterministically compute 6-digit TOTP code for a 30-second time step
 * Matches server computeTotpCodeForStep(secret, timeStep)
 */
export function computeClientTotpCode(secret, timeStep) {
  const hex = hmacSha256(String(secret), `totp:${timeStep}`);
  const num = parseInt(hex.slice(0, 8), 16) % 1000000;
  return String(num).padStart(6, '0');
}

/**
 * Build canonical v2 signing string matching server buildCanonicalQrSigningString
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
 * Generates the v2 dynamic QR payload with 30s TOTP, single-use Nonce, GPS telemetry, and device-bound signature
 */
export async function buildDynamicQrPayload(secret, studentId, deviceToken, options = {}) {
  if (!secret || !studentId || !deviceToken) {
    throw new Error('Missing credentials for generating attendance QR code.');
  }

  const ts = Math.floor(Date.now() / 1000);
  const timeStep = Math.floor(ts / TOTP_STEP_SECONDS);
  const totpCode = computeClientTotpCode(secret, timeStep);
  const nonce = randomHex(24);
  const mode = options.mode === 'offline' ? 'offline' : 'online';
  const loc =
    options.location && options.location.lat != null && options.location.lng != null
      ? {
          lat: Number(Number(options.location.lat).toFixed(6)),
          lng: Number(Number(options.location.lng).toFixed(6)),
          acc: options.location.acc != null ? Math.round(Number(options.location.acc)) : null
        }
      : null;

  const canonicalStr = buildCanonicalQrSigningString({
    sid: studentId,
    did: deviceToken,
    totp: totpCode,
    ts,
    nonce,
    mode,
    loc
  });

  const hmac = hmacSha256(String(secret), canonicalStr);

  return JSON.stringify({
    v: 2,
    sid: studentId,
    did: deviceToken,
    dt: deviceToken,
    c: totpCode,
    ts,
    n: nonce,
    mode,
    loc,
    hmac
  });
}

/**
 * Compute Haversine distance in meters between two GPS coordinates
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
