const pool = require('../config/database');

const getNotifications = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const [notifs, count] = await Promise.all([
      pool.query(
        `SELECT * FROM notifications WHERE user_id = $1
         ORDER BY read ASC, created_at DESC LIMIT $2 OFFSET $3`,
        [req.user.id, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*) as total, SUM(CASE WHEN NOT read THEN 1 ELSE 0 END) as unread
         FROM notifications WHERE user_id = $1`,
        [req.user.id]
      ),
    ]);

    res.json({
      notifications: notifs.rows,
      total: parseInt(count.rows[0].total),
      unread: parseInt(count.rows[0].unread),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const markRead = async (req, res) => {
  const { notificationId } = req.params;
  try {
    await pool.query(
      `UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2`,
      [notificationId, req.user.id]
    );
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const markAllRead = async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET read = TRUE WHERE user_id = $1`,
      [req.user.id]
    );
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getNotifications, markRead, markAllRead };
