const pool = require('../config/database');
const { createNotification } = require('../services/notificationService');
const { sendAssignmentEmail } = require('../services/emailService');

let io;
const setIO = (socketIO) => { io = socketIO; };

const logActivity = async (client, { taskId, projectId, userId, action, meta = {} }) => {
  await client.query(
    `INSERT INTO activity_log (task_id, project_id, user_id, action, meta)
     VALUES ($1, $2, $3, $4, $5)`,
    [taskId, projectId, userId, action, JSON.stringify(meta)]
  );
};

const emitToProject = (projectId, event, data) => {
  if (io) io.to(`project:${projectId}`).emit(event, data);
};

const getTasks = async (req, res) => {
  const { projectId } = req.params;
  const { status, assignee, priority } = req.query;

  let query = `
    SELECT t.*,
      u.name as assignee_name, u.email as assignee_email, u.avatar_url as assignee_avatar,
      cu.name as created_by_name,
      COALESCE(json_agg(DISTINCT jsonb_build_object('id', tl.id, 'label', tl.label, 'color', tl.color)) FILTER (WHERE tl.id IS NOT NULL), '[]') as labels,
      COALESCE(SUM(te.duration_seconds), 0) as total_time_seconds,
      COUNT(DISTINCT tc.id) as comment_count
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assignee_id
    LEFT JOIN users cu ON cu.id = t.created_by
    LEFT JOIN task_labels tl ON tl.task_id = t.id
    LEFT JOIN time_entries te ON te.task_id = t.id
    LEFT JOIN task_comments tc ON tc.task_id = t.id
    WHERE t.project_id = $1`;

  const params = [projectId];
  let idx = 2;
  if (status) { query += ` AND t.status = $${idx++}`; params.push(status); }
  if (assignee) { query += ` AND t.assignee_id = $${idx++}`; params.push(assignee); }
  if (priority) { query += ` AND t.priority = $${idx++}`; params.push(priority); }

  query += ` GROUP BY t.id, u.name, u.email, u.avatar_url, cu.name ORDER BY t.position ASC, t.created_at DESC`;

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createTask = async (req, res) => {
  const { projectId } = req.params;
  const { title, description, assigneeId, priority = 'medium', dueDate, labels = [] } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const maxPos = await client.query(
      `SELECT COALESCE(MAX(position), 0) as max FROM tasks WHERE project_id = $1`, [projectId]
    );

    const task = await client.query(
      `INSERT INTO tasks (project_id, title, description, assignee_id, created_by, priority, due_date, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [projectId, title, description, assigneeId || null, req.user.id, priority, dueDate || null, (maxPos.rows[0].max || 0) + 1]
    );

    const taskId = task.rows[0].id;

    for (const lbl of labels) {
      await client.query(
        `INSERT INTO task_labels (task_id, label, color) VALUES ($1, $2, $3)`,
        [taskId, lbl.label, lbl.color || '#6366f1']
      );
    }

    await logActivity(client, { taskId, projectId, userId: req.user.id, action: 'created', meta: { title } });
    await client.query('COMMIT');

    const fullTask = await pool.query(
      `SELECT t.*, u.name as assignee_name, u.avatar_url as assignee_avatar,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', tl.id, 'label', tl.label, 'color', tl.color)) FILTER (WHERE tl.id IS NOT NULL), '[]') as labels
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assignee_id
       LEFT JOIN task_labels tl ON tl.task_id = t.id
       WHERE t.id = $1 GROUP BY t.id, u.name, u.avatar_url`,
      [taskId]
    );

    const result = fullTask.rows[0];
    emitToProject(projectId, 'task:created', result);

    // Notify assignee
    if (assigneeId && assigneeId !== req.user.id) {
      const assignee = await pool.query('SELECT * FROM users WHERE id = $1', [assigneeId]);
      if (assignee.rows[0]) {
        createNotification({
          userId: assigneeId,
          type: 'task_assigned',
          title: 'New task assigned',
          body: `${req.user.name} assigned you "${title}"`,
          payload: { taskId, projectId },
        });
        sendAssignmentEmail({
          to: assignee.rows[0].email,
          userName: assignee.rows[0].name,
          taskTitle: title,
          projectName: 'your project',
          assignerName: req.user.name,
        }).catch(console.error);
      }
    }

    res.status(201).json(result);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

const getTask = async (req, res) => {
  const { taskId } = req.params;
  try {
    const [taskResult, commentsResult, activityResult] = await Promise.all([
      pool.query(
        `SELECT t.*, u.name as assignee_name, u.avatar_url as assignee_avatar, cu.name as created_by_name,
          COALESCE(json_agg(DISTINCT jsonb_build_object('id', tl.id, 'label', tl.label, 'color', tl.color)) FILTER (WHERE tl.id IS NOT NULL), '[]') as labels
         FROM tasks t
         LEFT JOIN users u ON u.id = t.assignee_id
         LEFT JOIN users cu ON cu.id = t.created_by
         LEFT JOIN task_labels tl ON tl.task_id = t.id
         WHERE t.id = $1 GROUP BY t.id, u.name, u.avatar_url, cu.name`,
        [taskId]
      ),
      pool.query(
        `SELECT tc.*, u.name as user_name, u.avatar_url
         FROM task_comments tc JOIN users u ON u.id = tc.user_id
         WHERE tc.task_id = $1 ORDER BY tc.created_at ASC`,
        [taskId]
      ),
      pool.query(
        `SELECT al.*, u.name as user_name, u.avatar_url
         FROM activity_log al LEFT JOIN users u ON u.id = al.user_id
         WHERE al.task_id = $1 ORDER BY al.created_at DESC LIMIT 50`,
        [taskId]
      ),
    ]);

    if (!taskResult.rows.length) return res.status(404).json({ error: 'Task not found' });

    res.json({
      ...taskResult.rows[0],
      comments: commentsResult.rows,
      activity: activityResult.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateTask = async (req, res) => {
  const { taskId } = req.params;
  const { title, description, assigneeId, status, priority, dueDate, position } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const old = await client.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (!old.rows.length) return res.status(404).json({ error: 'Task not found' });

    const oldTask = old.rows[0];

    const result = await client.query(
      `UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        assignee_id = COALESCE($3, assignee_id),
        status = COALESCE($4, status),
        priority = COALESCE($5, priority),
        due_date = COALESCE($6, due_date),
        position = COALESCE($7, position),
        updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [title, description, assigneeId, status, priority, dueDate, position, taskId]
    );

    // Log what changed
    const changes = {};
    if (status && status !== oldTask.status) changes.status = { from: oldTask.status, to: status };
    if (priority && priority !== oldTask.priority) changes.priority = { from: oldTask.priority, to: priority };
    if (assigneeId && assigneeId !== oldTask.assignee_id) changes.assignee = true;

    if (Object.keys(changes).length > 0) {
      await logActivity(client, {
        taskId,
        projectId: oldTask.project_id,
        userId: req.user.id,
        action: 'updated',
        meta: changes,
      });
    }

    await client.query('COMMIT');

    const updated = result.rows[0];
    emitToProject(updated.project_id, 'task:updated', updated);
    res.json(updated);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

const deleteTask = async (req, res) => {
  const { taskId } = req.params;
  try {
    const task = await pool.query('SELECT project_id FROM tasks WHERE id = $1', [taskId]);
    await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
    emitToProject(task.rows[0]?.project_id, 'task:deleted', { taskId });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const addComment = async (req, res) => {
  const { taskId } = req.params;
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const task = await client.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    const comment = await client.query(
      `INSERT INTO task_comments (task_id, user_id, body) VALUES ($1, $2, $3) RETURNING *`,
      [taskId, req.user.id, body]
    );
    await logActivity(client, {
      taskId,
      projectId: task.rows[0].project_id,
      userId: req.user.id,
      action: 'commented',
      meta: { preview: body.substring(0, 80) },
    });
    await client.query('COMMIT');
    const result = { ...comment.rows[0], user_name: req.user.name, avatar_url: req.user.avatar_url };
    emitToProject(task.rows[0].project_id, 'task:commented', result);
    res.status(201).json(result);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

const getActivity = async (req, res) => {
  const { taskId } = req.params;
  try {
    const result = await pool.query(
      `SELECT al.*, u.name as user_name, u.avatar_url
       FROM activity_log al LEFT JOIN users u ON u.id = al.user_id
       WHERE al.task_id = $1 ORDER BY al.created_at DESC`,
      [taskId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const addLabel = async (req, res) => {
  const { taskId } = req.params;
  const { label, color = '#6366f1' } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO task_labels (task_id, label, color) VALUES ($1, $2, $3) RETURNING *`,
      [taskId, label, color]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const removeLabel = async (req, res) => {
  const { labelId } = req.params;
  try {
    await pool.query('DELETE FROM task_labels WHERE id = $1', [labelId]);
    res.json({ message: 'Label removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getTasks, createTask, getTask, updateTask, deleteTask, addComment, getActivity, addLabel, removeLabel, setIO };
