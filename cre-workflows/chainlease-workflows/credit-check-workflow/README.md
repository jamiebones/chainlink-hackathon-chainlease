# ChainLease Credit Check Workflow

Automated credit verification workflow for the ChainLease rental platform using Chainlink Runtime Environment (CRE).

## Quick Start

1. Install dependencies:
   ```bash
   bun install
   ```

2. Configure your environment:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. Update config files with your contract addresses and API endpoints

4. Deploy to staging:
   ```bash
   bun x cre deploy staging-settings
   ```

See [WORKFLOW_README.md](./WORKFLOW_README.md) for detailed documentation.

## Workflow Type

**Trigger:** EVM Log Trigger (Event-Driven)  
**Event:** `LeaseCreated(uint256 leaseId, uint256 propertyId, address tenant, uint256 monthlyRent)`  
**Purpose:** Automatically verify tenant creditworthiness when new lease applications are submitted

## Architecture

1. Monitor blockchain for `LeaseCreated` events
2. Call external credit bureau API
3. Submit results back to smart contract
4. Store audit logs in Firestore

## Files

- **main.ts** - Workflow entry point and orchestration
- **types.ts** - TypeScript types and config schema
- **credit-check.ts** - Credit API integration
- **evm.ts** - Smart contract interactions
- **mongodb.ts** - MongoDB database operations
- **abi.ts** - Contract ABIs and event signatures


```bash
cre workflow simulate ./hello-world --target=staging-settings
```
