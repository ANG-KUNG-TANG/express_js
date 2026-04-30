// src/tests/services/email.service.test.js

import { jest } from '@jest/globals';

// ── nodemailer mock ───────────────────────────────────────────────────────────
// Must use jest.unstable_mockModule (not jest.mock) in ESM mode.
// The module under test is imported dynamically AFTER this registration.

const mockSendMail = jest.fn();
const mockVerify   = jest.fn();

jest.unstable_mockModule('nodemailer', () => ({
    default: {
        createTransport: jest.fn(() => ({
            sendMail: mockSendMail,
            verify:   mockVerify,
        })),
    },
}));

// Dynamic import AFTER mock registration so the mock is in place when
// email.service.js executes its top-level `import nodemailer from 'nodemailer'`
const nodemailer = (await import('nodemailer')).default;
const { emailService } = await import('../../../src/core/services/email.service.js');

// ─────────────────────────────────────────────────────────────────────────────

describe('emailService', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = {
            ...OLD_ENV,
            SMTP_USER:    'test@example.com',
            SMTP_PASS:    'secret',
            SMTP_FROM:    'noreply@example.com',
            FRONTEND_URL: 'https://app.example.com',
            SMTP_HOST:    'smtp.example.com',
            SMTP_PORT:    '587',
            SMTP_SECURE:  'false',
        };
        delete process.env.SMTP_SERVICE;
    });

    afterAll(() => { process.env = OLD_ENV; });

    // ── Transporter creation ──────────────────────────────────────────────────

    describe('transporter creation', () => {
        it('creates a Gmail transporter when SMTP_SERVICE=gmail', async () => {
            process.env.SMTP_SERVICE = 'gmail';
            mockSendMail.mockResolvedValueOnce({ messageId: '1' });

            await emailService.sendPasswordResetEmail({
                toEmail: 'u@e.com', userName: 'Alice', rawToken: 'tok',
            });

            expect(nodemailer.createTransport).toHaveBeenCalledWith(
                expect.objectContaining({ service: 'gmail' })
            );
        });

        it('creates a host/port transporter when SMTP_SERVICE is not gmail', async () => {
            mockSendMail.mockResolvedValueOnce({ messageId: '2' });

            await emailService.sendPasswordResetEmail({
                toEmail: 'u@e.com', userName: 'Bob', rawToken: 'tok',
            });

            expect(nodemailer.createTransport).toHaveBeenCalledWith(
                expect.objectContaining({ host: 'smtp.example.com', port: 587 })
            );
        });
    });

    // ── sendPasswordResetEmail ────────────────────────────────────────────────

    describe('sendPasswordResetEmail', () => {
        it('calls sendMail with correct to, subject, from', async () => {
            mockSendMail.mockResolvedValueOnce({ messageId: 'msg-1' });

            await emailService.sendPasswordResetEmail({
                toEmail: 'user@example.com', userName: 'Alice', rawToken: 'reset-xyz',
            });

            expect(mockSendMail).toHaveBeenCalledTimes(1);
            const mail = mockSendMail.mock.calls[0][0];
            expect(mail.to).toBe('user@example.com');
            expect(mail.subject).toMatch(/Reset Your Password/i);
            expect(mail.from).toContain('noreply@example.com');
        });

        it('embeds the reset URL (FRONTEND_URL + rawToken) in the HTML', async () => {
            mockSendMail.mockResolvedValueOnce({});

            await emailService.sendPasswordResetEmail({
                toEmail: 'u@e.com', userName: 'Alice', rawToken: 'abc123',
            });

            const { html } = mockSendMail.mock.calls[0][0];
            expect(html).toContain('https://app.example.com');
            expect(html).toContain('abc123');
        });

        it('includes the userName in the HTML body', async () => {
            mockSendMail.mockResolvedValueOnce({});

            await emailService.sendPasswordResetEmail({
                toEmail: 'u@e.com', userName: 'Charlie', rawToken: 't',
            });

            expect(mockSendMail.mock.calls[0][0].html).toContain('Charlie');
        });

        it('falls back to "there" when userName is falsy', async () => {
            mockSendMail.mockResolvedValueOnce({});

            await emailService.sendPasswordResetEmail({
                toEmail: 'u@e.com', userName: '', rawToken: 't',
            });

            expect(mockSendMail.mock.calls[0][0].html).toContain('Hi there');
        });

        it('returns the value from sendMail', async () => {
            const expected = { messageId: 'returned-id' };
            mockSendMail.mockResolvedValueOnce(expected);

            const result = await emailService.sendPasswordResetEmail({
                toEmail: 'u@e.com', userName: 'X', rawToken: 't',
            });

            expect(result).toEqual(expected);
        });

        it('propagates sendMail errors', async () => {
            mockSendMail.mockRejectedValueOnce(new Error('SMTP failure'));

            await expect(
                emailService.sendPasswordResetEmail({ toEmail: 'u@e.com', userName: 'X', rawToken: 't' })
            ).rejects.toThrow('SMTP failure');
        });
    });

    // ── sendNotificationEmail ─────────────────────────────────────────────────

    describe('sendNotificationEmail', () => {
        it('calls sendMail with correct to, subject, from', async () => {
            mockSendMail.mockResolvedValueOnce({});

            await emailService.sendNotificationEmail({
                toEmail: 'student@example.com', userName: 'Dana',
                subject: 'New Task Assigned', title: 'Task ready',
                body:    'Your teacher assigned a new task.',
            });

            const mail = mockSendMail.mock.calls[0][0];
            expect(mail.to).toBe('student@example.com');
            expect(mail.subject).toBe('New Task Assigned');
            expect(mail.from).toContain('noreply@example.com');
        });

        it('renders title and body in the HTML', async () => {
            mockSendMail.mockResolvedValueOnce({});

            await emailService.sendNotificationEmail({
                toEmail: 'u@e.com', userName: 'Eve',
                subject: 'S', title: 'My Title', body: 'My body text',
            });

            const { html } = mockSendMail.mock.calls[0][0];
            expect(html).toContain('My Title');
            expect(html).toContain('My body text');
        });

        it('includes CTA button when ctaUrl is provided', async () => {
            mockSendMail.mockResolvedValueOnce({});

            await emailService.sendNotificationEmail({
                toEmail: 'u@e.com', userName: 'F', subject: 'S', title: 'T', body: 'B',
                ctaUrl: 'https://app.example.com/tasks/1', ctaText: 'View Task',
            });

            const { html } = mockSendMail.mock.calls[0][0];
            expect(html).toContain('https://app.example.com/tasks/1');
            expect(html).toContain('View Task');
        });

        it('omits CTA when ctaUrl is not provided', async () => {
            mockSendMail.mockResolvedValueOnce({});

            await emailService.sendNotificationEmail({
                toEmail: 'u@e.com', userName: 'G', subject: 'S', title: 'T', body: 'B',
            });

            expect(mockSendMail.mock.calls[0][0].html).not.toContain('View Details');
        });

        it('propagates sendMail errors', async () => {
            mockSendMail.mockRejectedValueOnce(new Error('Timeout'));

            await expect(
                emailService.sendNotificationEmail({
                    toEmail: 'u@e.com', userName: 'H', subject: 'S', title: 'T', body: 'B',
                })
            ).rejects.toThrow('Timeout');
        });
    });

    // ── verifyConnection ──────────────────────────────────────────────────────

    describe('verifyConnection', () => {
        it('calls transporter.verify()', async () => {
            mockVerify.mockResolvedValueOnce(true);
            await emailService.verifyConnection();
            expect(mockVerify).toHaveBeenCalledTimes(1);
        });

        it('propagates verify errors', async () => {
            mockVerify.mockRejectedValueOnce(new Error('Auth failed'));
            await expect(emailService.verifyConnection()).rejects.toThrow('Auth failed');
        });
    });
});