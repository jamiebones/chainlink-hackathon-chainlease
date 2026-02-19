# Rent Collection Workflow - Testing Guide

## Quick Test Command

Test the rent collection workflow locally by simulating an active lease and payment collection.

## Prerequisites

Before testing, ensure you have:

1. **Contracts Deployed**:
   - LeaseAgreement contract on Sepolia testnet
   - PaymentEscrow contract on Sepolia testnet
   - At least one active lease in the LeaseAgreement contract

2. **Environment Setup**:
   ```bash
   cd rent-collection-workflow
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Dependencies Installed**:
   ```bash
   npm install
   # or
   bun install
   ```

4. **Wallet Funded**:
   - The private key in `.env` must have Sepolia ETH for gas fees
   - Get testnet ETH from: https://sepoliafaucet.com/

## Test Scenarios

### 1. Local Function Test (No Blockchain)

Test the workflow logic without blockchain interaction:

```bash
# Set test mode
export TEST_MODE=true

# Run the workflow
npm run test
```

This will:
- Load configuration
- Check if today is rent collection day
- Log what would happen (no actual transactions)

### 2. Testnet Simulation with CRE CLI

Simulate with actual blockchain interaction:

```bash
# Ensure contracts are deployed and addresses in config.staging.json

# Run simulation
npm run simulate
```

Expected output:
```
Starting rent collection workflow...
Date: 2026-02-16T00:00:00.000Z
Today is rent collection day!
Found 3 active leases

Collecting rent for lease 1...
  Tenant: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
  Monthly Rent: 1.5 ETH
  Late Fee: 0.0 ETH
  Total: 1.5 ETH
  Transaction hash: 0xabc123...
Backend notified for lease 1

=== Rent Collection Summary ===
Total leases processed: 3
Successful collections: 3
Failed collections: 0
Total late fees collected: 0.0 ETH
```

### 3. Test with Specific Collection Day

Override the collection day to test immediately:

```bash
# Force today to be collection day
export COLLECTION_DAY=$(date +%d)

# Run workflow
npm run test
```

### 4. Test Late Fee Calculation

Create a test lease with overdue payment:

```solidity
// Using Hardhat console or script
const leaseAgreement = await ethers.getContractAt("LeaseAgreement", ADDRESS);

// Create lease with lastPaymentDate 40 days ago
await leaseAgreement.createLease(
  propertyId,
  ethers.parseEther("1.5"), // monthlyRent
  ethers.parseEther("3.0"), // securityDeposit
  365, // duration in days
  worldIdNullifier
);

// Activate the lease
await leaseAgreement.activateLease(leaseId);

// Manually set lastPaymentDate to 40 days ago (requires admin function)
// Then run workflow to see late fee calculation
```

### 5. Integration Test with Backend

Test complete workflow including backend notification:

```bash
# Terminal 1: Start backend
cd ../../backend
npm run dev

# Terminal 2: Run workflow
cd ../cre-workflows/chainlease-workflows/rent-collection-workflow
npm run test

# Check backend logs for notification receipt
```

## Test Checklist

- [ ] Configuration loads correctly
- [ ] Can connect to RPC endpoint
- [ ] Can read from LeaseAgreement contract
- [ ] `getActiveLeases()` returns correct lease IDs
- [ ] Late fee calculation is accurate
- [ ] Transactions are signed and sent
- [ ] Payment recorded on-chain
- [ ] Backend API receives notification
- [ ] MongoDB stores payment record
- [ ] Gas costs are reasonable
- [ ] Error handling works (insufficient balance, invalid lease)

## Expected Test Results

### Successful Rent Collection

```json
{
  "leaseId": "1",
  "tenant": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amount": "1500000000000000000",
  "lateFee": "0",
  "totalCharged": "1500000000000000000",
  "transactionHash": "0xabc123...",
  "timestamp": "1707264000",
  "success": true
}
```

### Late Payment

```json
{
  "leaseId": "2",
  "tenant": "0x123d35Cc6634C0532925a3b844Bc9e7595f0abc",
  "amount": "2000000000000000000",
  "lateFee": "100000000000000000",
  "totalCharged": "2100000000000000000",
  "transactionHash": "0xdef456...",
  "timestamp": "1707264000",
  "success": true
}
```

### Failed Collection

```json
{
  "leaseId": "3",
  "tenant": "0x456d35Cc6634C0532925a3b844Bc9e7595f0def",
  "amount": "1000000000000000000",
  "lateFee": "0",
  "totalCharged": "1000000000000000000",
  "transactionHash": "",
  "timestamp": "1707264000",
  "success": false,
  "errorMessage": "insufficient funds for intrinsic transaction cost"
}
```

## Debugging

### Workflow not executing

```bash
# Check logs
cre logs --workflow rent-collection-workflow --tail 100

# Verify deployment
cre list workflows

# Check CRE CLI version
cre --version
```

### Transactions failing

```bash
# Check wallet balance
cast balance <WALLET_ADDRESS> --rpc-url $RPC_URL

# Check nonce
cast nonce <WALLET_ADDRESS> --rpc-url $RPC_URL

# Estimate gas
cast estimate <CONTRACT_ADDRESS> "collectRent(uint256,address,address,uint256,uint256)" \
  1 <TENANT> <LANDLORD> 1000000000000000000 0 \
  --rpc-url $RPC_URL
```

### Contract interaction issues

```bash
# Verify contract is deployed
cast code <CONTRACT_ADDRESS> --rpc-url $RPC_URL

# Read active leases
cast call <LEASE_AGREEMENT_ADDRESS> "getActiveLeases()" --rpc-url $RPC_URL

# Check lease details
cast call <LEASE_AGREEMENT_ADDRESS> "leases(uint256)" 1 --rpc-url $RPC_URL
```

## Manual Workflow Trigger

If you need to manually trigger the workflow outside the schedule:

```bash
# Using CRE CLI
cre trigger --workflow rent-collection-workflow --force

# Or call the function directly via API
curl -X POST https://cre-api.chain.link/workflows/rent-collection-workflow/trigger \
  -H "Authorization: Bearer $CRE_API_KEY" \
  -H "Content-Type: application/json"
```

## Monitoring in Production

Once deployed, monitor the workflow:

```bash
# View recent executions
cre executions --workflow rent-collection-workflow --limit 10

# Check success rate
cre metrics --workflow rent-collection-workflow --period 7d

# Set up alerts
cre alerts create --workflow rent-collection-workflow \
  --type error \
  --threshold 3 \
  --window 1h \
  --email your@email.com
```

## Gas Cost Estimation

Typical gas costs per execution:

- Reading active leases: ~50,000 gas
- Each rent collection: ~100,000 gas
- Backend notification: 0 gas (off-chain)

For 10 active leases:
- Total gas: ~1,050,000 gas
- Cost at 20 gwei: ~0.021 ETH (~$50)

Monitor gas prices and adjust workflow schedule if needed.

## Next Steps

After successful testing:

1. Deploy to CRE production environment
2. Set up monitoring and alerts
3. Document for project submission
4. Create demo video showing automated rent collection
5. Update README with deployment addresses

## Questions?

See main project README or workflow documentation for more details.
