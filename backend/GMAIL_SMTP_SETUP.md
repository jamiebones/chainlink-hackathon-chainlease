# Gmail SMTP Setup Guide for ChainLease Notifications

## Prerequisites
- A Gmail account (can be a dedicated account for the application)
- Node.js backend with nodemailer installed

## Step 1: Enable 2-Factor Authentication on Gmail

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification**
3. Follow the prompts to enable 2FA (required for App Passwords)

## Step 2: Generate Gmail App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Select **App**: Mail
3. Select **Device**: Other (custom name) → Enter "ChainLease Backend"
4. Click **Generate**
5. Copy the 16-character password (shown like: `xxxx xxxx xxxx xxxx`)
6. **Important**: Save this password securely - you won't be able to see it again

## Step 3: Install nodemailer

```bash
cd backend
npm install nodemailer
```

## Step 4: Configure Environment Variables

Add to your `.env` file:

```bash
# Gmail SMTP Configuration
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx  # The 16-char app password from Step 2
EMAIL_FROM_NAME=ChainLease

# Backend API Key (for CRE workflow authentication)
BACKEND_API_KEY=your-secure-random-key-here
```

**Security Notes:**
- Never commit `.env` to version control
- Add `.env` to your `.gitignore`
- Use different credentials for staging/production environments

## Step 5: Add Route to Backend

Add to your Express server (e.g., `backend/src/server.js`):

```javascript
const express = require('express');
const { handleLeaseActivatedNotification } = require('./api/notifications');

const app = express();
app.use(express.json());

// Notification endpoint for CRE workflow
app.post('/api/notifications/lease-activated', handleLeaseActivatedNotification);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
```

## Step 6: Test Email Sending

Create a test script `backend/test-email.js`:

```javascript
const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.GMAIL_USER}>`,
      to: 'your-test-email@example.com', // Replace with your test email
      subject: 'Test Email from ChainLease',
      text: 'If you receive this, Gmail SMTP is working!',
      html: '<p>If you receive this, <strong>Gmail SMTP is working!</strong></p>',
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
}

testEmail();
```

Run the test:
```bash
cd backend
node test-email.js
```

## Step 7: Update CRE Workflow Config

Ensure your CRE workflow config has the correct backend endpoint:

**`config.staging.json`:**
```json
{
  "backendApi": {
    "endpoint": "http://localhost:3001",
    "apiKey": "${{ secrets.BACKEND_API_KEY }}"
  }
}
```

**`config.production.json`:**
```json
{
  "backendApi": {
    "endpoint": "https://api.chainlease.io",
    "apiKey": "${{ secrets.BACKEND_API_KEY }}"
  }
}
```

## Troubleshooting

### Error: "Invalid login: 535-5.7.8 Username and Password not accepted"
- Make sure you're using an **App Password**, not your regular Gmail password
- Verify 2FA is enabled on your Google account
- Check that the app password has no spaces (format: `xxxxxxxxxxxxxxxx`)

### Error: "self signed certificate in certificate chain"
- Add `tls: { rejectUnauthorized: false }` to transporter config (only for development)

### Emails going to spam
- Set up SPF, DKIM, and DMARC records for your domain
- Use a dedicated email address (e.g., `noreply@chainlease.io`)
- Consider using a custom SMTP relay service for production

### Rate Limits
- Gmail has sending limits: ~500 emails/day for free accounts, ~2000/day for Google Workspace
- For high-volume applications, consider:
  - SendGrid (100 emails/day free, then $15/mo for 40k emails)
  - Mailgun
  - AWS SES
  - Postmark

## Production Best Practices

1. **Use a dedicated Gmail account** for sending (not your personal email)
2. **Monitor sending limits** - Gmail restricts to ~500-2000 emails/day
3. **Implement retry logic** for failed sends
4. **Log all email attempts** to your database
5. **Consider email queue** (Bull, RabbitMQ) for reliability
6. **Add unsubscribe links** to emails (required by law in many jurisdictions)
7. **Test with real email addresses** before production deployment

## Alternative: Google Workspace (Paid)

For production, consider upgrading to Google Workspace:
- Higher sending limits (2000 emails/day)
- Custom domain (noreply@chainlease.io instead of @gmail.com)
- Better deliverability
- Professional appearance
- Cost: $6/user/month

Setup is the same, just use your Google Workspace email credentials.

## Next Steps

1. ✅ Set up Gmail App Password
2. ✅ Configure `.env` with credentials
3. ✅ Test email sending with `test-email.js`
4. ✅ Start backend server
5. ✅ Test CRE workflow → Backend → Gmail flow
6. ✅ Monitor logs for successful email delivery
