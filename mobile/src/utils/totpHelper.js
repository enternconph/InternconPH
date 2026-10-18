import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const DEVICE_STORAGE_KEY = '@internconph_attendance_device_token';

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

  // Append 64-bit big endian length
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
function hmacSha256(keyStr, messageStr) {
  let key = stringToUtf8(keyStr);
  const message = stringToUtf8(messageStr);
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
 * Retrieve or generate a persistent hardware device token on this mobile device
 */
export async function getOrCreateDeviceToken() {
  try {
    let token = await AsyncStorage.getItem(DEVICE_STORAGE_KEY);
    if (!token || token.length < 32) {
      const chars = '0123456789abcdef';
      let rand = '';
      for (let i = 0; i < 48; i++) {
        rand += chars[Math.floor(Math.random() * chars.length)];
      }
      token = `andr_${rand}`;
      await AsyncStorage.setItem(DEVICE_STORAGE_KEY, token);
    }
    return token;
  } catch (err) {
    console.warn('AsyncStorage error reading device token:', err);
    return `dev_rn_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
  }
}

/**
 * Reset local device token (for device re-binding)
 */
export async function resetLocalDeviceToken() {
  try {
    await AsyncStorage.removeItem(DEVICE_STORAGE_KEY);
    return await getOrCreateDeviceToken();
  } catch (_) {
    return null;
  }
}

/**
 * Human-readable device name for mobile
 */
export function getDeviceName() {
  const os = Platform.OS === 'android' ? 'Android Device' : 'iOS Device';
  return `${os} (React Native App v1.0)`;
}

/**
 * Generates the full dynamic QR payload with a fresh timestamp and HMAC-SHA256 signature
 */
export async function buildDynamicQrPayload(secret, studentId, deviceToken) {
  if (!secret || !studentId || !deviceToken) {
    throw new Error('Missing credentials for generating attendance QR code.');
  }

  const ts = Math.floor(Date.now() / 1000);
  const message = `${studentId}:${deviceToken}:${ts}`;
  const sig = hmacSha256(secret, message);

  return JSON.stringify({
    v: 1,
    sid: studentId,
    dt: deviceToken,
    ts,
    sig
  });
}
