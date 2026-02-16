// abi.ts
// LeaseActivated event ABI and signature

import { keccak256, toHex } from "viem";

/**
 * LeaseActivated event ABI
 * Emitted when a landlord activates a lease after credit check approval
 */
export const leaseActivatedEventAbi = [
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                name: "leaseId",
                type: "uint256",
            },
            {
                indexed: true,
                name: "tenant",
                type: "address",
            },
            {
                indexed: true,
                name: "landlord",
                type: "address",
            },
            {
                indexed: false,
                name: "propertyId",
                type: "uint256",
            },
            {
                indexed: false,
                name: "startDate",
                type: "uint256",
            },
            {
                indexed: false,
                name: "endDate",
                type: "uint256",
            },
            {
                indexed: false,
                name: "monthlyRent",
                type: "uint256",
            },
        ],
        name: "LeaseActivated",
        type: "event",
    },
] as const;

/**
 * Compute the LeaseActivated event signature hash
 * Used to filter logs in the workflow trigger
 */
export const LEASE_ACTIVATED_SIGNATURE = keccak256(
    toHex("LeaseActivated(uint256,address,address,uint256,uint256,uint256,uint256)")
);
