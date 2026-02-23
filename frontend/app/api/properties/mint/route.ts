// app/api/properties/mint/route.ts
// Mint PropertyNFT and create listing

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { sepolia } from 'viem/chains';
import { getIPFSService } from '@/lib/ipfs';
import { PropertyMetadata, metadataSchema } from '@/types/property';

const PROPERTY_NFT_ADDRESS = process.env.NEXT_PUBLIC_PROPERTY_NFT_ADDRESS as `0x${string}`;

// PropertyNFT ABI (minimal)
const PROPERTY_NFT_ABI = [
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
] as const;

/**
 * POST /api/properties/mint
 * Upload metadata to IPFS and mint PropertyNFT
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        // Extract form data
        const metadataJson = formData.get('metadata') as string;
        const owner = formData.get('owner') as string;
        const images = formData.getAll('images') as File[];

        if (!metadataJson || !owner || images.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Validate owner address
        if (!/^0x[a-fA-F0-9]{40}$/.test(owner)) {
            return NextResponse.json(
                { success: false, error: 'Invalid owner address' },
                { status: 400 }
            );
        }

        // Parse metadata
        const metadata = JSON.parse(metadataJson);

        // Validate metadata with Zod
        const validatedMetadata = metadataSchema.parse(metadata);

        const ipfs = getIPFSService();

        // Step 1: Upload images to IPFS
        console.log(`Uploading ${images.length} images to IPFS...`);
        const imageUploads = await Promise.all(
            images.map(async (file, index) => {
                const cid = await ipfs.uploadFile(file, file.name);
                return {
                    cid,
                    url: ipfs.getGatewayURL(cid),
                    description: metadata.images?.[index]?.description || '',
                    isPrimary: index === 0,
                };
            })
        );

        // Step 2: Create complete metadata with image CIDs
        const completeMetadata: PropertyMetadata = {
            ...validatedMetadata,
            images: imageUploads,
        };

        // Step 3: Upload metadata JSON to IPFS
        console.log('Uploading metadata to IPFS...');
        const metadataCID = await ipfs.uploadJSON(
            completeMetadata,
            `property-${Date.now()}-metadata.json`
        );

        const metadataURI = `ipfs://${metadataCID}`;
        const propertyAddressString = `${completeMetadata.address.street}, ${completeMetadata.address.city}, ${completeMetadata.address.state}`;

        // Step 4: Return metadata for frontend to mint NFT
        // (The actual minting will be done by the frontend using user's wallet)
        return NextResponse.json({
            success: true,
            data: {
                metadataURI,
                metadataCID,
                metadata: completeMetadata,
                propertyAddress: propertyAddressString,
                gatewayURL: ipfs.getGatewayURL(metadataCID),
            },
        });
    } catch (error: any) {
        console.error('Property minting error:', error);

        if (error.name === 'ZodError') {
            return NextResponse.json(
                { success: false, error: 'Invalid metadata', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Failed to prepare property for minting', message: error.message },
            { status: 500 }
        );
    }
}
