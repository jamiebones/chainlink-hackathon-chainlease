# ChainLease Backend API

REST API server for ChainLease credit checks and data management.

## Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start MongoDB (if running locally)
mongod

# Start development server
npm run dev

# Or production
npm start
```

## API Endpoints

### Health Check
```bash
GET /health
```

### Credit Check API

#### Verify Credit
```bash
POST /api/credit-check/verify
Content-Type: application/json

{
  "leaseId": "123",
  "tenantAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "timestamp": 1739318400000
}
```

Response:
```json
{
  "leaseId": "123",
  "tenantAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "creditScore": 720,
  "passed": true,
  "riskLevel": "low",
  "verificationId": "verify_1739318400_abc123",
  "timestamp": 1739318400000,
  "details": {
    "paymentHistory": "Excellent",
    "debtToIncome": 0.28,
    "bankruptcies": 0,
    "evictions": 0
  }
}
```

#### Add Mock Tenant Data
```bash
POST /api/credit-check/add-tenant
Content-Type: application/json

{
  "tenantAddress": "0x123...",
  "creditScore": 750,
  "riskLevel": "low",
  "paymentHistory": "Excellent",
  "debtToIncome": 0.25,
  "bankruptcies": 0,
  "evictions": 0
}
```

### Data API

#### Save Credit Check
```bash
POST /api/data/credit-checks
Content-Type: application/json

{
  "leaseId": "123",
  "tenantAddress": "0x...",
  "creditScore": 720,
  "passed": true,
  "riskLevel": "low",
  "verificationId": "verify_...",
  "txHash": "0x...",
  "timestamp": 1739318400000
}
```

#### Get Credit Check
```bash
GET /api/data/credit-checks/:leaseId
GET /api/data/credit-checks/tenant/:address
```

## Testing

```bash
# Test credit check
curl -X POST http://localhost:3000/api/credit-check/verify \
  -H "Content-Type: application/json" \
  -d '{
    "leaseId": "123",
    "tenantAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "timestamp": 1739318400000
  }'

# Test data save
curl -X POST http://localhost:3000/api/data/credit-checks \
  -H "Content-Type: application/json" \
  -d '{
    "leaseId": "123",
    "tenantAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "creditScore": 720,
    "passed": true,
    "riskLevel": "low",
    "verificationId": "verify_123",
    "txHash": "0xabc...",
    "timestamp": 1739318400000
  }'
```

## Mock Tenant Data

Pre-configured test addresses:
- `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb` - Score: 720 (Passes)
- `0x123` - Score: 580 (Fails)
- Any other address - Score: 650 (Default)
