const admin = require('../config/firebase');
const pool = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    if (process.env.DEV_BYPASS_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }
      const devEmail = 'dev@taskmanager.local';
      let result = await pool.query('SELECT * FROM users WHERE email = $1', [devEmail]);
      if (result.rows.length === 0) {
        result = await pool.query(
          `INSERT INTO users (firebase_uid, name, email, avatar_url)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          ['dev-firebase-uid-001', 'Dev User', devEmail, null]
        );
      }
      req.user = result.rows[0];
      req.firebaseUser = { uid: 'dev-firebase-uid-001', email: devEmail };
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(token);

    let result = await pool.query('SELECT * FROM users WHERE firebase_uid = $1', [decoded.uid]);
    if (result.rows.length === 0) {
      result = await pool.query(
        `INSERT INTO users (firebase_uid, name, email, avatar_url)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (firebase_uid) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email
         RETURNING *`,
        [decoded.uid, decoded.name || decoded.email?.split('@')[0] || 'User', decoded.email, decoded.picture || null]
      );
    }
    req.user = result.rows[0];
    req.firebaseUser = decoded;
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireRole = (roles) => async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    if (!workspaceId) return next();
    const result = await pool.query(
      'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, req.user.id]
    );
    if (result.rows.length === 0) return res.status(403).json({ error: 'Not a workspace member' });
    const userRole = result.rows[0].role;
    if (!roles.includes(userRole)) return res.status(403).json({ error: 'Insufficient permissions' });
    req.workspaceRole = userRole;
    next();
  } catch (err) { next(err); }
};

module.exports = { authenticate, requireRole };
