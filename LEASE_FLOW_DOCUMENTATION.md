# ChainLease: Complete Lease Securing Flow

## Overview
This document describes the end-to-end process of securing a rental lease on ChainLease, from property listing to active lease with rent payments.

---

## Flow Diagram

```
┌─────────────────┐
│  1. Property    │
│     Listing     │  Landlord lists property as NFT
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. Lease       │
│   Application   │  Tenant applies with World ID
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. Credit      │
│     Check       │  Automated via CRE Workflow
│   (Automated)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. Lease       │
│   Approval      │  Landlord reviews & approves
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  5. Security    │
│    Deposit      │  Tenant pays security deposit
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  6. Activation  │
│  Notification   │  Automated email via CRE
│   (Automated)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  7. Active      │
│     Lease       │  Monthly rent payments
└─────────────────┘
```

---

## Step-by-Step Process

### Step 1: Property Listing

**Actor:** Landlord  
**Contract:** `PropertyNFT.sol`  
**Function:** `mintProperty()`

**Process:**
1. Landlord calls `mintProperty()` with property details:
   - `to`: Landlord's address
   - `uri`: IPFS metadata URI
   - `metadata`: Property details
     ```solidity
     struct PropertyMetadata {
         string propertyAddress;
         string propertyType;
         uint256 squareFeet;
         uint256 bedrooms;
         uint256 bathrooms;
         bool isListed;
         uint256 monthlyRent;
     }
     ```

2. Contract mints an ERC-721 NFT representing the property
3. Property is marked as `isListed = true`
4. Event emitted: `PropertyMinted(tokenId, landlord, propertyAddress)`

**Key State Changes:**
- `_tokenIdCounter` incremented
- `properties[tokenId]` = property metadata
- `landlordProperties[landlord]` updated with new tokenId
- Landlord receives NFT ownership

**Required Permissions:** Anyone can mint (typically only landlords)

---

### Step 2: Lease Application

**Actor:** Tenant  
**Contract:** `LeaseAgreement.sol`  
**Function:** `createLease()`

**Process:**
1. Tenant verifies identity with World ID off-chain (generates nullifier hash)
2. Tenant calls `createLease()` with:
   - `propertyId`: ID of the property NFT
   - `duration`: Lease duration in days (30-3650)
   - `worldIdNullifierHash`: Unique World ID proof

3. Contract validates:
   - Property exists and is listed
   - Nullifier hash hasn't been used before (prevents duplicate applications)
   - Tenant hasn't already applied for this property
   - Duration is within valid range (30-3650 days)
   - Tenant is not the property owner

4. Lease created with state = `Draft` (0)
5. Event emitted: `LeaseCreated(leaseId, propertyId, tenant, monthlyRent)`

**Key State Changes:**
- `_leaseIdCounter` incremented
- `leases[leaseId]` = new lease struct
  ```solidity
  struct Lease {
      uint256 leaseId;
      uint256 propertyId;
      address landlord;
      address tenant;
      uint256 monthlyRent;
      uint256 securityDeposit;
      uint256 startDate;
      uint256 endDate;
      LeaseState state;           // Draft
      uint256 duration;
      bool creditCheckPassed;     // false
      string verificationId;      // empty
      uint256 lastPaymentDate;
  }
  ```
- `usedNullifiers[worldIdNullifierHash]` = true
- `tenantLeases[tenant]` updated
- `landlordLeases[landlord]` updated
- `propertyTenantApplications[propertyId][tenantHash]` = true

**Required Permissions:** Any address (tenant)

---

### Step 3: Credit Check (Automated)

**Actor:** Chainlink CRE Workflow  
**Contracts:** `LeaseAgreement.sol` (consumer), `KeystoneForwarder.sol` (Chainlink-managed)  
**Functions:** `receiveCreditCheck()` → `_processReport()` → `_updateCreditCheckStatus()`

**Process:**
1. **Trigger:** `LeaseCreated` event detected by CRE Log Trigger
2. **Workflow Execution:**
   - Workflow decodes event: leaseId, propertyId, tenant, monthlyRent
   - Calls external credit bureau API (Experian, Equifax, etc.)
   - Receives credit score, risk level, payment history
   - Determines pass/fail based on threshold (e.g., score >= 620)
   - Generates verification ID for audit trail

3. **On-Chain Submission:**
   - Workflow encodes result: `(uint256 leaseId, bool passed, string verificationId)`
   - Generates signed report via `runtime.report()`
   - Submits to `KeystoneForwarder` via `evmClient.writeReport()`
   
