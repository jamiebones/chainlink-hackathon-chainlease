// main.ts
// Entry point for the ChainLease credit check workflow.
// Monitors LeaseCreated events and automates tenant credit verification.

import {
  cre, type Runtime, type NodeRuntime,
  Runner, getNetwork, bytesToHex, EVMLog,
  handler,
  HTTPClient, consensusMedianAggregation, hexToBase64, EVMClient,
  consensusIdenticalAggregation, HTTPSendRequester
} from "@chainlink/cre-sdk";
import { keccak256, toHex, decodeEventLog, toBytes } from "viem";
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


  if (!result) {
    runtime.log(`Credit check failed for tenant ${tenant} on lease ${leaseId.toString()}`);
  }

  //WRITE TO THE CONTRACT:
  

  runtime.log(`Successfully sent data to webhook. Status: ${result.statusCode}`)
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
      }),
      onLogTrigger
    ),
  ]
}

export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}





































