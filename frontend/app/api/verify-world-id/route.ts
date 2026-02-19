// app/api/verify-world-id/route.ts
// World ID verification endpoint

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

interface WorldIDProof {
    merkle_root: string;
    nullifier_hash: string;
    proof: string;
    verification_level: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: WorldIDProof = await request.json();
        const { merkle_root, nullifier_hash, proof, verification_level } = body;

        // Validation
        if (!merkle_root || !nullifier_hash || !proof) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields',
                },
                { status: 400 }
            );
        }

        // Verify with World ID API
        const appId = process.env.WORLDCOIN_APP_ID;
        const actionId = process.env.WORLDCOIN_ACTION_ID || 'verify-tenant';

        if (!appId) {
            console.error('WORLDCOIN_APP_ID not configured');
            return NextResponse.json(
                {
                    success: false,
                    error: 'World ID not configured',
                },
                { status: 500 }
            );
        }

        // Call World ID verification API
        const verifyResponse = await fetch(
            `https://developer.worldcoin.org/api/v1/verify/${appId}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    merkle_root,
                    nullifier_hash,
                    proof,
                    verification_level,
                    action: actionId,
                }),
            }
        );

        if (!verifyResponse.ok) {
            const error = await verifyResponse.json();
            console.error('World ID verification failed:', error);
            return NextResponse.json(
                {
                    success: false,
                    error: 'World ID verification failed',
                    details: error,
                },
                { status: 400 }
            );
        }

        const verifyData = await verifyResponse.json();

        if (!verifyData.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid World ID proof',
                },
                { status: 400 }
            );
        }

        // Store verification in database
        const db = await getDatabase();
        const verifications = db.collection('worldIdVerifications');

        // Check if nullifier hash already used
        const existing = await verifications.findOne({ nullifier_hash });
        if (existing) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'This World ID has already been used',
                },
                { status: 409 }
            );
        }

        // Save verification
        await verifications.insertOne({
            nullifier_hash,
            merkle_root,
            verification_level,
            verified_at: new Date(),
            action: actionId,
        });

        console.log(`✅ World ID verified: ${nullifier_hash}`);

        return NextResponse.json({
            success: true,
            message: 'World ID verified successfully',
            nullifier_hash,
            verification_level,
        });
    } catch (error) {
        console.error('Error verifying World ID:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
            },
            { status: 500 }
        );
    }
}