4. **Forwarder Callback:**
   - `KeystoneForwarder` validates DON signatures
   - Calls `LeaseAgreement.onReport(bytes metadata, bytes report)`
   - `onReport()` calls `_processReport(bytes report)`
   
5. **Result Processing:**
   - `_processReport()` decodes report data
   - Calls `_updateCreditCheckStatus(leaseId, passed, verificationId)`
   - Updates lease with credit check result
   - Changes lease state to `PendingApproval` (1)
   - Event emitted: `CreditCheckCompleted(leaseId, passed, verificationId)`

6. **Backend Storage:**
   - Workflow also sends data to backend MongoDB
   - Stores complete credit check record for audit/compliance

**Key State Changes:**
- `leases[leaseId].creditCheckPassed` = true/false
- `leases[leaseId].verificationId` = verification ID string
- `leases[leaseId].state` = `PendingApproval` (1)

**Required Permissions:** 
- Only `KeystoneForwarder` address can call `onReport()`
- Validated by `onlyForwarder` modifier in `ReceiverTemplate`

**Workflow File:** `cre-workflows/chainlease-workflows/credit-check-workflow/main.ts`

---

### Step 4: Lease Approval & Activation

**Actor:** Landlord  
**Contract:** `LeaseAgreement.sol`  
**Function:** `activateLease()`

**Process:**
1. Landlord reviews credit check results (via frontend)
2. If approved, landlord calls `activateLease(leaseId)`
3. Contract validates:
   - Caller is the landlord for this lease
   - Credit check has passed (`creditCheckPassed == true`)
   - Lease is in `PendingApproval` state

4. Lease activated:
   - State changed to `Active` (2)
   - `startDate` set to current block timestamp
   - `endDate` calculated: `startDate + duration`
   - `lastPaymentDate` set to `startDate`

5. Event emitted: `LeaseActivated(leaseId, tenant, landlord, propertyId, startDate, endDate, monthlyRent)`

**Key State Changes:**
- `leases[leaseId].state` = `Active` (2)
- `leases[leaseId].startDate` = block.timestamp
- `leases[leaseId].endDate` = startDate + duration
- `leases[leaseId].lastPaymentDate` = startDate

**Required Permissions:** Only landlord of the lease

**Alternative Path - Rejection:**
If credit check failed or landlord rejects:
- Landlord can terminate lease
- State changes to `Terminated` (4)
- No further action possible on this lease

---

### Step 5: Security Deposit Payment

**Actor:** Tenant  
**Contract:** `PaymentEscrow.sol`  
**Function:** `depositSecurity()`

**Process:**
1. Tenant calls `depositSecurity()` with ETH payment:
   - `leaseId`: ID of the active lease
   - `landlord`: Landlord's address
   - `value`: Security deposit amount (typically 2-3x monthly rent)

2. Contract validates:
   - Payment amount > 0
   - No deposit already exists for this lease
   - Valid landlord address

3. Funds held in escrow contract
4. Event emitted: `DepositReceived(leaseId, tenant, amount)`

**Key State Changes:**
- `escrows[leaseId]` = new Escrow struct
  ```solidity
  struct Escrow {
      uint256 leaseId;
      address landlord;
      address tenant;
      uint256 depositAmount;
      uint256 depositedAt;
      bool released;
  }
  ```

**Required Permissions:** Any address (tenant should call)

**Notes:**
- Deposit held for entire lease duration
- Released at lease completion if no damages
- Can be forfeited if tenant breaches lease terms

---

### Step 6: Activation Notification (Automated)

**Actor:** Chainlink CRE Workflow  
**Contract:** N/A (Backend API only)  
**Functions:** Backend API `/api/notifications/lease-activated`

**Process:**
1. **Trigger:** `LeaseActivated` event detected by CRE Log Trigger
2. **Workflow Execution:**
   - Workflow decodes event data
   - Extracts: leaseId, tenant, landlord, propertyId, startDate, endDate, monthlyRent

3. **Backend API Call:**
   - Workflow POSTs to backend endpoint
   - Payload includes all lease activation details
   
4. **Backend Processing:**
   - Fetches tenant email from database (MongoDB)
   - Generates HTML email with lease details
   - Sends email via Gmail SMTP (nodemailer)
   - Stores notification record in database
   - Returns success status to workflow

5. **Email Sent:**
   - Tenant receives welcome email
   - Contains: lease ID, property address, rent amount, start/end dates, landlord contact

**Key State Changes:**
- Backend: `notifications` collection updated
- No on-chain state changes

**Required Permissions:** 
- Workflow must have valid `BACKEND_API_KEY`

