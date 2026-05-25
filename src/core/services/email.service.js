// core/services/email.service.js

import nodemailer from 'nodemailer';

const APP_NAME   = process.env.APP_NAME    || 'IELTS Platform';
const APP_URL    = process.env.FRONTEND_URL || 'http://localhost:3000';

const createTransporter = () => {
    if (process.env.SMTP_SERVICE === 'gmail') {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
    }
    return nodemailer.createTransport({
        host:   process.env.SMTP_HOST,
        port:   parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
};

// ── HTML base layout ──────────────────────────────────────────────────────────

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
  <div class="header"><h1>${APP_NAME}</h1></div>
  <div class="content">${body}</div>
  <div class="footer">© ${new Date().getFullYear()} ${APP_NAME} · If you didn't request this, you can safely ignore it.</div>
</div></body></html>`;

// ── Templates ─────────────────────────────────────────────────────────────────

const verificationHtml = (userName, verifyUrl) => baseLayout(`
  <h2 style="color:#111827;margin:0 0 16px">Verify your email address</h2>
  <p>Hi ${userName || 'there'},</p>
  <p>Thanks for signing up! Click the button below to verify your email address.
     This link expires in <strong>24 hours</strong>.</p>
  <p style="text-align:center;margin:32px 0">
    <a href="${verifyUrl}" class="btn">Verify my email</a>
  </p>
  <p style="font-size:13px;color:#6b7280">Or paste this link in your browser:<br/>
  <a href="${verifyUrl}" style="color:#1a56db;word-break:break-all">${verifyUrl}</a></p>
  <p style="font-size:13px;color:#6b7280">If you didn't create an account, you can safely ignore this email.</p>
`);

const passwordResetHtml = (userName, resetUrl) => baseLayout(`
  <h2 style="color:#111827;margin:0 0 16px">Reset your password</h2>
  <p>Hi ${userName || 'there'},</p>
  <p>We received a request to reset your password. This link expires in <strong>30 minutes</strong>.</p>
  <p style="text-align:center;margin:32px 0">
    <a href="${resetUrl}" class="btn">Reset my password</a>
  </p>
  <p style="font-size:13px;color:#6b7280">Or paste this link in your browser:<br/>
  <a href="${resetUrl}" style="color:#1a56db;word-break:break-all">${resetUrl}</a></p>
`);

const passwordChangedHtml = (userName) => baseLayout(`
  <h2 style="color:#111827;margin:0 0 16px">Your password has been changed</h2>
  <p>Hi ${userName || 'there'},</p>
  <p>Your password was successfully reset. You can now log in with your new password.</p>
  <p style="font-size:13px;color:#6b7280">
    If you did not make this change, please contact support immediately.
  </p>
`);

const notificationHtml = ({ userName, title, body, ctaText, ctaUrl }) => baseLayout(`
  <h2 style="color:#111827;margin:0 0 16px">${title}</h2>
  <p>Hi ${userName || 'there'},</p>
  <p>${body}</p>
  ${ctaUrl ? `<p style="text-align:center;margin:28px 0"><a href="${ctaUrl}" class="btn">${ctaText || 'View Details'}</a></p>` : ''}
`);

// ── Exported service ──────────────────────────────────────────────────────────

export const emailService = {

    /**
     * FIX: New method — was missing entirely.
     * Called by createUserUsecase and findOrCreateOAuthUser for every new account.
     * @param {{ toEmail: string, userName: string, rawToken: string }} param
     */
    async sendVerificationEmail({ toEmail, userName, rawToken }) {
        const verifyUrl = `${APP_URL}/pages/auth/auth_success.html?token=${rawToken}&type=verify`;
        return createTransporter().sendMail({
            from:    `"${APP_NAME}" <${process.env.SMTP_FROM}>`,
            to:      toEmail,
            subject: `Verify your email — ${APP_NAME}`,
            html:    verificationHtml(userName, verifyUrl),
        });
    },

    /**
     * Existing — unchanged except uses APP_NAME constant.
     */
    async sendPasswordResetEmail({ toEmail, userName, rawToken }) {
        const resetUrl = `${APP_URL}/pages/auth/reset_password.html?token=${rawToken}`;
        return createTransporter().sendMail({
            from:    `"${APP_NAME}" <${process.env.SMTP_FROM}>`,
            to:      toEmail,
            subject: `Reset your password — ${APP_NAME}`,
            html:    passwordResetHtml(userName, resetUrl),
        });
    },

    /**
     * FIX: New method — send after successful password reset to confirm the change.
     * Called by reset_password.uc.js after updating the hash and revoking sessions.
     * @param {{ toEmail: string, userName: string }} param
     */
    async sendPasswordChangedEmail({ toEmail, userName }) {
        return createTransporter().sendMail({
            from:    `"${APP_NAME}" <${process.env.SMTP_FROM}>`,
            to:      toEmail,
            subject: `Your password has been changed — ${APP_NAME}`,
            html:    passwordChangedHtml(userName),
        });
    },

    async sendNotificationEmail({ toEmail, userName, subject, title, body, ctaText, ctaUrl }) {
        return createTransporter().sendMail({
            from:    `"${APP_NAME}" <${process.env.SMTP_FROM}>`,
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