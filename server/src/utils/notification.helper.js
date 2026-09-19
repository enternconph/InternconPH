import pool from '../config/db.js';
import { emitUpdate } from '../config/socket.js';

/**
 * Persists a notification to the MySQL database and emits a real-time socket event.
 * @param {Object} params
 * @param {number} params.userId - Target user_id
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification body/message
 * @param {string} [params.type='other'] - Type ('registration','verification','ojt','job','complaint','system','other')
 * @param {Object} [params.meta={}] - Optional metadata for socket clients
 */
export async function sendNotification({
  userId,
  senderId = null,
  senderName = null,
  title,
  message,
  type = 'other',
  link = null,
  relatedType = null,
  relatedId = null,
  meta = {}
}) {
  if (!userId || !title || !message) return null;

  try {
    const validTypes = ['registration', 'verification', 'ojt', 'job', 'complaint', 'system', 'other'];
    const safeType = validTypes.includes(type) ? type : 'other';

    const [res] = await pool.query(
      `INSERT INTO notifications (user_id, sender_id, sender_name, title, message, link, related_type, related_id, type, is_read, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [userId, senderId, senderName, title, message, link, relatedType, relatedId, safeType]
    );

    const notificationId = res.insertId;

    // Emit real-time update to socket listeners
    emitUpdate('notification', {
      notification_id: notificationId,
      user_id: userId,
      sender_id: senderId,
      sender_name: senderName,
      title,
      message,
      link,
      related_type: relatedType,
      related_id: relatedId,
      type: safeType,
      is_read: 0,
      created_at: new Date().toISOString(),
      ...meta
    });

    return notificationId;
  } catch (error) {
    console.error(`[NotificationHelper] Failed to send notification to user ${userId}:`, error.message);
    return null;
  }
}
