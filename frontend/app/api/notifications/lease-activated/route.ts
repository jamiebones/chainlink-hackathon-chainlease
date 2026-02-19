// app/api/notifications/lease-activated/route.ts
// Lease activation notification endpoint for CRE workflow

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        // ========================================
        // 1. Validate API Key
        // ========================================
        const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');
        if (!apiKey || apiKey !== process.env.BACKEND_API_KEY) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Unauthorized - Invalid API key',
                },
                { status: 401 }
            );
        }

        // ========================================
        // 2. Extract and Validate Request Data
        // ========================================
        const body = await request.json();
        const {
            eventType,
            leaseId,
            tenantAddress,
            landlordAddress,
            propertyId,
            startDate,
            endDate,
            monthlyRent,
            txHash,
            blockNumber,
            timestamp,
        } = body;

        if (eventType !== 'lease-activated') {
            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid event type: ${eventType}`,
                },
                { status: 400 }
            );
        }

        if (!leaseId || !tenantAddress || !propertyId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields',
                },
                { status: 400 }
            );
        }

        console.log(`[Notification] Processing lease activation for lease #${leaseId}`);

        // ========================================
        // 3. Fetch Tenant Information from Database
        // ========================================
        const db = await getDatabase();
        const users = db.collection('users');
        const tenant = await users.findOne({ address: tenantAddress.toLowerCase() });

        if (!tenant || !tenant.email) {
            console.error(`[Notification] No email found for tenant ${tenantAddress}`);
            return NextResponse.json(
                {
                    success: false,
                    error: `Tenant email not found for address: ${tenantAddress}`,
                },
                { status: 404 }
            );
        }

        console.log(`[Notification] Tenant email: ${tenant.email}`);

        // ========================================
        // 4. Generate Email Content
        // ========================================
        const startDateStr = new Date(startDate * 1000).toLocaleDateString();
        const endDateStr = new Date(endDate * 1000).toLocaleDateString();
        const rentAmount = (parseFloat(monthlyRent) / 1e18).toFixed(2);

        const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .details { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Lease Activated!</h1>
            </div>
            <div class="content">
              <p>Hello ${tenant.name || 'there'},</p>
              <p>Great news! Your lease has been successfully activated on ChainLease.</p>
              <div class="details">
                <p><strong>Lease ID:</strong> ${leaseId}</p>
                <p><strong>Property ID:</strong> ${propertyId}</p>
                <p><strong>Monthly Rent:</strong> ${rentAmount} ETH</p>
                <p><strong>Start Date:</strong> ${startDateStr}</p>
                <p><strong>End Date:</strong> ${endDateStr}</p>
                ${txHash ? `<p><strong>Transaction:</strong> ${txHash}</p>` : ''}
              </div>
              <p>Your lease is now active. You can manage your rental on the ChainLease platform.</p>
            </div>
            <div class="footer">
              <p>ChainLease - Decentralized Real Estate Platform</p>
            </div>
          </div>
        </body>
      </html>
    `;

        // ========================================
        // 5. Send Email
        // ========================================
        await sendEmail({
            to: tenant.email,
            from: {
                email: process.env.GMAIL_USERNAME || 'noreply@chainlease.com',
                name: 'ChainLease',
            },
            subject: `Lease Activated - Property #${propertyId}`,
            html: emailHtml,
            text: `Your lease #${leaseId} has been activated. Start date: ${startDateStr}, End date: ${endDateStr}`,
        });

        console.log(`✅ Notification email sent to ${tenant.email}`);

        return NextResponse.json({
            success: true,
            message: 'Notification sent successfully',
            recipient: tenant.email,
        });
    } catch (error) {
        console.error('[Notification] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to send notification',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
