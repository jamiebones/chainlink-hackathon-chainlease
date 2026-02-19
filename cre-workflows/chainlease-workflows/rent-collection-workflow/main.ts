// main.ts
// Entry point for the ChainLease rent collection workflow
// Time-based workflow that identifies leases requiring rent payment and submits reports on-chain

import {
    cre,
    type Runtime,
    type NodeRuntime,
    Runner,
    getNetwork,
    EVMClient,
    HTTPClient
} from "@chainlink/cre-sdk";
import { encodeAbiParameters, parseAbiParameters, hexToBase64, formatUnits } from "viem";
import { configSchema, type Config, type ActiveLease, type NotificationPayload } from "./types.js";
import { LEASE_AGREEMENT_ABI, PAYMENT_ESCROW_ABI } from "./abi.js";

/**
 * Calculate late fee based on days overdue
 */
function calculateLateFee(
    monthlyRent: bigint,
    lastPaymentDate: bigint,
    currentTimestamp: bigint,
    gracePeriodDays: number,
    lateFeePercentage: number
): bigint {
    const daysSinceLastPayment = Number((currentTimestamp - lastPaymentDate) / 86400n);

    if (daysSinceLastPayment <= 30 + gracePeriodDays) {
        return 0n; // No late fee within grace period
    }

    const daysLate = daysSinceLastPayment - 30 - gracePeriodDays;
    const lateFeeAmount = (monthlyRent * BigInt(lateFeePercentage) * BigInt(daysLate)) / (100n * 30n);

    return lateFeeAmount;
}

/**
 * Send notification to backend API
 * Runs in node mode for HTTP consensus
 */
