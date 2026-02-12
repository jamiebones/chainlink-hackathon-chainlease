# ChainLease CRE Workflow Triggers

## Overview

ChainLease uses Chainlink Runtime Environment (CRE) workflows to automate critical rental platform operations. This document outlines the triggers implemented and potential future triggers.

---

## Implemented Triggers

### 1. Credit Check Workflow - **EVM Log Trigger**

**Purpose:** Automate tenant credit verification when lease applications are submitted

**Trigger Type:** EVM Log Trigger (Event-Driven)

**Event Monitored:**
```solidity
event LeaseCreated(
    uint256 indexed leaseId,
    uint256 indexed propertyId,
    address indexed tenant,
    uint256 monthlyRent
);
```

**Workflow Steps:**
1. **Listen** - Monitor LeaseAgreement contract for `LeaseCreated` events
2. **Verify** - Call external credit bureau API (Experian, Equifax, etc.)
3. **Submit** - Write credit check result back on-chain via `updateCreditCheckStatus()`
4. **Log** - Store audit trail in Firestore for compliance

**Configuration:**
- **Confidence Level:** `CONFIDENCE_LEVEL_FINALIZED` (waits for block finality)
- **Contract:** LeaseAgreement.sol
- **Addresses:** Configurable per environment (staging/production)

**Use Cases:**
- Automated tenant screening
- Real-time credit verification
- Landlord risk assessment
- Compliance documentation

---

## Recommended Future Triggers

### 2. Payment Monitoring Workflow - **Cron Trigger**

**Purpose:** Monitor active leases for overdue rent payments

**Trigger Type:** Cron Trigger (Time-Based)

**Suggested Schedule:** `0 0 * * *` (daily at midnight)

**Workflow Logic:**
```typescript
1. Query all Active leases from contract
2. Check if payment is overdue (>30 days since lastPaymentDate)
3. If overdue:
   - Notify landlord via email/SMS
   - Notify tenant with payment reminder
   - Update lease status to "Payment Overdue"
   - Log incident to Firestore
4. If severely overdue (>60 days):
   - Initiate dispute resolution process
   - Alert platform administrators
```

**Benefits:**
- Automated rent collection monitoring
- Early warning system for defaults
- Reduced manual oversight
- Better landlord experience

---

### 3. Lease Expiration Workflow - **Cron Trigger**

**Purpose:** Handle lease renewals and move-out procedures

**Trigger Type:** Cron Trigger (Time-Based)

**Suggested Schedule:** `0 0 * * *` (daily at midnight)

**Workflow Logic:**
```typescript
1. Query leases expiring in next 30 days
2. Send renewal offers to tenants
3. Notify landlords to prepare for potential vacancy
4. For leases expiring today:
   - Execute completeLease() on-chain
   - Process security deposit return
   - Update property listing status
   - Archive lease data
```

**Benefits:**
- Proactive lease management
- Automated renewal process
- Smooth tenant transitions
- Revenue continuity

---

### 4. Dispute Resolution Workflow - **EVM Log Trigger + Cron Hybrid**

**Purpose:** Manage disputes between landlords and tenants

**Trigger Type:** Hybrid (Event + Scheduled Check-ins)

**Event Monitored:**
```solidity
event DisputeRaised(
    uint256 indexed leaseId,
    address indexed initiator,
    string disputeReason,
    uint256 timestamp
);
```

**Workflow Logic:**
```typescript
On DisputeRaised Event:
1. Freeze lease state changes
2. Notify both parties
3. Request evidence submission
4. Schedule arbitration review (via external API or DAO vote)
5. Implement resolution on-chain
6. Update dispute history in Firestore

Cron Check (every 6 hours):
- Monitor dispute escalation timeline
- Send reminder notifications
- Auto-resolve low-priority disputes after timeout
```

**Benefits:**
- Fair mediation process
- Transparent dispute history
- Reduced platform liability
- Automated conflict resolution

---

### 5. Property Maintenance Workflow - **EVM Log Trigger**

**Purpose:** Track and manage maintenance requests

**Trigger Type:** EVM Log Trigger

**Event Monitored:**
```solidity
event MaintenanceRequested(
    uint256 indexed leaseId,
    uint256 indexed propertyId,
    string category,
    string description,
    uint8 urgency
);
```

**Workflow Logic:**
```typescript
1. Receive maintenance request event
2. Classify urgency (emergency, high, medium, low)
3. Notify landlord and property manager
4. Create work order in external system (e.g., BuildingEngines API)
5. Track completion status
6. Update on-chain when resolved
7. Log for warranty/insurance claims
```

