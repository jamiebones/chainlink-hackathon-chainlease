// app/api/users/register/route.ts
// User registration and profile management

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { walletAddress, email, name, phone, role } = body;

        // Validation
        if (!walletAddress || !email) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields: walletAddress, email',
                },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid email format',
                },
                { status: 400 }
            );
        }

        // Validate wallet address format
        const addressRegex = /^0x[a-fA-F0-9]{40}$/;
        if (!addressRegex.test(walletAddress)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid wallet address format',
                },
                { status: 400 }
            );
        }

        const db = await getDatabase();
        const users = db.collection('users');

        // Normalize address to lowercase for consistency
        const normalizedAddress = walletAddress.toLowerCase();

        // Check if email is already used by another address
        const existingEmail = await users.findOne({
            email: email.toLowerCase(),
            address: { $ne: normalizedAddress },
        });

        if (existingEmail) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Email already registered to another wallet address',
                },
                { status: 409 }
            );
        }

        // Upsert user document
        const result = await users.updateOne(
            { address: normalizedAddress },
            {
                $set: {
                    address: normalizedAddress,
                    email: email.toLowerCase(),
                    name: name || null,
                    phone: phone || null,
                    role: role || 'tenant',
                    updatedAt: new Date(),
                },
                $setOnInsert: {
                    createdAt: new Date(),
                    emailVerified: false,
                },
            },
            { upsert: true }
        );

        const user = await users.findOne({ address: normalizedAddress });

        console.log(`✅ User ${result.upsertedCount ? 'registered' : 'updated'}: ${normalizedAddress}`);

        return NextResponse.json({
            success: true,
            message: result.upsertedCount ? 'User registered successfully' : 'User updated successfully',
            user: {
                address: user!.address,
                email: user!.email,
                name: user!.name,
                phone: user!.phone,
                role: user!.role,
            },
        });
    } catch (error) {
        console.error('Error in user registration:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
            },
            { status: 500 }
        );
    }
}