const notifyBackend = (
    nodeRuntime: NodeRuntime<Config>,
    payload: NotificationPayload
): number => {
    const httpClient = new HTTPClient();

    try {
        const req = {
            url: `${nodeRuntime.config.backendApiUrl}/api/rent-payments`,
            method: "POST" as const,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${nodeRuntime.config.backendApiKey}`,
            },
            body: JSON.stringify(payload),
        };

        const response = httpClient.sendRequest(nodeRuntime, req).result();
        return response.statusCode;
    } catch (error) {
        nodeRuntime.log(`Backend notification failed: ${error}`);
        return 500;
    }
};

/**
 * Submit rent collection report to consumer contract
 * Uses CRE's report + writeReport pattern
 */
function submitRentCollectionReport(
    runtime: Runtime<Config>,
    leaseIds: bigint[],
    rentAmounts: bigint[],
    lateFees: bigint[]
): string {
    runtime.log(`Submitting rent collection report for ${leaseIds.length} leases`);

    const evmConfig = runtime.config.evms[0];

    // Get the target network
    const network = getNetwork({
        chainFamily: "evm",
        chainSelectorName: evmConfig.chainSelectorName,
        isTestnet: true,
    });

    if (!network) {
        throw new Error(`Network not found for chain selector: ${evmConfig.chainSelectorName}`);
    }

    // Create EVM client
    const evmClient = new EVMClient(network.chainSelector.selector);

    // Encode rent collection data for consumer contract
    // Consumer expects: (uint256[] leaseIds, uint256[] rentAmounts, uint256[] lateFees)
    const reportData = encodeAbiParameters(
        parseAbiParameters("uint256[] leaseIds, uint256[] rentAmounts, uint256[] lateFees"),
        [leaseIds, rentAmounts, lateFees]
    );

    runtime.log(`Writing report to consumer contract at ${evmConfig.consumerContractAddress}`);

    // Step 1: Generate signed report using consensus capability
    const reportResponse = runtime
        .report({
            encodedPayload: hexToBase64(reportData),
            encoderName: "evm",
            signingAlgo: "ecdsa",
            hashingAlgo: "keccak256",
        })
        .result();

    runtime.log("Report generated, submitting to chain...");

    // Step 2: Submit report to consumer contract via KeystoneForwarder
    const txReceipt = evmClient
        .writeReport({
            receiverAddress: evmConfig.consumerContractAddress,
            report: reportResponse.signedReport,
            gasLimit: BigInt(evmConfig.gasLimit),
        })
        .result();

    const txHash = txReceipt.transactionHash;
    runtime.log(`Rent collection report submitted. Transaction hash: ${txHash}`);

    return txHash;
}

/**
 * Time-based trigger handler
 * Processes rent collection for all active leases
 */
const onTimeTrigger = (runtime: Runtime<Config>): string => {
    try {
        runtime.log("=== ChainLease Rent Collection Workflow Triggered ===");

        const evmConfig = runtime.config.evms[0];

        // Get network and create EVM client for reading
        const network = getNetwork({
            chainFamily: "evm",
            chainSelectorName: evmConfig.chainSelectorName,
            isTestnet: true,
        });

        if (!network) {
            throw new Error(`Network not found: ${evmConfig.chainSelectorName}`);
        }

        const evmClient = new EVMClient(network.chainSelector.selector);

        // Fetch active leases from LeaseAgreement contract
        runtime.log("Fetching active leases...");

        const activeLeaseIds = evmClient.read({
            address: evmConfig.leaseAgreementAddress,
            abi: LEASE_AGREEMENT_ABI,
            functionName: "getActiveLeases",
            args: [],
        }).result() as bigint[];

        runtime.log(`Found ${activeLeaseIds.length} active leases`);

        if (activeLeaseIds.length === 0) {
            runtime.log("No active leases to process");
            return "No active leases";
        }

        // Get current block timestamp
        const currentBlock = evmClient.getBlockByNumber({ blockNumber: "latest" }).result();
        const currentTimestamp = BigInt(currentBlock.timestamp);

        // Process each lease and determine rent collection needs
        const leasesToCollect: bigint[] = [];
        const rentAmounts: bigint[] = [];
        const lateFees: bigint[] = [];

        for (const leaseId of activeLeaseIds) {
            // Fetch lease details
            const lease = evmClient.read({
                address: evmConfig.leaseAgreementAddress,
                abi: LEASE_AGREEMENT_ABI,
                functionName: "leases",
                args: [leaseId],
            }).result() as any[];

            const monthlyRent = lease[4] as bigint;
            const lastPaymentDate = lease[11] as bigint;
            const tenant = lease[3] as string;

            // Calculate if rent is due (30 days since last payment)
            const daysSincePayment = Number((currentTimestamp - lastPaymentDate) / 86400n);

            if (daysSincePayment >= 30) {
                const lateFee = calculateLateFee(
                    monthlyRent,
                    lastPaymentDate,
                    currentTimestamp,
                    runtime.config.gracePeriodDays,
                    runtime.config.lateFeePercentage
                );

                runtime.log(`Lease ${leaseId}: Rent due. Days since payment: ${daysSincePayment}, Late fee: ${formatUnits(lateFee, 18)} ETH`);

                leasesToCollect.push(leaseId);
                rentAmounts.push(monthlyRent);
                lateFees.push(lateFee);

                // Notify backend in node mode
                const notificationResult = runtime.runInNodeMode(
                    (nodeRuntime: NodeRuntime<Config>) => {
                        return notifyBackend(nodeRuntime, {
                            leaseId: leaseId.toString(),
                            tenant: tenant,
                            amount: monthlyRent.toString(),
                            lateFee: lateFee.toString(),
                            transactionHash: "",
                            timestamp: currentTimestamp.toString(),
                            status: lateFee > 0n ? "late" : "due",
                        });
                    }
                );

                runtime.log(`Backend notification status: ${notificationResult.result()}`);
            }
        }

        if (leasesToCollect.length === 0) {
            runtime.log("No leases require rent collection at this time");
            return "No rent collection needed";
        }

        // Submit on-chain report with leases requiring collection
        const txHash = submitRentCollectionReport(
            runtime,
            leasesToCollect,
            rentAmounts,
            lateFees
        );

        runtime.log(`Rent collection workflow completed. Processed ${leasesToCollect.length} leases.`);
        return `Success: ${leasesToCollect.length} leases processed, tx: ${txHash}`;

    } catch (error) {
        runtime.log(`Rent collection workflow error: ${error}`);
        throw error;
    }
};

/**
 * Initialize the CRE workflow with time-based trigger
 */
const initWorkflow = (config: Config) => {
    // Create timer capability for cron-based execution
    // Schedule: "0 0 * * *" = daily at midnight UTC
    const timer = new cre.capabilities.Timer({
        schedule: "0 0 * * *", // Daily at 00:00 UTC
    });

    return [
        {
            trigger: timer.trigger(),
            handler: onTimeTrigger,
        },
    ];
};

/**
 * Main entry point for CRE workflow
 */
export async function main() {
    const runner = new Runner({ configSchema, initWorkflow });
    await runner.run();
}

main();
