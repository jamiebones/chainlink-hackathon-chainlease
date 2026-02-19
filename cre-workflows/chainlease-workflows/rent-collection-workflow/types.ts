// types.ts
// Type definitions and Zod schemas for rent collection workflow

import { z } from "zod";

/**
 * Configuration schema for the workflow
 * Validated by CRE at runtime
 */
export const configSchema = z.object({
    evms: z.array(
        z.object({
            chainSelectorName: z.string(),
            leaseAgreementAddress: z.string(),
            consumerContractAddress: z.string(), // Contract that receives rent collection reports
            gasLimit: z.string(),
        })
    ),
    gracePeriodDays: z.number().int().min(0).default(3),
    lateFeePercentage: z.number().int().min(0).max(100).default(5),
    backendApiUrl: z.string().url("Invalid backend API URL"),
    backendApiKey: z.string().min(1, "Backend API key required"),
});

export type Config = z.infer<typeof configSchema>;

/**
 * Active lease structure from LeaseAgreement contract
 */
export interface ActiveLease {
    leaseId: bigint;
    propertyId: bigint;
    landlord: string;
    tenant: string;
    monthlyRent: bigint;
    securityDeposit: bigint;
    startDate: bigint;
    endDate: bigint;
    lastPaymentDate: bigint;
    state: number;
}

/**
 * Backend notification payload
 * Sent to backend API for record-keeping and tenant notifications
 */
export interface NotificationPayload {
    leaseId: string;
    tenant: string;
    amount: string;
    lateFee: string;
    transactionHash: string;
    timestamp: string;
    status: "success" | "failed" | "late" | "due";
}

