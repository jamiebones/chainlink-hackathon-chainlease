// lib/email.ts
// Email utilities using Gmail SMTP

import nodemailer from 'nodemailer';

export interface EmailOptions {
    to: string;
    from: {
        email: string;
        name: string;
    };
    subject: string;
    html: string;
    text?: string;
}

export function createGmailTransporter(username: string, password: string) {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: username,
            pass: password,
        },
        tls: {
            rejectUnauthorized: false,
        },
    });
}

export async function sendEmail(options: EmailOptions) {
    const username = process.env.GMAIL_USERNAME;
    const password = process.env.GMAIL_APP_PASSWORD;

    if (!username || !password) {
        throw new Error('Gmail SMTP credentials not configured');
    }

    const transporter = createGmailTransporter(username, password);
    await transporter.verify();

    const info = await transporter.sendMail({
        from: `"${options.from.name}" <${options.from.email}>`,
        to: options.to,
        subject: options.subject,
        text: options.text || '',
        html: options.html,
    });

    return info;
}
