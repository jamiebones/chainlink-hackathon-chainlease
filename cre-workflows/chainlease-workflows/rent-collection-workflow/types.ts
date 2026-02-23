// types.ts
// Type definitions and Zod schemas for rent collection workflow

import { z } from "zod";

/**
 * Configuration schema for the rent collection workflow
 * Validated by CRE at runtime
 */
export const configSchema = z.object({
    schedule: z.string(),
    evms: z.array(
        z.object({
            chainSelectorName: z.string(),
            leaseAgreementAddress: z.string(),
        })
    ),
    backendApi: z.object({
        endpoint: z.string().url(),
        apiKey: z.string().optional(),
    }),
});

export type Config = z.infer<typeof configSchema>;

/**
 * Lease struct from smart contract
 */
export interface Lease {
    leaseId: bigint;
    propertyId: bigint;
    landlord: string;
    tenant: string;
    monthlyRent: bigint;
    securityDeposit: bigint;
    startDate: bigint;
    endDate: bigint;
    duration: bigint;
    state: number; // LeaseState enum
    worldIdNullifierHash: string;
    creditCheckPassed: boolean;
    verificationId: string;
    lastPaymentDate: bigint;
    createdAt: bigint;
}

/**
 * Overdue lease data sent to backend
 */
export interface OverdueLeaseData {
    leaseId: string;
    tenantAddress: string;
    landlordAddress: string;
    monthlyRent: string;
    lastPaymentDate: number;
    daysSincePayment: number;
    daysOverdue: number;
    lateFee: string;
    propertyId: string;
}

/**
 * Backend notification request for overdue rent
 */
export interface RentNotificationRequest {
    eventType: "rent-overdue";
    overdueLeases: OverdueLeaseData[];
    timestamp: number;
    totalOverdue: number;
}

/**
 * Backend API response
 * Used for consensus across CRE nodes
 */
export interface RentNotificationResponse {
    statusCode: number;
    success: boolean;
    message?: string;
    notificationsSent: number;
    failed?: number;
}

/**
 * Lease state enum matching Solidity contract
 */
export enum LeaseState {
    Draft = 0,
    PendingApproval = 1,
    Active = 2,
    Completed = 3,
    Terminated = 4,
    Disputed = 5,
}
