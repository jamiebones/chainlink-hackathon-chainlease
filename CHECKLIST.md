# ChainLease - Quick Reference Checklist

## 🎯 Prize Targets
- **DeFi & Tokenization**: $20,000 (1st: $12k, 2nd: $8k)
- **Privacy**: $16,000 (1st: $10k, 2nd: $6k)
- **World ID + CRE**: $5,000 (1st: $3k, 2nd: $1.5k)

---

## 📅 Timeline (Feb 11 - Mar 1, 2026)

### Phase 1: Foundation (Days 1-6: Feb 11-16)
- [ ] Day 1: Project setup, Hardhat init, dependencies
- [ ] Day 2: PropertyNFT.sol + LeaseAgreement.sol (partial)
- [ ] Day 3: PaymentEscrow.sol + WorldIDVerifier.sol
- [ ] Day 4-5: Unit tests + World ID portal setup + Simulator testing
- [ ] Day 6: Next.js frontend + wallet connection + World ID IDKit

**Deliverable**: Working contracts + basic frontend + World ID integration

### Phase 2: DeFi Enhancement (Days 7-10: Feb 17-20)
- [ ] Day 7: CRE workflow #1 - Credit check oracle + simulation
- [ ] Day 8: CRE workflow #2 - Rent automation + simulation
- [ ] Day 9-10: Landlord/Tenant dashboards + lease signing flow

**Deliverable**: 2 working CRE workflows + complete frontend

### Phase 3: Privacy Layer (Days 11-16: Feb 21-26)
- [ ] Day 11-12: Confidential HTTP integration (available Feb 14)
- [ ] Day 13-14: Private transactions + UI toggles
- [ ] Day 15-16: End-to-end testing + documentation

**Deliverable**: Privacy features + comprehensive docs

### Phase 4: Polish & Submission (Days 17-19: Feb 27-Mar 1)
- [ ] Day 17: Deploy contracts + workflows + frontend + backend
- [ ] Day 18: Record & edit demo video (3-5 minutes)
- [ ] Day 19: Final submission to all prize categories

**Deliverable**: Submitted project competing for 3 prizes

---

## 🔧 Technical Stack

### Smart Contracts
- Solidity 0.8.24
- Hardhat + TypeScript
- OpenZeppelin (ERC-721, security)
- World ID contracts

### CRE Workflows
- Chainlink Runtime Environment SDK
- Confidential HTTP (Feb 14+)
- TypeScript

### Frontend
- Next.js 14 + TypeScript
- RainbowKit + wagmi
- World ID IDKit
- Tailwind CSS

### Backend
- Node.js + Express
- MongoDB
- IPFS (Pinata)

---

## 📋 Core Features Checklist

### Smart Contracts
- [ ] PropertyNFT.sol (ERC-721, metadata, listing)
- [ ] LeaseAgreement.sol (state machine, World ID nullifier)
- [ ] PaymentEscrow.sol (deposits, rent, late fees)
- [ ] WorldIDVerifier.sol (proof verification)
- [ ] DisputeResolution.sol (evidence, voting)

### World ID Integration
- [ ] App registered on Developer Portal (staging)
- [ ] Action created: "apply-for-lease"
- [ ] IDKit widget in frontend
- [ ] On-chain proof verification
- [ ] Nullifier hash tracking (prevent double-application)
- [ ] Testing with Simulator

### CRE Workflows
- [ ] Credit Check Oracle
  - [ ] External API integration
  - [ ] Confidential HTTP (API key encryption)
  - [ ] On-chain callback
  - [ ] CLI simulation successful
- [ ] Rent Automation
  - [ ] Time-based trigger (monthly)
  - [ ] Late fee calculation
  - [ ] Payment execution
  - [ ] CLI simulation successful

### Privacy Features
- [ ] Confidential HTTP in credit workflow
- [ ] Private security deposit transfers
- [ ] Private rent payment option
- [ ] UI toggles for privacy settings

### Frontend
- [ ] Wallet connection (RainbowKit)
- [ ] World ID authentication flow
- [ ] Landlord Dashboard
  - [ ] Mint Property NFT
  - [ ] Create lease proposals
  - [ ] View active leases
  - [ ] Payment analytics
- [ ] Tenant Dashboard
  - [ ] Browse properties
  - [ ] Apply for lease (World ID)
  - [ ] View application status
  - [ ] Payment history
- [ ] Lease Signing Flow (multi-step)
- [ ] Payment Dashboard

