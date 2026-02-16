# ChainLease Notification System - Complete Setup Guide

## 🎯 Architecture Overview

```
┌─────────────────┐
│ Smart Contract  │
│ LeaseAgreement  │
│                 │
│ activateLease() │──── emits ────┐
└─────────────────┘                │
                                   ▼
                         ┌──────────────────┐
                         │ LeaseActivated   │
                         │ Event On-Chain   │
                         └──────────────────┘
                                   │
                                   │ listens
                                   ▼
                         ┌──────────────────┐
                         │  CRE Workflow    │
                         │  (Chainlink)     │
                         │                  │
                         │  - Decode event  │
                         │  - Extract data  │
                         └──────────────────┘
                                   │
                                   │ POST /api/notifications/lease-activated
                                   ▼
                         ┌──────────────────┐
                         │  Backend API     │
                         │  (Express.js)    │
                         │                  │
                         │  - Fetch tenant  │
                         │  - Generate HTML │
                         │  - Send email    │
                         │  - Store record  │
                         └──────────────────┘
                                   │
                                   │ SMTP
                                   ▼
                         ┌──────────────────┐
                         │  Gmail SMTP      │
                         │                  │
                         │  Deliver email   │
                         │  to tenant       │
                         └──────────────────┘
```

## 📁 Project Structure

```
real-estate/
├── contracts/
│   └── LeaseAgreement.sol                 # Smart contract with LeaseActivated event
├── cre-workflows/
│   └── chainlease-workflows/
│       └── lease-notification-workflow/
│           ├── main.ts                    # CRE workflow entry point
│           ├── types.ts                   # TypeScript types
│           ├── abi.ts                     # Event ABI
│           ├── config.staging.json        # Staging config
│           ├── config.production.json     # Production config
│           └── README.md                  # Workflow documentation
└── backend/
    ├── src/
    │   ├── server.js                      # Express server
    │   └── api/
    │       └── notifications.js           # Email notification handler
    ├── test-email.js                      # Gmail SMTP test script
    ├── GMAIL_SMTP_SETUP.md                # Gmail setup guide
    └── .env                                # Environment variables
```

## 🚀 Quick Start

### Step 1: Backend Setup

1. **Install dependencies:**
   ```bash
   cd backend
   npm install nodemailer dotenv
   ```

2. **Set up Gmail App Password:**
   - Enable 2FA: https://myaccount.google.com/security
   - Generate App Password: https://myaccount.google.com/apppasswords
   - Save the 16-character password

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env:
   GMAIL_USER=your-gmail@gmail.com
   GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
   BACKEND_API_KEY=your-secure-random-key
   EMAIL_FROM_NAME=ChainLease
   PORT=3001
   ```

4. **Test Gmail SMTP:**
   ```bash
   node test-email.js
   # Should send test email to your Gmail
   ```

5. **Start backend server:**
   ```bash
   npm start
   # Backend running on http://localhost:3001
   ```

### Step 2: Deploy Smart Contract

1. **Compile contract:**
   ```bash
   npx hardhat compile
   ```

2. **Deploy LeaseAgreement:**
   ```bash
   npx hardhat run scripts/deploy.js --network sepolia
   # Save the deployed contract address
   ```

### Step 3: Configure CRE Workflow

1. **Update contract address:**
   ```bash
   cd cre-workflows/chainlease-workflows/lease-notification-workflow
   
   # Edit config.staging.json:
   {
     "evms": [{
       "leaseAgreementAddress": "0xYourDeployedContractAddress"
     }]
   }
   ```

2. **Set secrets:**
   ```bash
   cd ../  # chainlease-workflows directory
   
   # Edit secrets.yaml:
   BACKEND_API_KEY: "your-secure-random-key"  # Same as .env
   ```

3. **Install workflow dependencies:**
   ```bash
   cd lease-notification-workflow
   npm install
   ```

### Step 4: Test & Deploy Workflow

1. **Simulate locally:**
   ```bash
   npm run simulate
   # Tests workflow logic without deploying
   ```

2. **Deploy to staging:**
   ```bash
   npm run deploy:staging
   # Workflow now listening to Sepolia testnet
   ```

3. **Monitor workflow:**
   ```bash
   cre workflow logs --name lease-notification-workflow
   ```

## 🧪 End-to-End Testing

### Test Flow:

1. **Create a lease (on-chain):**
   ```javascript
   // Call createLease() from frontend or script
   await leaseAgreement.createLease(propertyId, tenant, duration, rent);
   ```

2. **Activate the lease (triggers workflow):**
   ```javascript
   await leaseAgreement.activateLease(leaseId);
   ```

3. **Verify:**
   - ✅ Check CRE workflow logs for event detection
   - ✅ Check backend logs for API call
   - ✅ Check tenant's email inbox for notification
   - ✅ Check database for notification record

### Manual API Test:

```bash
curl -X POST http://localhost:3001/api/notifications/lease-activated \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-backend-api-key" \
  -d '{
    "eventType": "lease-activated",
    "leaseId": "123",
    "tenantAddress": "0x1234567890123456789012345678901234567890",
    "landlordAddress": "0x0987654321098765432109876543210987654321",
    "propertyId": "456",
    "startDate": 1709251200,
    "endDate": 1740787200,
    "monthlyRent": "1500000000000000000000",
    "txHash": "0xabc123...",
    "blockNumber": 7123456,
    "timestamp": 1709251234567
  }'
