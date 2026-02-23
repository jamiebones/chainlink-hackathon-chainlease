// app/api/credit-check/verify/route.ts
// Simple Mock Credit Check API for CRE (Chainlink Runtime Environment) Demo

import { NextRequest, NextResponse } from 'next/server';

/**
 * Mock User Database
 * Pre-defined users with credit scores for CRE demo
 * 
 * REAL CREDIT CHECK LOOKUP METRICS:
 * ================================
 * Primary Identifiers (used by Equifax, Experian, TransUnion):
 * 1. SSN (Social Security Number) - PRIMARY KEY in US
 * 2. Full Name (First, Middle, Last)
 * 3. Date of Birth
 * 4. Current Address (Street, City, State, ZIP)
 * 
 * Secondary Identifiers:
 * - Previous addresses (last 2-5 years)
 * - Phone number
 * - Email address (newer bureaus)
 * 
 * The bureaus match using a combination of these to ensure accurate identity verification.
 * Typically: SSN + Name + DOB + Address
 */
interface MockUser {
    name: string;
    ssnLast4: string;
    dateOfBirth: string;
    creditScore: number;
    passed: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    paymentHistory: string;
    debtToIncome: number;
    bankruptcies: number;
    evictions: number;
}

const MOCK_USERS: MockUser[] = [
    {
        name: 'Alice Johnson',
        ssnLast4: '1234',
        dateOfBirth: '1990-05-15',
        creditScore: 780,
        passed: true,
        riskLevel: 'low',
        paymentHistory: 'Excellent - 100% on-time payments',
        debtToIncome: 22,
        bankruptcies: 0,
        evictions: 0,
    },
    {
        name: 'Bob Smith',
        ssnLast4: '2345',
        dateOfBirth: '1988-08-22',
        creditScore: 720,
        passed: true,
        riskLevel: 'low',
        paymentHistory: 'Good - 98% on-time payments',
        debtToIncome: 28,
        bankruptcies: 0,
        evictions: 0,
    },
    {
        name: 'Carol Martinez',
        ssnLast4: '3456',
        dateOfBirth: '1992-03-10',
        creditScore: 680,
        passed: true,
        riskLevel: 'medium',
        paymentHistory: 'Good - 95% on-time payments',
        debtToIncome: 35,
        bankruptcies: 0,
        evictions: 0,
    },
    {
        name: 'David Lee',
        ssnLast4: '4567',
        dateOfBirth: '1985-11-30',
        creditScore: 640,
        passed: true,
        riskLevel: 'medium',
        paymentHistory: 'Fair - 88% on-time payments',
        debtToIncome: 40,
        bankruptcies: 0,
        evictions: 0,
    },
    {
        name: 'Emma Wilson',
        ssnLast4: '5678',
        dateOfBirth: '1995-07-18',
        creditScore: 750,
        passed: true,
        riskLevel: 'low',
        paymentHistory: 'Excellent - 99% on-time payments',
        debtToIncome: 25,
        bankruptcies: 0,
        evictions: 0,
    },
    {
        name: 'Frank Brown',
        ssnLast4: '6789',
        dateOfBirth: '1982-12-05',
        creditScore: 590,
        passed: false,
        riskLevel: 'high',
        paymentHistory: 'Fair - 82% on-time payments',
        debtToIncome: 48,
        bankruptcies: 0,
        evictions: 1,
    },
    {
        name: 'Grace Taylor',
        ssnLast4: '7890',
        dateOfBirth: '1993-09-25',
        creditScore: 800,
        passed: true,
        riskLevel: 'low',
        paymentHistory: 'Excellent - 100% on-time payments',
        debtToIncome: 18,
        bankruptcies: 0,
        evictions: 0,
    },
    {
        name: 'Henry Davis',
        ssnLast4: '8901',
        dateOfBirth: '1980-04-12',
        creditScore: 550,
        passed: false,
        riskLevel: 'high',
        paymentHistory: 'Poor - 75% on-time payments',
        debtToIncome: 52,
        bankruptcies: 1,
        evictions: 0,
    },
    {
        name: 'Iris Anderson',
        ssnLast4: '9012',
        dateOfBirth: '1991-06-08',
        creditScore: 710,
        passed: true,
        riskLevel: 'low',
        paymentHistory: 'Good - 96% on-time payments',
        debtToIncome: 30,
        bankruptcies: 0,
        evictions: 0,
    },
    {
        name: 'Jack Robinson',
        ssnLast4: '0123',
        dateOfBirth: '1987-01-20',
        creditScore: 620,
        passed: true,
        riskLevel: 'medium',
        paymentHistory: 'Fair - 90% on-time payments',
        debtToIncome: 42,
        bankruptcies: 0,
        evictions: 0,
    },
];

