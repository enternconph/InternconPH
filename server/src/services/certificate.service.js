import pool from '../config/db.js';
import { sendNotification } from '../utils/notification.helper.js';
import { emitUpdate } from '../config/socket.js';

/**
 * Checks eligibility and automatically generates an official OJT completion certificate.
 * Conditions required:
 *  1. OJT Status is 'completed' OR rendered_hours >= required_hours
 *  2. Organization Evaluation has been completed and submitted in ojt_performance_records
 *
 * Side-effects:
 *  - Generates unique certificate in ojt_certificates
 *  - Automatically attaches certificate to student's Career Portfolio (portfolio_items)
 *  - Dispatches student notification and socket update
 *  - Strictly prevents duplicate generation
 */
export async function checkAndGenerateCertificate(ojtId) {
  try {
    if (!ojtId) return { success: false, message: 'Invalid ojt_id provided.' };

    // 1. Fetch OJT record with student, program, institution, and organization details
    const [rows] = await pool.query(
      `SELECT o.*, 
              s.user_id as student_user_id, s.first_name, s.last_name, s.student_number, s.program_id as student_program_id,
              p.program_name, p.program_code,
              inst.institution_id, inst.institution_name,
              ho.organization_id, ho.organization_name
       FROM ojt_records o
       JOIN students s ON o.student_id = s.student_id
       LEFT JOIN programs p ON s.program_id = p.program_id
       JOIN institutions inst ON s.institution_id = inst.institution_id
       JOIN hiring_organizations ho ON o.organization_id = ho.organization_id
       WHERE o.ojt_id = ?`,
      [ojtId]
    );

    if (rows.length === 0) {
      return { success: false, message: 'OJT record not found.' };
    }

    const ojt = rows[0];

    // 2. Check if hours fulfilled and ensure status is completed
    const reqHours = Number(ojt.required_hours) || 600;
    const renHours = Number(ojt.rendered_hours) || 0;
    const isHoursFulfilled = renHours >= reqHours;
    const isCompletedStatus = ojt.status === 'completed';

    if (!isHoursFulfilled && !isCompletedStatus) {
      return {
        success: false,
        reason: 'hours_incomplete',
        message: `OJT hours incomplete (${renHours}/${reqHours} hrs).`
      };
    }

    // If hours fulfilled but status not yet flipped, flip it now
    if (isHoursFulfilled && !isCompletedStatus) {
      await pool.query(
        "UPDATE ojt_records SET status = 'completed', end_date = COALESCE(end_date, CURRENT_DATE), updated_at = NOW() WHERE ojt_id = ?",
        [ojtId]
      );
      ojt.status = 'completed';
    }

    // 3. Check if Organization FINAL Evaluation is completed (Midterm alone does not issue completion certificate)
    const [evalRows] = await pool.query(
      "SELECT record_id, evaluation_period, rating, comments, score_details, evaluated_at FROM ojt_performance_records WHERE ojt_id = ? AND evaluation_period = 'final' ORDER BY evaluated_at DESC LIMIT 1",
      [ojtId]
    );

    if (evalRows.length === 0) {
      return {
        success: false,
        reason: 'evaluation_pending',
        message: 'Final organization evaluation has not been completed yet.'
      };
    }

    const evalRecord = evalRows[0];

    // Optional: fetch midterm rating if available for enriched certificate metadata
    const [midtermRows] = await pool.query(
      "SELECT rating FROM ojt_performance_records WHERE ojt_id = ? AND evaluation_period = 'midterm' ORDER BY evaluated_at DESC LIMIT 1",
      [ojtId]
    );
    const midtermRating = midtermRows.length > 0 ? midtermRows[0].rating : null;

    // 4. Check if Certificate already exists (Prevent Duplicates)
    const [existingCerts] = await pool.query(
      'SELECT * FROM ojt_certificates WHERE ojt_id = ?',
      [ojtId]
    );

    if (existingCerts.length > 0) {
      return {
        success: true,
        certificate: existingCerts[0],
        alreadyExisted: true,
        message: 'Certificate already generated for this OJT record.'
      };
    }

    // 5. Generate unique certificate serial code
    const currentYear = new Date().getFullYear();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const certCode = `CERT-OJT-${currentYear}-${String(ojtId).padStart(4, '0')}-${randomSuffix}`;
    const studentFullName = `${ojt.first_name} ${ojt.last_name}`;
    const completionDate = ojt.end_date || new Date().toISOString().split('T')[0];

    const certificatePayload = {
      certificate_code: certCode,
      ojt_id: ojtId,
      student_id: ojt.student_id,
      student_name: studentFullName,
      student_number: ojt.student_number,
      program_name: ojt.program_name || 'Degree Program',
      program_code: ojt.program_code || 'DEG',
      institution_name: ojt.institution_name,
      organization_name: ojt.organization_name,
      required_hours: reqHours,
      rendered_hours: renHours,
      midterm_rating: midtermRating,
      evaluation_rating: evalRecord.rating,
      completion_date: completionDate,
      issued_at: new Date().toISOString()
    };

    // 6. Insert certificate record
    const [insertResult] = await pool.query(
      `INSERT INTO ojt_certificates (
        certificate_code, ojt_id, student_id, institution_id, organization_id, program_id,
        student_name, student_number, program_name, institution_name, organization_name,
        rendered_hours, required_hours, evaluation_rating, completion_date, issued_at, certificate_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [
        certCode,
        ojtId,
        ojt.student_id,
        ojt.institution_id,
        ojt.organization_id,
        ojt.student_program_id || null,
        studentFullName,
        ojt.student_number || null,
        ojt.program_name || null,
        ojt.institution_name,
        ojt.organization_name,
        renHours,
        reqHours,
        evalRecord.rating,
        completionDate,
        JSON.stringify(certificatePayload)
      ]
    );

    const certificateId = insertResult.insertId;

    // 7. Automatically add to student's Career Portfolio
    let portfolioId = null;
    const [portfolioRows] = await pool.query(
      'SELECT portfolio_id FROM student_portfolios WHERE student_id = ? LIMIT 1',
      [ojt.student_id]
    );

    if (portfolioRows.length > 0) {
      portfolioId = portfolioRows[0].portfolio_id;
    } else {
      const [newPortfolio] = await pool.query(
        `INSERT INTO student_portfolios (student_id, title, summary, created_at, updated_at)
         VALUES (?, 'Verified Career Portfolio & Credentials', 'Official practical training competencies, academic credentials, and institutional certifications.', NOW(), NOW())`,
        [ojt.student_id]
      );
      portfolioId = newPortfolio.insertId;
    }

    // Check if item already in portfolio
    const [existingItems] = await pool.query(
      `SELECT item_id FROM portfolio_items 
       WHERE portfolio_id = ? AND item_type = 'certificate' AND associated_org_id = ? AND title LIKE ?`,
      [portfolioId, ojt.organization_id, `%${ojt.organization_name}%`]
    );

    if (existingItems.length === 0) {
      await pool.query(
        `INSERT INTO portfolio_items (
          portfolio_id, title, description, file_path, file_name, file_size, item_type, sub_category, is_verified, associated_org_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'certificate', 'credential', 1, ?, NOW(), NOW())`,
        [
          portfolioId,
          `Certificate of OJT Completion - ${ojt.organization_name}`,
          `Official verified completion certificate for ${renHours} hours of On-the-Job Training at ${ojt.organization_name}. Final Evaluation Rating: ${evalRecord.rating} / 5.0 ★. Issued on ${completionDate}. Serial: ${certCode}.`,
          `certificate://${certCode}`,
          `OJT_Completion_Certificate_${certCode}.pdf`,
          2048,
          ojt.organization_id
        ]
      );
    }

    // 8. Send Notification to the Student
    if (ojt.student_user_id) {
      await sendNotification({
        userId: ojt.student_user_id,
        senderId: ojt.institution_id,
        senderName: ojt.institution_name,
        title: 'OJT Completion Certificate Issued!',
        message: `Congratulations! Your official OJT Completion Certificate for ${ojt.organization_name} (${renHours} hrs rendered) has been automatically generated and added to your Digital Career Portfolio & Credentials.`,
        type: 'portfolio',
        link: '/dashboard/student/portfolio',
        relatedType: 'certificate',
        relatedId: certificateId
      });
    }

    // 9. Emit real-time update
    emitUpdate('certificate_generated', {
      certificate_id: certificateId,
      certificate_code: certCode,
      ojt_id: ojtId,
      student_id: ojt.student_id,
      organization_id: ojt.organization_id,
      institution_id: ojt.institution_id
    });

    return {
      success: true,
      newlyGenerated: true,
      certificate: {
        certificate_id: certificateId,
        certificate_code: certCode,
        ...certificatePayload
      },
      message: 'OJT Certificate generated and automatically added to Career Portfolio.'
    };
  } catch (error) {
    console.error('[Certificate Service Error]', error);
    return { success: false, message: 'Failed to generate certificate: ' + error.message };
  }
}

