// app/api/rent-payments/[leaseId]/route.ts
// Get payment history for a specific lease

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: { leaseId: string } }
) {
    try {
        const db = await getDatabase();
        const rentPaymentsCollection = db.collection('rentPayments');

        const payments = await rentPaymentsCollection
            .find({ leaseId: params.leaseId })
            .sort({ timestamp: -1 })
            .toArray();

        return NextResponse.json({
            success: true,
            leaseId: params.leaseId,
            count: payments.length,
            payments: payments.map((p) => ({
                id: p._id.toString(),
                leaseId: p.leaseId,
                tenant: p.tenant,
                amount: p.amount,
                lateFee: p.lateFee,
                totalAmount: p.totalAmount,
                transactionHash: p.transactionHash,
                timestamp: p.timestamp,
                status: p.status,
                recordedAt: p.recordedAt,
            })),
        });
    } catch (error) {
        console.error('Error fetching payment history:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
            },
            { status: 500 }
        );
    }
}
