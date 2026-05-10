const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { sendInviteEmail } = require('../services/emailService');

const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.*, 
        COALESCE(json_agg(
          json_build_object('id', w.id, 'name', w.name, 'role', wm.role)
        ) FILTER (WHERE w.id IS NOT NULL), '[]') as workspaces
       FROM users u
       LEFT JOIN workspace_members wm ON wm.user_id = u.id
       LEFT JOIN workspaces w ON w.id = wm.workspace_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const sendInvite = async (req, res) => {
  const { workspaceId } = req.params;
  const { email, role = 'member' } = req.body;

  try {
    const workspace = await pool.query('SELECT * FROM workspaces WHERE id = $1', [workspaceId]);
    if (!workspace.rows.length) return res.status(404).json({ error: 'Workspace not found' });

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO invitations (workspace_id, email, role, token, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [workspaceId, email, role, token, expiresAt]
    );

    await sendInviteEmail({
      to: email,
      workspaceName: workspace.rows[0].name,
      inviterName: req.user.name,
      token,
    });

    res.json({ message: 'Invitation sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const acceptInvite = async (req, res) => {
  const { token } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const inv = await client.query(
      `SELECT * FROM invitations WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
      [token]
    );

    if (!inv.rows.length) return res.status(400).json({ error: 'Invalid or expired invitation' });

    const invite = inv.rows[0];

    // Add to workspace
    await client.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       VALUES ($1, $2, $3) ON CONFLICT (workspace_id, user_id) DO NOTHING`,
      [invite.workspace_id, req.user.id, invite.role]
    );

    await client.query(
      `UPDATE invitations SET accepted_at = NOW() WHERE id = $1`,
      [invite.id]
    );

    await client.query('COMMIT');
    res.json({ workspaceId: invite.workspace_id, message: 'Joined workspace successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

module.exports = { getMe, sendInvite, acceptInvite };
