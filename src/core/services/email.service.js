// core/services/email.service.js
// Lives alongside jwt.service.js and token_store.service.js

import nodemailer from 'nodemailer';

const createTransporter = () =>
    nodemailer.createTransport({
        host:   process.env.SMTP_HOST,
        port:   parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

// ── HTML templates ───────────────────────────────────────────────────────────

const baseLayout = (body) => `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<style>
  body{margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif}
  .wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
  .header{background:#1a56db;padding:24px 32px} .header h1{margin:0;color:#fff;font-size:22px}
  .content{padding:32px} p{color:#374151;font-size:15px;line-height:1.6}
  .btn{display:inline-block;background:#1a56db;color:#fff;text-decoration:none;padding:13px 28px;border-radius:6px;font-size:15px;font-weight:600}
  .footer{background:#f4f6f9;padding:16px 32px;text-align:center;font-size:12px;color:#9ca3af}
</style></head><body>
<div class="wrap">
  <div class="header"><h1>IELTS Platform</h1></div>
  <div class="content">${body}</div>
  <div class="footer">© ${new Date().getFullYear()} IELTS Platform · If you didn't request this, you can safely ignore it.</div>
</div></body></html>`;

const passwordResetHtml = (userName, resetUrl) => baseLayout(`
  <h2 style="color:#111827;margin:0 0 16px">Reset Your Password</h2>
  <p>Hi ${userName || 'there'},</p>
  <p>We received a request to reset your password. This link expires in <strong>30 minutes</strong>.</p>
  <p style="text-align:center;margin:32px 0"><a href="${resetUrl}" class="btn">Reset My Password</a></p>
  <p style="font-size:13px;color:#6b7280">Or paste this link in your browser:<br/>
  <a href="${resetUrl}" style="color:#1a56db;word-break:break-all">${resetUrl}</a></p>
`);

const notificationHtml = ({ userName, title, body, ctaText, ctaUrl }) => baseLayout(`
  <h2 style="color:#111827;margin:0 0 16px">${title}</h2>
  <p>Hi ${userName || 'there'},</p>
  <p>${body}</p>
  ${ctaUrl ? `<p style="text-align:center;margin:28px 0"><a href="${ctaUrl}" class="btn">${ctaText || 'View Details'}</a></p>` : ''}
`);

// ── Exported service ─────────────────────────────────────────────────────────

export const emailService = {
    async sendPasswordResetEmail({ toEmail, userName, rawToken }) {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;
        return createTransporter().sendMail({
            from:    `"IELTS Platform" <${process.env.SMTP_FROM}>`,
            to:      toEmail,
            subject: 'Reset Your Password — IELTS Platform',
            html:    passwordResetHtml(userName, resetUrl),
        });
    },

    async sendNotificationEmail({ toEmail, userName, subject, title, body, ctaText, ctaUrl }) {
        return createTransporter().sendMail({
            from:    `"IELTS Platform" <${process.env.SMTP_FROM}>`,
            to:      toEmail,
            subject,
            html:    notificationHtml({ userName, title, body, ctaText, ctaUrl }),
        });
    },

    async verifyConnection() {
        await createTransporter().verify();
        console.log('[emailService] SMTP connection verified ✓');
    },
};