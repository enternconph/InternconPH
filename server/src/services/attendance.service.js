/**
 * Attendance & OJT Hours Domain Service for InternConPH
 * Encapsulates all business logic, transactions, hours balancing, and notification dispatching.
 */

import pool, { withTransaction } from '../config/db.js';
import { emitUpdate } from '../config/socket.js';
import { sendNotification } from '../utils/notification.helper.js';
import { verifyTotpPayload } from '../utils/totp.helper.js';
import { checkEvaluationMilestones } from './certificate.service.js';

export class AttendanceService {
  /**
   * Certify or reject an attendance log with atomic hours reconciliation
   */
  static async verifyAttendanceRecord({ attendanceId, mentorId, mentorName, verifiedHours, status, notes = '' }) {
    if (!attendanceId) {
      throw new Error('Attendance ID is required.');
    }

    const validStatus = ['verified', 'rejected', 'pending'];
    if (!validStatus.includes(status)) {
      throw new Error(`Invalid status. Must be one of: [${validStatus.join(', ')}]`);
    }

    return await withTransaction(async (conn) => {
      // 1. Fetch current log with row lock for update
      const [logs] = await conn.query(
        `SELECT att.*, o.required_hours, o.rendered_hours AS current_ojt_rendered, 
                s.student_id, s.user_id AS student_user_id, s.first_name, s.last_name
         FROM ojt_attendance_logs att
         JOIN ojt_records o ON att.ojt_id = o.ojt_id
         JOIN students s ON o.student_id = s.student_id
         WHERE att.attendance_id = ? FOR UPDATE`,
        [attendanceId]
      );

      if (!logs || logs.length === 0) {
        const error = new Error('Attendance log not found.');
        error.status = 404;
        throw error;
      }

      const log = logs[0];
      const prevHours = parseFloat(log.hours_rendered) || 0;
      const newHours = verifiedHours !== undefined && verifiedHours !== null ? parseFloat(verifiedHours) : prevHours;

      if (isNaN(newHours) || newHours < 0 || newHours > 24) {
        const error = new Error('Hours rendered must be a valid number between 0 and 24.');
        error.status = 400;
        throw error;
      }

      // 2. Compute hours differential
      let diff = 0;
      if (status === 'verified') {
        diff = log.status === 'verified' ? (newHours - prevHours) : newHours;
      } else if (log.status === 'verified' && status !== 'verified') {
        // If transitioning from verified back to rejected/pending, subtract previous hours
        diff = -prevHours;
      }

      // 3. Update attendance record
      await conn.query(
        `UPDATE ojt_attendance_logs
         SET status = ?,
             hours_rendered = ?,
             mentor_notes = ?,
             verified_by = ?,
             verified_at = CASE WHEN ? = 'verified' THEN NOW() ELSE verified_at END
         WHERE attendance_id = ?`,
        [status, newHours, notes, mentorName || 'Workplace Mentor', status, attendanceId]
      );

      // 4. Update OJT Record and Student Hours if hours changed
      if (diff !== 0) {
        await conn.query(
          `UPDATE ojt_records 
           SET rendered_hours = GREATEST(0, rendered_hours + ?)
           WHERE ojt_id = ?`,
          [diff, log.ojt_id]
        );

        await conn.query(
          `UPDATE students 
           SET completed_ojt_hours = GREATEST(0, completed_ojt_hours + ?)
           WHERE student_id = ?`,
          [diff, log.student_id]
        );
      }

      // 5. Fetch updated rendered total
      const [ojtUpdated] = await conn.query(
        `SELECT ojt_id, required_hours, rendered_hours, status FROM ojt_records WHERE ojt_id = ?`,
        [log.ojt_id]
      );

      const totalRendered = ojtUpdated[0]?.rendered_hours || 0;
      const totalRequired = ojtUpdated[0]?.required_hours || 0;

      // 6. Broadcast Real-time WebSocket Event & Push Notification
      try {
        emitUpdate('ojt', log.ojt_id, 'attendance_verified', {
          attendance_id: attendanceId,
          status,
          hours_rendered: newHours,
          total_rendered: totalRendered,
          student_id: log.student_id
        });

        if (status === 'verified') {
          await sendNotification({
            userId: log.student_user_id,
            title: 'OJT Attendance Hours Credited',
            message: `Your mentor credited ${newHours.toFixed(2)} hours for ${log.log_date || 'your recent shift'}. Total progress: ${totalRendered.toFixed(1)} / ${totalRequired} hrs.`,
            type: 'ojt_progress',
            link: '/dashboard/student/ojt'
          });
          if (diff > 0) {
            checkEvaluationMilestones(log.ojt_id).catch(() => {});
          }
        }
      } catch (notifyErr) {
        console.warn('[AttendanceService] Notification dispatch warning:', notifyErr.message);
      }

      return {
        success: true,
        message: status === 'verified' 
          ? `Successfully certified ${newHours.toFixed(2)} hours for ${log.first_name} ${log.last_name}.`
          : `Attendance log marked as ${status}.`,
        attendanceId,
        diff,
        totalRendered,
        totalRequired,
        status
      };
    });
  }

  /**
   * Verify dynamic rotating TOTP QR payload with clock drift tolerance & device token lock
   */
  static verifyDynamicTotpQr({ payload, studentSecret, deviceToken }) {
    return verifyTotpPayload(payload, studentSecret, deviceToken);
  }
}
