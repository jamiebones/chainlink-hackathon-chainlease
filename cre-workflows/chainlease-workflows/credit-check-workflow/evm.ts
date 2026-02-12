// evm.ts
// EVM smart contract interactions

import { type Runtime, EVMClient, getNetwork, hexToBase64, bytesToHex } from "@chainlink/cre-sdk";
import { encodeAbiParameters, parseAbiParameters } from "viem";
import type { Config } from "./types";

/**
 * Submits credit check results back to the LeaseAgreement consumer contract
 * 
 * Uses CRE's report + writeReport pattern:
 * 1. Encode credit check data as ABI parameters
 * 2. Generate signed report with runtime.report()
 * 3. Submit report to consumer contract with writeReport()
 * 
 * @param runtime - CRE runtime with config and secrets
 * @param leaseId - Lease ID
 * @param passed - Whether the credit check passed
 * @param verificationId - External verification ID for audit trail
 * @returns Transaction hash
 */
export function submitCreditCheckResult(
    runtime: Runtime<Config>,
    leaseId: bigint,
    passed: boolean,
    verificationId: string
): string {
    runtime.log(`Submitting credit check result for lease ${leaseId.toString()}: ${passed}`);
    runtime.log(`Verification ID: ${verificationId}`);

    const evmConfig = runtime.config.evms[0];

    // Get the target network
    const network = getNetwork({
        chainFamily: "evm",
        chainSelectorName: evmConfig.chainSelectorName,
        isTestnet: true,
    });

    if (!network) {
        throw new Error(`Network not found: ${evmConfig.chainSelectorName}`);
    }

    // Create EVM client
    const evmClient = new EVMClient(network.chainSelector.selector);

    // Encode credit check data according to consumer contract's ABI
    // The consumer contract expects: (uint256 leaseId, bool passed, string verificationId)
    const reportData = encodeAbiParameters(
        parseAbiParameters("uint256 leaseId, bool passed, string verificationId"),
        [leaseId, passed, verificationId]
    );

    runtime.log(`Writing report to consumer contract at ${evmConfig.leaseAgreementAddress}`);

    // Step 1: Generate a signed report using the consensus capability
    const reportResponse = runtime
        .report({
            encodedPayload: hexToBase64(reportData),
            encoderName: "evm",
            signingAlgo: "ecdsa",
            hashingAlgo: "keccak256",
        })
        .result();

    runtime.log("Report generated, submitting to chain...");

    // Step 2: Submit the report to the consumer contract
    const writeReportResult = evmClient
        .writeReport(runtime, {
            receiver: evmConfig.leaseAgreementAddress,
            report: reportResponse,
            gasConfig: {
                gasLimit: evmConfig.gasLimit || "500000",
            },
        })
        .result();

    const txHash = bytesToHex(writeReportResult.txHash || new Uint8Array(32));
    runtime.log(`Write report transaction succeeded: ${txHash}`);

    return txHash;
}