### Backend Services
- [ ] Event indexer (MongoDB)
- [ ] IPFS service (Pinata)
- [ ] Notification service
- [ ] REST API endpoints

---

## 🧪 Testing Checklist

### Unit Tests
- [ ] PropertyNFT: minting, listing, ownership
- [ ] LeaseAgreement: state transitions, nullifier tracking
- [ ] PaymentEscrow: deposits, payments, late fees
- [ ] WorldIDVerifier: proof verification
- [ ] Coverage > 85%

### Integration Tests
- [ ] Complete lease cycle (mint → apply → approve → pay → complete)
- [ ] World ID proof → on-chain verification
- [ ] CRE workflow → smart contract callback

### CRE Simulations
- [ ] `npm run simulate:credit` - passes
- [ ] `npm run simulate:rent` - passes
- [ ] Deployed workflows tested on testnet

### Frontend E2E
- [ ] Connect wallet
- [ ] World ID verification
- [ ] Browse and apply for property
- [ ] Complete lease signing
- [ ] Make payment

---

## 🚀 Deployment Checklist

### Smart Contracts (Sepolia)
- [ ] Contracts compiled without errors
- [ ] Deployed to Sepolia testnet
- [ ] Verified on Etherscan
- [ ] Contract addresses documented

**Contracts to Deploy**:
1. PropertyNFT
2. PaymentEscrow
3. WorldIDVerifier (with World ID contract address)
4. LeaseAgreement (with dependencies)
5. DisputeResolution

### CRE Workflows
- [ ] Workflows deployed to CRE network
- [ ] Connected to deployed contracts
- [ ] Tested with live transactions
- [ ] Logs/monitoring configured

### Frontend (Vercel)
- [ ] Environment variables set
- [ ] Deployed to production
- [ ] Contract addresses updated
- [ ] World ID App ID configured
- [ ] Live URL tested

### Backend (Railway)
- [ ] MongoDB Atlas connection
- [ ] Environment variables set
- [ ] Deployed and running
- [ ] Event indexer syncing
- [ ] API endpoints working

---

## 📹 Demo Video Checklist (3-5 minutes)

### Script Sections
- [ ] Problem statement (0:00-0:30)
- [ ] Solution overview (0:30-1:00)
- [ ] Property minting demo (1:00-1:30)
- [ ] World ID verification (1:30-2:15)
- [ ] CRE credit check (2:15-3:00)
- [ ] Automated rent + privacy (3:00-3:30)
- [ ] Impact & innovation (3:30-4:00)
- [ ] Technical highlights (4:00-4:30)
- [ ] Call to action (4:30-5:00)

### Production
- [ ] Screen recording tool ready (OBS/Loom)
- [ ] Script written and rehearsed
- [ ] Testnet transactions prepared
- [ ] Recording completed
- [ ] Edited and polished
- [ ] Captions added
- [ ] Uploaded to YouTube (unlisted)
- [ ] Link tested and accessible

---

## 📝 Documentation Checklist

### README.md
- [ ] Project description and value prop
- [ ] Problem statement
- [ ] Key features
- [ ] Architecture diagram
- [ ] Setup instructions
- [ ] Demo video link
- [ ] Deployed URLs
- [ ] Team/contact info

### ARCHITECTURE.md
- [ ] System overview
- [ ] Component descriptions
- [ ] Data flow diagrams
- [ ] Contract interactions
- [ ] Technology choices explained

### CHAINLINK.md (CRITICAL for judging)
- [ ] All CRE workflow files linked
- [ ] Workflow descriptions
- [ ] Simulation results
- [ ] Deployed workflow addresses
- [ ] How to verify integrations
- [ ] Why CRE was essential (vs regular contracts)

### DEPLOYMENT.md
- [ ] Prerequisites
- [ ] Environment setup
- [ ] Contract deployment steps
- [ ] CRE workflow deployment
- [ ] Frontend deployment
- [ ] Backend deployment
- [ ] Troubleshooting guide

### API.md
- [ ] Endpoint documentation
- [ ] Request/response examples
- [ ] Error codes
- [ ] Rate limits

---

## 🏆 Submission Checklist

### Prize Category: DeFi & Tokenization
- [ ] Submission form completed
- [ ] Emphasize RWA tokenization + lifecycle management
- [ ] Highlight automated rent collection
- [ ] Show complete working demo

**Key Points**:
- Property NFTs represent RWAs
- Complete lease lifecycle on-chain
- Automated payments via CRE
- Not just fractionalization - full operational management

