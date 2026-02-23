// evm.ts
// Helper functions for reading lease data from the blockchain

import {
    type Runtime,
    EVMClient,
    getNetwork,
    encodeCallMsg,
    bytesToHex,
    LAST_FINALIZED_BLOCK_NUMBER,
} from "@chainlink/cre-sdk";
import { type Address, encodeFunctionData, decodeFunctionResult, zeroAddress } from "viem";
import { leaseAgreementAbi, FUNCTION_NAMES } from "./abi";
import { type Config, type Lease } from "./types";

/**
 * Get EVM client for the configured chain
 */
export function getEvmClient(runtime: Runtime<Config>): EVMClient {
    const evmConfig = runtime.config.evms[0];

    const network = getNetwork({
        chainFamily: "evm",
        chainSelectorName: evmConfig.chainSelectorName,
        isTestnet: true,
    });

    if (!network) {
        throw new Error(`Network not found: ${evmConfig.chainSelectorName}`);
    }

    return new EVMClient(network.chainSelector.selector);
}

/**
 * Get all active lease IDs from the contract
 */
export function getActiveLeases(
    runtime: Runtime<Config>,
    evmClient: EVMClient
): bigint[] {
    const evmConfig = runtime.config.evms[0];

    const callData = encodeFunctionData({
        abi: leaseAgreementAbi,
        functionName: FUNCTION_NAMES.GET_ACTIVE_LEASES,
        args: [],
    });

    const contractCall = evmClient
        .callContract(runtime, {
            call: encodeCallMsg({
                from: zeroAddress,
                to: evmConfig.leaseAgreementAddress as Address,
                data: callData,
            }),
            blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
        })
        .result();

    const activeLeaseIds = decodeFunctionResult({
        abi: leaseAgreementAbi,
        functionName: FUNCTION_NAMES.GET_ACTIVE_LEASES,
        data: bytesToHex(contractCall.data),
    }) as bigint[];

    return activeLeaseIds;
}

/**
 * Check if a specific lease is overdue
 */
export function isPaymentOverdue(
    runtime: Runtime<Config>,
    evmClient: EVMClient,
    leaseId: bigint
): boolean {
    const evmConfig = runtime.config.evms[0];

    const callData = encodeFunctionData({
        abi: leaseAgreementAbi,
        functionName: FUNCTION_NAMES.IS_PAYMENT_OVERDUE,
        args: [leaseId],
    });

    const contractCall = evmClient
        .callContract(runtime, {
            call: encodeCallMsg({
                from: zeroAddress,
                to: evmConfig.leaseAgreementAddress as Address,
                data: callData,
            }),
            blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
        })
        .result();

    const isOverdue = decodeFunctionResult({
        abi: leaseAgreementAbi,
        functionName: FUNCTION_NAMES.IS_PAYMENT_OVERDUE,
        data: bytesToHex(contractCall.data),
    }) as boolean;

    return isOverdue;
}

/**
 * Get detailed lease information
 */
export function getLease(
    runtime: Runtime<Config>,
    evmClient: EVMClient,
    leaseId: bigint
): Lease {
    const evmConfig = runtime.config.evms[0];

    const callData = encodeFunctionData({
        abi: leaseAgreementAbi,
        functionName: FUNCTION_NAMES.GET_LEASE,
        args: [leaseId],
    });

    const contractCall = evmClient
        .callContract(runtime, {
            call: encodeCallMsg({
                from: zeroAddress,
                to: evmConfig.leaseAgreementAddress as Address,
                data: callData,
            }),
            blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
        })
        .result();

    const leaseData = decodeFunctionResult({
        abi: leaseAgreementAbi,
        functionName: FUNCTION_NAMES.GET_LEASE,
        data: bytesToHex(contractCall.data),
    }) as Lease;

    return leaseData;
}

/**
 * Calculate days since last payment
 */
export function calculateDaysSincePayment(lastPaymentDate: bigint): number {
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const secondsSincePayment = currentTime - lastPaymentDate;
    const daysSincePayment = Number(secondsSincePayment / 86400n);
    return daysSincePayment;
}

/**
 * Calculate late fee based on monthly rent and number of days late
 */
export function calculateLateFee(
    monthlyRent: bigint,
    daysOverdue: number,
    gracePeriodDays: number,
    lateFeePercentage: number
): bigint {
    // Only charge late fee if past grace period
    if (daysOverdue <= gracePeriodDays) {
        return 0n;
    }

    // Calculate late fee as percentage of monthly rent
    const lateFee = (monthlyRent * BigInt(lateFeePercentage)) / 100n;
    return lateFee;
}
