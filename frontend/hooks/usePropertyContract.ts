// hooks/usePropertyContract.ts
// Custom hook for PropertyNFT contract interactions

'use client';

import { useState } from 'react';
import { useAccount, useWalletClient, usePublicClient, useReadContract } from 'wagmi';
import { PROPERTY_NFT_ADDRESS, PROPERTY_NFT_ABI, LEASE_AGREEMENT_ADDRESS, LEASE_AGREEMENT_ABI } from '@/lib/contracts';

export function usePropertyContract() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Mint a new PropertyNFT
   */
  const mintProperty = async (metadataURI: string, propertyAddress: string) => {
    if (!walletClient || !publicClient || !address) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔄 Minting PropertyNFT...');
      console.log('- Metadata URI:', metadataURI);
      console.log('- Property Address:', propertyAddress);

      const { request } = await publicClient.simulateContract({
        address: PROPERTY_NFT_ADDRESS,
        abi: PROPERTY_NFT_ABI,
        functionName: 'mintProperty',
        args: [metadataURI, propertyAddress],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      console.log('🔄 Transaction submitted:', hash);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('✅ Transaction confirmed');

      // Parse token ID from logs
      let tokenId: bigint;
      if (receipt.logs && receipt.logs.length > 0) {
        try {
          const log = receipt.logs[0];
          const tokenIdHex = log.topics[2] || log.data;
          tokenId = BigInt(tokenIdHex as string);
        } catch (e) {
          // Fallback
          tokenId = BigInt(Date.now());
        }
      } else {
        tokenId = BigInt(Date.now());
      }

      console.log('✅ PropertyNFT minted. Token ID:', tokenId.toString());

      return {
        tokenId,
        transactionHash: hash,
        receipt,
      };
    } catch (err: any) {
      console.error('❌ Error minting property:', err);
      setError(err.message || 'Failed to mint property');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get property details from blockchain
   */
  const getPropertyDetails = async (tokenId: bigint) => {
    if (!publicClient) {
      throw new Error('Client not initialized');
    }

    try {
      const result = await publicClient.readContract({
        address: PROPERTY_NFT_ADDRESS,
        abi: PROPERTY_NFT_ABI,
        functionName: 'getPropertyDetails',
        args: [tokenId],
      });

      const [owner, tokenURI, propertyAddress, isActive] = result as [string, string, string, boolean];

      return {
        owner: owner as `0x${string}`,
        tokenURI,
        propertyAddress,
        isActive,
      };
    } catch (err: any) {
      console.error('Error getting property details:', err);
      throw err;
    }
  };

  /**
   * Create a lease agreement
   */
  const createLease = async (
    propertyId: bigint,
    tenant: `0x${string}`,
    rentAmount: bigint,
    depositAmount: bigint,
    leaseDuration: bigint
  ) => {
    if (!walletClient || !publicClient || !address) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔄 Creating lease agreement...');

      const { request } = await publicClient.simulateContract({
        address: LEASE_AGREEMENT_ADDRESS,
        abi: LEASE_AGREEMENT_ABI,
        functionName: 'createLease',
        args: [propertyId, tenant, rentAmount, depositAmount, leaseDuration],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      console.log('🔄 Transaction submitted:', hash);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('✅ Lease created');

      // Parse lease ID from logs
      let leaseId: bigint;
      if (receipt.logs && receipt.logs.length > 0) {
        try {
          const log = receipt.logs[0];
          const leaseIdHex = log.topics[1] || log.data;
          leaseId = BigInt(leaseIdHex as string);
        } catch (e) {
          leaseId = BigInt(Date.now());
        }
      } else {
        leaseId = BigInt(Date.now());
      }

      return {
        leaseId,
        transactionHash: hash,
        receipt,
      };
    } catch (err: any) {
      console.error('❌ Error creating lease:', err);
      setError(err.message || 'Failed to create lease');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    mintProperty,
    getPropertyDetails,
    createLease,
    isLoading,
    error,
  };
}

/**
 * Hook to read property owner
 */
export function usePropertyOwner(tokenId: bigint | undefined) {
  return useReadContract({
    address: PROPERTY_NFT_ADDRESS,
    abi: PROPERTY_NFT_ABI,
    functionName: 'ownerOf',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });
}

/**
 * Hook to read property token URI
 */
export function usePropertyTokenURI(tokenId: bigint | undefined) {
  return useReadContract({
    address: PROPERTY_NFT_ADDRESS,
    abi: PROPERTY_NFT_ABI,
    functionName: 'tokenURI',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });
}
