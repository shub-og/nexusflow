const pool = require('../config/database');

let io;

const setIO = (socketIO) => { io = socketIO; };

const createNotification = async ({ userId, type, title, body, payload = {} }) => {
  const result = await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, payload)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userId, type, title, body, JSON.stringify(payload)]
  );
  const notification = result.rows[0];

  // Emit real-time to that user's room
  if (io) {
    io.to(`user:${userId}`).emit('notification:new', notification);
  }

  return notification;
};

module.exports = { createNotification, setIO };
