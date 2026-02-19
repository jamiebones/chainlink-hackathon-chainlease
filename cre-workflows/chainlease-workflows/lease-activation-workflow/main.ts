
import {
  cre, type Runtime, type NodeRuntime,
  Runner, getNetwork, bytesToHex, EVMLog,
  handler,
  HTTPClient, consensusMedianAggregation, hexToBase64, EVMClient,
  consensusIdenticalAggregation, HTTPSendRequester
} from "@chainlink/cre-sdk";
import { keccak256, toHex, decodeEventLog, toBytes } from "viem";
import { Config, creditCheckCompletedEventArgsSchema } from "./types";
import { creditCheckCompletedEventAbi } from "../credit-check-workflow/contract/abi";





// Callback function that runs when an event log is detected
const onLogTrigger = (runtime: Runtime<Config>, log: EVMLog): string => {
  runtime.log(`Log detected from ${bytesToHex(log.address)}`)
  const topics = log.topics.map(t => bytesToHex(t)) as [`0x${string}`, ...`0x${string}`[]];
  const data = bytesToHex(log.data);
  const decodedLog = decodeEventLog({ abi: creditCheckCompletedEventAbi, data, topics });
  runtime.log(`Event: ${decodedLog.eventName}`);
  const validationResult = creditCheckCompletedEventArgsSchema.safeParse(decodedLog.args);

  if (!validationResult.success) {
    runtime.log(`Event validation failed: ${validationResult.error.message}`);
    throw new Error(`Invalid event arguments: ${validationResult.error.message}`);
  }

  const { leaseId, propertyId, passed } = validationResult.data;
  const httpClient = new HTTPClient();
  //retrieve the data of the tenant and verify their credit score using the credit check API
  
  if (passed) {
    runtime.log(`Credit check passed for lease ${leaseId.toString()} on property ${propertyId.toString()}`);    
    //send an email to the landlord that a tenant has passed the credit check and the lease can be activated

  }


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





































