# ChainLease Workflow Summary

## ✅ Implemented: Credit Check Workflow

### Trigger Type: **EVM Log Trigger**

**What it does:** Automatically verifies tenant creditworthiness when they apply for a lease

**How it works:**
```
Blockchain Event → CRE Workflow → Credit API → Smart Contract → Database
```

**Detailed Flow:**

1. **Event Detection** 
   - Monitors `LeaseCreated` events from LeaseAgreement contract
   - Extracts: leaseId, propertyId, tenant address, monthly rent
   
2. **Credit Verification**
   - Calls external credit bureau API (Experian, Equifax, etc.)
   - Evaluates: credit score, payment history, bankruptcies, evictions
   - Determines: pass/fail + risk level (low/medium/high)
   
3. **On-Chain Settlement**
   - Submits result via `updateCreditCheckStatus(leaseId, passed)`
   - Updates lease state: Draft → PendingApproval (if passed)
   - Transaction signed by authorized workflow signer
   
4. **Audit Trail**
   - Writes complete record to Firestore
   - Includes: scores, verification ID, transaction hash
   - Enables frontend display and compliance reporting

**Configuration:**
- **Event:** `LeaseCreated(uint256 leaseId, uint256 propertyId, address tenant, uint256 monthlyRent)`
- **Confidence:** `CONFIDENCE_LEVEL_FINALIZED` (waits for block finality)
- **Contract:** LeaseAgreement.sol
- **APIs:** Credit bureau, Firestore

**Files:**
- [main.ts](chainlease-workflows/credit-check-workflow/main.ts) - Event handler & orchestration
- [types.ts](chainlease-workflows/credit-check-workflow/types.ts) - Type definitions
- [credit-check.ts](chainlease-workflows/credit-check-workflow/credit-check.ts) - Credit API integration
- [evm.ts](chainlease-workflows/credit-check-workflow/evm.ts) - Smart contract calls
- [mongodb.ts](chainlease-workflows/credit-check-workflow/mongodb.ts) - Database operations
- [abi.ts](chainlease-workflows/credit-check-workflow/abi.ts) - Contract ABIs

**Cost per execution:** ~$2.50 - $7.00 (API fees + gas)

---

## 📋 Recommended Additional Workflows

### 1. Payment Monitoring Workflow
**Trigger:** Cron (Daily)  
**Purpose:** Detect overdue rent payments  
**Priority:** High - Impacts landlord cash flow

### 2. Lease Expiration Workflow
**Trigger:** Cron (Daily)  
**Purpose:** Handle renewals and move-outs  
**Priority:** High - Reduces vacancy gaps

### 3. Dispute Resolution Workflow
**Trigger:** EVM Log + Cron Hybrid  
**Purpose:** Mediate landlord-tenant conflicts  
**Priority:** Medium - Essential for platform trust

### 4. Property Maintenance Workflow
**Trigger:** EVM Log  
**Purpose:** Track repair requests  
**Priority:** Medium - Tenant satisfaction

### 5. KYC/AML Verification Workflow
**Trigger:** EVM Log  
**Purpose:** Identity and compliance checks  
**Priority:** High - Regulatory requirement

### 6. Market Analytics Workflow
**Trigger:** Cron (Weekly)  
**Purpose:** Generate platform insights  
**Priority:** Low - Growth optimization

---

## Trigger Types Explained

### EVM Log Trigger (Event-Driven)
**When to use:** Immediate response to on-chain events  
**Examples:** Lease created, payment received, dispute raised  
**Pros:** Real-time, event-specific, precise  
**Cons:** Requires gas for monitoring

### Cron Trigger (Time-Based)
**When to use:** Scheduled batch processing  
**Examples:** Daily payment checks, weekly analytics  
**Pros:** Predictable, cost-efficient for batch work  
**Cons:** Not real-time, may miss urgent events

