const pool = require('../config/database');

const startTimer = async (req, res) => {
  const { taskId } = req.params;
  try {
    // Stop any active timer first
    await pool.query(
      `UPDATE time_entries SET ended_at = NOW(),
        duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INT
       WHERE user_id = $1 AND ended_at IS NULL`,
      [req.user.id]
    );

    const result = await pool.query(
      `INSERT INTO time_entries (task_id, user_id, started_at) VALUES ($1, $2, NOW()) RETURNING *`,
      [taskId, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const stopTimer = async (req, res) => {
  const { taskId } = req.params;
  try {
    const result = await pool.query(
      `UPDATE time_entries
       SET ended_at = NOW(),
           duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INT
       WHERE task_id = $1 AND user_id = $2 AND ended_at IS NULL
       RETURNING *`,
      [taskId, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'No active timer found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const addManualEntry = async (req, res) => {
  const { taskId } = req.params;
  const { durationMinutes, note, date } = req.body;
  if (!durationMinutes) return res.status(400).json({ error: 'durationMinutes is required' });

  try {
    const startedAt = date ? new Date(date) : new Date();
    const endedAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);

    const result = await pool.query(
      `INSERT INTO time_entries (task_id, user_id, started_at, ended_at, duration_seconds, note)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [taskId, req.user.id, startedAt, endedAt, durationMinutes * 60, note || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getActiveTimer = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT te.*, t.title as task_title, t.project_id
       FROM time_entries te JOIN tasks t ON t.id = te.task_id
       WHERE te.user_id = $1 AND te.ended_at IS NULL`,
      [req.user.id]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getProjectTimeReport = async (req, res) => {
  const { projectId } = req.params;
  const { from, to } = req.query;

  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.avatar_url,
        COALESCE(SUM(te.duration_seconds), 0) as total_seconds,
        COUNT(DISTINCT te.task_id) as tasks_tracked,
        json_agg(json_build_object(
          'taskId', t.id, 'taskTitle', t.title,
          'seconds', te.duration_seconds, 'date', te.started_at::DATE
        ) ORDER BY te.started_at DESC) as entries
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       LEFT JOIN time_entries te ON te.user_id = u.id
         AND te.task_id IN (SELECT id FROM tasks WHERE project_id = $1)
         AND ($2::DATE IS NULL OR te.started_at >= $2::DATE)
         AND ($3::DATE IS NULL OR te.started_at <= $3::DATE)
       LEFT JOIN tasks t ON t.id = te.task_id
       WHERE pm.project_id = $1
       GROUP BY u.id, u.name, u.avatar_url
       ORDER BY total_seconds DESC`,
      [projectId, from || null, to || null]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { startTimer, stopTimer, addManualEntry, getActiveTimer, getProjectTimeReport };
