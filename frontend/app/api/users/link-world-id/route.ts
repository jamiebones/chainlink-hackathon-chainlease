// app/api/users/link-world-id/route.ts
// Link World ID verification to user account

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { walletAddress, nullifier_hash } = body;

        if (!walletAddress || !nullifier_hash) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields',
                },
                { status: 400 }
            );
        }

        const db = await getDatabase();
        const users = db.collection('users');

        const normalizedAddress = walletAddress.toLowerCase();

        // Check if this World ID is already linked to another account
        const existingLink = await users.findOne({
            worldIdNullifier: nullifier_hash,
            address: { $ne: normalizedAddress },
        });

        if (existingLink) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'This World ID is already linked to another account',
                },
                { status: 409 }
            );
        }

        // Update user with World ID verification
        const result = await users.updateOne(
            { address: normalizedAddress },
            {
                $set: {
                    worldIdNullifier: nullifier_hash,
                    worldIdVerified: true,
                    worldIdVerifiedAt: new Date(),
                },
            },
            { upsert: true }
        );

        console.log(`✅ World ID linked to user: ${normalizedAddress}`);

        return NextResponse.json({
            success: true,
            message: 'World ID linked successfully',
        });
    } catch (error) {
        console.error('Error linking World ID:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
            },
            { status: 500 }
        );
    }
}
