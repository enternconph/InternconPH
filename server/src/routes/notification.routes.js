import express from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
router.use(verifyToken);

// GET /api/notifications - List user's notifications sorted newest first
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const [rows] = await pool.query(
      `SELECT notification_id, user_id, sender_id, sender_name, title, message, link, related_type, related_id, type, is_read, created_at, updated_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [req.user.user_id, limit]
    );

    const [[{ unreadCount }]] = await pool.query(
      'SELECT COUNT(*) as unreadCount FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.user_id]
    );

    return res.json({
      success: true,
      data: {
        notifications: rows,
        unreadCount
      }
    });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch notifications.' });
  }
});

// GET /api/notifications/unread-count - Lightweight unread badge query
router.get('/unread-count', async (req, res) => {
  try {
    const [[{ unreadCount }]] = await pool.query(
      'SELECT COUNT(*) as unreadCount FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.user_id]
    );
    return res.json({ success: true, data: { unreadCount } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not fetch unread count.' });
  }
});

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.user_id]);
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update notifications.' });
  }
});

// PUT /api/notifications/:id/read - Mark specific notification as read
router.put('/:id/read', async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?',
      [req.params.id, req.user.user_id]
    );
    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
});

export default router;
