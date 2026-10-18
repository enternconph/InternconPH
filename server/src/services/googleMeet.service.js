import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Service for Google Meet REST API v2
 * Official Endpoint: https://meet.googleapis.com/v2/spaces
 * Authorization Scopes: https://www.googleapis.com/auth/meetings.space.created
 */

// Cache for access token to reduce auth roundtrips
let cachedToken = null;
let tokenExpiryTime = 0;

/**
 * Load Google Service Account credentials from either an env variable JSON string,
 * a file path, or fallback to GOOGLE_APPLICATION_CREDENTIALS.
 */
function loadServiceAccountCredentials() {
  const rawKey = process.env.GOOGLE_MEET_SERVICE_ACCOUNT_KEY ||
                 process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
                 process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!rawKey) return null;

  try {
    const trimmed = rawKey.trim();
    if (trimmed.startsWith('{')) {
      return JSON.parse(trimmed);
    }
    // Check if it's a file path
    const resolvedPath = path.isAbsolute(trimmed) ? trimmed : path.resolve(process.cwd(), trimmed);
    if (fs.existsSync(resolvedPath)) {
      const content = fs.readFileSync(resolvedPath, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn('[Google Meet API] Warning: Failed to parse service account credentials:', err.message);
  }

  return null;
}

/**
 * Check if Google Meet API credentials exist in environment.
 * Supports Service Account (with domain-wide delegation) or OAuth2 Refresh Token.
 */
export function isGoogleMeetConfigured() {
  const sa = loadServiceAccountCredentials();
  if (sa && sa.client_email && sa.private_key) {
    return true;
  }

  const hasOAuth = Boolean(
    process.env.GOOGLE_MEET_CLIENT_ID &&
    process.env.GOOGLE_MEET_CLIENT_SECRET &&
    process.env.GOOGLE_MEET_REFRESH_TOKEN
  );

  return hasOAuth;
}

/**
 * Startup health check log (non-blocking, never crashes server)
 */
export function checkGoogleMeetConfigOnStartup() {
  if (isGoogleMeetConfigured()) {
    console.log('[Google Meet API] Auto-generation service is configured and ready.');
  } else {
    console.log('[Google Meet API] Notice: Google Meet API credentials not found in env. Online interviews will gracefully fall back to manual links (Zoom, Teams, or manual Meet links).');
  }
}

/**
 * Generate Base64URL string
 */
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Obtain an OAuth2 access token via Service Account JWT grant (supports Workspace Domain-Wide Delegation)
 */
async function getAccessTokenFromServiceAccount(sa) {
  const now = Math.floor(Date.now() / 1000);
  
  // Reuse token if still valid for at least 60 seconds
  if (cachedToken && tokenExpiryTime > now + 60) {
    return cachedToken;
  }

  const impersonatedUser = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL ||
                           process.env.GOOGLE_MEET_IMPERSONATED_USER ||
                           process.env.GOOGLE_WORKSPACE_USER;

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const claimSet = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/meetings.space.created',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  // If a Workspace user is configured for domain-wide delegation, set sub
  if (impersonatedUser) {
    claimSet.sub = impersonatedUser;
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaim = base64UrlEncode(JSON.stringify(claimSet));
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  signer.end();
  const signature = signer.sign(sa.private_key, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const assertion = `${signatureInput}.${signature}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Failed to authenticate service account with Google OAuth');
  }

  cachedToken = data.access_token;
  tokenExpiryTime = now + (data.expires_in || 3600);
  return cachedToken;
}

/**
 * Obtain an OAuth2 access token via User/Admin Refresh Token
 */
async function getAccessTokenFromRefreshToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && tokenExpiryTime > now + 60) {
    return cachedToken;
  }

  const clientId = process.env.GOOGLE_MEET_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_MEET_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_MEET_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google OAuth2 refresh token credentials incomplete');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Failed to refresh Google OAuth2 access token');
  }

  cachedToken = data.access_token;
  tokenExpiryTime = now + (data.expires_in || 3600);
  return cachedToken;
}

/**
 * Get valid Google OAuth access token
 */
async function getGoogleAccessToken() {
  const sa = loadServiceAccountCredentials();
  if (sa && sa.client_email && sa.private_key) {
    return await getAccessTokenFromServiceAccount(sa);
  }

  if (process.env.GOOGLE_MEET_REFRESH_TOKEN) {
    return await getAccessTokenFromRefreshToken();
  }

  throw new Error('No Google credentials (Service Account or Refresh Token) configured.');
}

/**
 * Call spaces.create on Google Meet REST API v2 with exponential backoff for rate limiting (429)
 * Endpoint: POST https://meet.googleapis.com/v2/spaces
 */
export async function createGoogleMeetSpace({ topic = 'OJT Interview', retryCount = 0 } = {}) {
  const maxRetries = 3;

  try {
    const accessToken = await getGoogleAccessToken();

    const response = await fetch('https://meet.googleapis.com/v2/spaces', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        config: {
          accessType: 'OPEN',
          entryPointAccess: 'ALL'
        }
      })
    });

    // Handle Rate Limiting (429) with exponential backoff
    if (response.status === 429 && retryCount < maxRetries) {
      const delayMs = Math.pow(2, retryCount) * 1000 + Math.floor(Math.random() * 500);
      console.warn(`[Google Meet API] Quota/Rate limited (429). Retrying in ${delayMs}ms (Attempt ${retryCount + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return await createGoogleMeetSpace({ topic, retryCount: retryCount + 1 });
    }

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.error?.message || data.error_description || `HTTP ${response.status}`;
      console.warn(`[Google Meet API] spaces.create failed (${response.status}):`, errMsg);
      return {
        success: false,
        meetLinkGenerated: false,
        error: errMsg
      };
    }

    // Success response contains meetingUri: e.g. "https://meet.google.com/xxx-yyyy-zzz"
    const meetingUri = data.meetingUri || (data.meetingCode ? `https://meet.google.com/${data.meetingCode}` : null);

    if (!meetingUri) {
      return {
        success: false,
        meetLinkGenerated: false,
        error: 'Google Meet API succeeded but did not return a valid meetingUri.'
      };
    }

    return {
      success: true,
      meetLinkGenerated: true,
      meetingUri,
      meetingCode: data.meetingCode || null,
      spaceName: data.name || null
    };
  } catch (err) {
    console.warn('[Google Meet API] Exception during spaces.create:', err.message);
    return {
      success: false,
      meetLinkGenerated: false,
      error: err.message
    };
  }
}
