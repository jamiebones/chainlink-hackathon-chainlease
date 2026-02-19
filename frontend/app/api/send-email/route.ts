// app/api/send-email/route.ts
// Email sending API via Gmail SMTP

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { to, from, subject, html, text } = body;

        // Validate required fields
        if (!to || !from || !subject || !html) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields: to, from, subject, html',
                },
                { status: 400 }
            );
        }

        // Send email
        const info = await sendEmail({
            to,
            from,
            subject,
            html,
            text,
        });

        console.log(`✅ Email sent: ${info.messageId}`);

        return NextResponse.json({
            success: true,
            message: 'Email sent successfully',
            messageId: info.messageId,
        });
    } catch (error) {
        console.error('Error sending email:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to send email',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
