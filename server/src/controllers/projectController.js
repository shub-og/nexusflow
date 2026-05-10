const pool = require('../config/database');

const getProjects = async (req, res) => {
  const { workspaceId } = req.params;
  try {
    const result = await pool.query(
      `SELECT p.*,
        u.name as created_by_name,
        COUNT(DISTINCT t.id) as total_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) as done_tasks
       FROM projects p
       LEFT JOIN users u ON u.id = p.created_by
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE p.workspace_id = $1
       GROUP BY p.id, u.name
       ORDER BY p.created_at DESC`,
      [workspaceId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createProject = async (req, res) => {
  const { workspaceId } = req.params;
  const { name, description, color = '#6366f1' } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const project = await client.query(
      `INSERT INTO projects (workspace_id, name, description, color, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [workspaceId, name, description, color, req.user.id]
    );
    // Add creator as admin
    await client.query(
      `INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'admin')`,
      [project.rows[0].id, req.user.id]
    );
    // Add all workspace members
    const members = await client.query(
      `SELECT user_id FROM workspace_members WHERE workspace_id = $1 AND user_id != $2`,
      [workspaceId, req.user.id]
    );
    for (const m of members.rows) {
      await client.query(
        `INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
        [project.rows[0].id, m.user_id]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(project.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

const getProject = async (req, res) => {
  const { projectId } = req.params;
  try {
    const result = await pool.query(
      `SELECT p.*,
        COALESCE(json_agg(DISTINCT jsonb_build_object(
          'id', u.id, 'name', u.name, 'email', u.email, 'avatar_url', u.avatar_url, 'role', pm.role
        )) FILTER (WHERE u.id IS NOT NULL), '[]') as members
       FROM projects p
       LEFT JOIN project_members pm ON pm.project_id = p.id
       LEFT JOIN users u ON u.id = pm.user_id
       WHERE p.id = $1
       GROUP BY p.id`,
      [projectId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Project not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateProject = async (req, res) => {
  const { projectId } = req.params;
  const { name, description, color, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE projects SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        color = COALESCE($3, color),
        status = COALESCE($4, status),
        updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [name, description, color, status, projectId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteProject = async (req, res) => {
  const { projectId } = req.params;
  try {
    await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getProjectAnalytics = async (req, res) => {
  const { projectId } = req.params;
  try {
    const [statusResult, memberResult, timeResult, weeklyResult] = await Promise.all([
      pool.query(
        `SELECT status, COUNT(*) as count FROM tasks WHERE project_id = $1 GROUP BY status`,
        [projectId]
      ),
      pool.query(
        `SELECT u.id, u.name, u.avatar_url,
          COUNT(t.id) as total_tasks,
          COUNT(CASE WHEN t.status = 'done' THEN 1 END) as done_tasks,
          COUNT(CASE WHEN t.due_date < NOW() AND t.status != 'done' THEN 1 END) as overdue_tasks,
          COALESCE(SUM(te.duration_seconds), 0) as total_seconds
         FROM project_members pm
         JOIN users u ON u.id = pm.user_id
         LEFT JOIN tasks t ON t.assignee_id = u.id AND t.project_id = $1
         LEFT JOIN time_entries te ON te.user_id = u.id AND te.task_id IN (SELECT id FROM tasks WHERE project_id = $1)
         WHERE pm.project_id = $1
         GROUP BY u.id, u.name, u.avatar_url`,
        [projectId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(duration_seconds), 0) as total_seconds
         FROM time_entries WHERE task_id IN (SELECT id FROM tasks WHERE project_id = $1)`,
        [projectId]
      ),
      pool.query(
        `SELECT DATE_TRUNC('week', created_at) as week,
          COUNT(*) as created,
          COUNT(CASE WHEN status = 'done' THEN 1 END) as completed
         FROM tasks WHERE project_id = $1
         GROUP BY week ORDER BY week DESC LIMIT 8`,
        [projectId]
      ),
    ]);

    const statusMap = {};
    statusResult.rows.forEach(r => { statusMap[r.status] = parseInt(r.count); });
    const total = Object.values(statusMap).reduce((a, b) => a + b, 0);

    res.json({
      tasks: { ...statusMap, total },
      progress: total > 0 ? Math.round(((statusMap.done || 0) / total) * 100) : 0,
      members: memberResult.rows,
      totalTime: parseInt(timeResult.rows[0]?.total_seconds || 0),
      weekly: weeklyResult.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getProjects, createProject, getProject, updateProject, deleteProject, getProjectAnalytics };
