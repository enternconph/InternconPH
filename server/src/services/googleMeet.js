import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure env variables are loaded if not already
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

/**
 * Creates and configures a Google OAuth2 client with refresh token credentials.
 * @returns {google.auth.OAuth2 | null}
 */
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_MEET_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_MEET_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || process.env.GOOGLE_MEET_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.warn('[Google Meet API] Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN.');
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'http://localhost:3000/api/auth/google/callback'
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  return oauth2Client;
}

/**
 * Calls Google Meet API v2 (POST https://meet.googleapis.com/v2/spaces) to create a space.
 * Includes retry logic with exponential backoff for HTTP 429 responses (max 3 retries).
 *
 * @param {Object} options
 * @param {number} [options.retryCount=0]
 * @returns {Promise<{ meetingUri: string, meetingCode: string, name: string } | null>}
 */
export async function createMeetSpace({ retryCount = 0 } = {}) {
  try {
    const oauth2Client = getOAuth2Client();
    if (!oauth2Client) {
      return null;
    }

    const tokenResponse = await oauth2Client.getAccessToken();
    const accessToken = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token;

    if (!accessToken) {
      console.warn('[Google Meet API] Failed to obtain access token from OAuth2 client.');
      return null;
    }

    const response = await fetch('https://meet.googleapis.com/v2/spaces', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    // Handle 429 Rate Limit with exponential backoff (max 3 retries)
    if (response.status === 429) {
      if (retryCount < 3) {
        const backoffMs = Math.pow(2, retryCount) * 1000 + Math.random() * 500;
        console.warn(`[Google Meet API] 429 Rate limited. Retrying attempt ${retryCount + 1}/3 after ${Math.round(backoffMs)}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        return await createMeetSpace({ retryCount: retryCount + 1 });
      } else {
        console.warn('[Google Meet API] 429 Rate limit max retries (3) exceeded.');
        return null;
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[Google Meet API] spaces.create failed with HTTP ${response.status}:`, errorText);
      return null;
    }

    const data = await response.json();

    if (!data.meetingUri) {
      console.warn('[Google Meet API] Response payload missing meetingUri:', data);
      return null;
    }

    const meetingUri = data.meetingUri;
    const meetingCode = data.meetingCode || meetingUri.split('/').pop() || '';
    const name = data.name || '';

    console.log(`[Google Meet API] Successfully generated space: ${meetingUri} (code: ${meetingCode})`);

    return {
      meetingUri,
      meetingCode,
      name
    };
  } catch (err) {
    console.warn('[Google Meet API] Exception during createMeetSpace:', err.message);
    return null;
  }
}

/**
 * Helper to check if Google Meet credentials are configured.
 * @returns {boolean}
 */
export function isGoogleMeetConfigured() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_MEET_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_MEET_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || process.env.GOOGLE_MEET_REFRESH_TOKEN;
  return !!(clientId && clientSecret && refreshToken);
}

export default {
  createMeetSpace,
  isGoogleMeetConfigured
};
