// app/api/credit-check/verify/route.ts
// Credit check API endpoint

import { NextRequest, NextResponse } from 'next/server';

/**
 * Mock credit score database
 * In production, this would call Experian, Equifax, TransUnion, etc.
 */
const mockTenantData: Record<string, any> = {
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb': {
        creditScore: 720,
        riskLevel: 'low',
        paymentHistory: 'Excellent',
        debtToIncome: 0.28,
        bankruptcies: 0,
        evictions: 0,
    },
    '0x123': {
        creditScore: 580,
        riskLevel: 'high',
        paymentHistory: 'Poor',
        debtToIncome: 0.55,
        bankruptcies: 1,
        evictions: 2,
    },
    default: {
        creditScore: 650,
        riskLevel: 'medium',
        paymentHistory: 'Fair',
        debtToIncome: 0.35,
        bankruptcies: 0,
        evictions: 0,
    },
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { leaseId, tenantAddress, propertyId, timestamp } = body;

        // Validation
        if (!leaseId || !tenantAddress) {
            return NextResponse.json(
                { error: 'Missing required fields: leaseId, tenantAddress' },
                { status: 400 }
            );
        }

        console.log(`📋 Credit check requested for tenant: ${tenantAddress}`);

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Get mock data or use default
        const tenantData = mockTenantData[tenantAddress] || mockTenantData['default'];

        // Determine pass/fail based on score
        const MIN_CREDIT_SCORE = 620;
        const passed =
            tenantData.creditScore >= MIN_CREDIT_SCORE &&
            ['low', 'medium'].includes(tenantData.riskLevel);

        // Generate verification ID
        const verificationId = `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const response = {
            leaseId,
            tenantAddress,
            creditScore: tenantData.creditScore,
            passed,
            riskLevel: tenantData.riskLevel,
            verificationId,
            timestamp: timestamp || Date.now(),
            statusCode: 200,
            details: {
                paymentHistory: tenantData.paymentHistory,
                debtToIncome: tenantData.debtToIncome,
                bankruptcies: tenantData.bankruptcies,
                evictions: tenantData.evictions,
            },
        };

        console.log(`✅ Credit check completed: Score ${tenantData.creditScore}, ${passed ? 'PASSED' : 'FAILED'}`);

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in credit check:', error);
        return NextResponse.json({ error: 'Credit check failed' }, { status: 500 });
    }
}