**Workflow File:** `cre-workflows/chainlease-workflows/lease-notification-workflow/main.ts`

---

### Step 7: Active Lease & Rent Payments

**Actor:** Tenant (manual) or CRE Workflow (automated)  
**Contract:** `PaymentEscrow.sol`  
**Functions:** `payRent()` (manual) or `collectRent()` (automated)

#### 7a. Manual Rent Payment

**Process:**
1. Tenant calls `payRent()` with ETH payment:
   - `leaseId`: ID of the lease
   - `landlord`: Landlord's address
   - `value`: Rent amount (+ late fees if applicable)

2. Contract validates:
   - Payment amount > 0
   - Valid landlord address

3. Rent transferred directly to landlord
4. Payment recorded in history
5. Event emitted: `RentPaid(leaseId, tenant, amount, timestamp)`

**Key State Changes:**
- `paymentHistory[leaseId]` updated with timestamp
- `totalPaid[leaseId]` += payment amount

#### 7b. Automated Rent Collection (CRE Workflow)

**Process:**
1. **Trigger:** Time-based (cron: daily at 00:00 UTC)
2. **Workflow Execution:**
   - Fetches all active leases via `getActiveLeases()`
   - For each lease, checks if rent is due (30+ days since last payment)
   - Calculates late fees if applicable:
     ```
     daysLate = daysSincePayment - 30 - gracePeriod
     lateFee = (monthlyRent × lateFeePercentage × daysLate) / (100 × 30)
     ```
   
3. **On-Chain Report Submission:**
   - Encodes rent collection data: `(uint256[] leaseIds, uint256[] rentAmounts, uint256[] lateFees)`
   - Generates signed report via `runtime.report()`
   - Submits to consumer contract via `evmClient.writeReport()`
   
4. **Consumer Contract Processing:**
   - Receives report from `KeystoneForwarder`
   - Processes batch rent collection
   - Calls `PaymentEscrow.collectRent()` for each lease

5. **Backend Notification:**
   - Workflow sends payment results to backend API
   - Backend stores payment records
   - Backend sends email notifications to tenants

**Key State Changes:**
- `paymentHistory[leaseId]` updated
- `totalPaid[leaseId]` updated
- `leases[leaseId].lastPaymentDate` updated

**Required Permissions:** 
- Automated: Only authorized workflow signer
- Manual: Any address (tenant should call)

**Workflow File:** `cre-workflows/chainlease-workflows/rent-collection-workflow/main.ts`

---

## Additional Lease Management

### Lease Completion

**Actor:** Landlord or Tenant  
**Contract:** `LeaseAgreement.sol`  
**Function:** `completeLease()`

**Process:**
1. Called when lease term ends naturally
2. State changed to `Completed` (3)
3. Security deposit released via `PaymentEscrow.releaseDeposit()`

### Lease Termination

**Actor:** Landlord  
**Contract:** `LeaseAgreement.sol`  
**Function:** `terminateLease()`

**Process:**
1. Landlord can terminate for breach of contract
2. State changed to `Terminated` (4)
3. Security deposit may be forfeited via `PaymentEscrow.forfeitDeposit()`

### Dispute Resolution

**Actor:** Tenant or Landlord  
**Contract:** `DisputeResolution.sol`  
**Function:** `fileDispute()`

**Process:**
1. Party files dispute with 0.01 ETH fee
2. Provides reason and evidence (IPFS hash)
3. Arbitrator reviews and resolves
4. Possible outcomes:
   - Favor landlord
   - Favor tenant
   - Split decision
   - Dismissed

**Functions:**
- `fileDispute()` - Create dispute
- `updateDisputeStatus()` - Change status
- `resolveDispute()` - Arbitrator decision
- `cancelDispute()` - Initiator cancellation

---

## State Transitions

```
Draft (0)
   │
   ├─ Credit Check Completed
   │
   ▼
PendingApproval (1)
   │
   ├─ Landlord Activates
   │
   ▼
Active (2)
   │
   ├─ Lease Term Ends → Completed (3)
   ├─ Breach/Termination → Terminated (4)
   └─ Dispute Filed → Disputed (5)
```

---

## Key Contracts Summary

| Contract | Purpose | Key Functions |
|----------|---------|---------------|
| **PropertyNFT.sol** | Property tokenization | `mintProperty()`, `setPropertyListing()`, `updateRent()` |
| **LeaseAgreement.sol** | Lease lifecycle management | `createLease()`, `activateLease()`, `receiveCreditCheck()`, `recordPayment()` |
| **PaymentEscrow.sol** | Financial transactions | `depositSecurity()`, `payRent()`, `collectRent()`, `releaseDeposit()` |
| **WorldIDVerifier.sol** | Identity verification | `mockVerify()`, `verifyProof()`, `isVerified()` |
| **DisputeResolution.sol** | Conflict arbitration | `fileDispute()`, `resolveDispute()`, `updateDisputeStatus()` |
| **ReceiverTemplate.sol** | CRE integration base | `onReport()`, `_processReport()` |

