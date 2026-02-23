// main.ts
// Entry point for the ChainLease lease notification workflow
// Monitors LeaseActivated events and sends email notifications via Gmail SMTP

import {
    cre,
    type Runtime,
    type NodeRuntime,
    Runner,
    getNetwork,
    bytesToHex,
    EVMLog,
    HTTPClient,
    type HTTPSendRequester,
    consensusIdenticalAggregation,
    ok,
} from "@chainlink/cre-sdk";
import { keccak256, toHex, decodeEventLog } from "viem";
import {
    configSchema,
    type Config,
    type LeaseActivatedEventArgs,
    type BackendNotificationRequest,
    type NotificationResponse,
    leaseActivatedEventArgsSchema,
} from "./types";
import { leaseActivatedEventAbi, LEASE_ACTIVATED_SIGNATURE } from "./abi";

/*********************************
 * Helper Functions
 *********************************/

/**
 * Sends lease activation notification to backend API
 * Backend handles:
 *   - Fetching tenant email from database
 *   - Sending email via Gmail SMTP (nodemailer)
 *   - Storing notification record
 * 
 * IMPORTANT: Uses cacheSettings to prevent duplicate emails
 * 
 * @param sendRequester HTTPSendRequester instance for sending HTTP requests
 * @param config Workflow configuration
 * @param payload Notification request payload
 * @returns Notification response for consensus
 */
const sendNotificationEmail = (
    sendRequester: HTTPSendRequester,
    config: Config,
    payload: BackendNotificationRequest
): NotificationResponse => {
    try {
        // 1. Get API key from config
        const apiKey = config.backendApi.apiKey;

        // 2. Serialize payload to JSON and encode to base64 
        const payloadJson = JSON.stringify(payload);
        const bodyBytes = new TextEncoder().encode(payloadJson);
        const body = Buffer.from(bodyBytes).toString('base64');

        // 3. Construct HTTP POST request with cacheSettings to prevent duplicate sends
        const req = {
            url: `${config.backendApi.endpoint}/api/notifications/lease-activated`,
            method: "POST" as const,
            body,
            headers: {
                "Content-Type": "application/json",
                ...(apiKey && { "Authorization": `Bearer ${apiKey}` }),
            },
            cacheSettings: {
                readFromCache: true,
                maxAgeMs: 120000, // 2 minutes - prevents duplicate emails for same event
            },
        };

        // 4. Send HTTP request
        const response = sendRequester.sendRequest(req as any).result();

        // 5. Check response status
        if (!ok(response)) {
            const errorBody = new TextDecoder().decode(response.body);
            throw new Error(`Backend API error (${response.statusCode}): ${errorBody}`);
        }

        // 6. Parse response body
        const responseBody = new TextDecoder().decode(response.body);
        const responseData = JSON.parse(responseBody) as NotificationResponse;

        return {
            statusCode: response.statusCode,
            success: responseData.success,
            message: responseData.message,
            recipient: responseData.recipient,
        };

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`Error sending notification: ${errorMsg}`);
    }
};

/*********************************
 * Log Trigger Handler
 *********************************/

/**
 * Handles LeaseActivated events from the LeaseAgreement contract
 * Triggers email notification through backend API
 *
 * @param runtime CRE runtime instance with config
 * @param log EVM log containing the LeaseActivated event
 * @returns Success message string
 */
