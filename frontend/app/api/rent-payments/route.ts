// app/api/rent-payments/route.ts
// Rent payment recording API

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { leaseId, tenant, amount, lateFee, transactionHash, timestamp, status } = body;

        // Validation
        if (!leaseId || !tenant || !amount || !transactionHash || !timestamp || !status) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields',
                    required: ['leaseId', 'tenant', 'amount', 'transactionHash', 'timestamp', 'status'],
                },
                { status: 400 }
            );
        }

        // Validate status enum
        if (!['success', 'failed', 'late'].includes(status)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid status. Must be: success, failed, or late',
                },
                { status: 400 }
            );
        }

        const db = await getDatabase();
        const rentPaymentsCollection = db.collection('rentPayments');

        // Create rent payment record
        const rentPayment = {
            leaseId,
            tenant: tenant.toLowerCase(),
            amount,
            lateFee: lateFee || '0',
            totalAmount: (BigInt(amount) + BigInt(lateFee || '0')).toString(),
            transactionHash,
            timestamp: new Date(parseInt(timestamp) * 1000),
            status,
            recordedAt: new Date(),
        };

        // Insert into database
        const result = await rentPaymentsCollection.insertOne(rentPayment);

        console.log(`✅ Rent payment recorded for lease ${leaseId}: ${status}`);

        if (status === 'late') {
            console.log(`⚠️ Late payment for lease ${leaseId} - sending notification`);
        }

        return NextResponse.json(
            {
                success: true,
                message: 'Rent payment recorded successfully',
                paymentId: result.insertedId.toString(),
                data: {
                    leaseId,
                    status,
                    transactionHash,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error recording rent payment:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
            },
            { status: 500 }
        );
    }
}