---

## CRE Workflows Summary

| Workflow | Trigger Type | Purpose | File |
|----------|-------------|---------|------|
| **Credit Check** | EVM Log (`LeaseCreated`) | Automated tenant verification | `credit-check-workflow/main.ts` |
| **Lease Notification** | EVM Log (`LeaseActivated`) | Email notifications to tenants | `lease-notification-workflow/main.ts` |
| **Rent Collection** | Time-based (cron daily) | Automated monthly rent collection | `rent-collection-workflow/main.ts` |

---

## Security & Authorization

### Access Control
- **Landlord Only:** `activateLease()`, `terminateLease()`, `completeLease()`
- **Tenant Only:** Typically calls `createLease()`, `payRent()`, `depositSecurity()`
- **Forwarder Only:** `onReport()` (via `onlyForwarder` modifier)
- **Arbitrator Only:** `resolveDispute()`, `updateDisputeStatus()`
- **Owner Only:** `setPaymentEscrow()`, `setWorldIdVerifier()`, contract deployment

### Reentrancy Protection
- All payment functions use `ReentrancyGuard` from OpenZeppelin
- `nonReentrant` modifier on: `depositSecurity()`, `payRent()`, `collectRent()`, `releaseDeposit()`

### World ID Integration
- Prevents duplicate lease applications
- One application per identity per property
- Nullifier hash tracking in `usedNullifiers` mapping

---

## Frontend Integration Points

### Landlord Dashboard
1. Mint property → Call `PropertyNFT.mintProperty()`
2. View applications → Query `LeaseAgreement.leases()`
3. Review credit checks → Read `creditCheckPassed` and `verificationId`
4. Activate lease → Call `LeaseAgreement.activateLease()`
5. View rent payments → Query `PaymentEscrow.paymentHistory()`

### Tenant Dashboard
1. Browse properties → Query `PropertyNFT.properties()`
2. Apply for lease → Call `LeaseAgreement.createLease()`
3. Check application status → Query `LeaseAgreement.leases()`
4. Pay security deposit → Call `PaymentEscrow.depositSecurity()`
5. Pay rent → Call `PaymentEscrow.payRent()`
6. View payment history → Query `PaymentEscrow.paymentHistory()`

### Admin Panel
1. Manage arbitrators → Call `DisputeResolution.addArbitrator()`
2. View disputes → Query `DisputeResolution.disputes()`
3. View all leases → Query `LeaseAgreement` + backend API

---

## Backend API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/credit-check/verify` | POST | Credit check verification |
| `/api/data/credit-checks` | GET | Fetch credit check records |
| `/api/notifications/lease-activated` | POST | Receive lease activation events from CRE |
| `/api/rent-payments` | POST | Record rent payment from CRE workflow |
| `/api/rent-payments/:leaseId` | GET | Get payment history for a lease |
| `/api/rent-payments/tenant/:address` | GET | Get all payments for a tenant |
| `/api/send-email` | POST | Send custom emails |
| `/api/users` | GET/POST | User management |

---

## Technology Stack

### Smart Contracts
- Solidity 0.8.24
- OpenZeppelin (ERC721, ReentrancyGuard, Ownable)
- Hardhat (deployment & testing)

### CRE Workflows
- TypeScript
- Chainlink CRE SDK
- Viem (Ethereum library)
- Zod (schema validation)

### Backend
- Node.js + Express
- MongoDB (database)
- Nodemailer (Gmail SMTP)
- JWT (authentication)

### Frontend (TODO)
- Next.js / React
- Wagmi / Viem (wallet connection)
- TailwindCSS (styling)

---

## Next Steps for Implementation

1. ✅ Smart contracts deployed
2. ✅ Credit check workflow implemented
3. ✅ Lease notification workflow implemented
4. ✅ Rent collection workflow implemented (needs consumer contract)
5. ⏳ Create consumer contract for rent collection reports
6. ⏳ Build frontend (highest priority)
7. ⏳ Deploy to testnet and test end-to-end flow
8. ⏳ Security audit
9. ⏳ Production deployment

---

**Document Version:** 1.0  
**Last Updated:** February 16, 2026  
**Project:** ChainLease - Decentralized Rental Platform