### Prize Category: Privacy
- [ ] Submission form completed
- [ ] Emphasize Confidential HTTP + World ID + Private Transactions
- [ ] Show encrypted API keys
- [ ] Demonstrate private deposits

**Key Points**:
- World ID: identity without PII
- Confidential HTTP: API keys never on-chain
- Private transactions: deposit amounts hidden
- GDPR/compliance benefits

### Prize Category: World ID with CRE
- [ ] Submission form completed
- [ ] Show World ID extending to other chains via CRE
- [ ] Demonstrate proof verification
- [ ] Explain nullifier hash usage

**Key Points**:
- World ID for unique personhood
- CRE orchestrates multi-step verification
- Prevents Sybil attacks (same tenant, multiple applications)
- Privacy-preserving identity verification

### All Categories
- [ ] Public GitHub repository
- [ ] 3-5 minute video (publicly viewable)
- [ ] README links to all Chainlink files
- [ ] Working demo on testnet
- [ ] CRE simulation demonstrated

---

## ⚠️ Critical Success Factors

### Must-Haves (or project fails)
- [ ] At least 1 CRE workflow working (simulated + deployed)
- [ ] World ID integration functional (at least with simulator)
- [ ] Smart contracts deployed to testnet
- [ ] Demo video submitted
- [ ] Public GitHub repo

### High-Impact (2x chances of winning)
- [ ] 2 CRE workflows (credit + rent)
- [ ] Confidential HTTP working
- [ ] Polished UI/UX
- [ ] Comprehensive documentation
- [ ] Professional video production

### Differentiators (10x chances of winning)
- [ ] Novel approach (lifecycle vs just tokenization)
- [ ] All privacy features working
- [ ] Production-ready code quality
- [ ] Multi-chain capable architecture
- [ ] Strong business case (real market need)

---

## 🐛 Troubleshooting Quick Reference

### World ID Issues
- **Proof not verifying**: Check App ID, action ID match
- **Simulator not working**: Try different browser, clear cache
- **Nullifier collision**: Each user+action+appId = unique nullifier

### CRE Workflow Issues
- **Simulation fails**: Check CRE CLI version, dotenv loaded
- **Deployment issues**: Verify CRE API key, network config
- **Callback not working**: Check contract address in workflow config

### Contract Deployment Issues
- **Out of gas**: Increase gas limit in hardhat.config
- **Verification fails**: Wait 30s after deploy, check API key
- **Testnet ETH**: Use Sepolia faucet, Alchemy faucet

### Frontend Issues
- **Wallet not connecting**: Check WalletConnect project ID
- **Contract calls failing**: Verify contract addresses, ABI updated
- **World ID not loading**: Check app_id env variable

---

## 📊 Daily Progress Template

```
## Day X - [Date]

### ✅ Completed
- Task 1
- Task 2

### 🚧 In Progress
- Task 3

### ⏭️ Next
- Task 4
- Task 5

### 🔥 Blockers
- Issue: [description]
  - Solution: [how resolved]

### 💡 Learnings
- Key insight or decision made

### ⏱️ Time Spent
- Coding: X hours
- Testing: X hours
- Documentation: X hours
```

---

## 🎤 Elevator Pitch (30 seconds)

"ChainLease transforms real estate leasing with Web3. We tokenize properties as NFTs, verify tenants using World ID's zero-knowledge proofs, and automate credit checks and rent collection with Chainlink Runtime Environment. Security deposits are held in smart contract escrow, and all sensitive data is protected using Confidential HTTP. It's privacy-first, fully automated, and trustless—bringing a $600 billion market on-chain."

---

## 🚨 If Running Out of Time

### Priority 1 (Must Ship)
1. PropertyNFT + LeaseAgreement contracts
2. 1 CRE workflow (credit check)
3. World ID integration (even if just simulator)
4. Basic frontend (can apply for lease)
5. 3-minute demo video

### Cut If Needed
- Dispute resolution contract
- Backend services (use frontend only)
- Private transactions (document intent)
- Second CRE workflow
- Advanced UI features

### Emergency MVP (Last 48 Hours)
- Deploy existing contracts
- 1 working CRE workflow
- Minimal frontend with World ID
- 2-minute video showing core concept
- Clean GitHub repo with README

**Remember**: A working demo of core features beats incomplete ambitious plans!

---

**Last Updated**: February 11, 2026  
**Deadline**: March 1, 2026 (19 days remaining)

🚀 **Let's build ChainLease and make history!**
