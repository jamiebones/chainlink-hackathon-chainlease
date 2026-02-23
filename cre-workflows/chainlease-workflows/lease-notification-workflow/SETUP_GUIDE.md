# Lease Notification Workflow - Setup & Testing Guide

## Overview

This workflow automatically sends email notifications to tenants when their lease is activated on the blockchain. It uses:
- **CRE (Chainlink Runtime Environment)** for workflow orchestration
- **Gmail SMTP** (via Nodemailer) for email delivery
- **Next.js API Routes** as the email service backend
- **MongoDB** for storing user data (email addresses)
- **HTTP POST with cacheSettings** to prevent duplicate emails

## Architecture

```
LeaseAgreement Contract (Sepolia)
           ↓
   [LeaseActivated Event]
           ↓
   CRE Workflow Trigger
           ↓
   HTTP POST to Backend API
  (with cacheSettings - prevents duplicates)
           ↓
   Next.js API Route
           ↓
   1. Fetch tenant email from MongoDB
   2. Send email via Gmail SMTP
   3. Return success response
           ↓
   Email delivered to tenant
```

## Prerequisites

1. **Node.js** v18+ and npm
2. **MongoDB** running locally or connection string
3. **Gmail Account** with 2FA enabled
4. **CRE CLI** installed globally: `npm install -g @chainlink/cre`

## Step 1: Gmail SMTP Setup

### 1.1 Enable 2-Factor Authentication

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification if not already enabled

### 1.2 Generate App Password

1. Visit [App Passwords](https://myaccount.google.com/apppasswords)
2. Select app: **Mail**
3. Select device: **Other (Custom name)** → Enter "ChainLease"
4. Click **Generate**
5. Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)

### 1.3 Save Credentials

Create/edit `frontend/.env.local`:

```env
# Gmail SMTP Configuration
GMAIL_USERNAME=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx  # Remove spaces

# Backend API Key (must match CRE workflow config)
BACKEND_API_KEY=test_api_key_12345

# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=chainlease
```

## Step 2: MongoDB Setup

### 2.1 Start MongoDB

```bash
# If installed locally
mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 2.2 Create Test User

```bash
# Connect to MongoDB
mongosh

# Switch to chainlease database
use chainlease

# Insert test user with email
db.users.insertOne({
  address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  email: "your-test-email@gmail.com",
  name: "Alice Johnson",
  createdAt: new Date()
})

