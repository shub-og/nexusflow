const cron = require('node-cron');
const pool = require('../config/database');
const { createNotification } = require('./notificationService');
const { sendDeadlineEmail } = require('./emailService');

const startCronJobs = () => {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Running overdue task check...');
    try {
      const result = await pool.query(`
        SELECT t.id, t.title, t.due_date, t.project_id,
               p.name as project_name,
               u.id as user_id, u.name as user_name, u.email as user_email
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        JOIN users u ON t.assignee_id = u.id
        WHERE t.due_date < NOW()
          AND t.status != 'done'
          AND t.assignee_id IS NOT NULL
      `);

      for (const task of result.rows) {
        await createNotification({
          userId: task.user_id,
          type: 'task_overdue',
          title: 'Task overdue',
          body: `"${task.title}" in ${task.project_name} is past its due date`,
          payload: { taskId: task.id, projectId: task.project_id },
        });

        // Send email (non-blocking)
        sendDeadlineEmail({
          to: task.user_email,
          userName: task.user_name,
          taskTitle: task.title,
          projectName: task.project_name,
          dueDate: task.due_date,
        }).catch(console.error);
      }

      console.log(`✅ Overdue check: ${result.rows.length} tasks flagged`);
    } catch (err) {
      console.error('❌ Overdue cron error:', err);
    }
  });

  console.log('✅ Cron jobs started');
};

module.exports = startCronJobs;