### HTTP Trigger (Webhook)
**When to use:** External system notifications  
**Examples:** Stripe payment received, support ticket created  
**Pros:** Integrates with any service  
**Cons:** Requires public endpoint, security considerations

### Hybrid Trigger
**When to use:** Complex workflows with multiple entry points  
**Examples:** Dispute (event) + escalation checks (cron)  
**Pros:** Comprehensive coverage  
**Cons:** More complex to maintain

---

## Smart Contract Events Available

From **LeaseAgreement.sol:**

```solidity
event LeaseCreated(
    uint256 indexed leaseId,
    uint256 indexed propertyId,
    address indexed tenant,
    uint256 monthlyRent
);

event LeaseStateChanged(
    uint256 indexed leaseId,
    LeaseState oldState,
    LeaseState newState
);

event CreditCheckCompleted(
    uint256 indexed leaseId,
    bool passed
);

event LeaseActivated(
    uint256 indexed leaseId,
    uint256 startDate,
    uint256 endDate
);
```

From **PropertyNFT.sol:**

```solidity
event PropertyMinted(
    uint256 indexed tokenId,
    address indexed owner,
    string propertyAddress
);

event PropertyListed(
    uint256 indexed tokenId,
    bool isListed
);

event RentUpdated(
    uint256 indexed tokenId,
    uint256 newRent
);
```

**Potential Workflows:**
- `PropertyMinted` → Property verification workflow
- `PropertyListed` → Market notification workflow
- `LeaseStateChanged` → State transition alerts
- `LeaseActivated` → Onboarding automation

---

## Development Workflow

### Local Development
```bash
# 1. Navigate to workflow directory
cd cre-workflows/chainlease-workflows/credit-check-workflow

# 2. Install dependencies
bun install

# 3. Configure environment
cp .env.example .env
# Edit .env with your values

# 4. Test locally with simulator
bun x cre sim staging-settings

# 5. View logs
bun x cre logs staging-settings --follow
```

### Deployment
```bash
# Deploy to testnet (Sepolia)
bun x cre deploy staging-settings

# Deploy to mainnet
bun x cre deploy production-settings

# Check workflow status
bun x cre status staging-settings

# View production logs
bun x cre logs production-settings --tail 100
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CHAINLEASE PLATFORM                       │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│  PropertyNFT.sol │         │ LeaseAgreement   │
│  (ERC-721)       │◄────────│  .sol            │
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         │ Emits Events               │ Emits Events
         ▼                            ▼
┌────────────────────────────────────────────────┐
│         CHAINLINK CRE WORKFLOWS                │
├────────────────────────────────────────────────┤
│                                                │
│  ┌─────────────────────────────────────────┐  │
│  │  Credit Check Workflow (EVM Log)  ✅    │  │
│  │  • Listens: LeaseCreated              │  │
│  │  • Calls: Credit Bureau API           │  │
│  │  • Updates: Contract + Database       │  │
│  └─────────────────────────────────────────┘  │
│                                                │
│  ┌─────────────────────────────────────────┐  │
│  │  Payment Monitor (Cron) 🔜             │  │
│  │  • Schedule: Daily                     │  │
│  │  • Checks: Overdue payments            │  │
│  │  • Alerts: Landlords + Tenants         │  │
│  └─────────────────────────────────────────┘  │
│                                                │
│  ┌─────────────────────────────────────────┐  │
│  │  Lease Expiration (Cron) 🔜            │  │
│  │  • Schedule: Daily                     │  │
│  │  • Manages: Renewals + Move-outs       │  │
│  │  • Updates: Property listings          │  │
│  └─────────────────────────────────────────┘  │
│                                                │
└───────────┬────────────────────────────────────┘
            │
            │ Writes to
            ▼
┌────────────────────────────┐
│       MONGODB              │
│  • Credit Checks           │
│  • Payment History         │
│  • Audit Logs              │
│  • Analytics               │
└────────────────────────────┘
            │
            │ Powers
            ▼
┌────────────────────────────┐
│   FRONTEND DASHBOARD       │
│  • Landlord Portal         │
│  • Tenant Application      │
│  • Admin Panel             │
└────────────────────────────┘
```

