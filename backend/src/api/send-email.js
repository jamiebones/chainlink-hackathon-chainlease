// send-email.js
// Backend endpoint for sending emails via Gmail SMTP
// This service receives HTTP requests from the CRE workflow and sends emails using Gmail SMTP

import nodemailer from 'nodemailer';
import express from 'express';

const router = express.Router();

/**
 * Gmail SMTP Configuration
 * 
 * Prerequisites:
 * 1. Enable 2-Factor Authentication on your Google account
 * 2. Generate an App Password: https://myaccount.google.com/apppasswords
 * 3. Use the app password instead of your regular password
 * 
 * Environment Variables:
 * - GMAIL_USERNAME: Your Gmail address (e.g., yourname@gmail.com)
 * - GMAIL_APP_PASSWORD: Your Gmail app-specific password (16-character code)
 */

/**
 * Creates a Gmail SMTP transporter
 * @param {string} username - Gmail email address
 * @param {string} password - Gmail app password
 * @returns {nodemailer.Transporter}
 */
function createGmailTransporter(username, password) {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // Use TLS
        auth: {
            user: username,
            pass: password,
        },
        tls: {
            rejectUnauthorized: false, // For development; use true in production
        },
    });
}

/**
 * Sends an email via Gmail SMTP
 * 
 * POST /api/send-email
 * Body:
 * {
 *   "to": "recipient@example.com",
 *   "from": {
 *     "email": "sender@example.com",
 *     "name": "Sender Name"
 *   },
 *   "subject": "Email Subject",
 *   "html": "<html>...</html>",
 *   "text": "Plain text version",
 *   "smtp": {
 *     "username": "your-gmail@gmail.com",
 *     "password": "your-app-password"
 *   }
 * }
 */
router.post('/', async (req, res) => {
    try {
        const { to, from, subject, html, text, smtp } = req.body;

        // Validate required fields
        if (!to || !from || !subject || !html) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: to, from, subject, html',
            });
        }

        // Get SMTP credentials from request or environment
        const username = smtp?.username || process.env.GMAIL_USERNAME;
        const password = smtp?.password || process.env.GMAIL_APP_PASSWORD;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Gmail SMTP credentials not provided',
            });
        }

        // Create transporter
        const transporter = createGmailTransporter(username, password);

        // Verify connection
        await transporter.verify();

        // Send email
        const info = await transporter.sendMail({
            from: `"${from.name}" <${from.email}>`,
            to,
            subject,
            text: text || '',
            html,
        });

        console.log('Email sent successfully:', info.messageId);

        res.status(200).json({
            success: true,
            messageId: info.messageId,
            statusCode: 200,
        });

    } catch (error) {
        console.error('Error sending email:', error);

        res.status(500).json({
            success: false,
            statusCode: 500,
            error: error.message,
        });
    }
});

/**
 * Test endpoint to verify Gmail SMTP configuration
 * 
 * GET /api/send-email/test
 */
router.get('/test', async (req, res) => {
    try {
        const username = process.env.GMAIL_USERNAME;
        const password = process.env.GMAIL_APP_PASSWORD;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Gmail credentials not configured in environment variables',
            });
        }

        const transporter = createGmailTransporter(username, password);
        await transporter.verify();

        res.status(200).json({
            success: true,
            message: 'Gmail SMTP configuration is valid',
            username,
        });

    } catch (error) {
        console.error('SMTP configuration test failed:', error);

        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

export default router;
