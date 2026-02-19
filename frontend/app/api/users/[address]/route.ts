// app/api/users/[address]/route.ts
// Get user by wallet address

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: { address: string } }
) {
    try {
        const db = await getDatabase();
        const users = db.collection('users');

        const normalizedAddress = params.address.toLowerCase();
        const user = await users.findOne({ address: normalizedAddress });

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User not found',
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            user: {
                address: user.address,
                email: user.email,
                name: user.name,
                phone: user.phone,
                role: user.role,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
            },
            { status: 500 }
        );
    }
}
