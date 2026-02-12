// abi.ts
// Contract ABIs and event signatures for ChainLease workflows

import { parseAbi } from "viem";

/**
 * ABI for the LeaseCreated event that triggers the credit check workflow
 */
export const leaseCreatedEventAbi = parseAbi([
    "event LeaseCreated(uint256 indexed leaseId, uint256 indexed propertyId, address indexed tenant, uint256 monthlyRent)"
]);

/**
 * Event signature for computing the event topic hash
 */
export const LEASE_CREATED_SIGNATURE = "LeaseCreated(uint256,uint256,address,uint256)";

/**
 * ABI for LeaseAgreement contract function interactions
 */
export const leaseAgreementAbi = parseAbi([
    "function updateCreditCheckStatus(uint256 leaseId, bool passed) external",
    "function getLease(uint256 leaseId) external view returns (tuple(uint256 leaseId, uint256 propertyId, address landlord, address tenant, uint256 monthlyRent, uint256 securityDeposit, uint256 startDate, uint256 endDate, uint256 duration, uint8 state, bytes32 worldIdNullifierHash, bool creditCheckPassed, uint256 lastPaymentDate, uint256 createdAt))",
]);
