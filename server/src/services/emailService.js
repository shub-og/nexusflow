const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email not configured — emails will be skipped in dev');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  return transporter;
};

const send = async (opts) => {
  const t = getTransporter();
  if (!t) { console.log('📧 [DEV] Email skipped:', opts.subject); return; }
  await t.sendMail({ from: process.env.EMAIL_FROM, ...opts });
};

const sendInviteEmail = async ({ to, workspaceName, inviterName, token }) => {
  const link = `${process.env.CLIENT_URL}/invite/${token}`;
  console.log(`📧 Invite link for ${to}: ${link}`);
  await send({
    to, subject: `${inviterName} invited you to ${workspaceName}`,
    html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
      <h2 style="color:#6366f1">You're invited!</h2>
      <p><strong>${inviterName}</strong> invited you to join <strong>${workspaceName}</strong>.</p>
      <a href="${link}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;margin:16px 0">Accept Invitation</a>
      <p style="color:#888;font-size:13px">Link expires in 7 days.</p>
    </div>`,
  });
};

const sendDeadlineEmail = async ({ to, userName, taskTitle, projectName, dueDate }) => {
  await send({
    to, subject: `⏰ Task overdue: ${taskTitle}`,
    html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
      <h2 style="color:#ef4444">Task Overdue</h2>
      <p>Hi ${userName}, <strong>${taskTitle}</strong> in <strong>${projectName}</strong> is past its due date (${new Date(dueDate).toLocaleDateString()}).</p>
      <a href="${process.env.CLIENT_URL}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none">View Task</a>
    </div>`,
  });
};

const sendAssignmentEmail = async ({ to, userName, taskTitle, projectName, assignerName }) => {
  await send({
    to, subject: `📋 New task assigned: ${taskTitle}`,
    html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
      <h2 style="color:#6366f1">New Task Assigned</h2>
      <p>Hi ${userName}, <strong>${assignerName}</strong> assigned you: <strong>${taskTitle}</strong> in <strong>${projectName}</strong>.</p>
      <a href="${process.env.CLIENT_URL}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none">View Task</a>
    </div>`,
  });
};

module.exports = { sendInviteEmail, sendDeadlineEmail, sendAssignmentEmail };
