// main.ts
// Entry point for the ChainLease lease notification workflow
// Monitors LeaseActivated events and triggers backend API for email notifications

import {
    cre,
    type Runtime,
    type NodeRuntime,
    Runner,
    getNetwork,
    bytesToHex,
    EVMLog,
    HTTPClient,
    consensusMedianAggregation,
} from "@chainlink/cre-sdk";
import { keccak256, toHex, decodeEventLog } from "viem";
import {
    configSchema,
    type Config,
    type LeaseActivatedEventArgs,
    type BackendNotificationRequest,
    leaseActivatedEventArgsSchema,
} from "./types";
import { leaseActivatedEventAbi, LEASE_ACTIVATED_SIGNATURE } from "./abi";

/*********************************
 * Helper Functions
 *********************************/

/**
 * Sends lease activation notification to backend API
 * Backend handles email sending via Gmail SMTP and database storage
 * Runs in node mode for HTTP consensus
 * 
 * @param nodeRuntime CRE node runtime with config
 * @param payload Notification request payload
 * @returns HTTP status code for consensus
 */
const triggerBackendNotification = (
    nodeRuntime: NodeRuntime<Config>,
    payload: BackendNotificationRequest
): number => {
    const httpClient = new HTTPClient();

    try {
        const req = {
            url: `${nodeRuntime.config.backendApi.endpoint}/api/notifications/lease-activated`,
            method: "POST" as const,
            headers: {
                "Content-Type": "application/json",
                ...(nodeRuntime.config.backendApi.apiKey && {
                    "Authorization": `Bearer ${nodeRuntime.config.backendApi.apiKey}`,
                }),
            },
            body: JSON.stringify(payload),
        };

        const response = httpClient.sendRequest(nodeRuntime, req).result();

        // Log response for debugging
        if (response.statusCode >= 200 && response.statusCode < 300) {
            const responseBody = new TextDecoder().decode(response.body);
            nodeRuntime.log(`Backend response: ${responseBody}`);
        }

        // Return status code for consensus (numeric type required)
        return response.statusCode;
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        nodeRuntime.log(`Error triggering backend notification: ${errorMsg}`);
        throw error;
    }
};

/*********************************
 * Log Trigger Handler
 *********************************/

/**
 * Handles LeaseActivated events from the LeaseAgreement contract
 * Forwards event data to backend API which handles:
 *   - Fetching tenant email from database
 *   - Sending email via Gmail SMTP
 *   - Storing notification record
 *
 * @param runtime CRE runtime instance with config and secrets
 * @param log EVM log containing the LeaseActivated event
 * @returns Success message string
 */
const onLeaseActivatedTrigger = (runtime: Runtime<Config>, log: EVMLog): string => {
    try {
        runtime.log("=== ChainLease Lease Notification Workflow Triggered ===");

        // ========================================
        // Step 1: Decode Event Log
        // ========================================

        const topics = log.topics.map((t) => bytesToHex(t)) as [`0x${string}`, ...`0x${string}`[]];
        const data = bytesToHex(log.data);

        const decodedLog = decodeEventLog({
            abi: leaseActivatedEventAbi,
            data,
            topics,
        });

        runtime.log(`Event: ${decodedLog.eventName}`);

        // Validate event arguments
        const validationResult = leaseActivatedEventArgsSchema.safeParse(decodedLog.args);

        if (!validationResult.success) {
            runtime.log(`Event validation failed: ${validationResult.error.message}`);
            throw new Error(`Invalid event arguments: ${validationResult.error.message}`);
        }

        const eventArgs = validationResult.data;
        runtime.log(`Lease ID: ${eventArgs.leaseId.toString()}`);
        runtime.log(`Tenant: ${eventArgs.tenant}`);
        runtime.log(`Landlord: ${eventArgs.landlord}`);
        runtime.log(`Property ID: ${eventArgs.propertyId.toString()}`);

        // ========================================
        // Step 2: Trigger Backend API
        // ========================================

        runtime.log("Sending notification request to backend API...");

        const notificationPayload: BackendNotificationRequest = {
            eventType: "lease-activated",
            leaseId: eventArgs.leaseId.toString(),
            tenantAddress: eventArgs.tenant,
            landlordAddress: eventArgs.landlord,
            propertyId: eventArgs.propertyId.toString(),
            startDate: Number(eventArgs.startDate),
            endDate: Number(eventArgs.endDate),
            monthlyRent: eventArgs.monthlyRent.toString(),
            txHash: "", // Transaction hash not available from event log
            blockNumber: Number(log.blockNumber),
            timestamp: Date.now(),
        };

        const statusCode = runtime.runInNodeMode(
            (nodeRuntime) => triggerBackendNotification(nodeRuntime, notificationPayload),
            consensusMedianAggregation()
        )().result();

        // Convert to number for comparison
        const httpStatus = Number(statusCode);

        if (httpStatus >= 200 && httpStatus < 300) {
            runtime.log(`Backend API responded successfully: ${httpStatus}`);

            const successMessage = `Lease activation notification triggered for lease #${eventArgs.leaseId}`;
            runtime.log(successMessage);
            return successMessage;
        } else {
            runtime.log(`Backend API error: ${httpStatus}`);
            throw new Error(`Backend API returned ${httpStatus}`);
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

    // Compute the event topic hash for LeaseActivated
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
