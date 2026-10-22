/**
 * Attendance HTTP Controller for InternConPH
 * Handles HTTP requests for DTR certification, hours reconciliation, and QR verification.
 */

import { AttendanceService } from '../services/attendance.service.js';

export class AttendanceController {
  /**
   * PUT /api/org/attendance/:id
   */
  static async verifyAttendance(req, res) {
    try {
      const attendanceId = req.params.id;
      const { hours_rendered, status, mentor_notes } = req.body;

      const result = await AttendanceService.verifyAttendanceRecord({
        attendanceId,
        mentorId: req.user.user_id,
        mentorName: req.user.full_name,
        verifiedHours: hours_rendered,
        status: status || 'verified',
        notes: mentor_notes || ''
      });

      return res.json(result);
    } catch (err) {
      console.error('[AttendanceController.verifyAttendance Error]', err);
      return res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Failed to update attendance record.'
      });
    }
  }
}