**Benefits:**
- Fast emergency response
- Improved property upkeep
- Tenant satisfaction
- Maintenance history tracking

---

### 6. KYC/AML Verification Workflow - **EVM Log Trigger**

**Purpose:** Verify identity and compliance for landlords and tenants

**Trigger Type:** EVM Log Trigger

**Event Monitored:**
```solidity
event KYCRequested(
    address indexed user,
    bytes32 indexed verificationId,
    uint8 userType  // 0=tenant, 1=landlord
);
```

**Workflow Logic:**
```typescript
1. Receive KYC request
2. Call identity verification API (Persona, Stripe Identity, etc.)
3. Perform AML screening (Chainalysis, TRM Labs)
4. Check sanctions lists
5. Submit verification result on-chain
6. Store encrypted documents in IPFS/Arweave
7. Update user verification status
```

**Benefits:**
- Regulatory compliance
- Fraud prevention
- Platform credibility
- Risk mitigation

---

### 7. Market Analytics Workflow - **Cron Trigger**

**Purpose:** Aggregate platform data and generate insights

**Trigger Type:** Cron Trigger

**Suggested Schedule:** `0 0 */7 * *` (weekly)

**Workflow Logic:**
```typescript
1. Query all properties and leases
2. Calculate metrics:
   - Average rent by location
   - Occupancy rates
   - Lease duration trends
   - Default rates
   - Market saturation
3. Update analytics dashboard (Firestore/BigQuery)
4. Generate landlord property valuation reports
5. Provide tenant market insights
```

**Benefits:**
- Data-driven pricing
- Market transparency
- Investment insights
- Platform growth metrics

---

## Trigger Type Comparison

| Trigger Type | Use Case | Latency | Cost | Reliability |
|-------------|----------|---------|------|-------------|
| **EVM Log** | Event-driven actions | Immediate | Gas + CRE fee | High |
| **Cron** | Scheduled tasks | Batch processing | CRE fee only | Very High |
| **HTTP** | External webhook | Near-immediate | CRE fee + API cost | Medium |
| **Hybrid** | Complex workflows | Variable | Combined | High |

---

## Implementation Priority

### Phase 1 (MVP) ✅
- [x] Credit Check Workflow (EVM Log Trigger)

### Phase 2 (Q1 2026)
- [ ] Payment Monitoring (Cron Trigger)
- [ ] Lease Expiration (Cron Trigger)

### Phase 3 (Q2 2026)
- [ ] Dispute Resolution (Hybrid)
- [ ] Property Maintenance (EVM Log Trigger)

### Phase 4 (Q3 2026)
- [ ] KYC/AML Verification (EVM Log Trigger)
- [ ] Market Analytics (Cron Trigger)

---

## Configuration Examples

### EVM Log Trigger Config
```typescript
const evmClient = new cre.capabilities.EVMClient(chainSelector);

cre.handler(
  evmClient.logTrigger({
    addresses: [contractAddress],
    topics: [{ values: [eventHash] }],
    confidence: "CONFIDENCE_LEVEL_FINALIZED",
  }),
  handlerFunction
);
```

### Cron Trigger Config
```typescript
const cron = new cre.capabilities.CronCapability();

cre.handler(
  cron.trigger({ schedule: "0 0 * * *" }),
  handlerFunction
);
```

---

## Monitoring & Alerts

### Recommended Monitoring
- Workflow execution success rate
- API response times
- Gas costs per workflow
- Error rates and types
- Average processing latency

### Alert Thresholds
- Error rate > 5%
- API timeout > 10 seconds
- Gas cost spike > 2x baseline
- Workflow backlog > 10 pending

---

## Security Considerations

1. **Private Keys:** Store signer keys in CRE secrets, never in config
2. **API Keys:** Rotate regularly, use separate keys per environment
3. **Rate Limiting:** Implement backoff for external APIs
4. **Access Control:** Restrict workflow signer permissions on-chain
5. **Audit Logs:** Maintain immutable records of all automated actions

---

## Resources

- [CRE Documentation](https://docs.chain.link/chainlink-functions/resources/service-responsibility)
- [LeaseAgreement Contract](../../contracts/LeaseAgreement.sol)
- [Workflow Implementation](./chainlease-workflows/credit-check-workflow/)
- [Project README](./README.md)

---

**Last Updated:** February 12, 2026  
**Maintained By:** ChainLease Development Team
