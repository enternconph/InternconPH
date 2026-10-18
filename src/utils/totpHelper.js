/**
 * Client-side Cryptographic TOTP + Device Hardware Token Utility
 * Used for generating dynamic, time-bound, screenshot-resistant attendance QR codes.
 */

const DEVICE_STORAGE_KEY = 'internconph_attendance_device_token';

/**
 * Retrieve or generate a persistent hardware device token on this browser/device
 */
export function getOrCreateDeviceToken() {
  try {
    let token = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (!token || token.length < 32) {
      const array = new Uint8Array(24);
      if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(array);
      } else {
        // Fallback random
        for (let i = 0; i < 24; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
      }
      token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      localStorage.setItem(DEVICE_STORAGE_KEY, token);
    }
    return token;
  } catch (err) {
    console.warn('LocalStorage error reading device token:', err);
    return 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  }
}

/**
 * Clear local device token (for device reset/re-binding)
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
 * Human-readable device/browser name
 */
export function getDeviceName() {
  const ua = navigator.userAgent || '';
  let os = 'Unknown Device';
  if (/Windows/i.test(ua)) os = 'Windows PC';
  else if (/Macintosh|Mac OS/i.test(ua)) os = 'Mac Desktop';
  else if (/Android/i.test(ua)) os = 'Android Mobile';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS Device';
  else if (/Linux/i.test(ua)) os = 'Linux Device';

  let browser = 'Browser';
  if (/Chrome|CriOS/i.test(ua) && !/Edge|Edg/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Edge|Edg/i.test(ua)) browser = 'Edge';

  return `${os} (${browser})`;
}

/**
 * Computes HMAC-SHA256 signature in browser using SubtleCrypto
 * message: `${studentId}:${deviceToken}:${timestamp}`
 * secret: 64-char hex string as UTF-8 bytes
 */
export async function generateClientTotpSignature(secret, studentId, deviceToken, timestamp) {
  const message = `${studentId}:${deviceToken}:${timestamp}`;
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);

  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Cryptography API is not available on this browser.');
  }

  const key = await window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await window.crypto.subtle.sign('HMAC', key, enc.encode(message));
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates the full dynamic QR payload with a fresh timestamp and HMAC-SHA256 signature
 */
export async function buildDynamicQrPayload(secret, studentId, deviceToken) {
  if (!secret || !studentId || !deviceToken) {
    throw new Error('Missing credentials for generating attendance QR code.');
  }

  const ts = Math.floor(Date.now() / 1000);
  const sig = await generateClientTotpSignature(secret, studentId, deviceToken, ts);

  return JSON.stringify({
    v: 1,
    sid: studentId,
    dt: deviceToken,
    ts,
    sig
  });
}
