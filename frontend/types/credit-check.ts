// types/credit-check.ts
// Comprehensive credit check types

import { z } from 'zod';

/**
 * Employment Status Enum
 */
export enum EmploymentStatus {
    FULL_TIME = 'full_time',
    PART_TIME = 'part_time',
    SELF_EMPLOYED = 'self_employed',
    CONTRACT = 'contract',
    UNEMPLOYED = 'unemployed',
    RETIRED = 'retired',
    STUDENT = 'student',
}

/**
 * Credit Check Request Input
 */
export interface CreditCheckRequest {
    // Lease Information
    leaseId?: string;
    propertyId: string;
    walletAddress: string;

    // Personal Information
    personalInfo: {
        firstName: string;
        middleName?: string;
        lastName: string;
        dateOfBirth: string; // YYYY-MM-DD
        ssnLast4: string; // Last 4 digits of SSN/National ID
        phoneNumber: string;
        email: string;
    };

    // Current Address
    currentAddress: {
        street: string;
        unit?: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
        lengthOfResidence: number; // months
    };

    // Previous Address (optional, for rental history)
    previousAddress?: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        lengthOfResidence: number; // months
    };

    // Employment Information
    employment: {
        status: EmploymentStatus;
        employerName?: string;
        jobTitle?: string;
        monthlyIncome: number; // in USD or token equivalent
        yearsAtJob?: number;
        employerPhone?: string;
    };

    // Previous Landlord Reference (optional)
    landlordReference?: {
        name: string;
        phone: string;
        rentalPeriod: string; // e.g., "Jan 2020 - Dec 2023"
        monthlyRent: number;
    };

    // Consent & Acknowledgment
    consent: {
        agreedToTerms: boolean;
        signature: string; // Wallet signature
        timestamp: number;
    };
}

/**
 * Zod Schema for Validation
 */
export const creditCheckRequestSchema = z.object({
    propertyId: z.string().min(1, 'Property ID is required'),
    walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
    leaseId: z.string().optional(),

    personalInfo: z.object({
        firstName: z.string().min(1, 'First name is required'),
        middleName: z.string().optional(),
        lastName: z.string().min(1, 'Last name is required'),
        dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
        ssnLast4: z.string().regex(/^\d{4}$/, 'Must be 4 digits'),
        phoneNumber: z.string().min(10, 'Valid phone number required'),
        email: z.string().email('Valid email required'),
    }),

    currentAddress: z.object({
        street: z.string().min(1, 'Street address required'),
        unit: z.string().optional(),
        city: z.string().min(1, 'City required'),
        state: z.string().min(1, 'State required'),
        zipCode: z.string().min(1, 'ZIP code required'),
        country: z.string().min(1, 'Country required'),
        lengthOfResidence: z.number().min(0, 'Length of residence required'),
    }),

    previousAddress: z.object({
        street: z.string(),
        city: z.string(),
        state: z.string(),
        zipCode: z.string(),
        lengthOfResidence: z.number(),
    }).optional(),

    employment: z.object({
        status: z.nativeEnum(EmploymentStatus),
        employerName: z.string().optional(),
        jobTitle: z.string().optional(),
        monthlyIncome: z.number().positive('Monthly income must be positive'),
        yearsAtJob: z.number().min(0).optional(),
        employerPhone: z.string().optional(),
    }),

    landlordReference: z.object({
        name: z.string(),
        phone: z.string(),
        rentalPeriod: z.string(),
        monthlyRent: z.number(),
    }).optional(),

    consent: z.object({
        agreedToTerms: z.boolean().refine(val => val === true, 'Must agree to terms'),
        signature: z.string().min(1, 'Signature required'),
        timestamp: z.number(),
    }),
});

/**
 * Credit Check Risk Level
 */
export enum CreditRiskLevel {
    EXCELLENT = 'excellent', // 740+
    GOOD = 'good',          // 670-739
    FAIR = 'fair',          // 580-669
    POOR = 'poor',          // 300-579
}

/**
 * Credit Check Response
 */
export interface CreditCheckResponse {
    // Request Info
    leaseId?: string;
    propertyId: string;
    tenantAddress: string;
    verificationId: string;
    timestamp: number;

    // Credit Score
    creditScore: number; // 300-850
    riskLevel: CreditRiskLevel;
    passed: boolean;

    // Detailed Report
    report: {
        // Payment History
        paymentHistory: {
            onTimePayments: number; // percentage
            latePayments: number;
            missedPayments: number;
            rating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
        };

        // Debt Analysis
        debt: {
            totalDebt: number;
            monthlyIncome: number;
            debtToIncomeRatio: number; // percentage
            availableCredit: number;
        };

        // Public Records
        publicRecords: {
            bankruptcies: number;
            foreclosures: number;
            evictions: number;
            collections: number;
        };

        // Rental History
        rentalHistory: {
            totalRentals: number;
            averageRentalPeriod: number; // months
            evictions: number;
            latePayments: number;
            rating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
        };

        // Income Verification
        incomeVerification: {
            monthlyIncome: number;
            employmentStatus: EmploymentStatus;
            incomeStability: 'Stable' | 'Unstable';
            meetsRequirement: boolean; // Income >= 3x rent
        };
    };

    // Recommendation
    recommendation: {
        approved: boolean;
        confidence: number; // 0-100
        suggestedDeposit: number; // suggested security deposit multiplier
        conditions?: string[]; // e.g., ["Require co-signer", "Higher deposit"]
        reasoning: string;
    };
}

/**
 * Credit Check Result stored in database
 */
export interface CreditCheckRecord {
    _id?: string;
    verificationId: string;
    leaseId?: string;
    propertyId: string;
    tenantAddress: string;

    // Applicant Info (encrypted/hashed in production)
    applicantInfo: {
        fullName: string;
        email: string;
        phoneNumber: string;
        ssnLast4: string;
    };

    // Results
    creditScore: number;
    passed: boolean;
    riskLevel: CreditRiskLevel;

    // Timestamps
    requestedAt: Date;
    completedAt: Date;

    // Report (full response)
    fullReport: CreditCheckResponse;
}

/**
 * Credit Check Statistics
 */
export interface CreditCheckStats {
    totalChecks: number;
    passRate: number; // percentage
    averageCreditScore: number;
    riskDistribution: Record<CreditRiskLevel, number>;
}

/**
 * Minimum Requirements for Approval
 */
export interface CreditCheckRequirements {
    minCreditScore: number;
    maxDebtToIncome: number; // percentage
    maxEvictions: number;
    maxBankruptcies: number;
    minIncomeMultiplier: number; // e.g., 3x rent
}

/**
 * Default requirements
 */
export const DEFAULT_REQUIREMENTS: CreditCheckRequirements = {
    minCreditScore: 620,
    maxDebtToIncome: 43, // 43% is standard
    maxEvictions: 0,
    maxBankruptcies: 0,
    minIncomeMultiplier: 3, // Income must be 3x monthly rent
};
