# Rent Collection Workflow

Automated monthly rent collection workflow using Chainlink Runtime Environment (CRE).

## Overview

This workflow automatically collects rent from active leases on a monthly schedule. It:

1. **Runs daily** at 00:00 UTC (checks if today is rent collection day)
2. **Fetches active leases** from the LeaseAgreement contract
3. **Calculates late fees** based on days overdue and grace period
4. **Collects rent** by calling the PaymentEscrow contract
5. **Sends notifications** to the backend API for record-keeping
6. **Provides detailed logs** and error handling

## Features

### ⏰ Time-Based Automation
- Cron schedule: `0 0 * * *` (daily at midnight UTC)
- Configurable collection day (default: 1st of month)
- Only executes rent collection on the specified day

### 💰 Late Fee Calculation
- Configurable grace period (default: 3 days)
- Percentage-based late fees (default: 5%)
- Progressive calculation based on days late
- Formula: `lateFee = (monthlyRent × lateFeePercentage × daysLate) / (100 × 30)`

### 🔄 Robust Error Handling
- Retries for failed transactions
- Continues processing even if one lease fails
- Detailed error logging and reporting
- Backend notification for both success and failure

### 📊 Comprehensive Reporting
- Summary of rent collections
- Success/failure counts
- Total late fees collected
- Individual lease transaction details

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Contract addresses
LEASE_AGREEMENT_ADDRESS=0x...    # Deployed LeaseAgreement contract
PAYMENT_ESCROW_ADDRESS=0x...     # Deployed PaymentEscrow contract

# RPC configuration
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
CHAIN_ID=11155111                # Sepolia testnet

# Wallet
PRIVATE_KEY=0x...                # Private key for signing transactions

# Rent collection settings
COLLECTION_DAY=1                 # Day of month (1-28)
GRACE_PERIOD_DAYS=3              # Grace period before late fees
LATE_FEE_PERCENTAGE=5            # Late fee percentage
MAX_RETRIES=3                    # Max retries for failures

# Backend API
BACKEND_API_URL=http://localhost:3001
BACKEND_API_KEY=dev-api-key
```

### Configuration Files

- **`config.staging.json`**: Staging environment settings
- **`config.production.json`**: Production environment settings

## Installation

```bash
# Install dependencies
npm install

# Or using Bun
bun install
```

## Usage

### Local Testing

Run the workflow locally to test functionality:

```bash
# Set environment variables
export LEASE_AGREEMENT_ADDRESS=0x...
export PAYMENT_ESCROW_ADDRESS=0x...
export RPC_URL=https://...
export PRIVATE_KEY=0x...
export COLLECTION_DAY=1
export BACKEND_API_URL=http://localhost:3001

# Run the workflow
npm run test
```

### CRE Simulation

Simulate the workflow with CRE CLI:

```bash
# Simulate with staging config
npm run simulate

# Or with custom config
cre simulate --workflow workflow.yaml --config config.staging.json
```

### Deployment

Deploy to Chainlink Runtime Environment:

```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

## Workflow Logic

### 1. Daily Check

Every day at 00:00 UTC, the workflow runs and checks:

```typescript
function isRentCollectionDay(): boolean {
  const today = new Date();
  const currentDay = today.getDate();
  return currentDay === config.collectionDay;
}
```

If not the collection day, it exits early.

### 2. Fetch Active Leases

Queries the LeaseAgreement contract for all active leases:

```solidity
// Smart contract call
function getActiveLeases() external view returns (uint256[] memory);
```

Returns an array of lease IDs with `state == Active (2)`.

### 3. Calculate Late Fees

For each lease, calculate if payment is overdue:

```typescript
const daysSinceLastPayment = (currentTimestamp - lastPaymentDate) / 86400;
const daysLate = daysSinceLastPayment - 30 - gracePeriodDays;

if (daysLate > 0) {
  lateFee = (monthlyRent × lateFeePercentage × daysLate) / (100 × 30);
}
```

### 4. Collect Rent

Call the PaymentEscrow contract to transfer funds:

```solidity
function collectRent(
  uint256 leaseId,
  address tenant,
  address landlord,
  uint256 amount,
  uint256 lateFee
) external payable returns (bool);
```

Transfers `monthlyRent + lateFee` from tenant to landlord.

### 5. Notify Backend

Send results to backend API for storage and notifications:

```typescript
POST /api/rent-payments
{
  leaseId: "1",
  tenant: "0x...",
  amount: "1000000000000000000",
  lateFee: "50000000000000000",
  transactionHash: "0x...",
  timestamp: "1707264000",
  status: "success" | "failed" | "late"
}
```

## Smart Contract Requirements

### LeaseAgreement Contract

Must implement:

```solidity
// Get all active lease IDs
function getActiveLeases() external view returns (uint256[] memory);

// Get lease details
function leases(uint256 leaseId) external view returns (
  uint256 leaseId,
  uint256 propertyId,
  address landlord,
  address tenant,
  uint256 monthlyRent,
  uint256 securityDeposit,
  uint256 startDate,
  uint256 endDate,
  LeaseState state,
  bytes32 worldIdNullifierHash,
  bool creditCheckPassed,
  uint256 lastPaymentDate
);

// Record rent payment
function recordRentPayment(uint256 leaseId) external;
```

### PaymentEscrow Contract

Must implement:

```solidity
// Collect rent from tenant
function collectRent(
  uint256 leaseId,
  address tenant,
  address landlord,
  uint256 amount,
  uint256 lateFee
) external payable returns (bool);

// Get payment history
function getPaymentHistory(uint256 leaseId) 
  external view returns (uint256[] memory);

// Record payment timestamp
function recordPayment(uint256 leaseId) external payable;

// Event
event RentPaid(
  uint256 indexed leaseId,
  address tenant,
  uint256 amount
);
```

## Backend API Endpoint

The backend should expose:

```typescript
POST /api/rent-payments
Headers:
  Content-Type: application/json
  Authorization: Bearer <API_KEY>

Body:
{
  leaseId: string,
  tenant: string,
  amount: string,
  lateFee: string,
  transactionHash: string,
  timestamp: string,
  status: "success" | "failed" | "late"
}

Response:
{
  success: boolean,
  message?: string
}
```

## Monitoring & Alerts

The workflow includes built-in monitoring:

- **Error threshold**: Alert after 3 errors within 1 hour
- **Timeout threshold**: Alert after 1 timeout within 1 hour
- **Success rate tracking**: Log successful vs failed collections

Access logs via CRE dashboard:

```bash
cre logs --workflow rent-collection-workflow
```

## Example Output

```
Starting rent collection workflow...
Date: 2026-02-01T00:00:00.000Z
Today is rent collection day!
Found 5 active leases

Collecting rent for lease 1...
  Tenant: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
  Monthly Rent: 1.5 ETH
  Late Fee: 0.0 ETH
  Total: 1.5 ETH
  Transaction hash: 0xabc123...
Backend notified for lease 1

Collecting rent for lease 2...
  Tenant: 0x123d35Cc6634C0532925a3b844Bc9e7595f0abc
  Monthly Rent: 2.0 ETH
  Late Fee: 0.1 ETH (5 days late)
  Total: 2.1 ETH
  Transaction hash: 0xdef456...
Backend notified for lease 2

=== Rent Collection Summary ===
Total leases processed: 5
Successful collections: 4
Failed collections: 1
Total late fees collected: 0.25 ETH
```

## Troubleshooting

### Workflow not executing

- Verify cron schedule in `workflow.yaml`
- Check CRE dashboard for workflow status
- Ensure workflow is deployed and active

### Transaction failures

- Check wallet has sufficient ETH for gas fees
- Verify contract addresses are correct
- Ensure private key has permission to call contracts
- Check if tenant has sufficient balance

### Late fees not calculated

- Verify `lastPaymentDate` is set in lease contract
- Check grace period and late fee percentage
- Ensure current date is past due date + grace period

### Backend notifications failing

- Verify backend API URL and API key
- Check network connectivity
- Review backend logs for errors

## Security Considerations

1. **Private Key**: Store in secure environment variables, never commit to git
2. **API Keys**: Use different keys for staging/production
3. **Access Control**: Ensure only workflow can call rent collection functions
4. **Rate Limiting**: Backend API should implement rate limiting
5. **Gas Price**: Monitor gas prices to avoid excessive fees

## Testing Checklist

- [ ] Environment variables configured
- [ ] Contracts deployed to testnet
- [ ] Workflow simulates successfully
- [ ] Test with single active lease
- [ ] Test with multiple leases
- [ ] Test late fee calculation
- [ ] Test failure scenarios
- [ ] Verify backend notifications
- [ ] Check gas consumption
- [ ] Monitor logs for errors

## Contributing

This workflow is part of the ChainLease platform. See main project README for contribution guidelines.

## License

MIT License - See LICENSE file for details.