/**
 * Simple lookup function - finds user by SSN last 4 digits
 * In real credit checks, this would use full SSN + name + DOB + address
 */
function lookupUser(ssnLast4: string): MockUser | null {
    return MOCK_USERS.find(user => user.ssnLast4 === ssnLast4) || null;
}

/**
 * POST /api/credit-check/verify
 * Called by CRE workflow with: { leaseId, propertyId, tenantAddress, ssnLast4 }
 * Returns pre-defined credit score from mock database
 * 
 * Note: tenantAddress is only used for blockchain linking, 
 * actual credit lookup uses SSN (like real credit bureaus)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { leaseId, propertyId, tenantAddress, ssnLast4 } = body;

        if (!ssnLast4) {
            return NextResponse.json({
                leaseId: leaseId?.toString() || '0',
                tenantAddress: tenantAddress || '',
                creditScore: 0,
                passed: false,
                riskLevel: 'high',
                verificationId: 'error_no_ssn',
                statusCode: 400,
                details: {
                    paymentHistory: 'SSN required for credit check',
                    debtToIncome: 0,
                    bankruptcies: 0,
                    evictions: 0,
                },
            }, { status: 400 });
        }

        console.log(`📋 Credit check requested for SSN: ***-**-${ssnLast4}`);

        // Lookup user in mock database by SSN (like real credit bureaus)
        const user = lookupUser(ssnLast4);

        if (!user) {
            console.log(`❌ No credit history found for SSN: ***-**-${ssnLast4}`);
            return NextResponse.json({
                leaseId: leaseId?.toString() || '0',
                tenantAddress,
                creditScore: 0,
                passed: false,
                riskLevel: 'high',
                verificationId: `verify_notfound_${Date.now()}`,
                statusCode: 200,
                details: {
                    paymentHistory: 'No credit history found',
                    debtToIncome: 0,
                    bankruptcies: 0,
                    evictions: 0,
                },
            });
        }

        // Return pre-defined credit data
        const response = {
            leaseId: leaseId?.toString() || '0',
            tenantAddress,
            creditScore: user.creditScore,
            passed: user.passed,
            riskLevel: user.riskLevel,
            verificationId: `verify_${Date.now()}_${user.ssnLast4}`,
            statusCode: 200,
            details: {
                paymentHistory: user.paymentHistory,
                debtToIncome: user.debtToIncome,
                bankruptcies: user.bankruptcies,
                evictions: user.evictions,
            },
        };

        console.log(`✅ Credit check completed for ${user.name}`);
        console.log(`   Score: ${user.creditScore} | Risk: ${user.riskLevel} | Passed: ${user.passed}`);

        return NextResponse.json(response);

    } catch (error: any) {
        console.error('❌ Error in credit check:', error);
        return NextResponse.json(
            {
                leaseId: '0',
                tenantAddress: '',
                creditScore: 0,
                passed: false,
                riskLevel: 'high',
                verificationId: 'error',
                statusCode: 500,
                details: {
                    paymentHistory: 'Error processing request',
                    debtToIncome: 0,
                    bankruptcies: 0,
                    evictions: 0,
                },
            },
            { status: 500 }
        );
    }
}

/**
 * Mock mapping of tenant addresses to SSN last 4 for CRE simulation
 * In production, this would be done through proper KYC/identity verification
 */
