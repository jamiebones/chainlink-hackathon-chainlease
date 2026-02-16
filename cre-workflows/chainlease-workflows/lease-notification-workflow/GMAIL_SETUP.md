# Gmail SMTP Setup Guide for ChainLease Email Notifications

This guide explains how to set up Gmail SMTP for sending lease activation email notifications.

## Prerequisites

1. A Gmail account
2. 2-Factor Authentication enabled on your Google account

## Step-by-Step Setup

### 1. Enable 2-Factor Authentication

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", click on "2-Step Verification"
3. Follow the prompts to enable 2FA if not already enabled

### 2. Generate App Password

1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select app: **Mail**
3. Select device: **Other (Custom name)** → Enter "ChainLease Backend"
4. Click **Generate**
5. Copy the 16-character password (it will look like: `xxxx xxxx xxxx xxxx`)

### 3. Configure Backend Environment

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create `.env` file from example:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and add your Gmail credentials:
   ```env
   GMAIL_USERNAME=your-email@gmail.com
   GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
   ```
   
   **Note**: Remove spaces from the app password

### 4. Configure CRE Workflow Secrets

1. Edit `cre-workflows/chainlease-workflows/secrets.yaml`:
   ```yaml
   secretsNames:
       GMAIL_USERNAME:
           - your-email@gmail.com
       GMAIL_APP_PASSWORD:
           - your-app-password-here
       BACKEND_API_KEY:
           - your-backend-api-key
   ```

### 5. Install Dependencies

```bash
cd backend
npm install
```

### 6. Start Backend Server

```bash
npm start
# or for development with auto-reload:
npm run dev
```

The server will start on port 3001 (or your configured PORT).

### 7. Test Email Configuration

Test the Gmail SMTP connection:

```bash
curl http://localhost:3001/api/send-email/test
```

Expected response:
```json
{
  "success": true,
  "message": "Gmail SMTP configuration is valid",
  "username": "your-email@gmail.com"
}
```

### 8. Send a Test Email

```bash
curl -X POST http://localhost:3001/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "from": {
      "email": "your-email@gmail.com",
      "name": "ChainLease"
    },
    "subject": "Test Email",
    "html": "<h1>Hello</h1><p>This is a test email from ChainLease.</p>",
    "text": "Hello. This is a test email from ChainLease."
  }'
```

Expected response:
```json
{
  "success": true,
  "messageId": "<unique-message-id@gmail.com>",
  "statusCode": 200
}
```

## Gmail Sending Limits

- **Free Gmail accounts**: 500 emails per day
- **Google Workspace accounts**: 2,000 emails per day

For production with high volume, consider:
- Using a Google Workspace account
- Implementing a dedicated email service (SendGrid, Mailgun, AWS SES)
- Adding email queuing for rate limiting

## Troubleshooting

### Error: "Invalid login credentials"
- Ensure 2FA is enabled on your Google account
- Generate a new App Password
- Remove spaces from the app password
- Make sure you're using the app password, not your regular Google password

### Error: "Connection timeout"
- Check firewall settings (port 587 must be open)
- Try port 465 with `secure: true` instead

### Error: "Daily sending quota exceeded"
- Wait 24 hours for the quota to reset
- Consider upgrading to Google Workspace
- Implement email queuing with rate limiting

## Security Best Practices

1. **Never commit** `.env` or actual secrets to version control
2. Use different app passwords for development and production
3. Rotate app passwords periodically
4. Store production secrets securely (e.g., AWS Secrets Manager, HashiCorp Vault)
5. Implement API key authentication for the backend endpoint
6. Use HTTPS in production
7. Monitor email sending logs for suspicious activity

## Production Deployment

For production, update the email endpoint in config:

**config.production.json**:
```json
{
  "emailService": {
    "endpoint": "https://api.chainlease.io/api/send-email",
    "apiKey": "${{ secrets.BACKEND_API_KEY }}",
    "provider": "gmail",
    "smtp": {
      "username": "${{ secrets.GMAIL_USERNAME }}",
      "password": "${{ secrets.GMAIL_APP_PASSWORD }}"
    }
  }
}
```

## Alternative: Gmail API (OAuth2)

For better security and higher limits, consider using Gmail API with OAuth2 instead of SMTP:

1. More secure (no password storage)
2. Higher sending limits
3. Better monitoring and logging
4. Requires more complex setup

See [Gmail API Documentation](https://developers.google.com/gmail/api) for details.

## Support

If you encounter issues:
1. Check the backend server logs
2. Verify environment variables are set correctly
3. Test SMTP connection using the `/test` endpoint
4. Review Gmail's [SMTP documentation](https://support.google.com/a/answer/176600)
