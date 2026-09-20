import express from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';
import { emitUpdate } from '../config/socket.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AVATARS_DIR = path.resolve(__dirname, '../../uploads/avatars');

if (!fs.existsSync(AVATARS_DIR)) {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
}

import { getUploadStorage, saveUploadedFile } from '../utils/upload.helper.js';

const avatarUpload = multer({
  storage: getUploadStorage('avatars'),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit to accommodate high-res phone camera photos
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif|svg|bmp|tiff|heic|heif/i;
    const ext = path.extname(file.originalname || '').toLowerCase().replace('.', '');
    const isImageMime = file.mimetype && file.mimetype.startsWith('image/');
    if (allowedTypes.test(ext) || isImageMime) {
      return cb(null, true);
    }
    cb(new Error('Only image files (JPG, PNG, WebP, GIF, HEIC) are allowed.'));
  }
});

/**
 * Helper to fetch or create default preferences for a user
 */
async function getOrCreatePreferences(userId) {
  const [rows] = await pool.query('SELECT * FROM user_preferences WHERE user_id = ?', [userId]);
  if (rows.length > 0) {
    return rows[0];
  }

  const defaultPref = {
    theme: 'light',
    sound_enabled: 1,
    email_notifications: 1,
    sms_alerts: 0,
    ojt_updates: 1,
    grievance_alerts: 1,
    marketing_emails: 0,
    compact_view: 0
  };

  await pool.query(
    `INSERT INTO user_preferences (user_id, theme, sound_enabled, email_notifications, sms_alerts, ojt_updates, grievance_alerts, marketing_emails, compact_view)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)`,
    [
      userId,
      defaultPref.theme,
      defaultPref.sound_enabled,
      defaultPref.email_notifications,
      defaultPref.sms_alerts,
      defaultPref.ojt_updates,
      defaultPref.grievance_alerts,
      defaultPref.marketing_emails,
      defaultPref.compact_view
    ]
  );

  const [created] = await pool.query('SELECT * FROM user_preferences WHERE user_id = ?', [userId]);
  return created[0] || defaultPref;
}

