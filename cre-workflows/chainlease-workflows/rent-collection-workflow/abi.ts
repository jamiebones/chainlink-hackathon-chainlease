// abi.ts
// LeaseAgreement contract ABI for rent collection workflow

import { parseAbi } from "viem";

/**
 * LeaseAgreement contract ABI
 * Includes only the functions needed for rent collection monitoring
 */
export const leaseAgreementAbi = parseAbi([
    // Get all active lease IDs
    "function getActiveLeases() view returns (uint256[])",

    // Check if specific lease is overdue
    "function isPaymentOverdue(uint256 leaseId) view returns (bool)",

    // Get detailed lease information
    "function getLease(uint256 leaseId) view returns (tuple(uint256 leaseId, uint256 propertyId, address landlord, address tenant, uint256 monthlyRent, uint256 securityDeposit, uint256 startDate, uint256 endDate, uint256 duration, uint8 state, bytes32 worldIdNullifierHash, bool creditCheckPassed, string verificationId, uint256 lastPaymentDate, uint256 createdAt))",

    // Record payment (for potential future onchain write capability)
    "function recordPayment(uint256 leaseId)",
]);

/**
 * Function names as constants for type safety
 */
export const FUNCTION_NAMES = {
    GET_ACTIVE_LEASES: "getActiveLeases",
    IS_PAYMENT_OVERDUE: "isPaymentOverdue",
    GET_LEASE: "getLease",
    RECORD_PAYMENT: "recordPayment",
} as const;
