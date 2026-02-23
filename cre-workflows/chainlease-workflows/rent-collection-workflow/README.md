# Rent Collection Workflow

ChainLease CRE workflow for monitoring active leases and sending notifications for overdue rent payments.

## Overview

This workflow runs on a daily schedule (cron trigger) to:
1. Read all active leases from the LeaseAgreement contract
2. Check if any leases have overdue payments (>30 days since last payment)
3. Calculate late fees for overdue payments (after grace period)
4. Send notifications to tenants and landlords via backend API

## Architecture

- **Trigger**: Cron (daily at 10:00 AM UTC)
- **Onchain Reads**: 
  - `getActiveLeases()` - Get all active lease IDs
  - `isPaymentOverdue(leaseId)` - Check if lease is overdue
  - `getLease(leaseId)` - Get detailed lease information
- **HTTP POST**: Send overdue notifications to backend API
- **Consensus**: Identical aggregation across CRE nodes

## Configuration

### Staging (`config.staging.json`)
- Network: Sepolia testnet
- Backend: localhost:3000
- Grace period: 3 days
- Late fee: 5% of monthly rent

### Production (`config.production.json`)
- Network: Ethereum mainnet
- Backend: api.chainlease.com
- Grace period: 3 days
- Late fee: 5% of monthly rent

## Files

- `main.ts` - Workflow entry point with cron handler
- `types.ts` - Type definitions and Zod schemas
- `abi.ts` - LeaseAgreement contract ABI
- `evm.ts` - Helper functions for onchain reads
- `config.staging.json` - Staging configuration
- `config.production.json` - Production configuration
- `workflow.yaml` - Workflow metadata

## Usage

### Install Dependencies

```bash
npm install
```

### Simulate Workflow

```bash
npm run simulate
# Or directly:
cre workflow simulate rent-collection-workflow --target staging-settings
```

### Deploy to Staging

```bash
npm run deploy:staging
```

### Deploy to Production

```bash
npm run deploy:prod
```

## Backend API Endpoint

The workflow sends POST requests to:
```
POST /api/notifications/rent-overdue
```

**Request Payload:**
```typescript
{
  eventType: "rent-overdue",
  overdueLeases: [
    {
      leaseId: "1",
      tenantAddress: "0x...",
      landlordAddress: "0x...",
      monthlyRent: "1500000000000000000",
      lastPaymentDate: 1708531200,
      daysSincePayment: 35,
      daysOverdue: 5,
      lateFee: "75000000000000000",
      propertyId: "1"
    }
  ],
  timestamp: 1708617600,
  totalOverdue: 1
}
```

**Response:**
```typescript
{
  statusCode: 200,
  success: true,
  message: "Notifications sent successfully",
  notificationsSent: 2,
  failed: 0
}
```

## Monitoring

- Runs daily at 10:00 AM UTC
- Checks all active leases
- Logs overdue payments with details
- Sends notifications to tenants and landlords
- Calculates late fees after grace period

## Late Fees

- Grace period: 3 days (configurable)
- Late fee: 5% of monthly rent (configurable)
- Example: $1,500 rent → $75 late fee if >3 days overdue

## Testing

Before deploying, test the workflow in simulation mode:

1. Update `config.staging.json` with test contract address
2. Ensure backend API is running on localhost:3000
3. Run simulation: `npm run simulate`
4. Check logs for workflow execution
5. Verify notifications sent to backend

## Contract Functions Used

```solidity
// Get all active lease IDs
function getActiveLeases() view returns (uint256[])

// Check if lease is overdue (>30 days since last payment)
function isPaymentOverdue(uint256 leaseId) view returns (bool)

// Get detailed lease information
function getLease(uint256 leaseId) view returns (Lease memory)
```

## Dependencies

- `@chainlink/cre-sdk` ^1.1.1 - CRE runtime and capabilities
- `viem` ^2.0.0 - Ethereum ABI encoding/decoding
- `zod` ^3.22.0 - Schema validation

## Notes

- Uses LAST_FINALIZED_BLOCK_NUMBER for all onchain reads (prevents reorgs)
- HTTP POST uses cacheSettings to prevent duplicate notifications (5-minute cache)
- Safe decimal conversion with viem's formatUnits (no precision loss)
- Validates all configurations with Zod schemas
- Consensus ensures all CRE nodes agree on results

## References

- [CRE_CRON_TRIGGER_REFERENCE.md](../../CRE_CRON_TRIGGER_REFERENCE.md)
- [CRE_ONCHAIN_READ_REFERENCE.md](../../CRE_ONCHAIN_READ_REFERENCE.md)
- [CRE_HTTP_POST_REQUEST_REFERENCE.md](../../CRE_HTTP_POST_REQUEST_REFERENCE.md)