const TENANT_ADDRESS_TO_SSN: Record<string, string> = {
    '0x70997970C51812dc3A010C7d01b50e0d17dc79C8': '1234', // Alice - High score
    '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC': '2345', // Bob - Good score
    '0x90F79bf6EB2c4f870365E785982E1f101E93b906': '3456', // Carol - Medium
    '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65': '4567', // David - Medium
    '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc': '5678', // Emma - High
    '0x976EA74026E726554dB657fA54763abd0C3a0aa9': '6789', // Frank - Fail
    '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955': '7890', // Grace - Excellent
    '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f': '8901', // Henry - Fail
    '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720': '9012', // Iris - Good
    '0xBcd4042DE499D14e55001CcbB24a551F3b954096': '0123', // Jack - Medium
};

/**
 * GET /api/credit-check/verify
 * Supports two modes:
 * 1. With ?tenantAddress=0x... - Returns credit check for specific tenant (CRE simulation)
 * 2. Without params - Lists all mock users (debugging)
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const tenantAddress = searchParams.get('tenantAddress');

    // Mode 1: Credit check for specific tenant (CRE workflow simulation)
    if (tenantAddress) {
        console.log(`📋 GET Credit check requested for tenant: ${tenantAddress}`);

        const ssnLast4 = TENANT_ADDRESS_TO_SSN[tenantAddress];

        if (!ssnLast4) {
            console.log(`⚠️  No SSN mapping found for address: ${tenantAddress} - Using default passing score for testing`);
            return NextResponse.json({
                leaseId: '0',
                tenantAddress,
                creditScore: 720,
                passed: true,
                riskLevel: 'low',
                verificationId: `verify_default_${Date.now()}`,
                statusCode: 200,
                details: {
                    paymentHistory: 'Default passing score for testing',
                    debtToIncome: 25,
                    bankruptcies: 0,
                    evictions: 0,
                },
            });
        }

        const user = lookupUser(ssnLast4);

        if (!user) {
            console.log(`⚠️  No user found for SSN: ***-**-${ssnLast4} - Using default passing score for testing`);
            return NextResponse.json({
                leaseId: '0',
                tenantAddress,
                creditScore: 720,
                passed: true,
                riskLevel: 'low',
                verificationId: `verify_default_${Date.now()}`,
                statusCode: 200,
                details: {
                    paymentHistory: 'Default passing score for testing',
                    debtToIncome: 25,
                    bankruptcies: 0,
                    evictions: 0,
                },
            });
        }

        const response = {
            leaseId: '0',
            tenantAddress,
            creditScore: user.creditScore,
            passed: user.passed,
            riskLevel: user.riskLevel,
            verificationId: `verify_${Date.now()}_${user.ssnLast4}`,
            statusCode: 200,
            details: {
                paymentHistory: user.paymentHistory,
                debtToIncome: user.debtToIncome,
                bankruptcies: user.bankruptcies,
                evictions: user.evictions,
            },
        };

        console.log(`✅ Credit check completed for ${user.name}`);
        console.log(`   Score: ${user.creditScore} | Risk: ${user.riskLevel} | Passed: ${user.passed}`);

        return NextResponse.json(response);
    }

    // Mode 2: List all mock users (debugging)
    return NextResponse.json({
        success: true,
        message: 'Mock Credit Check Database - Lookup by SSN Last 4',
        info: {
            lookupMethod: 'SSN Last 4 digits (like real credit bureaus)',
            realCreditCheckMetrics: [
                '1. SSN (Social Security Number) - PRIMARY',
                '2. Full Name (First, Middle, Last)',
                '3. Date of Birth',
                '4. Current Address',
                '5. Previous Addresses (2-5 years)',
                '6. Phone Number',
                '7. Email (modern bureaus)',
            ],
            tenantAddressMappings: Object.keys(TENANT_ADDRESS_TO_SSN).length + ' addresses mapped for CRE simulation',
        },
        users: MOCK_USERS.map(user => ({
            name: user.name,
            ssnLast4: user.ssnLast4,
            dateOfBirth: user.dateOfBirth,
            creditScore: user.creditScore,
            passed: user.passed,
            riskLevel: user.riskLevel,
        })),
    });
}
