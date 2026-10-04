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
  // BYPASS GOOGLE MEET API
  // User requested to bypass Google Meet integration for now due to token invalidation.
  // Returning null forces the system to gracefully fall back to the manual meeting link/location.
  console.log('[Google Meet API] Bypassing API and returning null to allow manual link fallback.');
  return null;
}

/**
 * Helper to check if Google Meet credentials are configured.
 * @returns {boolean}
 */
export function isGoogleMeetConfigured() {
  // BYPASS GOOGLE MEET API
  // Returning false so the frontend disables the Google Meet UI integration completely.
  return false;
}

export default {
  createMeetSpace,
  isGoogleMeetConfigured
};
