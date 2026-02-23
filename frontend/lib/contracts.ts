// lib/contracts.ts
// Smart contract integration utilities

import { createPublicClient, createWalletClient, custom, http, parseEther } from 'viem';
import { sepolia } from 'viem/chains';

// Contract addresses (update after deployment)
export const PROPERTY_NFT_ADDRESS = process.env.NEXT_PUBLIC_PROPERTY_NFT_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000000';
export const LEASE_AGREEMENT_ADDRESS = process.env.NEXT_PUBLIC_LEASE_AGREEMENT_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000000';
export const PAYMENT_ESCROW_ADDRESS = process.env.NEXT_PUBLIC_PAYMENT_ESCROW_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000000';

// PropertyNFT ABI
export const PROPERTY_NFT_ABI = [
    {
        inputs: [
            { name: 'tokenURI', type: 'string' },
            { name: 'propertyAddress', type: 'string' },
        ],
        name: 'mintProperty',
        outputs: [{ name: 'tokenId', type: 'uint256' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        name: 'getPropertyDetails',
        outputs: [
            { name: 'owner', type: 'address' },
            { name: 'tokenURI', type: 'string' },
            { name: 'propertyAddress', type: 'string' },
            { name: 'isActive', type: 'bool' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        name: 'ownerOf',
        outputs: [{ name: 'owner', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        name: 'tokenURI',
        outputs: [{ name: 'uri', type: 'string' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

// LeaseAgreement ABI (minimal)
export const LEASE_AGREEMENT_ABI = [
    {
        inputs: [
            { name: 'propertyId', type: 'uint256' },
            { name: 'tenant', type: 'address' },
            { name: 'rentAmount', type: 'uint256' },
            { name: 'depositAmount', type: 'uint256' },
            { name: 'leaseDuration', type: 'uint256' },
        ],
        name: 'createLease',
        outputs: [{ name: 'leaseId', type: 'uint256' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: 'leaseId', type: 'uint256' }],
        name: 'activateLease',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [{ name: 'leaseId', type: 'uint256' }],
        name: 'getLeaseDetails',
        outputs: [
            { name: 'propertyId', type: 'uint256' },
            { name: 'landlord', type: 'address' },
            { name: 'tenant', type: 'address' },
            { name: 'rentAmount', type: 'uint256' },
            { name: 'depositAmount', type: 'uint256' },
            { name: 'startDate', type: 'uint256' },
            { name: 'endDate', type: 'uint256' },
            { name: 'status', type: 'uint8' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

// PaymentEscrow ABI (minimal)
export const PAYMENT_ESCROW_ABI = [
    {
        inputs: [{ name: 'leaseId', type: 'uint256' }],
        name: 'makePayment',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [{ name: 'leaseId', type: 'uint256' }],
        name: 'getPaymentHistory',
        outputs: [
            {
                name: 'payments',
                type: 'tuple[]',
                components: [
                    { name: 'amount', type: 'uint256' },
                    { name: 'timestamp', type: 'uint256' },
                    { name: 'isLate', type: 'bool' },
                ],
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

// Get public client for reading blockchain data
export function getPublicClient() {
    return createPublicClient({
        chain: sepolia,
        transport: http(),
    });
}

// Get wallet client for writing to blockchain
export function getWalletClient() {
    if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('No Ethereum wallet detected');
    }

    return createWalletClient({
        chain: sepolia,
        transport: custom(window.ethereum),
    });
}

// Mint PropertyNFT
export async function mintPropertyNFT(
    walletClient: any,
    account: `0x${string}`,
    tokenURI: string,
    propertyAddress: string
): Promise<bigint> {
    try {
        const { request } = await walletClient.simulateContract({
            address: PROPERTY_NFT_ADDRESS,
            abi: PROPERTY_NFT_ABI,
            functionName: 'mintProperty',
            args: [tokenURI, propertyAddress],
            account,
        });

        const hash = await walletClient.writeContract(request);

        const publicClient = getPublicClient();
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        // Parse logs to get token ID
        // This is a simplified version - in production, use proper event parsing
        const tokenId = BigInt(Date.now()); // Placeholder

        return tokenId;
    } catch (error) {
        console.error('Error minting PropertyNFT:', error);
        throw error;
    }
}

// Get property details from blockchain
export async function getPropertyDetails(tokenId: bigint) {
    try {
        const publicClient = getPublicClient();

        const [owner, tokenURI, propertyAddress, isActive] = await publicClient.readContract({
            address: PROPERTY_NFT_ADDRESS,
            abi: PROPERTY_NFT_ABI,
            functionName: 'getPropertyDetails',
            args: [tokenId],
        }) as [string, string, string, boolean];

        return {
            owner: owner as `0x${string}`,
            tokenURI,
            propertyAddress,
            isActive,
        };
    } catch (error) {
        console.error('Error fetching property details:', error);
        throw error;
    }
}

// Create lease agreement
export async function createLease(
    walletClient: any,
    account: `0x${string}`,
    propertyId: bigint,
    tenant: `0x${string}`,
    rentAmount: bigint,
    depositAmount: bigint,
    leaseDuration: bigint
): Promise<bigint> {
    try {
        const { request } = await walletClient.simulateContract({
            address: LEASE_AGREEMENT_ADDRESS,
            abi: LEASE_AGREEMENT_ABI,
            functionName: 'createLease',
            args: [propertyId, tenant, rentAmount, depositAmount, leaseDuration],
            account,
        });

        const hash = await walletClient.writeContract(request);

        const publicClient = getPublicClient();
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        // Parse logs to get lease ID
        const leaseId = BigInt(Date.now()); // Placeholder

        return leaseId;
    } catch (error) {
        console.error('Error creating lease:', error);
        throw error;
    }
}

// Activate lease (tenant pays deposit)
export async function activateLease(
    walletClient: any,
    account: `0x${string}`,
    leaseId: bigint,
    depositAmount: bigint
): Promise<string> {
    try {
        const hash = await walletClient.writeContract({
            address: LEASE_AGREEMENT_ADDRESS,
            abi: LEASE_AGREEMENT_ABI,
            functionName: 'activateLease',
            args: [leaseId],
            account,
            value: depositAmount,
        });

        const publicClient = getPublicClient();
        await publicClient.waitForTransactionReceipt({ hash });

        return hash;
    } catch (error) {
        console.error('Error activating lease:', error);
        throw error;
    }
}

// Make rent payment
export async function makeRentPayment(
    walletClient: any,
    account: `0x${string}`,
    leaseId: bigint,
    amount: bigint
): Promise<string> {
    try {
        const hash = await walletClient.writeContract({
            address: PAYMENT_ESCROW_ADDRESS,
            abi: PAYMENT_ESCROW_ABI,
            functionName: 'makePayment',
            args: [leaseId],
            account,
            value: amount,
        });

        const publicClient = getPublicClient();
        await publicClient.waitForTransactionReceipt({ hash });

        return hash;
    } catch (error) {
        console.error('Error making payment:', error);
        throw error;
    }
}

// Get lease details
export async function getLeaseDetails(leaseId: bigint) {
    try {
        const publicClient = getPublicClient();

        const [
            propertyId,
            landlord,
            tenant,
            rentAmount,
            depositAmount,
            startDate,
            endDate,
            status,
        ] = await publicClient.readContract({
            address: LEASE_AGREEMENT_ADDRESS,
            abi: LEASE_AGREEMENT_ABI,
            functionName: 'getLeaseDetails',
            args: [leaseId],
        }) as [bigint, string, string, bigint, bigint, bigint, bigint, number];

        return {
            propertyId,
            landlord: landlord as `0x${string}`,
            tenant: tenant as `0x${string}`,
            rentAmount,
            depositAmount,
            startDate,
            endDate,
            status,
        };
    } catch (error) {
        console.error('Error fetching lease details:', error);
        throw error;
    }
}
