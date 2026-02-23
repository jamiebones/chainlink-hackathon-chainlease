// main.ts
// Entry point for the ChainLease credit check workflow.
// Monitors LeaseCreated events and automates tenant credit verification.

import {
  type Runtime,
  Runner,
  getNetwork,
  bytesToHex,
  type EVMLog,
  handler,
  HTTPClient,
  hexToBase64,
  EVMClient,
  consensusIdenticalAggregation
} from "@chainlink/cre-sdk";
import { keccak256, decodeEventLog, toBytes } from "viem";
import { configSchema, Config, CreditCheckResponse, leaseCreatedEventArgsSchema, LeaseData } from "./types";
import { fetchCreditCheck } from "./credit-check";
import { submitCreditCheckResult } from "./evm";
import { leaseCreatedEventAbi, LEASE_CREATED_SIGNATURE } from "./abi";





// Callback function that runs when an event log is detected
const onLogTrigger = (runtime: Runtime<Config>, log: EVMLog): string => {
  runtime.log(`Log detected from ${bytesToHex(log.address)}`)
  const topics = log.topics.map(t => bytesToHex(t)) as [`0x${string}`, ...`0x${string}`[]];
  const data = bytesToHex(log.data);
  const decodedLog = decodeEventLog({ abi: leaseCreatedEventAbi, data, topics });
  runtime.log(`Event: ${decodedLog.eventName}`);
  const validationResult = leaseCreatedEventArgsSchema.safeParse(decodedLog.args);

  if (!validationResult.success) {
    runtime.log(`Event validation failed: ${validationResult.error.message}`);
    throw new Error(`Invalid event arguments: ${validationResult.error.message}`);
  }

  const { leaseId, propertyId, tenant } = validationResult.data;
  const httpClient = new HTTPClient();
  //retrieve the data of the tenant and verify their credit score using the credit check API
  const leaseData: LeaseData = {
    leaseId,
    propertyId,
    tenantAddress: tenant,
  };
  const result = httpClient
    .sendRequest(
      runtime,
      fetchCreditCheck,
      consensusIdenticalAggregation<CreditCheckResponse>()
    )(runtime.config,
      leaseData)
    .result()

  // Check if API call was successful
  if (!result || result.statusCode !== 200) {
    runtime.log(`Credit check API failed for tenant ${tenant} on lease ${leaseId.toString()}`);
    // Submit failure result to contract
    submitCreditCheckResult(runtime, leaseId, false, "api-error");
    return `Credit check API failed for lease ${leaseId.toString()}`;
  }

  // Submit successful result to contract
  submitCreditCheckResult(runtime, BigInt(result.leaseId), result.passed, result.verificationId);
  runtime.log(`Credit check completed: ${result.passed ? 'PASSED' : 'FAILED'} (Score: ${result.creditScore})`)
  return "Log processed successfully"
}

const initWorkflow = (config: Config) => {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.evms.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Network not found: ${config.evms.chainSelectorName}`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector);
  const leaseEventHash = keccak256(toBytes("LeaseCreated(uint256,uint256,address,uint256)"))

  return [
    handler(
      evmClient.logTrigger({
        addresses: [hexToBase64(config.evms.leaseAgreementAddress)],
        topics: [
          { values: [hexToBase64(leaseEventHash)] },
        ],
        confidence: "CONFIDENCE_LEVEL_FINALIZED",
      }),
      onLogTrigger
    ),
  ]
}

export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}





