```

## 📧 Email Template

The backend sends a beautiful HTML email with:
- 🎉 Header with celebration
- 📋 Lease details (ID, property, rent, dates)
- 📝 Next steps checklist
- 🔗 Link to view lease in dashboard
- ⛓️ Blockchain transaction link

## 🔐 Security Checklist

- ✅ Gmail App Password (not regular password)
- ✅ Backend API key authentication
- ✅ HTTPS in production
- ✅ Rate limiting on API endpoints
- ✅ Input validation on all endpoints
- ✅ Environment variables never committed to git
- ✅ Different credentials for staging/production

## 🐛 Troubleshooting

### Email not sending?

1. **Check Gmail SMTP credentials:**
   ```bash
   cd backend
   node test-email.js
   ```

2. **Verify backend is running:**
   ```bash
   curl http://localhost:3001/health
   ```

3. **Check backend logs:**
   ```bash
   # Should show:
   # [Notification] Processing lease activation for lease #123
   # [Notification] Email sent! Message ID: ...
   ```

### Workflow not triggering?

1. **Check event was emitted:**
   - View transaction on Etherscan
   - Verify LeaseActivated event in logs

2. **Check workflow is deployed:**
   ```bash
   cre workflow list
   ```

3. **Check workflow logs:**
   ```bash
   cre workflow logs --name lease-notification-workflow --tail 50
   ```

### Common Errors:

| Error | Solution |
|-------|----------|
| `Invalid login: 535-5.7.8` | Use App Password, not regular password |
| `Unauthorized - Invalid API key` | Check BACKEND_API_KEY matches in .env and secrets.yaml |
| `Tenant email not found` | Implement fetchTenantFromDatabase() in notifications.js |
| `Connection refused` | Backend not running, start with `npm start` |

## 📊 Monitoring & Production

### Key Metrics to Monitor:

- ✅ Email delivery rate
- ✅ API response times
- ✅ Workflow execution count
- ✅ Failed email attempts
- ✅ Database notification records

### Production Checklist:

- [ ] Use Google Workspace for custom domain
- [ ] Set up SPF/DKIM/DMARC records
- [ ] Implement email queue (Bull/RabbitMQ)
- [ ] Add retry logic for failed sends
- [ ] Monitor Gmail sending limits
- [ ] Set up alerting for failures
- [ ] Database backups for notification records
- [ ] Log rotation for backend logs

## 🎓 Additional Resources

- [Gmail SMTP Setup Guide](backend/GMAIL_SMTP_SETUP.md)
- [CRE Workflow Documentation](cre-workflows/chainlease-workflows/lease-notification-workflow/README.md)
- [Chainlink CRE Docs](https://docs.chain.link/cre)
- [Backend API Documentation](backend/src/api/notifications.js)

## 🤝 Support

Questions? Check:
1. Backend logs: `backend/logs/`
2. CRE workflow logs: `cre workflow logs`
3. Email test: `node backend/test-email.js`
4. API test: Use curl command above

---

**Status**: ✅ Ready for deployment!
**Last Updated**: February 15, 2026