// GET /api/user/profile - Fetch authenticated user profile & preferences
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.user_id;

    const [users] = await pool.query(
      `SELECT u.user_id, u.email, u.avatar_url, u.display_name, u.role_id, u.is_active, u.is_verified, u.created_at, r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const userData = users[0];
    let details = {};

    if (userData.role_name === 'student') {
      const [students] = await pool.query(
        `SELECT s.*, p.program_name, p.program_code, i.institution_name
         FROM students s
         LEFT JOIN programs p ON s.program_id = p.program_id
         LEFT JOIN institutions i ON s.institution_id = i.institution_id
         WHERE s.user_id = ?`,
        [userId]
      );
      if (students.length > 0) details = students[0];
    } else if (userData.role_name === 'organization_staff' || userData.role_name === 'workplace_mentor' || userData.role_name === 'hr_staff') {
      const [staff] = await pool.query(
        `SELECT os.*, ho.organization_name, ho.industry
         FROM organization_staff os
         JOIN hiring_organizations ho ON os.organization_id = ho.organization_id
         WHERE os.user_id = ?`,
        [userId]
      );
      if (staff.length > 0) details = staff[0];
    } else if (userData.role_name === 'institution_staff') {
      const [staff] = await pool.query(
        `SELECT ist.*, i.institution_name, p.program_name
         FROM institution_staff ist
         JOIN institutions i ON ist.institution_id = i.institution_id
         LEFT JOIN programs p ON ist.program_id = p.program_id
         WHERE ist.user_id = ?`,
        [userId]
      );
      if (staff.length > 0) details = staff[0];
    } else if (userData.role_name === 'hiring_organization') {
      const [orgs] = await pool.query(
        `SELECT ho.* FROM hiring_organizations ho
         JOIN organization_registrations oreg ON ho.organization_id = oreg.organization_id
         WHERE oreg.submitted_by = ?`,
        [userId]
      );
      if (orgs.length > 0) details = orgs[0];
    } else if (userData.role_name === 'institution') {
      const [insts] = await pool.query(
        `SELECT i.* FROM institutions i
         JOIN institution_registrations ireg ON i.institution_id = ireg.institution_id
         WHERE ireg.submitted_by = ?`,
        [userId]
      );
      if (insts.length > 0) details = insts[0];
    }

    const preferences = await getOrCreatePreferences(userId);

    return res.json({
      success: true,
      data: {
        user: userData,
        details,
        preferences
      }
    });
  } catch (error) {
    console.error('Fetch user profile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch user profile.' });
  }
});

// PUT /api/user/profile - Update profile details & display name
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { display_name, avatar_url, first_name, last_name, contact_number, position } = req.body;

    // Update users table
    if (display_name !== undefined || avatar_url !== undefined) {
      await pool.query(
        'UPDATE users SET display_name = COALESCE(?, display_name), avatar_url = COALESCE(?, avatar_url) WHERE user_id = ?',
        [display_name !== undefined ? display_name.trim() : null, avatar_url !== undefined ? avatar_url.trim() : null, userId]
      );
    }

    const roleName = req.user.role_name || req.user.role;

    // Update role specific personal details
    if (roleName === 'student') {
      await pool.query(
        `UPDATE students SET
          first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          contact_number = COALESCE(?, contact_number)
         WHERE user_id = ?`,
        [first_name || null, last_name || null, contact_number || null, userId]
      );
    } else if (roleName === 'organization_staff' || roleName === 'workplace_mentor' || roleName === 'hr_staff') {
      await pool.query(
        `UPDATE organization_staff SET
          first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          contact_number = COALESCE(?, contact_number),
          job_title = COALESCE(?, job_title)
         WHERE user_id = ?`,
        [first_name || null, last_name || null, contact_number || null, position || null, userId]
      );
    } else if (roleName === 'institution_staff') {
      await pool.query(
        `UPDATE institution_staff SET
          first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          contact_number = COALESCE(?, contact_number)
         WHERE user_id = ?`,
        [first_name || null, last_name || null, contact_number || null, userId]
      );
    }

    emitUpdate('user_profile_updated', { user_id: userId });

    return res.json({
      success: true,
      message: 'Profile updated successfully!',
      data: {
        display_name,
        avatar_url
      }
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

// POST /api/user/avatar - Upload profile picture file
router.post('/avatar', verifyToken, (req, res, next) => {
  avatarUpload.single('avatar')(req, res, (err) => {
    if (err) {
      console.error('[Avatar Multer Error]', err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'Image size exceeds the 15MB limit. Please upload a smaller photo.'
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid image file.'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded.' });
    }

    const avatarUrl = await saveUploadedFile(req.file, 'avatars');
    if (!avatarUrl) {
      return res.status(500).json({ success: false, message: 'Failed to process and store avatar image.' });
    }

    const userId = req.user.user_id;

    await pool.query('UPDATE users SET avatar_url = ? WHERE user_id = ?', [avatarUrl, userId]);

    emitUpdate('user_avatar_updated', { user_id: userId, avatar_url: avatarUrl });

    return res.json({
      success: true,
      message: 'Profile picture uploaded successfully!',
      avatar_url: avatarUrl
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to upload avatar.' });
  }
});

// GET /api/user/preferences - Fetch notification & theme preferences
router.get('/preferences', verifyToken, async (req, res) => {
  try {
    const preferences = await getOrCreatePreferences(req.user.user_id);
    return res.json({ success: true, data: preferences });
  } catch (error) {
    console.error('Fetch preferences error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch preferences.' });
  }
});

// PUT /api/user/preferences - Update notification & theme preferences
router.put('/preferences', verifyToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const {
      theme = 'light',
      sound_enabled = 1,
      email_notifications = 1,
      sms_alerts = 0,
      ojt_updates = 1,
      grievance_alerts = 1,
      marketing_emails = 0,
      compact_view = 0
    } = req.body;

    await pool.query(
      `INSERT INTO user_preferences (user_id, theme, sound_enabled, email_notifications, sms_alerts, ojt_updates, grievance_alerts, marketing_emails, compact_view)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        theme = VALUES(theme),
        sound_enabled = VALUES(sound_enabled),
        email_notifications = VALUES(email_notifications),
        sms_alerts = VALUES(sms_alerts),
        ojt_updates = VALUES(ojt_updates),
        grievance_alerts = VALUES(grievance_alerts),
        marketing_emails = VALUES(marketing_emails),
        compact_view = VALUES(compact_view),
        updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        theme,
        sound_enabled ? 1 : 0,
        email_notifications ? 1 : 0,
        sms_alerts ? 1 : 0,
        ojt_updates ? 1 : 0,
        grievance_alerts ? 1 : 0,
        marketing_emails ? 1 : 0,
        compact_view ? 1 : 0
      ]
    );

    const [updated] = await pool.query('SELECT * FROM user_preferences WHERE user_id = ?', [userId]);

    return res.json({
      success: true,
      message: 'Preferences saved successfully!',
      data: updated[0]
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save preferences.' });
  }
});

// POST /api/user/change-password - Change user password securely
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long.' });
    }

    // Retrieve user password hash
    const [rows] = await pool.query('SELECT password_hash FROM users WHERE user_id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'The current password you entered is incorrect.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [newHash, userId]);

    return res.json({
      success: true,
      message: 'Password changed successfully! Please use your new password next time you log in.'
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ success: false, message: 'Failed to change password.' });
  }
});

export default router;
