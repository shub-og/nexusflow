const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const authCtrl = require('../controllers/authController');
const workspaceCtrl = require('../controllers/workspaceController');
const projectCtrl = require('../controllers/projectController');
const taskCtrl = require('../controllers/taskController');
const timeCtrl = require('../controllers/timeController');
const notifCtrl = require('../controllers/notificationController');

// ─── Auth ────────────────────────────────────────────────────────────────────
router.get('/auth/me', authenticate, authCtrl.getMe);
router.post('/workspaces/:workspaceId/invite', authenticate, authCtrl.sendInvite);
router.post('/invite/accept/:token', authenticate, authCtrl.acceptInvite);

// ─── Workspaces ──────────────────────────────────────────────────────────────
router.post('/workspaces', authenticate, workspaceCtrl.createWorkspace);
router.get('/workspaces/:workspaceId', authenticate, workspaceCtrl.getWorkspace);
router.patch('/workspaces/:workspaceId', authenticate, requireRole(['admin']), workspaceCtrl.updateWorkspace);
router.get('/workspaces/:workspaceId/members', authenticate, workspaceCtrl.getMembers);
router.delete('/workspaces/:workspaceId/members/:userId', authenticate, requireRole(['admin']), workspaceCtrl.removeMember);

// ─── Projects ────────────────────────────────────────────────────────────────
router.get('/workspaces/:workspaceId/projects', authenticate, projectCtrl.getProjects);
router.post('/workspaces/:workspaceId/projects', authenticate, projectCtrl.createProject);
router.get('/projects/:projectId', authenticate, projectCtrl.getProject);
router.patch('/projects/:projectId', authenticate, projectCtrl.updateProject);
router.delete('/projects/:projectId', authenticate, projectCtrl.deleteProject);
router.get('/projects/:projectId/analytics', authenticate, projectCtrl.getProjectAnalytics);

// ─── Tasks ───────────────────────────────────────────────────────────────────
router.get('/projects/:projectId/tasks', authenticate, taskCtrl.getTasks);
router.post('/projects/:projectId/tasks', authenticate, taskCtrl.createTask);
router.get('/tasks/:taskId', authenticate, taskCtrl.getTask);
router.patch('/tasks/:taskId', authenticate, taskCtrl.updateTask);
router.delete('/tasks/:taskId', authenticate, taskCtrl.deleteTask);
router.post('/tasks/:taskId/comments', authenticate, taskCtrl.addComment);
router.get('/tasks/:taskId/activity', authenticate, taskCtrl.getActivity);
router.post('/tasks/:taskId/labels', authenticate, taskCtrl.addLabel);
router.delete('/labels/:labelId', authenticate, taskCtrl.removeLabel);

// ─── Time Tracking ───────────────────────────────────────────────────────────
router.post('/tasks/:taskId/time/start', authenticate, timeCtrl.startTimer);
router.post('/tasks/:taskId/time/stop', authenticate, timeCtrl.stopTimer);
router.post('/tasks/:taskId/time/manual', authenticate, timeCtrl.addManualEntry);
router.get('/time/active', authenticate, timeCtrl.getActiveTimer);
router.get('/projects/:projectId/time-report', authenticate, timeCtrl.getProjectTimeReport);

// ─── Notifications ───────────────────────────────────────────────────────────
router.get('/notifications', authenticate, notifCtrl.getNotifications);
router.patch('/notifications/:notificationId/read', authenticate, notifCtrl.markRead);
router.patch('/notifications/read-all', authenticate, notifCtrl.markAllRead);

// ─── Workspace Analytics ─────────────────────────────────────────────────────
router.get('/workspaces/:workspaceId/analytics', authenticate, async (req, res) => {
  const { workspaceId } = req.params;
  const pool = require('../config/database');
  try {
    const [overdue, workload, progress] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) as count FROM tasks t
         JOIN projects p ON p.id = t.project_id
         WHERE p.workspace_id = $1 AND t.due_date < NOW() AND t.status != 'done'`,
        [workspaceId]
      ),
      pool.query(
        `SELECT u.id, u.name, u.avatar_url, COUNT(t.id) as task_count
         FROM workspace_members wm JOIN users u ON u.id = wm.user_id
         LEFT JOIN tasks t ON t.assignee_id = u.id
           AND t.project_id IN (SELECT id FROM projects WHERE workspace_id = $1)
           AND t.status != 'done'
         WHERE wm.workspace_id = $1
         GROUP BY u.id, u.name, u.avatar_url ORDER BY task_count DESC`,
        [workspaceId]
      ),
      pool.query(
        `SELECT p.id, p.name, p.color,
          COUNT(t.id) as total, COUNT(CASE WHEN t.status='done' THEN 1 END) as done
         FROM projects p LEFT JOIN tasks t ON t.project_id = p.id
         WHERE p.workspace_id = $1 AND p.status = 'active'
         GROUP BY p.id, p.name, p.color`,
        [workspaceId]
      ),
    ]);
    res.json({
      overdueCount: parseInt(overdue.rows[0].count),
      memberWorkload: workload.rows,
      projectProgress: progress.rows.map(p => ({
        ...p,
        progress: p.total > 0 ? Math.round((p.done / p.total) * 100) : 0,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