/**
 * Checks whether an intern has reached OJT evaluation milestones:
 *  - Midterm Milestone: rendered_hours >= 50% of required_hours (notifies Mentor + Student if no midterm/final eval yet)
 *  - Final Milestone: rendered_hours >= 100% of required_hours (notifies Mentor if no final eval yet, or issues certificate if final eval exists)
 */
export async function checkEvaluationMilestones(ojtId) {
  try {
    if (!ojtId) return;

    const [rows] = await pool.query(
      `SELECT o.*,
              COALESCE(o.required_hours, s.required_ojt_hours, p.required_ojt_hours, 600) as effective_required_hours,
              s.user_id as student_user_id, s.first_name, s.last_name, s.student_number,
              ho.organization_name,
              mentor_os.user_id as mentor_user_id
       FROM ojt_records o
       JOIN students s ON o.student_id = s.student_id
       LEFT JOIN programs p ON s.program_id = p.program_id
       JOIN hiring_organizations ho ON o.organization_id = ho.organization_id
       LEFT JOIN organization_staff mentor_os ON o.mentor_id = mentor_os.org_staff_id
       WHERE o.ojt_id = ?`,
      [ojtId]
    );

    if (rows.length === 0) return;
    const ojt = rows[0];

    const reqHours = Number(ojt.effective_required_hours) || 600;
    const renHours = Number(ojt.rendered_hours) || 0;
    const halfHours = reqHours / 2;

    if (renHours < halfHours && ojt.status !== 'completed') return;

    const [evalRows] = await pool.query(
      'SELECT record_id, evaluation_period FROM ojt_performance_records WHERE ojt_id = ?',
      [ojtId]
    );

    const hasMidterm = evalRows.some((e) => e.evaluation_period === 'midterm');
    const hasFinal = evalRows.some((e) => e.evaluation_period === 'final');

    // Resolve target mentor / supervisor user_ids to notify
    const recipientUserIds = new Set();
    if (ojt.mentor_user_id) {
      recipientUserIds.add(Number(ojt.mentor_user_id));
    } else if (ojt.supervisor_name) {
      const [supStaff] = await pool.query(
        `SELECT user_id FROM organization_staff
         WHERE organization_id = ?
           AND user_id IS NOT NULL
           AND (CONCAT(first_name, ' ', last_name) = ? OR first_name = ?)`,
        [ojt.organization_id, ojt.supervisor_name, ojt.supervisor_name]
      );
      supStaff.forEach((st) => {
        if (st.user_id) recipientUserIds.add(Number(st.user_id));
      });
    }

    // Fallback: if no specific mentor user resolved, notify organization mentors / HR staff
    if (recipientUserIds.size === 0) {
      const [orgStaff] = await pool.query(
        'SELECT user_id FROM organization_staff WHERE organization_id = ? AND user_id IS NOT NULL',
        [ojt.organization_id]
      );
      orgStaff.forEach((st) => {
        if (st.user_id) recipientUserIds.add(Number(st.user_id));
      });

      const [orgRegs] = await pool.query(
        'SELECT submitted_by FROM organization_registrations WHERE organization_id = ? AND submitted_by IS NOT NULL',
        [ojt.organization_id]
      );
      orgRegs.forEach((rg) => {
        if (rg.submitted_by) recipientUserIds.add(Number(rg.submitted_by));
      });
    }

    const studentFullName = `${ojt.first_name} ${ojt.last_name}`.trim();

    // 1. MIDTERM EVALUATION MILESTONE (50% of required hours reached)
    if (renHours >= halfHours && !hasMidterm && !hasFinal) {
      const [existingMidtermNotif] = await pool.query(
        "SELECT notification_id FROM notifications WHERE related_type = 'midterm_due' AND related_id = ? LIMIT 1",
        [ojtId]
      );

      if (existingMidtermNotif.length === 0) {
        for (const mentorUserId of recipientUserIds) {
          await sendNotification({
            userId: mentorUserId,
            senderId: ojt.student_user_id || null,
            senderName: studentFullName || 'OJT System',
            title: 'Midterm Evaluation Required (50% Hours Reached)',
            message: `${studentFullName} (#${ojt.student_number || ojt.student_id}) has reached ${renHours} of ${reqHours} required OJT hours (50% halfway milestone). Please evaluate this intern for their Midterm Performance Assessment.`,
            type: 'ojt',
            link: `/dashboard/organization/evaluations?student_id=${ojt.student_id}&period=midterm`,
            relatedType: 'midterm_due',
            relatedId: ojtId
          });
        }

        if (ojt.student_user_id) {
          await sendNotification({
            userId: ojt.student_user_id,
            senderName: ojt.organization_name || 'OJT System',
            title: '50% OJT Milestone Reached — Midterm Evaluation',
            message: `Congratulations! You have rendered ${renHours} of ${reqHours} required OJT hours (halfway milestone). Your Workplace Mentor has been notified to conduct your Midterm Performance Evaluation.`,
            type: 'ojt',
            link: '/dashboard/student/ojt?tab=evaluations',
            relatedType: 'midterm_milestone',
            relatedId: ojtId
          });
        }

        emitUpdate('evaluation_milestone_reached', {
          ojt_id: ojtId,
          milestone: 'midterm',
          student_id: ojt.student_id,
          organization_id: ojt.organization_id
        });
      }
    }

    // 2. FINAL EVALUATION MILESTONE (100% of required hours reached)
    if ((renHours >= reqHours || ojt.status === 'completed') && !hasFinal) {
      const [existingFinalNotif] = await pool.query(
        "SELECT notification_id FROM notifications WHERE related_type = 'final_due' AND related_id = ? LIMIT 1",
        [ojtId]
      );

      if (existingFinalNotif.length === 0) {
        const nextPeriod = hasMidterm ? 'final' : 'midterm';
        for (const mentorUserId of recipientUserIds) {
          await sendNotification({
            userId: mentorUserId,
            senderId: ojt.student_user_id || null,
            senderName: studentFullName || 'OJT System',
            title: 'Final OJT Evaluation Required (100% Hours Completed)',
            message: `${studentFullName} (#${ojt.student_number || ojt.student_id}) has completed ${renHours} of ${reqHours} required OJT hours! ${
              hasMidterm
                ? 'Please submit their Final Performance Evaluation to finalize OJT completion.'
                : 'Please complete their pending Midterm Evaluation followed by their Final Performance Evaluation.'
            }`,
            type: 'ojt',
            link: `/dashboard/organization/evaluations?student_id=${ojt.student_id}&period=${nextPeriod}`,
            relatedType: 'final_due',
            relatedId: ojtId
          });
        }

        emitUpdate('evaluation_milestone_reached', {
          ojt_id: ojtId,
          milestone: 'final',
          student_id: ojt.student_id,
          organization_id: ojt.organization_id
        });
      }
    } else if ((renHours >= reqHours || ojt.status === 'completed') && hasFinal) {
      await checkAndGenerateCertificate(ojtId);
    }
  } catch (err) {
    console.warn('[checkEvaluationMilestones Warning]', err.message);
  }
}
