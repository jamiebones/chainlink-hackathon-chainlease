/**
 * ABI for LeaseAgreement Contract
 * Contains functions for reading lease data and state
 */
export const LEASE_AGREEMENT_ABI = [
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "leaseId",
                "type": "uint256"
            }
        ],
        "name": "leases",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "leaseId",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "propertyId",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "landlord",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "tenant",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "monthlyRent",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "securityDeposit",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "startDate",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "endDate",
                "type": "uint256"
            },
            {
                "internalType": "enum LeaseAgreement.LeaseState",
                "name": "state",
                "type": "uint8"
            },
            {
                "internalType": "bytes32",
                "name": "worldIdNullifierHash",
                "type": "bytes32"
            },
            {
                "internalType": "bool",
                "name": "creditCheckPassed",
                "type": "bool"
            },
            {
                "internalType": "uint256",
                "name": "lastPaymentDate",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getActiveLeases",
        "outputs": [
            {
                "internalType": "uint256[]",
                "name": "",
                "type": "uint256[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "leaseId",
                "type": "uint256"
            }
        ],
        "name": "recordRentPayment",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;

/**
 * ABI for PaymentEscrow Contract
 * Handles rent payments and late fees
 */
export const PAYMENT_ESCROW_ABI = [
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "leaseId",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "tenant",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "landlord",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "lateFee",
                "type": "uint256"
            }
        ],
        "name": "collectRent",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "leaseId",
                "type": "uint256"
            }
        ],
        "name": "getPaymentHistory",
        "outputs": [
            {
                "internalType": "uint256[]",
                "name": "",
                "type": "uint256[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "leaseId",
                "type": "uint256"
            }
        ],
        "name": "recordPayment",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "leaseId",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "tenant",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "RentPaid",
        "type": "event"
    }
] as const;
