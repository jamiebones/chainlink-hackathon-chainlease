// main.ts
// ChainLease Rent Collection Workflow
// Monitors active leases and sends notifications for overdue payments

import {
    CronCapability,
    handler,
    type Runtime,
    type CronPayload,
    Runner,
    HTTPClient,
    type HTTPSendRequester,
    consensusIdenticalAggregation,
    ok,
} from "@chainlink/cre-sdk";
import { formatUnits } from "viem";
import {
    configSchema,
    type Config,
    type OverdueLeaseData,
    type RentNotificationRequest,
    type RentNotificationResponse,
    LeaseState,
} from "./types";
import {
    getEvmClient,
    getActiveLeases,
    isPaymentOverdue,
    getLease,
    calculateDaysSincePayment,
    calculateLateFee,
} from "./evm";

/**
 * Send rent notification to backend API
 * Backend handles email sending and database updates
 */
const sendRentNotification = (
    sendRequester: HTTPSendRequester,
    config: Config,
    payload: RentNotificationRequest
): RentNotificationResponse => {
    // 1. Get API configuration
    const apiKey = config.backendApi.apiKey;

    // 2. Serialize payload to JSON and encode to base64
    const payloadJson = JSON.stringify(payload);
    const bodyBytes = new TextEncoder().encode(payloadJson);
    const body = Buffer.from(bodyBytes).toString("base64");

    // 3. Construct HTTP POST request
    // Note: Backend API handles deduplication to prevent duplicate notifications
    const req = {
        url: `${config.backendApi.endpoint}/api/notifications/rent-overdue`,
        method: "POST" as const,
        body,
        headers: {
            "Content-Type": "application/json",
            ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
        },
    };

    // 4. Send HTTP request
    const response = sendRequester.sendRequest(req).result();

    // 5. Check response status
    if (!ok(response)) {
        const errorBody = new TextDecoder().decode(response.body);
        throw new Error(`Backend API error (${response.statusCode}): ${errorBody}`);
    }

    // 6. Decode response body
    const responseBody = new TextDecoder().decode(response.body);
    const parsedResponse = JSON.parse(responseBody) as RentNotificationResponse;

    return {
        statusCode: response.statusCode,
        success: parsedResponse.success,
        message: parsedResponse.message,
        notificationsSent: parsedResponse.notificationsSent,
        failed: parsedResponse.failed,
    };
};

/**
 * Cron trigger handler - runs daily to check for overdue payments
 */
const onRentCheckTrigger = (runtime: Runtime<Config>, payload: CronPayload): string => {
    runtime.log("=== ChainLease Rent Collection Workflow ===");

    // Log scheduled execution time
    if (payload.scheduledExecutionTime) {
        const scheduledTime = new Date(
            Number(payload.scheduledExecutionTime.seconds) * 1000 +
            payload.scheduledExecutionTime.nanos / 1000000
        );
        runtime.log(`Scheduled execution: ${scheduledTime.toISOString()}`);
    }

    // Use hardcoded defaults for grace period and late fees
    const gracePeriodDays = 3;
    const lateFeePercentage = 5;

    runtime.log(`Grace period: ${gracePeriodDays} days, Late fee: ${lateFeePercentage}%`);

    // Step 1: Initialize EVM client
    const evmClient = getEvmClient(runtime);
    runtime.log("EVM client initialized");

    // Step 2: Get all active leases
    const activeLeaseIds = getActiveLeases(runtime, evmClient);
    runtime.log(`Found ${activeLeaseIds.length} active lease(s)`);

    if (activeLeaseIds.length === 0) {
        runtime.log("No active leases to monitor");
        return "No active leases";
    }

    // Step 3: Check each lease for overdue payments
    const overdueLeases: OverdueLeaseData[] = [];

    for (const leaseId of activeLeaseIds) {
        runtime.log(`Checking lease #${leaseId.toString()}...`);

        // Check if payment is overdue (>30 days since last payment)
        const isOverdue = isPaymentOverdue(runtime, evmClient, leaseId);

        if (!isOverdue) {
            runtime.log(`  ✓ Lease #${leaseId.toString()} is current`);
            continue;
        }

        // Get detailed lease information
        const lease = getLease(runtime, evmClient, leaseId);

        // Verify lease is still active
        if (lease.state !== LeaseState.Active) {
            runtime.log(`  ⚠️ Lease #${leaseId.toString()} is not active (state: ${lease.state})`);
            continue;
        }

        // Calculate days since last payment
        const daysSincePayment = calculateDaysSincePayment(lease.lastPaymentDate);
        const daysOverdue = daysSincePayment - 30; // Rent due every 30 days

        // Calculate late fee
        const lateFee = calculateLateFee(
            lease.monthlyRent,
            daysOverdue,
            gracePeriodDays,
            lateFeePercentage
        );

        const rentInEth = formatUnits(lease.monthlyRent, 18);
        const lateFeeInEth = formatUnits(lateFee, 18);

        runtime.log(`  ⚠️ OVERDUE: ${daysOverdue} days late`);
        runtime.log(`     Rent: ${rentInEth} ETH, Late fee: ${lateFeeInEth} ETH`);
        runtime.log(`     Tenant: ${lease.tenant}`);
        runtime.log(`     Landlord: ${lease.landlord}`);

        // Add to overdue list
        overdueLeases.push({
            leaseId: leaseId.toString(),
            tenantAddress: lease.tenant,
            landlordAddress: lease.landlord,
            monthlyRent: lease.monthlyRent.toString(),
            lastPaymentDate: Number(lease.lastPaymentDate),
            daysSincePayment,
            daysOverdue,
            lateFee: lateFee.toString(),
            propertyId: lease.propertyId.toString(),
        });
    }

    // Step 4: If no overdue leases, return early
    if (overdueLeases.length === 0) {
        runtime.log("✓ No overdue payments found");
        return `Checked ${activeLeaseIds.length} leases, all current`;
    }

    runtime.log(`\nFound ${overdueLeases.length} overdue lease(s)`);

    // Step 5: Send notifications via HTTP POST
    const notificationPayload: RentNotificationRequest = {
        eventType: "rent-overdue",
        overdueLeases,
        timestamp: Math.floor(Date.now() / 1000),
        totalOverdue: overdueLeases.length,
    };

    runtime.log("Sending overdue notifications to backend...");

    const httpClient = new HTTPClient();
    const result = httpClient
        .sendRequest(
            runtime,
            (sendRequester: HTTPSendRequester, config: Config) =>
                sendRentNotification(sendRequester, config, notificationPayload),
            consensusIdenticalAggregation<RentNotificationResponse>()
        )(runtime.config)
        .result();

    runtime.log(`Backend response: ${result.message}`);
    runtime.log(`Notifications sent: ${result.notificationsSent}`);
    if (result.failed && result.failed > 0) {
        runtime.log(`Failed notifications: ${result.failed}`);
    }

    const summary = `Checked ${activeLeaseIds.length} leases, ${overdueLeases.length} overdue, ${result.notificationsSent} notifications sent`;
    runtime.log(`\n✓ ${summary}`);

    return summary;
};

/**
 * Initialize workflow with cron trigger
 */
const initWorkflow = (config: Config) => {
    const cronTrigger = new CronCapability().trigger({
        schedule: config.schedule,
    });

    return [handler(cronTrigger, onRentCheckTrigger)];
};

/**
 * Main entry point
 */
export async function main() {
    const runner = await Runner.newRunner<Config>();
    await runner.run(initWorkflow);
}
