# Lease Notification Workflow

## Overview
This CRE workflow monitors `LeaseActivated` events from the LeaseAgreement contract and triggers the backend API to send email notifications to tenants when their lease is approved and activated by the landlord.

## Architecture

**Backend-First Approach**: The workflow only forwards event data to your backend API, which handles all email logic, Gmail SMTP integration, and database storage.

## Workflow Flow

```
1. LeaseAgreement.activateLease() called by landlord
   ↓
2. LeaseActivated event emitted on-chain
   ↓
3. CRE Workflow detects event and decodes data
   ↓
4. POST lease details to backend API endpoint
   ↓
5. Backend API:
   - Fetches tenant email from database
   - Generates email template
   - Sends email via Gmail SMTP
   - Stores notification record
   ↓
6. Workflow receives backend confirmation
```

## Event Structure

```solidity
event LeaseActivated(
    uint256 indexed leaseId,
    address indexed tenant,
    address indexed landlord,
    uint256 propertyId,
    uint256 startDate,
    uint256 endDate,
    uint256 monthlyRent
);
```

## Configuration

### Required Config (`config.*.json`)
```json
{
  "evms": [{
    "chainSelectorName": "ethereum-testnet-sepolia",
    "leaseAgreementAddress": "0x...",
    "startBlock": 12345
  }],
  "backendApi": {
    "endpoint": "https://api.chainlease.io",
    "apiKey": "${{ secrets.BACKEND_API_KEY }}"
  }
}
```

### Secrets (`secrets.yaml`)
```yaml
BACKEND_API_KEY: "your-backend-api-key"
```

### Backend API Endpoint

The workflow sends POST requests to:
```
POST {backendApi.endpoint}/api/notifications/lease-activated
```

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer {BACKEND_API_KEY}
```

**Request Body:**
```json
{
  "eventType": "lease-activated",
  "leaseId": "123",
  "tenantAddress": "0x...",
  "landlordAddress": "0x...",
  "propertyId": "456",
  "startDate": 1709251200,
  "endDate": 1740787200,
  "monthlyRent": "1500000000000000000000",
  "txHash": "0x...",
  "blockNumber": 7123456,
  "timestamp": 1709251234567
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Notification email sent successfully",
  "notificationId": "notification_abc123",
  "emailSent": true
}
```

## Benefits of Backend-First Architecture

✅ **Simpler workflow** - Only forwards events, no complex email logic  
✅ **Backend controls everything** - Email templates, retry logic, Gmail SMTP credentials  
✅ **Reusable API** - Trigger notifications from admin panel, cron jobs, other sources  
✅ **Better security** - Gmail SMTP credentials never leave your backend  
✅ **Easier testing** - Test email sending independently of blockchain events  

## Files

- `main.ts` - Entry point, listens to events and triggers backend API
- `types.ts` - TypeScript interfaces and Zod schemas
- `abi.ts` - LeaseActivated event ABI and signature
- `email-service.ts` - Reference email template (not used by workflow)
- `config.*.json` - Environment-specific configuration
- `workflow.yaml` - Workflow definition for CRE

## Testing

```bash
# Simulate workflow locally
cre workflow simulate --config config.staging.json

# Deploy to staging
cre workflow deploy --config config.staging.json --target staging

# Deploy to production
cre workflow deploy --config config.production.json --target production
```

## Backend Implementation Guide

Your backend API endpoint should:

1. **Validate the request** (check API key, validate payload)
2. **Fetch tenant email** from your database using `tenantAddress`
3. **Generate email template** with lease details
4. **Send via Gmail SMTP** (using nodemailer or similar)
5. **Store notification record** in database
6. **Return success response**

### Example Backend Implementation (Node.js/Express)

```javascript
const nodemailer = require('nodemailer');

app.post('/api/notifications/lease-activated', async (req, res) => {
  try {
    // 1. Validate API key
    const apiKey = req.headers.authorization?.replace('Bearer ', '');
    if (apiKey !== process.env.BACKEND_API_KEY) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // 2. Extract lease data
    const { leaseId, tenantAddress, propertyId, startDate, endDate, monthlyRent } = req.body;

    // 3. Fetch tenant email from database
    const tenant = await db.users.findOne({ address: tenantAddress });
    if (!tenant || !tenant.email) {
      return res.status(404).json({ success: false, error: 'Tenant email not found' });
    }

    // 4. Send email via Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD, // Use App Password, not regular password
      },
    });

    const emailHtml = generateLeaseEmail({ leaseId, propertyId, startDate, endDate, monthlyRent, tenantName: tenant.name });

    const info = await transporter.sendMail({
      from: '"ChainLease" <noreply@chainlease.io>',
      to: tenant.email,
      subject: 'Your Lease Has Been Approved! 🎉',
      html: emailHtml,
    });

    // 5. Store notification record
    await db.notifications.create({
      leaseId,
      tenantAddress,
      emailTo: tenant.email,
      emailSent: true,
      messageId: info.messageId,
      timestamp: Date.now(),
    });

    // 6. Return success
    res.json({
      success: true,
      message: 'Notification email sent successfully',
      emailSent: true,
      notificationId: info.messageId,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## Email Template Example

Your backend should generate an email like:

```
Subject: Your Lease Has Been Approved! 🎉

Hi [Tenant Name],

Great news! Your lease application has been approved and activated.

Lease Details:
- Lease ID: #12345
- Property ID: #678
- Monthly Rent: 1500 USDC
- Start Date: March 1, 2026
- End Date: March 1, 2027

Next Steps:
1. Make your first rent payment before [Due Date]
2. Review your lease agreement in your dashboard
3. Contact your landlord for move-in details

View Lease: https://chainlease.io/lease/12345

Questions? Reply to this email or contact support@chainlease.io

Best regards,
The ChainLease Team
```

## Monitoring

The workflow logs:
- Event detection
- Email send attempts
- API response codes
- Database storage confirmations
- Error details

Access logs via:
```bash
cre workflow logs --name lease-notification-workflow
```
