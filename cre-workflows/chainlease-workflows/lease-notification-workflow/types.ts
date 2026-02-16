// types.ts
// Type definitions and Zod schemas for lease notification workflow

import { z } from "zod";

/**
 * Configuration schema for the workflow
 */
export const configSchema = z.object({
    evms: z.array(
        z.object({
            chainSelectorName: z.string(),
            leaseAgreementAddress: z.string(),
            startBlock: z.number().optional(),
        })
    ),
    backendApi: z.object({
        endpoint: z.string().url(),
        apiKey: z.string().optional(),
    }),
});

export type Config = z.infer<typeof configSchema>;

/**
 * Schema for validating LeaseActivated event arguments
 */
export const leaseActivatedEventArgsSchema = z.object({
    leaseId: z.bigint(),
    tenant: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    landlord: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    propertyId: z.bigint(),
    startDate: z.bigint(),
    endDate: z.bigint(),
    monthlyRent: z.bigint(),
});

export type LeaseActivatedEventArgs = z.infer<typeof leaseActivatedEventArgsSchema>;

/**
 * Backend notification request payload
 * Sent to backend API which handles email sending and database storage
 */
export interface BackendNotificationRequest {
    eventType: "lease-activated";
    leaseId: string;
    tenantAddress: string;
    landlordAddress: string;
    propertyId: string;
    startDate: number;
    endDate: number;
    monthlyRent: string;
    txHash: string;
    blockNumber: number;
    timestamp: number;
}

/**
 * Backend API response
 */
export interface BackendNotificationResponse {
    success: boolean;
    message?: string;
    notificationId?: string;
    emailSent?: boolean;
    error?: string;
}
