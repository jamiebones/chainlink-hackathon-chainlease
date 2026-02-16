// main.ts
// Entry point for the ChainLease credit check workflow.
// Monitors LeaseCreated events and automates tenant credit verification.

import { cre, type Runtime, type NodeRuntime, 
  Runner, getNetwork, bytesToHex, EVMLog, 
  HTTPClient, consensusMedianAggregation } from "@chainlink/cre-sdk";
import { keccak256, toHex, decodeEventLog } from "viem";
import { configSchema, type Config, type CreditCheckResponse, leaseCreatedEventArgsSchema } from "./types";
import { fetchCreditCheck } from "./credit-check";
import { submitCreditCheckResult } from "./evm";
import { leaseCreatedEventAbi, LEASE_CREATED_SIGNATURE } from "./abi";

/*********************************
 * Log Trigger Handler
 *********************************/

/**
 * Saves credit check data to backend database via API
 * Runs in node mode for HTTP request consensus
 */
const saveToBackend = (
  nodeRuntime: NodeRuntime<Config>,
  payload: {
    leaseId: string;
    tenantAddress: string;
    creditScore: number;
    passed: boolean;
    riskLevel: string;
    verificationId: string;
    txHash: string;
    timestamp: number;
    details?: any;
  }
): number => {
  const httpClient = new HTTPClient();

  const req = {
    url: nodeRuntime.config.backendApi!.endpoint,
    method: "POST" as const,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  };

  const response = httpClient.sendRequest(nodeRuntime, req).result();
  // Return status code for consensus (numeric type required)
  return response.statusCode;
};

/**
 * Handles LeaseCreated events from the LeaseAgreement contract.
 * Orchestrates the full credit check flow:
 *   1. Decode event to extract lease details
 *   2. Call external credit check API
 *   3. Submit results back to smart contract
 *   4. Store audit record in database
 *
 * @param runtime - CRE runtime instance with config and secrets
 * @param log - EVM log containing the LeaseCreated event
 * @returns Success message string
 */
