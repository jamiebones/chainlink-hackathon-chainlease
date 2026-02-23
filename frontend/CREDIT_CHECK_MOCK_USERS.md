# Credit Check Mock Users for CRE Demo

This document lists the 10 pre-defined mock users for testing the ChainLink Runtime Environment (CRE) credit check workflow during the hackathon.

## Purpose

- **Simple mock database** - No complex calculations
- **CRE demonstration** - Shows CRE workflow calling our API and processing responses
- **Pre-defined data** - All credit scores are static, not calculated

## API Endpoint

```
POST /api/credit-check/verify
GET /api/credit-check/verify (list all users)
```

## Mock Users Database

### 1. Alice Johnson (Excellent Credit)
- **Wallet**: `0x1234567890123456789012345678901234567890`
- **SSN Last 4**: 1234
- **Credit Score**: 780
- **Status**: ✅ PASSED
- **Risk Level**: Low
- **Payment History**: Excellent - 100% on-time payments
- **Debt-to-Income**: 22%
- **Bankruptcies**: 0
- **Evictions**: 0

### 2. Bob Smith (Good Credit)
- **Wallet**: `0x2345678901234567890123456789012345678901`
- **SSN Last 4**: 2345
- **Credit Score**: 720
- **Status**: ✅ PASSED
- **Risk Level**: Low
- **Payment History**: Good - 98% on-time payments
- **Debt-to-Income**: 28%
- **Bankruptcies**: 0
- **Evictions**: 0

### 3. Carol Martinez (Medium Credit)
- **Wallet**: `0x3456789012345678901234567890123456789012`
- **SSN Last 4**: 3456
- **Credit Score**: 680
- **Status**: ✅ PASSED
- **Risk Level**: Medium
- **Payment History**: Good - 95% on-time payments
- **Debt-to-Income**: 35%
- **Bankruptcies**: 0
- **Evictions**: 0

### 4. David Lee (Fair Credit)
- **Wallet**: `0x4567890123456789012345678901234567890123`
- **SSN Last 4**: 4567
- **Credit Score**: 640
- **Status**: ✅ PASSED
- **Risk Level**: Medium
- **Payment History**: Fair - 88% on-time payments
- **Debt-to-Income**: 40%
- **Bankruptcies**: 0
- **Evictions**: 0

### 5. Emma Wilson (Very Good Credit)
- **Wallet**: `0x5678901234567890123456789012345678901234`
- **SSN Last 4**: 5678
- **Credit Score**: 750
- **Status**: ✅ PASSED
- **Risk Level**: Low
- **Payment History**: Excellent - 99% on-time payments
- **Debt-to-Income**: 25%
- **Bankruptcies**: 0
- **Evictions**: 0

### 6. Frank Brown (Poor Credit - WITH EVICTION)
- **Wallet**: `0x6789012345678901234567890123456789012345`
- **SSN Last 4**: 6789
- **Credit Score**: 590
- **Status**: ❌ FAILED
- **Risk Level**: High
- **Payment History**: Fair - 82% on-time payments
- **Debt-to-Income**: 48%
- **Bankruptcies**: 0
- **Evictions**: 1 ⚠️

### 7. Grace Taylor (Excellent Credit)
- **Wallet**: `0x7890123456789012345678901234567890123456`
- **SSN Last 4**: 7890
- **Credit Score**: 800
- **Status**: ✅ PASSED
- **Risk Level**: Low
- **Payment History**: Excellent - 100% on-time payments
- **Debt-to-Income**: 18%
- **Bankruptcies**: 0
- **Evictions**: 0

### 8. Henry Davis (Very Poor Credit - WITH BANKRUPTCY)
- **Wallet**: `0x8901234567890123456789012345678901234567`
- **SSN Last 4**: 8901
- **Credit Score**: 550
- **Status**: ❌ FAILED
- **Risk Level**: High
- **Payment History**: Poor - 75% on-time payments
- **Debt-to-Income**: 52%
- **Bankruptcies**: 1 ⚠️
- **Evictions**: 0

### 9. Iris Anderson (Good Credit)
- **Wallet**: `0x9012345678901234567890123456789012345678`
- **SSN Last 4**: 9012
- **Credit Score**: 710
- **Status**: ✅ PASSED
- **Risk Level**: Low
- **Payment History**: Good - 96% on-time payments
- **Debt-to-Income**: 30%
- **Bankruptcies**: 0
- **Evictions**: 0

### 10. Jack Robinson (Borderline Credit)
- **Wallet**: `0x0123456789012345678901234567890123456789`
- **SSN Last 4**: 0123
- **Credit Score**: 620
- **Status**: ✅ PASSED
- **Risk Level**: Medium
- **Payment History**: Fair - 90% on-time payments
- **Debt-to-Income**: 42%
- **Bankruptcies**: 0
- **Evictions**: 0

## Testing with CRE Workflow

### Request Format (from CRE)
```json
POST /api/credit-check/verify

{
  "leaseId": "123",
  "propertyId": "456",
  "tenantAddress": "0x1234567890123456789012345678901234567890"
}
```

### Response Format
```json
{
  "leaseId": "123",
  "tenantAddress": "0x1234567890123456789012345678901234567890",
  "creditScore": 780,
  "passed": true,
  "riskLevel": "low",
  "verificationId": "verify_1234567890_1234",
  "details": {
    "paymentHistory": "Excellent - 100% on-time payments",
    "debtToIncome": 22,
    "bankruptcies": 0,
    "evictions": 0
  }
}
```

## Usage in Demo

1. **CRE Workflow** listens for `LeaseCreated` event on blockchain
2. **Extracts** tenant wallet address from event
3. **Calls** our API with `POST /api/credit-check/verify`
4. **Receives** pre-defined credit data from mock database
5. **Processes** the response and calls smart contract with result
6. **Updates** lease status on-chain based on credit check

## Testing Scenarios

### ✅ Approved Scenarios
- Use wallets: Alice, Bob, Carol, David, Emma, Grace, Iris, Jack
- Expected: `passed: true`

### ❌ Rejected Scenarios
- Use wallet: Frank Brown (has eviction)
- Use wallet: Henry Davis (has bankruptcy)
- Expected: `passed: false`

### 🔍 Not Found Scenario
- Use any wallet not in the list
- Expected: Score 0, `passed: false`, "No credit history found"

## Quick Test

```bash
# List all users
curl http://localhost:3000/api/credit-check/verify

# Test Alice (should pass)
curl -X POST http://localhost:3000/api/credit-check/verify \
  -H "Content-Type: application/json" \
  -d '{
    "leaseId": "1",
    "propertyId": "1",
    "tenantAddress": "0x1234567890123456789012345678901234567890"
  }'

# Test Frank (should fail - has eviction)
curl -X POST http://localhost:3000/api/credit-check/verify \
  -H "Content-Type: application/json" \
  -d '{
    "leaseId": "2",
    "propertyId": "1",
    "tenantAddress": "0x6789012345678901234567890123456789012345"
  }'
```

## Notes

- **No calculations** - All data is pre-defined
- **Simple lookup** - Match by wallet address
- **CRE focused** - Designed to showcase CRE workflow, not credit algorithms
- **Hackathon ready** - Easy to demo with predictable results
