# ChainLease Full Stack Setup Guide

Complete guide to run the ChainLease platform with backend API and CRE workflow.

## Architecture

```
┌─────────────────┐
│  Smart Contract │ Emits LeaseCreated event
│  (Sepolia)      │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  CRE Workflow   │ Listens for events
│  (Chainlink)    │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Backend API    │ /api/credit-check/verify
│  (Express)      │ /api/data/credit-checks
└────────┬────────┘
         │
         v
┌─────────────────┐
│  MongoDB        │ Stores audit logs
│  (Database)     │
└─────────────────┘
```

## Prerequisites

- Node.js 18+ or Bun
- MongoDB (local or Atlas)
- Metamask/wallet with testnet ETH

## Step 1: Start MongoDB

### Option A: Local MongoDB
```bash
# Install MongoDB
sudo apt-get install mongodb

# Start MongoDB
sudo systemctl start mongodb

# Verify it's running
mongo
```

### Option B: MongoDB Atlas
1. Create free cluster at https://cloud.mongodb.com
2. Get connection string
3. Update backend `.env`

## Step 2: Start Backend API

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your MongoDB URI
nano .env

# Start server
npm run dev
```

Expected output:
```
✅ Connected to MongoDB: chainlease
✅ ChainLease Backend API running on port 3000
📍 Health check: http://localhost:3000/health
🔍 Credit Check: http://localhost:3000/api/credit-check/verify
💾 Data API: http://localhost:3000/api/data/credit-checks
```

## Step 3: Test Backend API

```bash
# Test health
curl http://localhost:3000/health

# Test credit check with mock data
curl -X POST http://localhost:3000/api/credit-check/verify \
  -H "Content-Type: application/json" \
  -d '{
    "leaseId": "1",
    "tenantAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "timestamp": 1739318400000
  }'

# Should return:
# {
#   "creditScore": 720,
#   "passed": true,
#   "riskLevel": "low",
#   ...
# }
```

## Step 4: Deploy Smart Contracts

```bash
cd ../

# Compile contracts
npx hardhat compile

# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.js --network sepolia

# Save the deployed LeaseAgreement address
```

## Step 5: Configure CRE Workflow

```bash
cd cre-workflows/chainlease-workflows/credit-check-workflow

# Install dependencies
bun install  # or npm install

# Update config.staging.json
nano config.staging.json
```

Update with your values:
```json
{
  "evms": [{
    "chainSelectorName": "ethereum-testnet-sepolia",
    "leaseAgreementAddress": "0xYOUR_CONTRACT_ADDRESS",
    "signerKey": "SIGNER_PRIVATE_KEY"
  }],
  "creditCheckApi": {
    "endpoint": "http://localhost:3000/api/credit-check/verify",
    "apiKey": "CREDIT_API_KEY"
  },
  "backendApi": {
    "endpoint": "http://localhost:3000/api/data/credit-checks",
    "apiKey": "BACKEND_API_KEY"
  }
}
```

Update secrets:
```bash
cd ..
nano secrets.yaml
```

```yaml
SIGNER_PRIVATE_KEY: "your_private_key_without_0x"
CREDIT_API_KEY: "dev_key_123"
BACKEND_API_KEY: "dev_key_123"
```

## Step 6: Test Workflow Locally

```bash
cd credit-check-workflow

# Simulate workflow
bun x cre sim staging-settings

# You should see logs showing the workflow is listening
```

## Step 7: Trigger Full Flow

### Terminal 1: Backend API (running)
```bash
cd backend
npm run dev
```

### Terminal 2: CRE Workflow (simulating)
```bash
cd cre-workflows/chainlease-workflows/credit-check-workflow
bun x cre sim staging-settings
```

### Terminal 3: Trigger lease creation
```bash
# Using Hardhat console
npx hardhat console --network sepolia

> const LeaseAgreement = await ethers.getContractFactory("LeaseAgreement");
> const lease = await LeaseAgreement.attach("0xYOUR_CONTRACT_ADDRESS");
> const tx = await lease.createLease(
    1, // propertyId
    365, // duration (1 year)
    "0x1234567890123456789012345678901234567890123456789012345678901234" // World ID nullifier
  );
> await tx.wait();
> console.log("Lease created! Workflow should trigger now...");
```

## Expected Flow

1. **Contract emits event**: `LeaseCreated(1, 1, 0x..., 1000000000000000000)`
2. **CRE detects event**: Logs show "=== ChainLease Credit Check Workflow Triggered ==="
3. **Workflow calls credit API**: `POST localhost:3000/api/credit-check/verify`
4. **Backend returns score**: `{ creditScore: 720, passed: true }`
5. **Workflow calls contract**: `updateCreditCheckStatus(1, true)`
6. **Workflow saves to DB**: `POST localhost:3000/api/data/credit-checks`
7. **Complete**: Logs show "=== Credit Check Workflow Completed Successfully ==="

## Verify Results

### Check smart contract:
```bash
npx hardhat console --network sepolia

> const lease = await contract.getLease(1);
> console.log(lease.creditCheckPassed); // Should be true
> console.log(lease.state); // Should be 1 (PendingApproval)
```

### Check database:
```bash
# Query MongoDB
mongo

> use chainlease
> db.creditChecks.find().pretty()

# Or via API
curl http://localhost:3000/api/data/credit-checks/1
```

## Deployment to Production

### Deploy backend to cloud:
```bash
# Heroku, Railway, or DigitalOcean
# Update config.production.json with production URL
```

### Deploy CRE workflow:
```bash
bun x cre deploy production-settings
```

## Troubleshooting

### Backend not accessible from CRE:
- CRE might not reach `localhost` 
- Deploy backend to public URL (ngrok for testing)
- Update `creditCheckApi.endpoint` with public URL

### Workflow not triggering:
- Check contract address in config
- Verify event signature matches
- Ensure RPC endpoint is accessible

### Database errors:
- Check MongoDB is running
- Verify connection string
- Check network access (Atlas)

## Development Tips

### Add custom mock tenant:
```bash
curl -X POST http://localhost:3000/api/credit-check/add-tenant \
  -H "Content-Type: application/json" \
  -d '{
    "tenantAddress": "0xYourTestAddress",
    "creditScore": 800,
    "riskLevel": "low",
    "paymentHistory": "Excellent",
    "debtToIncome": 0.20,
    "bankruptcies": 0,
    "evictions": 0
  }'
```

### Watch backend logs:
```bash
cd backend
npm run dev | bunyan  # If you have bunyan
# Or just npm run dev
```

### Watch workflow logs:
```bash
bun x cre logs staging-settings --follow
```

---

**Questions?** Open an issue or check the documentation in each folder.