const onLeaseCreatedTrigger = (runtime: Runtime<Config>, log: EVMLog): string => {
  try {
    // ========================================
    // Step 1: Decode Event Log
    // ========================================

    runtime.log("=== ChainLease Credit Check Workflow Triggered ===");

    // Convert topics/data to hex format for viem decoding
    const topics = log.topics.map(t => bytesToHex(t)) as [`0x${string}`, ...`0x${string}`[]];
    const data = bytesToHex(log.data);

    // Decode the LeaseCreated event
    const decodedLog = decodeEventLog({ abi: leaseCreatedEventAbi, data, topics });
    runtime.log(`Event: ${decodedLog.eventName}`);

    // Validate event arguments with Zod schema
    const validationResult = leaseCreatedEventArgsSchema.safeParse(decodedLog.args);

    if (!validationResult.success) {
      runtime.log(`Event validation failed: ${validationResult.error.message}`);
      throw new Error(`Invalid event arguments: ${validationResult.error.message}`);
    }

    const { leaseId, propertyId, tenant, monthlyRent } = validationResult.data;

    runtime.log(`Lease ID: ${leaseId.toString()}`);
    runtime.log(`Property ID: ${propertyId.toString()}`);
    runtime.log(`Tenant: ${tenant}`);
    runtime.log(`Monthly Rent: ${monthlyRent.toString()} wei`);

    // ========================================
    // Step 2: Perform Credit Check  
    // ========================================
    // Calls external credit bureau API to evaluate tenant creditworthiness.
    // Uses runInNodeMode for HTTP consensus on credit score across DON nodes.
    // See credit-check.ts for implementation.

    runtime.log(`Initiating credit check for tenant: ${tenant}`);

    // Execute credit check with consensus on the credit score
    const fetchScore = (nodeRuntime: NodeRuntime<Config>): number => {
      const result = fetchCreditCheck(nodeRuntime, leaseId.toString(), tenant);
      return result.creditScore;
    };

    const creditScore = runtime.runInNodeMode(
      fetchScore,
      consensusMedianAggregation()
    )().result();

  
    const creditCheckResult: CreditCheckResponse = fetchCreditCheck(
      { config: runtime.config } as NodeRuntime<Config>,
      leaseId.toString(),
      tenant
    );

    // Update score with consensus value
    creditCheckResult.creditScore = Number(creditScore);

    runtime.log(`Credit Check Status: ${creditCheckResult.statusCode}`);
    runtime.log(`Credit Score: ${creditCheckResult.creditScore}`);
    runtime.log(`Approval Status: ${creditCheckResult.passed ? "APPROVED" : "DENIED"}`);
    runtime.log(`Risk Level: ${creditCheckResult.riskLevel}`);

    // ========================================
    // Step 3: Submit Result to Smart Contract
    // ========================================
    // Calls updateCreditCheckStatus() on the LeaseAgreement contract.
    // This updates the lease state and enables landlord approval if passed.
    // See evm.ts for implementation.

    const txHash: string = submitCreditCheckResult(
      runtime,
      leaseId,
      creditCheckResult.passed,
      creditCheckResult.verificationId
    );

    runtime.log(`On-chain settlement tx: ${txHash}`);

    // ========================================
    // Step 4: Save to Database via Backend API
    // ========================================

    if (runtime.config.backendApi) {
      runtime.log("Saving credit check data to database...");

      const statusCode = runtime.runInNodeMode(
        (nodeRuntime) => saveToBackend(nodeRuntime, {
          leaseId: leaseId.toString(),
          tenantAddress: creditCheckResult.tenantAddress,
          creditScore: creditCheckResult.creditScore,
          passed: creditCheckResult.passed,
          riskLevel: creditCheckResult.riskLevel,
          verificationId: creditCheckResult.verificationId,
          txHash,
          timestamp: creditCheckResult.timestamp,
          details: creditCheckResult.details,
        }),
        consensusMedianAggregation()
      )().result();

      runtime.log(`Database save completed with status: ${statusCode}`);
    }

    runtime.log("=== Credit Check Workflow Completed Successfully ===");

    return `Credit check completed for lease ${leaseId.toString()}: ${creditCheckResult.passed ? "APPROVED" : "DENIED"}`;

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    runtime.log(`❌ Workflow error: ${msg}`);
    runtime.log(`Stack trace: ${err instanceof Error ? err.stack : "N/A"}`);
    throw err;
  }
};

/*********************************
 * Workflow Initialization
 *********************************/

/**
 * Initializes the CRE workflow by setting up the EVM log trigger.
 * Configures the workflow to listen for LeaseCreated events from the LeaseAgreement contract.
 *
 * @param config - Validated workflow configuration
 * @returns Array of CRE handlers
 */
const initWorkflow = (config: Config) => {
  // Fetch the blockchain network to monitor
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.evms[0].chainSelectorName,
    isTestnet: true,
  });

  if (!network) {
    throw new Error(`Network not found for chain selector: ${config.evms[0].chainSelectorName}`);
  }

  // Create EVM client for the target chain
  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);

  // Compute the event topic hash for LeaseCreated
  const leaseCreatedHash = keccak256(toHex(LEASE_CREATED_SIGNATURE));

  // Register handler to trigger only on LeaseCreated events from our contract
  return [
    cre.handler(
      evmClient.logTrigger({
        addresses: [config.evms[0].leaseAgreementAddress],
        topics: [{ values: [leaseCreatedHash] }],
        confidence: "CONFIDENCE_LEVEL_FINALIZED", // Wait for block finality
      }),
      onLeaseCreatedTrigger
    ),
  ];
};

/*********************************
 * Entry Point
 *********************************/

/**
 * Main entry point for the CRE workflow.
 * Initializes the CRE runner with config schema validation and starts the workflow.
 */
export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema });
  await runner.run(initWorkflow);
}

main();
