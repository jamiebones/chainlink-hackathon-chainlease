# ChainLease Implementation Plan
## Privacy-First Real Estate Leasing Platform - Chainlink Hackathon 2026

**Timeline**: February 11 - March 1, 2026 (19 days)  
**Target Prize Categories**: DeFi & Tokenization ($20k), Privacy ($16k), World ID with CRE ($5k)  
**Tech Stack**: Ethereum, Solidity, Hardhat, Next.js, World ID, Chainlink Runtime Environment

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Phase 1: Foundation (Days 1-6)](#phase-1-foundation)
5. [Phase 2: DeFi Enhancement (Days 7-10)](#phase-2-defi-enhancement)
6. [Phase 3: Privacy Layer (Days 11-16)](#phase-3-privacy-layer)
7. [Phase 4: Polish & Submission (Days 17-19)](#phase-4-polish--submission)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Checklist](#deployment-checklist)
10. [Demo Video Script](#demo-video-script)

---

## Project Overview

### Problem Statement
Current real estate leasing is broken:
- Manual PDF contracts that are slow and error-prone
- Privacy risks with sensitive tenant data (SSN, credit history)
- Manual bank transfers with no automation
- Slow credit checks through centralized bureaus
- No transparency or trust between landlords and tenants

### Solution: ChainLease
Web3-native leasing platform with:
- **Tokenized Properties**: ERC-721 NFTs represent rental properties
- **Zero-Knowledge Identity**: World ID proves personhood without revealing PII
- **Automated Workflows**: CRE orchestrates credit checks and rent collection
- **Privacy-First**: Confidential HTTP + private transactions protect sensitive data
- **Smart Escrow**: Automated security deposits with programmatic release

### Value Proposition
- **For Tenants**: Privacy-preserving verification, automated payments, transparent terms
- **For Landlords**: Instant credit checks, guaranteed rent collection, reduced fraud
- **For Market**: $600B+ annual US rental market moving on-chain

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Landlord   │  │    Tenant    │  │   Property   │      │
│  │  Dashboard   │  │  Dashboard   │  │   Listing    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                 │                   │              │
│         └─────────────────┴───────────────────┘              │
│                           │                                  │
│                    ┌──────▼──────┐                          │
│                    │  World ID   │                          │
│                    │  IDKit SDK  │                          │
│                    └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   SMART CONTRACTS (Ethereum)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PropertyNFT │  │LeaseAgreement│  │PaymentEscrow │      │
│  │  (ERC-721)   │  │(State Machine│  │  (Deposits)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │  World ID    │  │   Dispute    │                        │
│  │  Verifier    │  │  Resolution  │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              CHAINLINK RUNTIME ENVIRONMENT                   │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Workflow 1: Credit Check Oracle                 │      │
│  │  - Fetch credit score via Confidential HTTP     │      │
│  │  - Return approval status on-chain               │      │
│  └──────────────────────────────────────────────────┘      │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Workflow 2: Automated Rent Collection          │      │
│  │  - Time-based trigger (monthly)                  │      │
│  │  - Execute payment & late fee calculations       │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND SERVICES (Node.js)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Event     │  │     IPFS     │  │ Notification │      │
│  │   Indexer    │  │   Service    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                    MongoDB Database                          │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow: Complete Lease Cycle

1. **Property Listing**
   ```
   Landlord → Mint PropertyNFT → Upload images to IPFS → List on platform
   ```

2. **Tenant Application**
   ```
   Tenant → Browse properties → Click "Apply"
   → World ID verification (prove unique human)
   → Submit application with World ID proof
   ```

3. **Credit Check**
   ```
   Application submitted → CRE Workflow triggered
   → Confidential HTTP to credit API (API keys encrypted)
   → Credit score evaluated → Result stored on-chain
   ```

4. **Lease Activation**
   ```
   Credit approved → Tenant deposits security (private transaction)
   → Lease state: Draft → Active
   → Store World ID nullifier hash (prevent double-application)
   ```

5. **Rent Collection**
   ```
   CRE Automation → Monthly trigger (1st of month)
   → Check lease active → Deduct rent from tenant wallet
   → Late fee if past grace period → Update payment history
   ```

6. **Lease Completion**
   ```
   Lease term ends → Tenant requests deposit return
   → No disputes → Escrow releases deposit (private transaction)
   → Lease state: Active → Completed
   ```

---

## Project Structure

```
real-estate/
├── contracts/                      # Smart contracts (Solidity)
│   ├── PropertyNFT.sol
│   ├── LeaseAgreement.sol
│   ├── PaymentEscrow.sol
│   ├── WorldIDVerifier.sol
│   ├── DisputeResolution.sol
│   └── interfaces/
│       ├── IPropertyNFT.sol
│       ├── ILeaseAgreement.sol
│       └── IPaymentEscrow.sol
│
├── cre-workflows/                  # Chainlink Runtime Environment
│   ├── credit-check-workflow.ts
│   ├── rent-automation-workflow.ts
│   ├── config/
│   │   └── workflow-config.json
│   └── mocks/
│       └── mock-credit-api.ts
│
├── frontend/                       # Next.js application
│   ├── src/
│   │   ├── components/
│   │   │   ├── LandlordDashboard.tsx
│   │   │   ├── TenantDashboard.tsx
│   │   │   ├── PropertyListing.tsx
│   │   │   ├── LeaseSigningFlow.tsx
│   │   │   ├── PaymentDashboard.tsx
│   │   │   ├── WorldIDAuth.tsx
│   │   │   └── WalletConnect.tsx
│   │   ├── pages/
│   │   │   ├── index.tsx
│   │   │   ├── properties.tsx
│   │   │   ├── dashboard.tsx
│   │   │   └── lease/[id].tsx
│   │   ├── hooks/
│   │   │   ├── useContract.ts
│   │   │   ├── useWorldID.ts
│   │   │   └── useLeaseStatus.ts
│   │   ├── lib/
│   │   │   ├── contracts.ts
│   │   │   ├── worldid.ts
│   │   │   └── api.ts
│   │   └── types/
│   │       └── index.ts
│   ├── public/
│   └── package.json
│
├── backend/                        # Express.js backend
│   ├── src/
│   │   ├── services/
│   │   │   ├── event-indexer.ts
│   │   │   ├── ipfs-service.ts
│   │   │   └── notification-service.ts
│   │   ├── api/
│   │   │   └── routes.ts
│   │   ├── models/
│   │   │   ├── Property.ts
│   │   │   ├── Lease.ts
│   │   │   └── Payment.ts
│   │   └── server.ts
│   └── package.json
│
├── scripts/                        # Deployment & utility scripts
│   ├── deploy.ts
│   ├── verify.ts
│   ├── setup-world-id.ts
│   └── test-cre-workflow.ts
│
├── test/                          # Test files
│   ├── PropertyNFT.test.ts
│   ├── LeaseAgreement.test.ts
│   ├── PaymentEscrow.test.ts
│   ├── WorldIDVerifier.test.ts
│   ├── integration/
│   │   └── lease-flow.test.ts
│   └── cre-workflows/
│       └── credit-check.test.ts
│
├── docs/                          # Documentation
│   ├── ARCHITECTURE.md
│   ├── CHAINLINK.md
│   ├── API.md
│   └── DEPLOYMENT.md
│
├── hardhat.config.ts
├── package.json
├── .env.example
└── README.md
```

---

## Phase 1: Foundation (Days 1-6)
**Goal**: Working smart contracts + basic frontend + World ID integration

### Day 1: Project Setup
**Tasks**:
- [ ] Initialize workspace structure
- [ ] Set up Hardhat with TypeScript
- [ ] Install dependencies
- [ ] Configure environment variables
- [ ] Create Git repository

**Commands**:
```bash
# Initialize project
mkdir real-estate && cd real-estate
npm init -y

# Install Hardhat & dependencies
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @typechain/hardhat
npm install @openzeppelin/contracts @chainlink/contracts dotenv

# Initialize Hardhat
npx hardhat init # Choose "TypeScript project"

# Install World ID SDK
npm install @worldcoin/idkit

# Create directory structure
mkdir -p contracts/interfaces cre-workflows scripts test docs frontend backend
```

**Files to Create**:

1. **hardhat.config.ts**
```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
```

2. **.env.example**
```env
# RPC URLs
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
PRIVATE_KEY=your_private_key_here

# World ID Configuration (Staging)
NEXT_PUBLIC_WORLD_ID_APP_ID=app_staging_YOUR_APP_ID
WORLD_ID_ACTION_APPLY_LEASE=apply-for-lease

# Chainlink Configuration
CRE_NODE_URL=https://cre-testnet.chain.link
CRE_API_KEY=your_cre_api_key

# APIs
CREDIT_API_URL=https://sandbox.experian.com/api
CREDIT_API_KEY=your_credit_api_key

# IPFS
PINATA_API_KEY=your_pinata_key
PINATA_SECRET_KEY=your_pinata_secret

# Database
MONGODB_URI=mongodb://localhost:27017/chainlease

# Block Explorers
ETHERSCAN_API_KEY=your_etherscan_key
```

3. **package.json** (root)
```json
{
  "name": "chainlease",
  "version": "1.0.0",
  "description": "Privacy-First Real Estate Leasing Platform",
  "scripts": {
    "compile": "hardhat compile",
    "test": "hardhat test",
    "deploy:sepolia": "hardhat run scripts/deploy.ts --network sepolia",
    "verify": "hardhat run scripts/verify.ts",
    "frontend": "cd frontend && npm run dev",
    "backend": "cd backend && npm run dev"
  },
  "keywords": ["web3", "real-estate", "world-id", "chainlink", "defi"],
  "author": "ChainLease Team",
  "license": "MIT"
}
```

### Day 2: Core Smart Contracts - Part 1

**Task**: Build PropertyNFT and LeaseAgreement contracts

**Files to Create**:

1. **contracts/PropertyNFT.sol**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title PropertyNFT
 * @notice ERC-721 contract for tokenized rental properties
 * @dev Each NFT represents a unique rental property with metadata
 */
contract PropertyNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    struct PropertyMetadata {
        string propertyAddress;
        string propertyType; // e.g., "apartment", "house"
        uint256 squareFeet;
        uint256 bedrooms;
        uint256 bathrooms;
        bool isListed;
    }

    mapping(uint256 => PropertyMetadata) public properties;
    mapping(address => uint256[]) public landlordProperties;

    event PropertyMinted(
        uint256 indexed tokenId,
        address indexed owner,
        string propertyAddress
    );

    event PropertyListed(uint256 indexed tokenId, bool isListed);

    constructor() ERC721("ChainLease Property", "CLPROP") Ownable(msg.sender) {}

    /**
     * @notice Mint a new property NFT
     * @param to Address of the property owner (landlord)
     * @param metadataURI IPFS URI with property images and details
     * @param metadata On-chain property metadata
     * @return tokenId The ID of the minted NFT
     */
    function mintProperty(
        address to,
        string memory metadataURI,
        PropertyMetadata memory metadata
    ) public returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _mint(to, newTokenId);
        _setTokenURI(newTokenId, metadataURI);

        properties[newTokenId] = metadata;
        landlordProperties[to].push(newTokenId);

        emit PropertyMinted(newTokenId, to, metadata.propertyAddress);
        return newTokenId;
    }

    /**
     * @notice Toggle property listing status
     * @param tokenId Property NFT ID
     * @param isListed New listing status
     */
    function setPropertyListing(uint256 tokenId, bool isListed) public {
        require(ownerOf(tokenId) == msg.sender, "Not property owner");
        properties[tokenId].isListed = isListed;
        emit PropertyListed(tokenId, isListed);
    }

    /**
     * @notice Get all properties owned by a landlord
     * @param landlord Landlord address
     * @return Array of property token IDs
     */
    function getPropertiesByLandlord(address landlord)
        public
        view
        returns (uint256[] memory)
    {
        return landlordProperties[landlord];
    }

    // Override required functions
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
```

2. **contracts/LeaseAgreement.sol** (Partial - will expand)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IPropertyNFT.sol";
import "./PaymentEscrow.sol";

/**
 * @title LeaseAgreement
 * @notice Manages lease lifecycle and state transitions
 */
contract LeaseAgreement is ReentrancyGuard, Pausable {
    enum LeaseState {
        Draft,
        PendingApproval,
        Active,
        Completed,
        Terminated,
        Disputed
    }

    struct Lease {
        uint256 leaseId;
        uint256 propertyId;
        address landlord;
        address tenant;
        uint256 monthlyRent;
        uint256 securityDeposit;
        uint256 startDate;
        uint256 endDate;
        LeaseState state;
        bytes32 worldIdNullifierHash; // Prevents same tenant applying twice
        bool creditCheckPassed;
        uint256 lastPaymentDate;
    }

    uint256 private _leaseIdCounter;
    mapping(uint256 => Lease) public leases;
    mapping(address => uint256[]) public tenantLeases;
    mapping(address => uint256[]) public landlordLeases;
    mapping(bytes32 => bool) public usedNullifiers; // World ID nullifier tracking

    IPropertyNFT public propertyNFT;
    PaymentEscrow public paymentEscrow;

    event LeaseCreated(uint256 indexed leaseId, uint256 indexed propertyId, address tenant);
    event LeaseStateChanged(uint256 indexed leaseId, LeaseState newState);
    event CreditCheckCompleted(uint256 indexed leaseId, bool passed);

    constructor(address _propertyNFT, address _paymentEscrow) {
        propertyNFT = IPropertyNFT(_propertyNFT);
        paymentEscrow = PaymentEscrow(_paymentEscrow);
    }

    /**
     * @notice Create a new lease application
     * @param propertyId Property NFT ID
     * @param monthlyRent Monthly rent amount in wei
     * @param securityDeposit Security deposit amount
     * @param duration Lease duration in days
     * @param worldIdNullifierHash World ID nullifier to prevent double-application
     */
    function createLease(
        uint256 propertyId,
        uint256 monthlyRent,
        uint256 securityDeposit,
        uint256 duration,
        bytes32 worldIdNullifierHash
    ) public returns (uint256) {
        require(!usedNullifiers[worldIdNullifierHash], "Already applied");
        require(propertyNFT.ownerOf(propertyId) != address(0), "Property not exists");

        _leaseIdCounter++;
        uint256 newLeaseId = _leaseIdCounter;

        address landlord = propertyNFT.ownerOf(propertyId);

        leases[newLeaseId] = Lease({
            leaseId: newLeaseId,
            propertyId: propertyId,
            landlord: landlord,
            tenant: msg.sender,
            monthlyRent: monthlyRent,
            securityDeposit: securityDeposit,
            startDate: 0,
            endDate: 0,
            state: LeaseState.Draft,
            worldIdNullifierHash: worldIdNullifierHash,
            creditCheckPassed: false,
            lastPaymentDate: 0
        });

        usedNullifiers[worldIdNullifierHash] = true;
        tenantLeases[msg.sender].push(newLeaseId);
        landlordLeases[landlord].push(newLeaseId);

        emit LeaseCreated(newLeaseId, propertyId, msg.sender);
        return newLeaseId;
    }

    /**
     * @notice Activate lease after credit check and deposit
     * @param leaseId Lease ID
     */
    function activateLease(uint256 leaseId) public nonReentrant {
        Lease storage lease = leases[leaseId];
        require(lease.state == LeaseState.PendingApproval, "Invalid state");
        require(lease.creditCheckPassed, "Credit check not passed");
        require(msg.sender == lease.landlord, "Only landlord");

        lease.state = LeaseState.Active;
        lease.startDate = block.timestamp;
        lease.endDate = block.timestamp + 365 days; // TODO: use duration param

        emit LeaseStateChanged(leaseId, LeaseState.Active);
    }

    // Additional functions will be added in Day 3
}
```

### Day 3: Core Smart Contracts - Part 2

**Task**: Build PaymentEscrow and WorldIDVerifier

1. **contracts/PaymentEscrow.sol**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PaymentEscrow
 * @notice Manages security deposits and rent payments
 */
contract PaymentEscrow is ReentrancyGuard, Ownable {
    struct Escrow {
        uint256 leaseId;
        address landlord;
        address tenant;
        uint256 depositAmount;
        uint256 depositedAt;
        bool released;
    }

    mapping(uint256 => Escrow) public escrows;
    mapping(uint256 => uint256[]) public paymentHistory; // leaseId => timestamps
    
    uint256 public constant LATE_FEE_PERCENTAGE = 5; // 5% late fee
    uint256 public constant GRACE_PERIOD = 3 days;

    event DepositReceived(uint256 indexed leaseId, address tenant, uint256 amount);
    event DepositReleased(uint256 indexed leaseId, address tenant, uint256 amount);
    event RentPaid(uint256 indexed leaseId, address tenant, uint256 amount);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Deposit security deposit for a lease
     * @param leaseId Lease ID
     * @param landlord Landlord address
     */
    function depositSecurity(uint256 leaseId, address landlord) 
        public 
        payable 
        nonReentrant 
    {
        require(msg.value > 0, "Amount must be > 0");
        require(escrows[leaseId].depositAmount == 0, "Already deposited");

        escrows[leaseId] = Escrow({
            leaseId: leaseId,
            landlord: landlord,
            tenant: msg.sender,
            depositAmount: msg.value,
            depositedAt: block.timestamp,
            released: false
        });

        emit DepositReceived(leaseId, msg.sender, msg.value);
    }

    /**
     * @notice Release security deposit after lease completion
     * @param leaseId Lease ID
     */
    function releaseDeposit(uint256 leaseId) public nonReentrant {
        Escrow storage escrow = escrows[leaseId];
        require(!escrow.released, "Already released");
        require(
            msg.sender == escrow.landlord || msg.sender == owner(),
            "Not authorized"
        );

        escrow.released = true;
        payable(escrow.tenant).transfer(escrow.depositAmount);

        emit DepositReleased(leaseId, escrow.tenant, escrow.depositAmount);
    }

    /**
     * @notice Record rent payment
     * @param leaseId Lease ID
     */
    function recordPayment(uint256 leaseId) public payable nonReentrant {
        paymentHistory[leaseId].push(block.timestamp);
        emit RentPaid(leaseId, msg.sender, msg.value);
    }

    /**
     * @notice Get payment history for a lease
     * @param leaseId Lease ID
     * @return Array of payment timestamps
     */
    function getPaymentHistory(uint256 leaseId) 
        public 
        view 
        returns (uint256[] memory) 
    {
        return paymentHistory[leaseId];
    }
}
```

2. **contracts/WorldIDVerifier.sol**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IWorldID } from "@worldcoin/world-id-contracts/interfaces/IWorldID.sol";

/**
 * @title WorldIDVerifier
 * @notice Verifies World ID proofs for tenant identity
 */
contract WorldIDVerifier {
    IWorldID public worldId;
    string public appId;
    string public actionId;

    mapping(uint256 => bool) public verifiedProofs;

    event ProofVerified(address indexed user, uint256 indexed nullifierHash);

    constructor(
        address _worldId,
        string memory _appId,
        string memory _actionId
    ) {
        worldId = IWorldID(_worldId);
        appId = _appId;
        actionId = _actionId;
    }

    /**
     * @notice Verify World ID proof
     * @param signal Arbitrary signal (can be user address)
     * @param root Merkle root from World ID
     * @param nullifierHash Unique identifier for this user+action
     * @param proof Zero-knowledge proof
     */
    function verifyProof(
        address signal,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) public {
        require(!verifiedProofs[nullifierHash], "Proof already used");

        worldId.verifyProof(
            root,
            abi.encodePacked(appId).hashToField(),
            abi.encodePacked(actionId).hashToField(),
            signal,
            nullifierHash,
            proof
        );

        verifiedProofs[nullifierHash] = true;
        emit ProofVerified(signal, nullifierHash);
    }

    /**
     * @notice Check if a nullifier hash has been verified
     * @param nullifierHash Nullifier hash to check
     * @return bool Whether the proof has been verified
     */
    function isVerified(uint256 nullifierHash) public view returns (bool) {
        return verifiedProofs[nullifierHash];
    }
}
```

### Day 4-5: World ID Integration & Testing

**Tasks**:
- Register app on World ID Developer Portal (staging)
- Write unit tests for contracts
- Set up World ID Simulator for testing
- Test complete proof verification flow

**Files to Create**:

1. **scripts/setup-world-id.ts**
```typescript
import dotenv from 'dotenv';
dotenv.config();

/**
 * World ID Setup Instructions
 * 
 * 1. Go to https://developer.worldcoin.org/
 * 2. Create new app:
 *    - Name: ChainLease
 *    - Environment: Staging
 *    - Integration: External (IDKit)
 *    - Verification: Cloud or On-chain
 * 
 * 3. Create Action:
 *    - Action ID: apply-for-lease
 *    - Description: Verify tenant identity for lease application
 *    - Max verifications: 1 per user
 * 
 * 4. Copy App ID to .env:
 *    NEXT_PUBLIC_WORLD_ID_APP_ID=app_staging_xxxxx
 * 
 * 5. For on-chain verification, deploy WorldIDVerifier.sol
 *    with World ID contract address:
 *    - Ethereum Sepolia: 0x... (get from World ID docs)
 */

async function main() {
    console.log("World ID Configuration:");
    console.log("App ID:", process.env.NEXT_PUBLIC_WORLD_ID_APP_ID);
    console.log("Action:", process.env.WORLD_ID_ACTION_APPLY_LEASE);
    console.log("\nSimulator URL: https://simulator.worldcoin.org/");
    console.log("\nNext steps:");
    console.log("1. Test with simulator before deploying contracts");
    console.log("2. Deploy WorldIDVerifier with App ID");
    console.log("3. Integrate IDKit in frontend");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
```

2. **test/PropertyNFT.test.ts**
```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { PropertyNFT } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("PropertyNFT", function () {
    let propertyNFT: PropertyNFT;
    let owner: SignerWithAddress;
    let landlord: SignerWithAddress;

    beforeEach(async function () {
        [owner, landlord] = await ethers.getSigners();

        const PropertyNFTFactory = await ethers.getContractFactory("PropertyNFT");
        propertyNFT = await PropertyNFTFactory.deploy();
    });

    describe("Minting", function () {
        it("Should mint a property NFT", async function () {
            const metadata = {
                propertyAddress: "123 Main St, New York, NY",
                propertyType: "apartment",
                squareFeet: 1000,
                bedrooms: 2,
                bathrooms: 2,
                isListed: true,
            };

            const tx = await propertyNFT.mintProperty(
                landlord.address,
                "ipfs://QmTest123",
                metadata
            );

            await expect(tx)
                .to.emit(propertyNFT, "PropertyMinted")
                .withArgs(1, landlord.address, metadata.propertyAddress);

            expect(await propertyNFT.ownerOf(1)).to.equal(landlord.address);
        });

        it("Should track landlord properties", async function () {
            const metadata = {
                propertyAddress: "123 Main St",
                propertyType: "apartment",
                squareFeet: 1000,
                bedrooms: 2,
                bathrooms: 2,
                isListed: true,
            };

            await propertyNFT.mintProperty(landlord.address, "ipfs://1", metadata);
            await propertyNFT.mintProperty(landlord.address, "ipfs://2", metadata);

            const properties = await propertyNFT.getPropertiesByLandlord(landlord.address);
            expect(properties.length).to.equal(2);
        });
    });

    describe("Listing", function () {
        it("Should toggle property listing", async function () {
            const metadata = {
                propertyAddress: "123 Main St",
                propertyType: "apartment",
                squareFeet: 1000,
                bedrooms: 2,
                bathrooms: 2,
                isListed: true,
            };

            await propertyNFT.mintProperty(landlord.address, "ipfs://1", metadata);

            await propertyNFT.connect(landlord).setPropertyListing(1, false);
            const property = await propertyNFT.properties(1);
            expect(property.isListed).to.be.false;
        });

        it("Should only allow owner to change listing", async function () {
            const metadata = {
                propertyAddress: "123 Main St",
                propertyType: "apartment",
                squareFeet: 1000,
                bedrooms: 2,
                bathrooms: 2,
                isListed: true,
            };

            await propertyNFT.mintProperty(landlord.address, "ipfs://1", metadata);

            await expect(
                propertyNFT.connect(owner).setPropertyListing(1, false)
            ).to.be.revertedWith("Not property owner");
        });
    });
});
```

### Day 6: Basic Frontend Setup

**Tasks**:
- Initialize Next.js project
- Set up wallet connection with RainbowKit
- Create basic layout and navigation
- Integrate World ID IDKit widget

**Commands**:
```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
npm install @rainbow-me/rainbowkit wagmi viem @worldcoin/idkit
npm install @tanstack/react-query
```

**Files to Create**:

1. **frontend/app/layout.tsx**
```typescript
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ChainLease - Privacy-First Real Estate Leasing',
  description: 'Decentralized leasing platform with World ID and Chainlink',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

2. **frontend/app/providers.tsx**
```typescript
'use client';

import { RainbowKitProvider, getDefaultWallets } from '@rainbow-me/rainbowkit';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { sepolia, baseGoerli } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';

const { chains, publicClient } = configureChains(
  [sepolia, baseGoerli],
  [publicProvider()]
);

const { connectors } = getDefaultWallets({
  appName: 'ChainLease',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider chains={chains}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}
```

3. **frontend/components/WorldIDAuth.tsx**
```typescript
'use client';

import { IDKitWidget, ISuccessResult } from '@worldcoin/idkit';

interface WorldIDAuthProps {
  onSuccess: (proof: ISuccessResult) => void;
  onError?: (error: Error) => void;
}

export default function WorldIDAuth({ onSuccess, onError }: WorldIDAuthProps) {
  const appId = process.env.NEXT_PUBLIC_WORLD_ID_APP_ID || '';
  const action = process.env.NEXT_PUBLIC_WORLD_ID_ACTION || 'apply-for-lease';

  return (
    <IDKitWidget
      app_id={appId}
      action={action}
      onSuccess={onSuccess}
      onError={onError}
      verification_level="device" // Use 'device' for testing, 'orb' for production
    >
      {({ open }) => (
        <button
          onClick={open}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Verify with World ID
        </button>
      )}
    </IDKitWidget>
  );
}
```

---

## Phase 2: DeFi Enhancement (Days 7-10)
**Goal**: Complete DeFi functionality + CRE workflows

### Day 7: CRE Workflow - Credit Check

**Tasks**:
- Install CRE SDK
- Create credit check workflow
- Test with CRE CLI simulation
- Connect to smart contracts

**Commands**:
```bash
cd cre-workflows
npm init -y
npm install @chainlink/cre-sdk axios dotenv
```

**Files to Create**:

1. **cre-workflows/credit-check-workflow.ts**
```typescript
import { CREWorkflow, WorkflowConfig } from '@chainlink/cre-sdk';
import axios from 'axios';

/**
 * CRE Workflow: Credit Check Oracle
 * 
 * Fetches tenant credit score from external API
 * Returns approval status on-chain
 */

interface CreditCheckInput {
  tenantAddress: string;
  worldIdNullifierHash: string;
  minimumScore: number;
}

interface CreditCheckOutput {
  approved: boolean;
  score?: number;
  timestamp: number;
}

const config: WorkflowConfig = {
  name: 'credit-check-oracle',
  version: '1.0.0',
  network: 'ethereum-sepolia',
  triggers: ['manual', 'on-chain-event'],
};

async function fetchCreditScore(tenantAddress: string): Promise<number> {
  // TODO: Replace with real credit API after Feb 14 (use Confidential HTTP)
  try {
    const response = await axios.get(
      `${process.env.CREDIT_API_URL}/score`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.CREDIT_API_KEY}`,
        },
        params: {
          address: tenantAddress,
        },
      }
    );
    return response.data.score;
  } catch (error) {
    console.error('Credit API error:', error);
    // For testing: return mock score
    return 700; // Mock credit score
  }
}

export async function creditCheckWorkflow(
  input: CreditCheckInput
): Promise<CreditCheckOutput> {
  console.log(`Processing credit check for tenant: ${input.tenantAddress}`);
  
  // Step 1: Verify World ID proof was submitted (check on-chain)
  console.log('Verifying World ID proof...');
  
  // Step 2: Fetch credit score from external API
  const creditScore = await fetchCreditScore(input.tenantAddress);
  console.log(`Credit score retrieved: ${creditScore}`);
  
  // Step 3: Evaluate against minimum threshold
  const approved = creditScore >= input.minimumScore;
  console.log(`Credit check result: ${approved ? 'APPROVED' : 'REJECTED'}`);
  
  // Step 4: Return result for on-chain storage
  return {
    approved,
    score: approved ? creditScore : undefined, // Only return score if approved
    timestamp: Date.now(),
  };
}

// CRE Simulation Entry Point
if (require.main === module) {
  const testInput: CreditCheckInput = {
    tenantAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    worldIdNullifierHash: '0x123456...',
    minimumScore: 650,
  };

  creditCheckWorkflow(testInput)
    .then((result) => {
      console.log('\nWorkflow Result:', JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error('Workflow error:', error);
      process.exit(1);
    });
}
```

2. **cre-workflows/package.json**
```json
{
  "name": "chainlease-cre-workflows",
  "version": "1.0.0",
  "scripts": {
    "simulate:credit": "ts-node credit-check-workflow.ts",
    "simulate:rent": "ts-node rent-automation-workflow.ts",
    "deploy": "cre deploy --network sepolia"
  },
  "dependencies": {
    "@chainlink/cre-sdk": "^1.0.0",
    "axios": "^1.6.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.3.0"
  }
}
```

### Day 8: CRE Workflow - Rent Automation

**Files to Create**:

1. **cre-workflows/rent-automation-workflow.ts**
```typescript
import { CREWorkflow } from '@chainlink/cre-sdk';
import { ethers } from 'ethers';

/**
 * CRE Workflow: Automated Rent Collection
 * 
 * Time-based trigger (monthly)
 * Checks lease status and collects rent
 */

interface RentCollectionInput {
  leaseId: number;
  currentDate: number; // Unix timestamp
}

interface RentCollectionOutput {
  success: boolean;
  rentCollected: boolean;
  lateFee: string; // in wei
  nextDueDate: number;
}

const GRACE_PERIOD_DAYS = 3;
const LATE_FEE_PERCENTAGE = 5;
const SECONDS_PER_DAY = 86400;

async function getLeaseData(leaseId: number): Promise<any> {
  // TODO: Connect to smart contract
  // For simulation, return mock data
  return {
    leaseId,
    monthlyRent: ethers.parseEther('1.5'), // 1.5 ETH
    lastPaymentDate: Math.floor(Date.now() / 1000) - 30 * SECONDS_PER_DAY,
    isActive: true,
    tenant: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  };
}

async function collectRent(
  leaseId: number,
  amount: bigint,
  tenant: string
): Promise<boolean> {
  console.log(`Attempting to collect ${ethers.formatEther(amount)} ETH from ${tenant}`);
  // TODO: Execute on-chain transaction
  // For simulation, return success
  return true;
}

export async function rentAutomationWorkflow(
  input: RentCollectionInput
): Promise<RentCollectionOutput> {
  console.log(`\n=== Rent Automation Workflow ===`);
  console.log(`Lease ID: ${input.leaseId}`);
  console.log(`Current Date: ${new Date(input.currentDate * 1000).toISOString()}`);
  
  // Step 1: Fetch lease data
  const lease = await getLeaseData(input.leaseId);
  console.log(`Monthly Rent: ${ethers.formatEther(lease.monthlyRent)} ETH`);
  
  if (!lease.isActive) {
    console.log('Lease is not active. Skipping rent collection.');
    return {
      success: true,
      rentCollected: false,
      lateFee: '0',
      nextDueDate: 0,
    };
  }
  
  // Step 2: Calculate days since last payment
  const daysSincePayment = Math.floor(
    (input.currentDate - lease.lastPaymentDate) / SECONDS_PER_DAY
  );
  console.log(`Days since last payment: ${daysSincePayment}`);
  
  // Step 3: Check if rent is due (30+ days)
  if (daysSincePayment < 30) {
    console.log('Rent not yet due.');
    return {
      success: true,
      rentCollected: false,
      lateFee: '0',
      nextDueDate: lease.lastPaymentDate + 30 * SECONDS_PER_DAY,
    };
  }
  
  // Step 4: Calculate late fee if past grace period
  let lateFee = BigInt(0);
  const daysLate = daysSincePayment - 30;
  if (daysLate > GRACE_PERIOD_DAYS) {
    lateFee = (lease.monthlyRent * BigInt(LATE_FEE_PERCENTAGE)) / BigInt(100);
    console.log(`Late by ${daysLate} days. Late fee: ${ethers.formatEther(lateFee)} ETH`);
  }
  
  // Step 5: Collect rent + late fee
  const totalAmount = lease.monthlyRent + lateFee;
  const collected = await collectRent(input.leaseId, totalAmount, lease.tenant);
  
  console.log(`Rent collection: ${collected ? 'SUCCESS' : 'FAILED'}`);
  
  return {
    success: collected,
    rentCollected: collected,
    lateFee: lateFee.toString(),
    nextDueDate: input.currentDate + 30 * SECONDS_PER_DAY,
  };
}

// CRE Simulation Entry Point
if (require.main === module) {
  const testInput: RentCollectionInput = {
    leaseId: 1,
    currentDate: Math.floor(Date.now() / 1000), // Current timestamp
  };

  rentAutomationWorkflow(testInput)
    .then((result) => {
      console.log('\n=== Workflow Result ===');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error('Workflow error:', error);
      process.exit(1);
    });
}
```

### Day 9-10: Frontend Dashboards

**Tasks**:
- Build landlord dashboard (property management)
- Build tenant dashboard (browse & apply)
- Implement lease signing flow
- Connect to smart contracts

**Files to Create**:

1. **frontend/components/LandlordDashboard.tsx** - See structure above
2. **frontend/components/TenantDashboard.tsx** - See structure above
3. **frontend/components/LeaseSigningFlow.tsx** - Multi-step wizard

---

## Phase 3: Privacy Layer (Days 11-16)
**Goal**: Add Confidential HTTP + Private Transactions + Polish

### Day 11-12: Confidential HTTP Integration (Available Feb 14+)

**Tasks**:
- Update credit check workflow with Confidential HTTP
- Encrypt API keys and sensitive parameters
- Test with real credit API sandbox

**Update File**:
```typescript
// cre-workflows/credit-check-workflow.ts (Enhanced)
import { ConfidentialHTTP } from '@chainlink/cre-sdk';

const confidentialConfig = {
  encryptApiKeys: true,
  encryptRequestParams: ['ssn', 'full_name', 'dob'],
  decryptResponseFields: ['credit_score'], // Only expose score
};

async function fetchCreditScoreConfidential(
  tenantAddress: string
): Promise<number> {
  const confidentialHttp = new ConfidentialHTTP(confidentialConfig);
  
  const response = await confidentialHttp.request({
    url: process.env.CREDIT_API_URL,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CREDIT_API_KEY}`, // Will be encrypted
    },
    body: {
      address: tenantAddress,
      // Any sensitive params here will be encrypted
    },
  });
  
  // Response is partially decrypted - only credit score visible
  return response.data.credit_score;
}
```

### Day 13-14: Private Transactions

**Tasks**:
- Integrate Chainlink Privacy Standard
- Update PaymentEscrow for private deposits
- Add UI toggle for private payments

### Day 15-16: Testing & Documentation

**Tasks**:
- End-to-end testing of complete flow
- Write comprehensive documentation
- Create architecture diagrams
- Document all Chainlink integrations

---

## Phase 4: Polish & Submission (Days 17-19)
**Goal**: Deploy, record demo video, submit

### Day 17: Deployment

**Checklist**:
- [ ] Deploy contracts to Sepolia testnet
- [ ] Verify contracts on Etherscan
- [ ] Deploy CRE workflows
- [ ] Deploy frontend to Vercel
- [ ] Deploy backend to Railway
- [ ] Test all integrations live

### Day 18: Demo Video Production

**Video Script (3-5 minutes)**:

```
[0:00-0:30] PROBLEM & HOOK
- Screen: Traditional lease forms with PDFs, manual processes
- Voiceover: "Leasing a home today is broken. PDFs, manual credit checks,
  slow bank transfers, and zero privacy for tenant data."
- Screen transition to ChainLease logo

[0:30-1:00] SOLUTION OVERVIEW
- Screen: Architecture diagram
- Voiceover: "ChainLease changes everything. We've built a complete
  Web3 leasing platform using cutting-edge technology."
- Highlight: Property tokenization, World ID, CRE, Privacy features

[1:00-1:30] DEMO - PROPERTY LISTING
- Screen: Landlord dashboard
- Action: Mint Property NFT
- Show: MetaMask transaction, NFT appears on testnet explorer
- Voiceover: "Landlords tokenize properties as ERC-721 NFTs"

[1:30-2:15] DEMO - TENANT APPLICATION WITH WORLD ID
- Screen: Tenant dashboard, browse properties
- Action: Click "Apply", World ID widget appears
- Show: QR code, paste into Simulator
- Action: Proof returned, submitted on-chain
- Voiceover: "Tenants verify their identity with World ID - proving
  they're a unique human without revealing personal information.
  The zero-knowledge proof is verified on-chain."

[2:15-3:00] DEMO - CRE CREDIT CHECK
- Screen: CRE dashboard showing workflow logs
- Show: Workflow triggered, Confidential HTTP request
- Highlight: API keys encrypted, credit score returned
- Action: Lease state changes to "Approved"
- Voiceover: "Chainlink Runtime Environment orchestrates the credit
  check using Confidential HTTP. API keys never touch the blockchain,
  and sensitive data remains encrypted."

[3:00-3:30] DEMO - AUTOMATED RENT & PRIVACY
- Screen: Payment dashboard
- Show: Monthly rent automation, late fee calculation
- Action: Private transaction for security deposit
- Voiceover: "Rent collection is fully automated with CRE. Deposits
  can be transferred privately using Chainlink's Privacy Standard."

[3:30-4:00] IMPACT & INNOVATION
- Screen: Feature comparison table (Web2 vs ChainLease)
- Show: Key metrics (privacy preserved, automation enabled, trust minimized)
- Voiceover: "ChainLease isn't just a concept - it's a production-ready
  platform solving real problems in a $600 billion market."

[4:00-4:30] TECHNICAL HIGHLIGHTS
- Screen: Code snippets
- Show: World ID integration, CRE workflow, Smart contract
- Voiceover: "Built with Solidity, World ID for identity, CRE for
  orchestration, and privacy-preserving technology throughout."

[4:30-5:00] CALL TO ACTION
- Screen: GitHub repo, deployed URLs
- Voiceover: "ChainLease demonstrates the future of real estate.
  Privacy-first. Automated. Trustless. Built on Chainlink."
- End: ChainLease logo + tagline
```

### Day 19: Final Submission

**Submission Checklist**:

1. **GitHub Repository**
   - [ ] Clean commits, remove secrets
   - [ ] Comprehensive README with setup instructions
   - [ ] CHAINLINK.md with all integrations documented
   - [ ] Code comments and documentation
   - [ ] LICENSE file (MIT)

2. **Video**
   - [ ] 3-5 minutes, high quality
   - [ ] Uploaded to YouTube (unlisted, public viewable)
   - [ ] Captions added
   - [ ] Link tested

3. **Deployment**
   - [ ] Smart contracts on Sepolia (verified)
   - [ ] CRE workflows deployed and tested
   - [ ] Frontend live with working demo
   - [ ] All URLs documented

4. **Prize Category Submissions**
   - [ ] DeFi & Tokenization - Emphasize RWA lifecycle management
   - [ ] Privacy - Highlight Confidential HTTP + World ID + Private Transactions
   - [ ] World ID with CRE - Show integration extending World ID capabilities

5. **Documentation**
   - [ ] README.md (project overview, quick start)
   - [ ] ARCHITECTURE.md (technical deep dive)
   - [ ] CHAINLINK.md (all CRE integrations with file links)
   - [ ] DEPLOYMENT.md (deployment instructions)
   - [ ] API.md (backend API documentation)

---

## Testing Strategy

### Unit Tests
```bash
# Run all contract tests
npx hardhat test

# Run with coverage
npx hardhat coverage

# Target: >85% coverage
```

### Integration Tests
- Complete lease flow: mint → apply → approve → pay → complete
- World ID proof verification
- CRE workflow execution
- Payment escrow logic

### CRE Workflow Simulation
```bash
# Test credit check
cd cre-workflows
npm run simulate:credit

# Test rent automation
npm run simulate:rent

# Expected output: Successful execution with logs
```

### Frontend E2E Testing
- Wallet connection
- World ID verification flow
- Property browsing and application
- Lease signing and tracking
- Payment history display

---

## Deployment Checklist

### Smart Contracts (Sepolia)
```bash
# Compile contracts
npx hardhat compile

# Deploy to Sepolia
npx hardhat run scripts/deploy.ts --network sepolia

# Verify on Etherscan
npx hardhat verify --network sepolia DEPLOYED_ADDRESS
```

### CRE Workflows
```bash
# Deploy to CRE network
cd cre-workflows
cre deploy --network ethereum-sepolia

# Test deployed workflows
cre test --workflow credit-check-oracle
```

### Frontend (Vercel)
```bash
cd frontend
vercel --prod

# Set environment variables in Vercel dashboard
```

### Backend (Railway)
```bash
# Connect GitHub repo to Railway
# Set environment variables
# Deploy automatically on push
```

---

## Key Milestones & Success Metrics

### Minimum Viable Submission (Top 10 Prize - $1,500)
- ✅ Core smart contracts deployed
- ✅ 1 working CRE workflow (credit check)
- ✅ World ID integration (basic)
- ✅ Simple frontend
- ✅ 3-minute demo video

### Competitive Submission (2nd Place - $8,000-14,000)
- ✅ Everything above +
- ✅ 2 CRE workflows (credit + rent automation)
- ✅ Complete lease lifecycle
- ✅ Polished UI/UX
- ✅ Comprehensive documentation
- ✅ 5-minute professional video

### Winning Submission (1st Place - $15,000-25,000)
- ✅ Everything above +
- ✅ Confidential HTTP in production
- ✅ Private transactions working
- ✅ Multiple prize category eligibility
- ✅ Novel technical innovation
- ✅ Exceptional presentation
- ✅ Production-ready code quality

---

## Risk Mitigation

### Technical Risks
| Risk | Mitigation | Backup Plan |
|------|------------|-------------|
| CRE learning curve | Start early, use examples | Focus on 1 workflow if needed |
| Privacy features delayed | Build without, add later | Document intent, show design |
| World ID integration issues | Use simulator extensively | Mock verification as fallback |
| Deployment problems | Test on local network first | Deploy to Base if Sepolia issues |

### Scope Risks
| Risk | Mitigation | Backup Plan |
|------|------------|-------------|
| Too ambitious | Clear MVP definition | Cut dispute resolution |
| Time overrun | Daily progress tracking | Focus on core features only |
| Integration complexity | Modular architecture | Use mocks for external services |

---

## Resources & Links

### Documentation
- [Chainlink CRE Docs](https://docs.chain.link/chainlink-runtime-environment)
- [World ID Docs](https://docs.world.org/world-id)
- [Hardhat Docs](https://hardhat.org/docs)
- [Semaphore Protocol](https://docs.semaphore.pse.dev/)

### Tools
- [World ID Simulator](https://simulator.worldcoin.org/)
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Tenderly](https://tenderly.co/) - Contract debugging
- [Pinata](https://pinata.cloud/) - IPFS uploads

### Community
- [Chainlink Discord](https://discord.gg/chainlink)
- [World Discord](https://world.org/discord)
- [Ethereum StackExchange](https://ethereum.stackexchange.com/)

---

## Daily Progress Tracking Template

```markdown
### Day X: [Date]
**Focus**: [Main goal for the day]

**Tasks Completed**:
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

**Blockers**:
- Issue 1 → Resolution

**Tomorrow**:
- Task 1
- Task 2

**Notes**:
- Important decisions made
- Lessons learned
```

---

## Contact & Team

**Project**: ChainLease  
**Hackathon**: Chainlink 2026  
**Submission Deadline**: March 1, 2026  
**Primary Contact**: [Your Name/GitHub]

---

**Let's build the future of real estate leasing! 🚀**
