// app/api/properties/upload-images/route.ts
// Image upload to IPFS

import { NextRequest, NextResponse } from 'next/server';
import { getIPFSService } from '@/lib/ipfs';

/**
 * POST /api/properties/upload-images
 * Upload multiple images to IPFS
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const files = formData.getAll('images') as File[];

        if (!files || files.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No images provided' },
                { status: 400 }
            );
        }

        // Validate file types
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        for (const file of files) {
            if (!allowedTypes.includes(file.type)) {
                return NextResponse.json(
                    { success: false, error: `Invalid file type: ${file.type}. Only JPEG, PNG, and WebP are allowed.` },
                    { status: 400 }
                );
            }
        }

        // Validate file sizes (max 10MB per image)
        const maxSize = 10 * 1024 * 1024; // 10MB
        for (const file of files) {
            if (file.size > maxSize) {
                return NextResponse.json(
                    { success: false, error: `File ${file.name} exceeds 10MB limit` },
                    { status: 400 }
                );
            }
        }

        const ipfs = getIPFSService();

        // Upload images to IPFS
        const uploadPromises = files.map(async (file, index) => {
            try {
                const cid = await ipfs.uploadFile(file, file.name);
                return {
                    cid,
                    url: ipfs.getGatewayURL(cid),
                    description: formData.get(`descriptions[${index}]`) as string || '',
                    isPrimary: index === 0, // First image is primary by default
                };
            } catch (error) {
                console.error(`Failed to upload ${file.name}:`, error);
                throw error;
            }
        });

        const images = await Promise.all(uploadPromises);

        return NextResponse.json({
            success: true,
            data: images,
        });
    } catch (error: any) {
        console.error('Image upload error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to upload images', message: error.message },
            { status: 500 }
        );
    }
}

