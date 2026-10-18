import pool from '../config/db.js';
import { sendNotification } from '../utils/notification.helper.js';

let reminderInterval = null;

/**
 * Checks for scheduled interviews that will start within the next 5 minutes
 * and sends real-time notifications to both the student and the organization.
 */
export async function checkUpcomingInterviews() {
  try {
    const [interviews] = await pool.query(
      `SELECT i.interview_id, i.application_id, i.schedule_at, i.mode, i.meeting_link, i.location_or_link,
              ja.student_id, s.user_id as student_user_id, s.first_name as student_first_name, s.last_name as student_last_name,
              jp.title as job_title, jp.organization_id, ho.organization_name
       FROM interviews i
       JOIN job_applications ja ON i.application_id = ja.application_id
       JOIN job_postings jp ON ja.job_id = jp.job_id
       JOIN hiring_organizations ho ON jp.organization_id = ho.organization_id
       JOIN students s ON ja.student_id = s.student_id
       WHERE i.status = 'scheduled'
         AND (i.reminder_sent_5m IS NULL OR i.reminder_sent_5m = 0)`
    );

    if (!interviews || interviews.length === 0) return;

    const now = Date.now();
    // 5 minutes in milliseconds + 30s buffer for check interval timing
    const fiveMinutesMs = 5 * 60 * 1000 + 30 * 1000;
    // Allow interviews starting between -1 minute (just started) and +5.5 minutes
    const pastToleranceMs = -60 * 1000;

    for (const interview of interviews) {
      if (!interview.schedule_at) continue;

      const schedTime = new Date(interview.schedule_at).getTime();
      const diffMs = schedTime - now;

      if (diffMs <= fiveMinutesMs && diffMs >= pastToleranceMs) {
        // Mark as sent immediately to prevent duplicate sends across concurrent loops
        await pool.query(
          'UPDATE interviews SET reminder_sent_5m = 1 WHERE interview_id = ?',
          [interview.interview_id]
        );

        const studentFullName = `${interview.student_first_name || ''} ${interview.student_last_name || ''}`.trim() || 'Candidate';
        const orgName = interview.organization_name || 'Organization';
        const jobTitle = interview.job_title || 'Position';

        // 1. Send 5-minute reminder to the student
        if (interview.student_user_id) {
          await sendNotification({
            userId: interview.student_user_id,
            senderName: orgName,
            title: 'Upcoming Interview in 5 Minutes',
            message: `Your interview for "${jobTitle}" with ${orgName} will begin in 5 minutes! Click to view details and join.`,
            type: 'job',
            link: '/dashboard/student/applications',
            relatedType: 'interview',
            relatedId: interview.interview_id,
            meta: {
              interview_id: interview.interview_id,
              meeting_link: interview.meeting_link,
              mode: interview.mode
            }
          });
        }

        // 2. Send 5-minute reminder to the organization users
        const [orgUsers] = await pool.query(
          `SELECT DISTINCT u.user_id
           FROM users u
           WHERE u.user_id IN (
             SELECT os.user_id FROM organization_staff os WHERE os.organization_id = ? AND os.user_id IS NOT NULL
             UNION
             SELECT oreg.submitted_by FROM organization_registrations oreg WHERE oreg.organization_id = ? AND oreg.submitted_by IS NOT NULL
             UNION
             SELECT u2.user_id FROM users u2 JOIN hiring_organizations ho ON u2.email = ho.contact_email WHERE ho.organization_id = ? AND u2.user_id IS NOT NULL
           )`,
          [interview.organization_id, interview.organization_id, interview.organization_id]
        );

        for (const orgUser of orgUsers) {
          if (orgUser.user_id) {
            await sendNotification({
              userId: orgUser.user_id,
              senderName: 'Interview Reminder',
              title: 'Upcoming Interview in 5 Minutes',
              message: `Your interview with ${studentFullName} for "${jobTitle}" will begin in 5 minutes.`,
              type: 'job',
              link: '/dashboard/organization/interviews',
              relatedType: 'interview',
              relatedId: interview.interview_id,
              meta: {
                interview_id: interview.interview_id,
                meeting_link: interview.meeting_link,
                mode: interview.mode
              }
            });
          }
        }

        console.log(`[InterviewReminder] 5-minute reminder dispatched for interview #${interview.interview_id} (${studentFullName} - ${orgName})`);
      }
    }
  } catch (error) {
    console.error('[InterviewReminder Error]', error.message);
  }
}

/**
 * Starts the background reminder scheduler (runs every 30 seconds).
 */
export function startInterviewReminderService() {
  if (reminderInterval) return;

  console.log('[InterviewReminder] Service started (checking every 30 seconds)');
  // Run once immediately on start
  checkUpcomingInterviews().catch((err) => console.error('[InterviewReminder Initial Run]', err.message));

  reminderInterval = setInterval(() => {
    checkUpcomingInterviews().catch((err) => console.error('[InterviewReminder Interval Run]', err.message));
  }, 30000);
}

export function stopInterviewReminderService() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
    console.log('[InterviewReminder] Service stopped');
  }
}
