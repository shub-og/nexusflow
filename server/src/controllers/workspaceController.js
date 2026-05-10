const pool = require('../config/database');

const createWorkspace = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ws = await client.query(
      `INSERT INTO workspaces (name, owner_id) VALUES ($1, $2) RETURNING *`,
      [name, req.user.id]
    );
    await client.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'admin')`,
      [ws.rows[0].id, req.user.id]
    );
    await client.query('COMMIT');
    res.status(201).json(ws.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

const getWorkspace = async (req, res) => {
  const { workspaceId } = req.params;
  try {
    const result = await pool.query(
      `SELECT w.*,
        COALESCE(json_agg(DISTINCT jsonb_build_object(
          'id', u.id, 'name', u.name, 'email', u.email, 'avatar_url', u.avatar_url, 'role', wm.role
        )) FILTER (WHERE u.id IS NOT NULL), '[]') as members
       FROM workspaces w
       LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
       LEFT JOIN users u ON u.id = wm.user_id
       WHERE w.id = $1
       GROUP BY w.id`,
      [workspaceId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Workspace not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateWorkspace = async (req, res) => {
  const { workspaceId } = req.params;
  const { name } = req.body;
  try {
    const result = await pool.query(
      `UPDATE workspaces SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [name, workspaceId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getMembers = async (req, res) => {
  const { workspaceId } = req.params;
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.avatar_url, wm.role, wm.joined_at
       FROM workspace_members wm
       JOIN users u ON u.id = wm.user_id
       WHERE wm.workspace_id = $1
       ORDER BY wm.joined_at ASC`,
      [workspaceId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const removeMember = async (req, res) => {
  const { workspaceId, userId } = req.params;
  try {
    await pool.query(
      `DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, userId]
    );
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createWorkspace, getWorkspace, updateWorkspace, getMembers, removeMember };
