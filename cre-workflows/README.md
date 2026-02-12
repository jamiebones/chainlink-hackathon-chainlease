# ChainLease CRE Workflows

This directory will contain Chainlink Runtime Environment (CRE) workflows for the ChainLease platform after initialization.

## ⚠️ Important: CRE Workflows Must Be Initialized via CLI

**Do not create workflow files manually!** The CRE CLI generates the proper project structure.

## Setup Steps

### 1. Prerequisites

1. **Create CRE Account**: Sign up at [cre.chain.link](https://cre.chain.link/)
2. **Install CRE CLI**: Follow instructions at [CRE CLI Installation](https://docs.chain.link/cre/getting-started/cli-installation)
3. **Login**: Run `cre login` and authenticate

### 2. Initialize Credit Check Workflow

```bash
cd cre-workflows
cre init credit-check-workflow --language typescript
```

This command generates:
- `credit-check-workflow/` directory
- `workflow.ts` - Main workflow file with example code
- `package.json` - CRE SDK dependencies
- `tsconfig.json` - TypeScript configuration
- `.cre/` - Metadata for CRE platform

### 3. Initialize Rent Automation Workflow

```bash
cre init rent-automation-workflow --language typescript
```

Generates the same structure in `rent-automation-workflow/` directory.

## Workflow Structure

Each CRE workflow uses the **trigger-and-callback model**:

```typescript
import * as cre from "@chainlink/cre-sdk";

// 1. Define your callback function
async function onLeaseCreated(
  config: Config,
  runtime: cre.Runtime,
  trigger: evmlog.Payload
): Promise<Result> {
  // Your business logic here
  // Use runtime to invoke capabilities (HTTP, EVM, etc.)
  return result;
}

// 2. Register handler with trigger + callback
cre.handler(
  evmlog.trigger({
    address: config.leaseAgreementAddress,
    event: "LeaseCreated(uint256,uint256,address,address)",
  }),
  onLeaseCreated
);
```

## Workflow Overview

### 1. Credit Check Workflow
- **Trigger**: EVM Log Trigger (LeaseCreated event)
- **Purpose**: Fetch tenant credit score and update contract
- **Capabilities Used**:
  - `http.Client` - Fetch credit score from API
  - `evm.Client` - Write result back to LeaseAgreement contract

### 2. Rent Automation Workflow
- **Trigger**: Cron Trigger (daily at 00:00 UTC)
- **Purpose**: Check for overdue payments and process rent
- **Capabilities Used**:
  - `evm.Client` - Read lease data and write payment records
  - `http.Client` - Send payment reminders (optional)

## Development Workflow

### 1. Build Workflows
```bash
cre build
```

### 2. Simulate Locally
Simulation runs your workflow on your machine but makes real API calls and blockchain reads:

```bash
# Simulate credit check workflow
cre simulate credit-check-workflow.ts

# Simulate rent automation workflow
cre simulate rent-automation-workflow.ts
```

### 3. Deploy to DON (Early Access Required)
Request early access at [cre.chain.link/request-access](https://cre.chain.link/request-access)

```bash
# Deploy to Sepolia testnet
cre deploy credit-check-workflow.ts --network sepolia
cre deploy rent-automation-workflow.ts --network sepolia

# Activate workflows
cre workflow activate <workflow-id>
```

## Configuration

Workflows require configuration (contract addresses, API keys, etc.). These are typically defined in:

1. **Config struct** in your workflow code
2. **Secrets** - stored securely in CRE platform
3. **Environment variables** - for local simulation

Example config:
```typescript
interface Config {
  leaseAgreementAddress: string;
  creditApiUrl: string;
  creditApiKey: string; // Store as CRE secret in production
  minimumCreditScore: number;
}
```

## Next Steps

1. **Install CRE CLI** if not already installed
2. **Run `cre init`** for each workflow
3. **Implement workflow logic** following the trigger-and-callback pattern
4. **Test with simulation** before deploying
5. **Deploy to testnet** after simulation succeeds

## Resources

- [CRE Documentation](https://docs.chain.link/cre)
- [Getting Started Guide](https://docs.chain.link/cre/getting-started/overview)
- [Trigger Reference](https://docs.chain.link/cre/guides/workflow/using-triggers/overview)
- [EVM Client Guide](https://docs.chain.link/cre/guides/workflow/using-evm-client/overview)
- [HTTP Client Guide](https://docs.chain.link/cre/guides/workflow/using-http-client)