---

## Security Best Practices

### ✅ Do's
- Store private keys in CRE secrets (never in config)
- Use separate API keys per environment
- Implement rate limiting on external APIs
- Validate all event data before processing
- Log all workflow executions for audit
- Use finalized block confidence for critical operations
- Encrypt sensitive data in Firestore

### ❌ Don'ts
- Never commit secrets to version control
- Don't skip input validation
- Don't use same signer for all workflows
- Don't expose raw API keys in logs
- Don't skip error handling
- Don't process unfinalized blocks for settlements

---

## Cost Analysis

### Credit Check Workflow (Per Execution)
- **Credit API:** $0.50 - $2.00
- **Gas (updateCreditCheckStatus):** $2.00 - $5.00
- **Firestore Write:** $0.0001
- **CRE Execution Fee:** ~$0.50
- **Total:** ~$3.00 - $7.50

### Monthly Costs (Estimate for 1000 leases)
- Credit checks: $3,000 - $7,500
- CRE subscription: ~$500/month
- MongoDB Atlas: ~$10/month (free tier or M10)
- **Total:** ~$3,500 - $8,000/month

### ROI Comparison
**Manual Processing:**
- Staff time: ~10 minutes per application
- Cost: $10/application (labor)
- For 1000 leases: $10,000/month

**Automated (CRE):**
- Processing time: ~30 seconds
- Cost: $3.50 - $7.50/lease
- For 1000 leases: $3,500 - $7,500/month

**Savings:** 30-65% + improved speed and accuracy

---

## Monitoring & Debugging

### Key Metrics to Track
- Workflow success rate (target: >99%)
- Average execution time (target: <60 seconds)
- API response times
- Gas costs per transaction
- Error types and frequency

### Debugging Commands
```bash
# Stream real-time logs
bun x cre logs staging-settings --follow

# Check last 100 executions
bun x cre logs staging-settings --tail 100

# View workflow status
bun x cre status staging-settings

# Test event processing
cast send $CONTRACT_ADDRESS "createLease(...)" --rpc-url $RPC
```

### Common Issues

**Issue:** Workflow not triggering
- ✓ Verify contract address in config
- ✓ Check event signature matches contract
- ✓ Ensure RPC endpoint is accessible
- ✓ Confirm blocks are finalized

**Issue:** Transaction reverts
- ✓ Signer has sufficient ETH for gas
- ✓ Signer authorized to call function
- ✓ Lease in correct state (Draft)
- ✓ Function parameters are valid

**Issue:** API failures
- ✓ Check API endpoint URL
- ✓ Verify API key is valid
- ✓ Review rate limits
- ✓ Inspect request/response logs

---

## Next Steps

### Immediate (This Week)
1. Deploy staging workflow to testnet
2. Test with sample lease applications
3. Verify Firestore integration
4. Monitor initial executions

### Short Term (This Month)
1. Deploy to production
2. Integrate with frontend
3. Set up monitoring alerts
4. Implement payment monitoring workflow

### Long Term (Next Quarter)
1. Add all recommended workflows
2. Optimize gas costs
3. Implement multi-chain support
4. Build analytics dashboard

---

## Resources

- **Documentation:** [chainlease-workflows/credit-check-workflow/WORKFLOW_README.md](chainlease-workflows/credit-check-workflow/WORKFLOW_README.md)
- **Triggers Guide:** [TRIGGERS.md](TRIGGERS.md)
- **CRE Docs:** https://docs.chain.link/chainlink-functions/resources/service-responsibility
- **Smart Contracts:** [../../contracts/](../../contracts/)
- **Project README:** [README.md](README.md)

---

**Status:** Credit Check Workflow ✅ Ready for Deployment  
**Last Updated:** February 12, 2026  
**Version:** 1.0.0
