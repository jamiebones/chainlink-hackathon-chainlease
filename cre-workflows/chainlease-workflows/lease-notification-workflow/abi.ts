// abi.ts
// LeaseActivated event ABI and signature

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
 * LeaseActivated event signature string
 * Hash will be computed in main.ts using keccak256
 */
export const LEASE_ACTIVATED_SIGNATURE = "LeaseActivated(uint256,address,address,uint256,uint256,uint256,uint256)";