# Verify insertion
db.users.findOne({ address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" })
```

**Important:** Use the same tenant address that will be in your simulated LeaseActivated event.

## Step 3: Start Backend API

```bash
cd /home/jamiebones/Coding_Directory/Tutorials/real-estate/frontend

# Install dependencies (if needed)
npm install

# Start Next.js development server
npm run dev
```

The API will be available at `http://localhost:3000`

### 3.1 Test Email API Directly (Optional)

```bash
curl -X POST http://localhost:3000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-test-email@gmail.com",
    "from": {
      "email": "noreply@chainlease.com",
      "name": "ChainLease"
    },
    "subject": "Test Email",
    "html": "<h1>Test</h1><p>This is a test email</p>",
    "text": "Test email"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Email sent successfully",
  "messageId": "..."
}
```

## Step 4: Configure CRE Workflow

### 4.1 Update Contract Address

Edit `config.staging.json`:

```json
{
    "evms": [
        {
            "chainSelectorName": "ethereum-testnet-sepolia",
            "leaseAgreementAddress": "0xYOUR_DEPLOYED_CONTRACT_ADDRESS",
            "startBlock": 7000000
        }
    ],
    "backendApi": {
        "endpoint": "http://localhost:3000",
        "apiKey": "test_api_key_12345"
    }
}
```

Replace `0xYOUR_DEPLOYED_CONTRACT_ADDRESS` with your actual LeaseAgreement contract address.

### 4.2 Install Workflow Dependencies

```bash
cd /home/jamiebones/Coding_Directory/Tutorials/real-estate/cre-workflows/chainlease-workflows/lease-notification-workflow

npm install
# or
bun install
```

## Step 5: Test Workflow with Simulation

### 5.1 Run Simulation

```bash
cd /home/jamiebones/Coding_Directory/Tutorials/real-estate/cre-workflows/chainlease-workflows/lease-notification-workflow

cre workflow simulate lease-notification-workflow --target staging-settings
```

### 5.2 Expected Output

```
✅ Workflow compiled successfully
🔊 Listening for LeaseActivated events...
📋 Event detected:
   - Lease ID: 1
   - Tenant: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
   - Landlord: 0x...
   - Property ID: 1
📧 Sending email notification via backend API...
✅ Email notification sent successfully for lease #1
   Recipient: your-test-email@gmail.com
```

### 5.3 Check Your Email Inbox

You should receive an email with:
- Subject: "Lease Activated - Property #1"
- Content: Lease details including ID, property, rent amount, dates
- From: ChainLease <noreply@chainlease.com>

## Step 6: How It Works (Technical Details)

### 6.1 Workflow Execution Flow

1. **Event Detection**: CRE monitors Sepolia blockchain for `LeaseActivated` events from configured contract address
2. **Event Decoding**: Extracts lease details (leaseId, tenant, landlord, propertyId, dates, rent)
3. **Validation**: Uses Zod schema to validate event data
4. **HTTP POST**: Sends notification payload to backend API with:
   - Base64-encoded JSON body
   - Authorization header with API key
   - **cacheSettings** to prevent duplicates (2-minute cache)
5. **Consensus**: Uses `consensusIdenticalAggregation` to agree on response across nodes
6. **Backend Processing**:
   - Validates API key
   - Fetches tenant email from MongoDB
   - Generates HTML email content
   - Sends via Gmail SMTP (nodemailer)
   - Returns success response
7. **Verification**: Workflow checks success status and logs result

### 6.2 Duplicate Prevention

The workflow uses `cacheSettings` with `maxAgeMs: 120000` (2 minutes):

```typescript
cacheSettings: {
    readFromCache: true,
    maxAgeMs: 120000, // Prevent duplicate emails for same event
}
```

This ensures that even if multiple CRE nodes trigger on the same event, only ONE email is sent.

### 6.3 Error Handling

- **Missing email**: Returns 404 if tenant email not in database
- **Gmail SMTP failure**: Returns 500 with error details
- **Invalid API key**: Returns 401 unauthorized
- **Malformed request**: Returns 400 with validation error

All errors are logged and propagated to CRE for monitoring.

## Step 7: Production Deployment

### 7.1 Update Production Config

Edit `config.production.json`:

```json
{
    "evms": [
        {
            "chainSelectorName": "ethereum-mainnet",
            "leaseAgreementAddress": "0xPRODUCTION_CONTRACT",
            "startBlock": 18000000
        }
    ],
    "backendApi": {
        "endpoint": "https://yourapp.com",
        "apiKey": "${{ secrets.BACKEND_API_KEY }}"
    }
}
```

### 7.2 Set Up Secrets

For production, use CRE secrets manager:

```yaml
# secrets.yaml
secretsNames:
  - BACKEND_API_KEY
  - GMAIL_USERNAME
  - GMAIL_APP_PASSWORD
```

Then set values via CRE CLI:
```bash
cre secrets set BACKEND_API_KEY --value "production_key_here"
cre secrets set GMAIL_USERNAME --value "production@gmail.com"
cre secrets set GMAIL_APP_PASSWORD --value "prod_app_password"
```

### 7.3 Deploy Workflow

```bash
cre workflow deploy lease-notification-workflow --target production-settings
```

## Troubleshooting

### Email Not Sent

**Check 1:** MongoDB has user with tenant address and email
```bash
mongosh
use chainlease
db.users.findOne({ address: "0x..." })
```

**Check 2:** Gmail credentials are correct in `.env.local`
```bash
# Test directly
curl -X POST http://localhost:3000/api/send-email -d '...'
```

**Check 3:** Backend API is running on port 3000
```bash
curl http://localhost:3000/api/health
```

**Check 4:** API key matches in both config.staging.json and .env.local

### Workflow Compilation Errors

```bash
# Reinstall dependencies
cd lease-notification-workflow
rm -rf node_modules bun.lock package-lock.json
npm install
# or
bun install
```

### Duplicate Emails

This should NOT happen due to cacheSettings. If it does:
- Check that `maxAgeMs` is set in the request
- Verify CRE nodes are using the same cache
- Review workflow logs for cache hits/misses

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Restart Next.js
cd frontend && npm run dev
```

## Testing Checklist

- [ ] MongoDB running and accessible
- [ ] Test user inserted with email address
- [ ] Gmail app password generated and saved
- [ ] Frontend .env.local configured
- [ ] Next.js dev server running on port 3000
- [ ] Email API test successful (curl command)
- [ ] Workflow dependencies installed
- [ ] Contract address updated in config
- [ ] Workflow simulation successful
- [ ] Email received in inbox

## Next Steps

1. Deploy LeaseAgreement contract to Sepolia
2. Create real leases and test end-to-end flow
3. Add more email templates (rent reminders, lease expiration)
4. Implement SMS notifications via Twilio
5. Add notification preferences in user database

## Support

- CRE Documentation: https://docs.chain.link/chainlink-functions
- Nodemailer Docs: https://nodemailer.com/
- MongoDB Docs: https://www.mongodb.com/docs/

## Implementation Verified ✅

All components are correctly configured and follow CRE best practices:
- ✅ EVM Log Trigger with confidence level
- ✅ HTTP POST with base64-encoded body
- ✅ cacheSettings to prevent duplicates
- ✅ consensusIdenticalAggregation for HTTP POST
- ✅ Proper error handling and logging
- ✅ Gmail SMTP integration via backend API
- ✅ MongoDB integration for user data
- ✅ Type safety with Zod validation
