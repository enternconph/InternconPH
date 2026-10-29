import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure env variables are loaded if not already
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

let lastMeetError = null;

export function getLastMeetError() {
  return lastMeetError;
}

/**
 * Creates and configures a Google OAuth2 client with refresh token credentials.
 * Works with free personal @gmail.com accounts via Google Calendar API v3.
 * @returns {google.auth.OAuth2 | null}
 */
function getOAuth2Client() {
  const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_MEET_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_MEET_CLIENT_SECRET || '').trim();
  const refreshToken = (process.env.GOOGLE_REFRESH_TOKEN || process.env.GOOGLE_MEET_REFRESH_TOKEN || '').trim();

  if (!clientId || !clientSecret || !refreshToken) {
    lastMeetError = 'Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN in environment variables.';
    console.warn(`[Google Meet] ${lastMeetError}`);
    return null;
  }

  const redirectUri =
    (process.env.GOOGLE_REDIRECT_URI || '').trim() ||
    'https://developers.google.com/oauthplayground';

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  return oauth2Client;
}

/**
 * Normalizes a schedule datetime input into valid ISO 8601 start & end timestamps (Asia/Manila default).
 */
function resolveEventWindow(startTime, durationMinutes = 60) {
  let startDate = null;

  if (startTime) {
    const raw = String(startTime).trim();
    // Handle HTML datetime-local strings without timezone (e.g. "2026-10-30T10:00")
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(raw)) {
      const normalized = raw.length === 16 ? `${raw}:00+08:00` : `${raw}+08:00`;
      const parsed = new Date(normalized);
      if (!isNaN(parsed.getTime())) startDate = parsed;
    } else {
      const parsed = new Date(raw);
      if (!isNaN(parsed.getTime())) startDate = parsed;
    }
  }

  if (!startDate) {
    startDate = new Date(Date.now() + 60 * 60 * 1000);
  }

  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  return {
    startIso: startDate.toISOString(),
    endIso: endDate.toISOString()
  };
}

/**
 * Creates a real Google Meet room using Google Calendar API v3 (`events.insert` + `hangoutsMeet`).
 * Unlike standalone Meet REST API v2 (`/v2/spaces` which requires paid Google Workspace),
 * Calendar API v3 `conferenceDataVersion: 1` works natively on free personal @gmail.com accounts!
 *
 * @param {Object} options
 * @param {string} [options.topic]
 * @param {string} [options.description]
 * @param {string|Date} [options.startTime]
 * @param {number} [options.durationMinutes=60]
 * @param {string[]} [options.attendeeEmails=[]]
 * @param {number} [options.retryCount=0]
 * @returns {Promise<{ meetingUri: string, meetingCode: string, name: string, calendarEventLink?: string } | null>}
 */
export async function createMeetSpace({
  topic = 'InternConPH OJT Interview',
  description = 'Online OJT interview scheduled via InternConPH.',
  startTime = null,
  durationMinutes = 60,
  attendeeEmails = [],
  retryCount = 0
} = {}) {
  lastMeetError = null;

  try {
    const oauth2Client = getOAuth2Client();
    if (!oauth2Client) {
      return null;
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const { startIso, endIso } = resolveEventWindow(startTime, durationMinutes);

    const validAttendees = Array.from(
      new Set(
        (Array.isArray(attendeeEmails) ? attendeeEmails : [])
          .map(e => String(e || '').trim().toLowerCase())
          .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      )
    ).map(email => ({ email }));

    const buildRequestBody = (includeAttendees) => ({
      summary: topic || 'InternConPH OJT Interview',
      description: description || 'Online OJT interview scheduled via InternConPH.',
      start: {
        dateTime: startIso,
        timeZone: 'Asia/Manila'
      },
      end: {
        dateTime: endIso,
        timeZone: 'Asia/Manila'
      },
      ...(includeAttendees && validAttendees.length > 0 ? { attendees: validAttendees } : {}),
      conferenceData: {
        createRequest: {
          requestId: `interncon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    });

    let res;
    try {
      res = await calendar.events.insert({
        calendarId: 'primary',
        conferenceDataVersion: 1,
        sendUpdates: validAttendees.length > 0 ? 'all' : 'none',
        requestBody: buildRequestBody(true)
      });
    } catch (insertErr) {
      // Retry on 429 rate limits (up to 3 attempts)
      const status = insertErr?.code || insertErr?.response?.status;
      if (status === 429 && retryCount < 3) {
        const backoffMs = Math.pow(2, retryCount) * 1000 + Math.random() * 500;
        console.warn(`[Google Meet] 429 Rate limited. Retrying ${retryCount + 1}/3 in ${Math.round(backoffMs)}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        return await createMeetSpace({
          topic,
          description,
          startTime,
          durationMinutes,
          attendeeEmails,
          retryCount: retryCount + 1
        });
      }

      // If inviting external attendees hit a quota restriction, retry creating the Meet room without attendees
      if (validAttendees.length > 0 && status && status !== 401 && status !== 403) {
        console.warn('[Google Meet] Retrying Calendar Meet room creation without attendee email invites:', insertErr.message);
        res = await calendar.events.insert({
          calendarId: 'primary',
          conferenceDataVersion: 1,
          sendUpdates: 'none',
          requestBody: buildRequestBody(false)
        });
      } else {
        throw insertErr;
      }
    }

    const data = res?.data || {};
    const videoEntry = data.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video');
    const meetingUri = data.hangoutLink || videoEntry?.uri || null;

    if (!meetingUri) {
      lastMeetError = 'Google Calendar event was created, but no Google Meet hangoutLink was returned.';
      console.warn('[Google Meet] Missing hangoutLink in response:', data);
      return null;
    }

    const meetingCode =
      data.conferenceData?.conferenceId ||
      meetingUri.replace(/^https?:\/\/meet\.google\.com\//i, '').split('?')[0] ||
      '';
    const name = data.id || '';

    console.log(`[Google Meet] Successfully generated Meet link via Calendar API: ${meetingUri} (code: ${meetingCode})`);

    return {
      meetingUri,
      meetingCode,
      name,
      calendarEventLink: data.htmlLink || null
    };
  } catch (err) {
    const apiMsg =
      err?.response?.data?.error?.message ||
      err?.response?.data?.error_description ||
      err?.message ||
      'Unknown Google Calendar API error';
    lastMeetError = apiMsg;
    console.warn('[Google Meet] Failed to create Google Meet link via Calendar API:', apiMsg);
    return null;
  }
}

/**
 * Helper to check if Google OAuth2 credentials are configured.
 * @returns {boolean}
 */
export function isGoogleMeetConfigured() {
  const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_MEET_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_MEET_CLIENT_SECRET || '').trim();
  const refreshToken = (process.env.GOOGLE_REFRESH_TOKEN || process.env.GOOGLE_MEET_REFRESH_TOKEN || '').trim();
  return !!(clientId && clientSecret && refreshToken);
}

export default {
  createMeetSpace,
  isGoogleMeetConfigured,
  getLastMeetError
};