const onLeaseActivatedTrigger = (runtime: Runtime<Config>, log: EVMLog): string => {
    try {
        runtime.log("=== ChainLease Lease Notification Workflow Triggered ===");

        // ========================================
        // Step 1: Decode Event Log
        // ========================================

        const topics = log.topics.map((t: Uint8Array) => bytesToHex(t)) as [`0x${string}`, ...`0x${string}`[]];
        const data = bytesToHex(log.data);

        const decodedLog = decodeEventLog({
            abi: leaseActivatedEventAbi,
            data,
            topics,
        });

        runtime.log(`Event: ${decodedLog.eventName}`);

        // Validate event arguments using Zod schema
        const validationResult = leaseActivatedEventArgsSchema.safeParse(decodedLog.args);

        if (!validationResult.success) {
            const errorMsg = `Invalid event arguments: ${validationResult.error.message}`;
            runtime.log(errorMsg);
            throw new Error(errorMsg);
        }

        const eventArgs = validationResult.data;
        runtime.log(`Lease ID: ${eventArgs.leaseId.toString()}`);
        runtime.log(`Tenant: ${eventArgs.tenant}`);
        runtime.log(`Landlord: ${eventArgs.landlord}`);
        runtime.log(`Property ID: ${eventArgs.propertyId.toString()}`);

        // ========================================
        // Step 2: Prepare Notification Payload
        // ========================================

        const notificationPayload: BackendNotificationRequest = {
            eventType: "lease-activated",
            leaseId: eventArgs.leaseId.toString(),
            tenantAddress: eventArgs.tenant,
            landlordAddress: eventArgs.landlord,
            propertyId: eventArgs.propertyId.toString(),
            startDate: Number(eventArgs.startDate),
            endDate: Number(eventArgs.endDate),
            monthlyRent: eventArgs.monthlyRent.toString(),
            txHash: "", // Transaction hash not available from EVMLog
            blockNumber: Number(log.blockNumber),
            timestamp: Date.now(),
        };

        // ========================================
        // Step 3: Send Email via Backend API
        // ========================================

        runtime.log(`Sending email notification for lease #${eventArgs.leaseId}...`);

        // Use HTTPClient.sendRequest with consensusIdenticalAggregation for HTTP POST
        // cacheSettings in sendNotificationEmail prevents duplicate emails
        const httpClient = new HTTPClient();

        const result = httpClient
            .sendRequest(
                runtime,
                (sendRequester: HTTPSendRequester, config: Config) =>
                    sendNotificationEmail(sendRequester, config, notificationPayload),
                consensusIdenticalAggregation<NotificationResponse>()
            )(runtime.config)
            .result();

        // ========================================
        // Step 4: Verify Success
        // ========================================

        if (result.success && result.statusCode >= 200 && result.statusCode < 300) {
            const successMsg = `✅ Email notification sent successfully for lease #${eventArgs.leaseId}`;
            runtime.log(successMsg);
            runtime.log(`   Recipient: ${result.recipient || 'unknown'}`);
            return successMsg;
        } else {
            const errorMsg = `Email sending failed: ${result.message || 'Unknown error'}`;
            runtime.log(`❌ ${errorMsg}`);
            throw new Error(errorMsg);
        }

    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        runtime.log(`ERROR: ${errorMsg}`);
        throw err;
    }
};

/*********************************
 * Workflow Initialization
 *********************************/

const initWorkflow = (config: Config) => {
    const evmConfig = config.evms[0];

    // Fetch the blockchain network to monitor
    const network = getNetwork({
        chainFamily: "evm",
        chainSelectorName: evmConfig.chainSelectorName,
        isTestnet: true,
    });

    if (!network) {
        throw new Error(`Network not found for chain selector: ${evmConfig.chainSelectorName}`);
    }

    // Create EVM client for the target chain
    const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);

    // Compute the event topic hash for LeaseActivated from the signature string
    const leaseActivatedHash = keccak256(toHex(LEASE_ACTIVATED_SIGNATURE));

    // Register handler to trigger only on LeaseActivated events from our contract
    return [
        cre.handler(
            evmClient.logTrigger({
                addresses: [evmConfig.leaseAgreementAddress],
                topics: [{ values: [leaseActivatedHash] }],
                confidence: "CONFIDENCE_LEVEL_FINALIZED",
            }),
            onLeaseActivatedTrigger
        ),
    ];
};

/*********************************
 * Main Entry Point
 *********************************/

export async function main() {
    const runner = await Runner.newRunner<Config>({ configSchema });
    await runner.run(initWorkflow);
}

main();
