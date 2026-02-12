# CRE Workflows Quick Start Guide

## Step-by-Step Setup

### 1. Prerequisites

#### Create CRE Account
```bash
# Visit https://cre.chain.link/ and create an account
# You'll need this for CLI authentication
```

#### Install CRE CLI
Follow the installation guide for your platform at:
https://docs.chain.link/cre/getting-started/cli-installation

Verify installation:
```bash
cre --version
```

#### Login to CRE
```bash
cre login
# Follow the prompts to authenticate
```

### 2. Initialize Credit Check Workflow

```bash
cd cre-workflows

# Initialize the workflow project
cre init credit-check-workflow --language typescript

# Navigate into the project
cd credit-check-workflow
```

This creates:
```
credit-check-workflow/
├── workflow.ts          # Main workflow file
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
└── .cre/                # CRE metadata
```

### 3. Implement Credit Check Logic

After `cre init` generates the project, edit the generated `workflow.ts` file.

**See [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) for the complete workflow code examples.**

Key implementation points:
- Use `evmlog.trigger()` to listen for LeaseCreated events
- Use `http.Client` to fetch credit scores from external API
- Use `evm.Client` to write results back to LeaseAgreement contract
- Follow the trigger-and-callback model with `cre.handler()`

### 4. Build and Simulate

```bash
# Build the workflow (compiles to WASM)
cre build

# Run simulation locally
# This makes real API calls and blockchain reads but runs on your machine
cre simulate
```

During simulation, you can:
- Test with mock data
- Verify API integrations
- Debug your workflow logic
- See console.log outputs

### 5. Initialize Rent Automation Workflow

```bash
# Go back to cre-workflows directory
cd ..

# Initialize second workflow
cre init rent-automation-workflow --language typescript
cd rent-automation-workflow

# Edit the generated workflow.ts file
# See IMPLEMENTATION_GUIDE.md for code examples
```

### 6. Test Both Workflows

```bash
# Test credit check workflow
cd ../credit-check-workflow
cre simulate

# Test rent automation workflow
cd ../rent-automation-workflow
cre simulate
```

### 7. Deploy to Testnet (Early Access Required)

After successful simulation:

```bash
# Request early access at: https://cre.chain.link/request-access
# Once approved:

# Deploy credit check workflow
cd credit-check-workflow
cre deploy --network sepolia

# Deploy rent automation workflow
cd ../rent-automation-workflow
cre deploy --network sepolia
```

After deployment, you'll receive:
- Workflow ID
- DON assignment
- Monitoring dashboard URL

### 8. Activate and Monitor

```bash
# Activate the workflows
cre workflow activate <credit-check-workflow-id>
cre workflow activate <rent-automation-workflow-id>

# View logs and status
cre workflow logs <workflow-id>
cre workflow status <workflow-id>
```

## Configuration Management

### Secrets
Store sensitive data (API keys) as secrets:

```bash
cre secret create CREDIT_API_KEY "your-api-key-here"
```

Access in workflow:
```typescript
const apiKey = await runtime.secrets.get("CREDIT_API_KEY");
```

### Environment-Specific Config

For different environments (simulation vs production):

```typescript
const config = {
  creditApiUrl: runtime.env === "production" 
    ? "https://api.creditbureau.com"
    : "https://api-staging.creditbureau.com",
  minimumCreditScore: 600,
};
```

## Troubleshooting

### Simulation Fails
- Check contract addresses are correct
- Verify API endpoints are accessible
- Ensure RPC URL is working
- Check ABI matches deployed contract

### Build Errors
- Run `npm install` in the workflow directory
- Verify TypeScript version compatibility
- Check CRE SDK version

### Deployment Issues
- Confirm early access approval
- Check network configuration
- Verify wallet has testnet ETH for gas
- Ensure workflow builds successfully first

## Next Steps

1. ✅ Complete smart contracts (PropertyNFT, LeaseAgreement, PaymentEscrow)
2. ✅ Deploy contracts to Sepolia testnet
3. ✅ Initialize CRE workflows with `cre init`
4. ✅ Implement workflow logic using templates
5. ✅ Simulate workflows locally
6. ⏳ Request CRE early access
7. ⏳ Deploy workflows to DON
8. ⏳ Integrate with frontend
9. ⏳ End-to-end testing

## Resources

- [CRE Documentation](https://docs.chain.link/cre)
- [Trigger Reference](https://docs.chain.link/cre/guides/workflow/using-triggers/overview)
- [EVM Client Guide](https://docs.chain.link/cre/guides/workflow/using-evm-client/overview)
- [Simulation Guide](https://docs.chain.link/cre/guides/operations/simulating-workflows)
- [CRE Support](https://docs.chain.link/cre/support-feedback)
