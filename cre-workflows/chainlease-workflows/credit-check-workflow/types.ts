// types.ts
// Type definitions for the ChainLease credit check workflow

import { z } from "zod";

/**
 * Configuration schema for the workflow
 * Validated by CRE at runtime
 */
export const configSchema = z.object({
    evms:
        z.object({
            chainSelectorName: z.string(),
            leaseAgreementAddress: z.string(),
            gasLimit: z.string(),
        }),
    creditCheckApi: z.object({
        endpoint: z.string(),
        apiKey: z.string(),
    }),
    backendApi: z.object({
        endpoint: z.string(),
        apiKey: z.string().optional(),
    }).optional(),
});

export type Config = z.infer<typeof configSchema>;

/**
 * Schema for LeaseCreated event arguments
 * Validates decoded event data from the blockchain
 */
export const leaseCreatedEventArgsSchema = z.object({
    leaseId: z.bigint(),
    propertyId: z.bigint(),
    tenant: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
    monthlyRent: z.bigint().positive(),
});

export type LeaseCreatedEventArgs = z.infer<typeof leaseCreatedEventArgsSchema>;

/**
 * Credit check service response structure
 */
export interface CreditCheckResponse {
    leaseId: string;
    tenantAddress: string;
    creditScore: number;
    passed: boolean;
    riskLevel: "low" | "medium" | "high";
    verificationId: string;
    statusCode: number;
    details?: {
        paymentHistory?: string;
        debtToIncome?: number;
        bankruptcies?: number;
        evictions?: number;
    };
}

export type LeaseData = {
    leaseId: bigint;
    propertyId: bigint;
    tenantAddress: string;
};