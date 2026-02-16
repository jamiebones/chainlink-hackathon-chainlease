// backend/src/api/notifications.js
// API endpoint for handling lease notification requests from CRE workflow

const nodemailer = require('nodemailer');

/**
 * POST /api/notifications/lease-activated
 * Receives lease activation events from CRE workflow and sends email via Gmail SMTP
 */
async function handleLeaseActivatedNotification(req, res) {
    try {
        // ========================================
        // 1. Validate API Key
        // ========================================
        const apiKey = req.headers.authorization?.replace('Bearer ', '');
        if (!apiKey || apiKey !== process.env.BACKEND_API_KEY) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized - Invalid API key',
            });
        }

        // ========================================
        // 2. Extract and Validate Request Data
        // ========================================
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
        } = req.body;

        if (eventType !== 'lease-activated') {
            return res.status(400).json({
                success: false,
                error: `Invalid event type: ${eventType}`,
            });
        }

        if (!leaseId || !tenantAddress || !propertyId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
            });
        }

        console.log(`[Notification] Processing lease activation for lease #${leaseId}`);

        // ========================================
        // 3. Fetch Tenant Information from Database
        // ========================================
        // TODO: Replace with your actual database query
        const tenant = await fetchTenantFromDatabase(tenantAddress);

        if (!tenant || !tenant.email) {
            console.error(`[Notification] No email found for tenant ${tenantAddress}`);
            return res.status(404).json({
                success: false,
                error: `Tenant email not found for address: ${tenantAddress}`,
            });
        }

        console.log(`[Notification] Tenant email: ${tenant.email}`);

        // ========================================
        // 4. Configure Gmail SMTP Transporter
        // ========================================
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER, // Your Gmail address
                pass: process.env.GMAIL_APP_PASSWORD, // Gmail App Password (NOT regular password)
            },
        });

        // ========================================
        // 5. Generate Email Content
        // ========================================
        const startDateStr = new Date(startDate * 1000).toLocaleDateString();
        const endDateStr = new Date(endDate * 1000).toLocaleDateString();
        const rentAmount = (parseFloat(monthlyRent) / 1e18).toFixed(2); // Assuming 18 decimals

        const emailHtml = generateLeaseActivationEmailHTML({
            tenantName: tenant.name || 'there',
            leaseId,
            propertyId,
            monthlyRent: rentAmount,
            startDate: startDateStr,
            endDate: endDateStr,
            txHash,
        });

        const emailText = generateLeaseActivationEmailText({
            tenantName: tenant.name || 'there',
            leaseId,
            propertyId,
            monthlyRent: rentAmount,
            startDate: startDateStr,
            endDate: endDateStr,
        });

        // ========================================
        // 6. Send Email via Gmail SMTP
        // ========================================
        console.log(`[Notification] Sending email to ${tenant.email}...`);

        const info = await transporter.sendMail({
            from: `"${process.env.EMAIL_FROM_NAME || 'ChainLease'}" <${process.env.GMAIL_USER}>`,
            to: tenant.email,
            subject: 'Your Lease Has Been Approved! 🎉',
            text: emailText,
            html: emailHtml,
        });

        console.log(`[Notification] Email sent! Message ID: ${info.messageId}`);

        // ========================================
        // 7. Store Notification Record in Database
        // ========================================
        // TODO: Replace with your actual database insert
        const notificationRecord = await saveNotificationToDatabase({
            leaseId,
            tenantAddress,
            landlordAddress,
            emailTo: tenant.email,
            emailSent: true,
            messageId: info.messageId,
            txHash,
            blockNumber,
            timestamp,
            sentAt: Date.now(),
        });

        console.log(`[Notification] Notification record saved: ${notificationRecord.id}`);

        // ========================================
        // 8. Return Success Response
        // ========================================
        return res.status(200).json({
            success: true,
            message: `Lease activation notification sent to ${tenant.email}`,
            notificationId: notificationRecord.id,
            emailSent: true,
            messageId: info.messageId,
        });

    } catch (error) {
        console.error('[Notification] Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
}

/**
 * Generate HTML email content
 */
function generateLeaseActivationEmailHTML({ tenantName, leaseId, propertyId, monthlyRent, startDate, endDate, txHash }) {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .details { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea; }
    .detail-row { margin: 10px 0; }
    .detail-label { font-weight: bold; color: #667eea; }
    .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Lease Approved!</h1>
    </div>
    <div class="content">
      <p>Hi ${tenantName},</p>
      
      <p>Great news! Your lease application has been <strong>approved and activated</strong> by the landlord.</p>
      
      <div class="details">
        <h3>Lease Details</h3>
        <div class="detail-row">
          <span class="detail-label">Lease ID:</span> #${leaseId}
        </div>
        <div class="detail-row">
          <span class="detail-label">Property ID:</span> #${propertyId}
        </div>
        <div class="detail-row">
          <span class="detail-label">Monthly Rent:</span> ${monthlyRent} tokens
        </div>
        <div class="detail-row">
          <span class="detail-label">Start Date:</span> ${startDate}
        </div>
        <div class="detail-row">
          <span class="detail-label">End Date:</span> ${endDate}
        </div>
      </div>
      
      <h3>Next Steps</h3>
      <ol>
        <li>Make your first rent payment before the due date</li>
        <li>Review your complete lease agreement in your dashboard</li>
        <li>Contact your landlord for move-in details and key pickup</li>
      </ol>
      
      <center>
        <a href="https://chainlease.io/lease/${leaseId}" class="cta-button">View Lease Details</a>
      </center>
      
      <p style="font-size: 11px; color: #999; margin-top: 30px;">
        Transaction: <a href="https://sepolia.etherscan.io/tx/${txHash}" style="color: #667eea;">${txHash.substring(0, 16)}...</a>
      </p>
      
      <p>If you have any questions, feel free to reply to this email or contact our support team.</p>
      
      <p>Best regards,<br>The ChainLease Team</p>
    </div>
    <div class="footer">
      <p>This is an automated notification from ChainLease. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate plain text email content
 */
function generateLeaseActivationEmailText({ tenantName, leaseId, propertyId, monthlyRent, startDate, endDate }) {
    return `
Hi ${tenantName},

Great news! Your lease application has been approved and activated by the landlord.

Lease Details:
- Lease ID: #${leaseId}
- Property ID: #${propertyId}
- Monthly Rent: ${monthlyRent} tokens
- Start Date: ${startDate}
- End Date: ${endDate}

Next Steps:
1. Make your first rent payment before the due date
2. Review your complete lease agreement in your dashboard
3. Contact your landlord for move-in details and key pickup

View your lease: https://chainlease.io/lease/${leaseId}

If you have any questions, feel free to reply to this email or contact our support team.

Best regards,
The ChainLease Team
  `;
}

/**
 * Fetch tenant from database (placeholder - implement with your DB)
 */
async function fetchTenantFromDatabase(tenantAddress) {
    const { getDatabase } = require('../services/database.js');

    try {
        const db = getDatabase();
        const users = db.collection('users');

        const user = await users.findOne({
            address: tenantAddress.toLowerCase()
        });

        if (!user) {
            console.log(`No user found for address: ${tenantAddress}`);
            return null;
        }

        return {
            address: user.address,
            email: user.email,
            name: user.name
        };
    } catch (error) {
        console.error('Error fetching tenant from database:', error);
        return null;
    }
}

/**
 * Save notification record to database (placeholder - implement with your DB)
 */
async function saveNotificationToDatabase(record) {
    const { getDatabase } = require('../services/database.js');

    try {
        const db = getDatabase();
        const notifications = db.collection('notifications');

        const document = {
            ...record,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await notifications.insertOne(document);

        console.log(`Notification record saved: ${result.insertedId}`);

        return {
            id: result.insertedId.toString(),
            ...document
        };
    } catch (error) {
        console.error('Error saving notification to database:', error);
        throw error;
    }
}

module.exports = {
    handleLeaseActivatedNotification,
};
