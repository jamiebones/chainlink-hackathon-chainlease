# CRE EVM Log Trigger Reference

## Overview

The EVM Log trigger fires when a specific log (event) is emitted by a smart contract on an EVM-compatible blockchain. This capability allows you to build powerful, event-driven workflows that react to onchain activity.

This guide covers:
1. How to configure your workflow to listen for specific events
2. How to decode the event data your workflow receives

**ChainLease Use Cases:**
- Credit check automation on `LeaseCreated` event
- Email notifications on `LeaseActivated` event
- Dispute handling on `DisputeRaised` event
- Payment tracking on `RentPaid` event

---

## Configuring Your Trigger

You create an EVM Log trigger by calling the `EVMClient.logTrigger()` method with a `FilterLogTriggerRequest` configuration. This configuration specifies which contract addresses and event topics to listen for.

> **⚠️ Base64 Encoding Required**  
> All addresses and topic values must be base64 encoded using the `hexToBase64()` helper function from the CRE SDK. While the workflow simulator accepts raw hex strings for convenience during development, deployed workflows require base64 encoding. Always use `hexToBase64()` on addresses and topic values to ensure your workflow works in both simulation and production.

---

## Basic Configuration

The simplest configuration listens for all events from specific contract addresses:

```typescript
import {
  EVMClient,
  handler,
  getNetwork,
  type Runtime,
  type EVMLog,
  Runner,
  bytesToHex,
  hexToBase64,
} from "@chainlink/cre-sdk"

type Config = {
  chainSelectorName: string
  contractAddress: string
}

// Callback function that runs when an event log is detected
const onLogTrigger = (runtime: Runtime<Config>, log: EVMLog): string => {
  runtime.log(`Log detected from ${bytesToHex(log.address)}`)
  // Your logic here...
  return "Log processed"
}

const initWorkflow = (config: Config) => {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Network not found: ${config.chainSelectorName}`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector)

  return [
    handler(
      evmClient.logTrigger({
        addresses: [hexToBase64(config.contractAddress)],
      }),
      onLogTrigger
    ),
  ]
}

export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}
```

---

## Filtering by Event Type

To listen for specific event types, you need to provide the event's signature hash as the first topic (Topics[0]). You can compute this using viem's `keccak256` and `toBytes` functions:

```typescript
import { keccak256, toBytes } from "viem"
import { hexToBase64 } from "@chainlink/cre-sdk"

const initWorkflow = (config: Config) => {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Network not found: ${config.chainSelectorName}`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector)

  // Compute the event signature hash for Transfer(address,address,uint256)
  const transferEventHash = keccak256(toBytes("Transfer(address,address,uint256)"))

  return [
    handler(
      evmClient.logTrigger({
        addresses: [hexToBase64(config.contractAddress)],
        topics: [
          { values: [hexToBase64(transferEventHash)] }, // Listen only for Transfer events
        ],
      }),
      onLogTrigger
    ),
  ]
}
```

---

## Filtering by Indexed Parameters

EVM events can have up to 3 indexed parameters (in addition to the event signature). You can filter on these indexed parameters by providing their values in the topics array.

### Understanding Topic Filtering

- **addresses**: The trigger fires if the event is emitted from any contract in this list (OR logic)
- **topics**: An event must match the conditions for all defined topic slots (AND logic between topics). Within a single topic, you can provide multiple values, and it will match if the event's topic is any of those values (OR logic within a topic)
- **Wildcarding topics**: To skip filtering on a specific topic position, omit it from the topics array or provide an empty values array `{ values: [] }`

> **⚠️ Topic values must be padded to 32 bytes and base64 encoded**
>
> EVM logs always store indexed parameters as 32-byte values. When filtering on topics 1, 2, or 3:
> - Pad your values to 32 bytes using `padHex(value, { size: 32 })` (e.g., addresses are 20 bytes and must be padded)
> - Convert to base64 using `hexToBase64()`
>
> If you don't pad correctly, your filter won't match the actual log topics and the trigger will not fire.
>
> Topic 0 (the event signature from `keccak256`) is already 32 bytes and doesn't need padding.

---

### Example 1: Filtering on a Single Indexed Parameter

To trigger only on Transfer events where the `from` address is a specific value:

```typescript
import { keccak256, toBytes, padHex } from "viem"
import { hexToBase64 } from "@chainlink/cre-sdk"

const initWorkflow = (config: Config) => {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Network not found: ${config.chainSelectorName}`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector)

  const transferEventHash = keccak256(toBytes("Transfer(address,address,uint256)"))
  const aliceAddress = "0xAlice..." as `0x${string}`

  return [
    handler(
      evmClient.logTrigger({
        addresses: [hexToBase64(config.contractAddress)],
        topics: [
          { values: [hexToBase64(transferEventHash)] }, // Topic 0: Event signature (Transfer)
          { values: [hexToBase64(padHex(aliceAddress, { size: 32 }))] }, // Topic 1: from = Alice
        ],
      }),
      onLogTrigger
    ),
  ]
}
```

> **Note: Indexed Parameters and Topics**
>
> Only parameters marked as `indexed` in the Solidity event definition can be filtered using topics. The event signature is always Topics[0]. Subsequent indexed parameters are Topics[1], Topics[2], and Topics[3].
>
> **Encoding different types:**
> - **Addresses**: Cast as `` `0x${string}` ``, use `padHex(address, { size: 32 })` then `hexToBase64()`
> - **uint256**: Use `padHex(numberToHex(value), { size: 32 })` then `hexToBase64()`
> - **bytes32**: Ensure it's 32 bytes, then use `hexToBase64()` directly

---

### Example 2: "AND" Filtering

To trigger on Transfer events where `from` is Alice AND `to` is Bob:

```typescript
import { keccak256, toBytes, padHex } from "viem"
import { hexToBase64 } from "@chainlink/cre-sdk"

const initWorkflow = (config: Config) => {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Network not found: ${config.chainSelectorName}`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector)

  const transferEventHash = keccak256(toBytes("Transfer(address,address,uint256)"))
  const aliceAddress = "0xAlice..." as `0x${string}`
  const bobAddress = "0xBob..." as `0x${string}`

  return [
    handler(
      evmClient.logTrigger({
        addresses: [hexToBase64(config.contractAddress)],
        topics: [
          { values: [hexToBase64(transferEventHash)] }, // Topic 0: Event signature (Transfer)
          { values: [hexToBase64(padHex(aliceAddress, { size: 32 }))] }, // Topic 1: from = Alice
          { values: [hexToBase64(padHex(bobAddress, { size: 32 }))] }, // Topic 2: to = Bob
        ],
      }),
      onLogTrigger
    ),
  ]
}
```

---

### Example 3: "OR" Filtering

To trigger on Transfer events where `from` is either Alice OR Charlie:

```typescript
import { keccak256, toBytes, padHex } from "viem"
import { hexToBase64 } from "@chainlink/cre-sdk"

const initWorkflow = (config: Config) => {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Network not found: ${config.chainSelectorName}`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector)

  const transferEventHash = keccak256(toBytes("Transfer(address,address,uint256)"))
  const aliceAddress = "0xAlice..." as `0x${string}`
  const charlieAddress = "0xCharlie..." as `0x${string}`

  return [
    handler(
      evmClient.logTrigger({
        addresses: [hexToBase64(config.contractAddress)],
        topics: [
          { values: [hexToBase64(transferEventHash)] }, // Topic 0: Event signature (Transfer)
          {
            values: [
              hexToBase64(padHex(aliceAddress, { size: 32 })),
              hexToBase64(padHex(charlieAddress, { size: 32 })),
            ],
          }, // Topic 1: from = Alice OR Charlie
        ],
      }),
      onLogTrigger
    ),
  ]
}
```

---

### Example 4: Multiple Event Types

To listen for multiple event types from a single contract, provide multiple event signature hashes in Topics[0]:

```typescript
import { keccak256, toBytes } from "viem"
import { hexToBase64 } from "@chainlink/cre-sdk"

const initWorkflow = (config: Config) => {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Network not found: ${config.chainSelectorName}`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector)

  const transferEventHash = keccak256(toBytes("Transfer(address,address,uint256)"))
  const approvalEventHash = keccak256(toBytes("Approval(address,address,uint256)"))

  return [
    handler(
      evmClient.logTrigger({
        addresses: [hexToBase64(config.contractAddress)],
        topics: [
          { values: [hexToBase64(transferEventHash), hexToBase64(approvalEventHash)] }, // Listen for Transfer OR Approval
        ],
      }),
      onLogTrigger
    ),
  ]
}
```

---

### Example 5: Multiple Contracts

To listen for the same event from multiple contracts, provide multiple addresses:

```typescript
import { keccak256, toBytes } from "viem"
import { hexToBase64 } from "@chainlink/cre-sdk"

const initWorkflow = (config: Config) => {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Network not found: ${config.chainSelectorName}`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector)

  const transferEventHash = keccak256(toBytes("Transfer(address,address,uint256)"))

  return [
    handler(
      evmClient.logTrigger({
        addresses: [hexToBase64("0xTokenA..."), hexToBase64("0xTokenB..."), hexToBase64("0xTokenC...")],
        topics: [
          { values: [hexToBase64(transferEventHash)] }, // Listen for Transfer events from any of these contracts
        ],
      }),
      onLogTrigger
    ),
  ]
}
```

---

### Example 6: Filtering on uint256 Indexed Parameter

To filter on indexed `uint256` or other numeric types, convert them to a 32-byte hex value:

```typescript
import { keccak256, toBytes, numberToHex, padHex } from "viem"
import { hexToBase64 } from "@chainlink/cre-sdk"

const initWorkflow = (config: Config) => {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Network not found: ${config.chainSelectorName}`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector)

  // Example: event ValueChanged(address indexed user, uint256 indexed newValue)
  const eventHash = keccak256(toBytes("ValueChanged(address,uint256)"))
  const userAddress = padHex("0xUser..." as `0x${string}`, { size: 32 })
  const targetValue = padHex(numberToHex(12345), { size: 32 })

  return [
    handler(
      evmClient.logTrigger({
        addresses: [hexToBase64(config.contractAddress)],
        topics: [
          { values: [hexToBase64(eventHash)] }, // Topic 0: Event signature
          { values: [hexToBase64(userAddress)] }, // Topic 1: user address
          { values: [hexToBase64(targetValue)] }, // Topic 2: newValue = 12345
        ],
      }),
      onLogTrigger
    ),
  ]
}
```

> **Note: Converting Numbers to Topics**
>
> For indexed `uint256` parameters, use `numberToHex()` to convert the number to hex, then `padHex()` to ensure it's 32 bytes, and finally `hexToBase64()` to encode it for the trigger configuration. For `bytes32` parameters, ensure they're already 32 bytes and apply `hexToBase64()` directly.

---

## Confidence Level

You can set the block confirmation level by adding the `confidence` field to the trigger configuration:

```typescript
evmClient.logTrigger({
  addresses: [hexToBase64(config.contractAddress)],
  confidence: "CONFIDENCE_LEVEL_FINALIZED", // Wait for finalized blocks
})
```

**Available confidence levels:**
- `CONFIDENCE_LEVEL_UNSPECIFIED` - Default behavior
- `CONFIDENCE_LEVEL_FINALIZED` - Wait for block finality (recommended for production)
- `CONFIDENCE_LEVEL_SAFE` - Wait for safe blocks

---

## Decoding the Event Payload

Once your trigger is configured, your handler function receives an `EVMLog` object.

### EVMLog Object Fields

| Field | Description |
|-------|-------------|
| `address` | The contract address that emitted the event |
| `topics` | An array of indexed event parameters |
| `data` | The non-indexed event parameters |
| `eventSig` | The keccak256 hash of the event signature |
| `blockNumber` | The block number where the event was emitted |
| `blockHash` | The block hash |
| `txHash` | The transaction hash |
| `txIndex` | The transaction index within the block |
| `index` | The log index within the block |
| `removed` | Flag indicating if the log was removed during a reorg |

---

### Method 1: Manual Topic Extraction

The simplest approach is to manually extract values from the `topics` array. This is useful when you only need a few indexed parameters.

For example, to decode a `Transfer(address indexed from, address indexed to, uint256 value)` event:

```typescript
import { bytesToHex } from "@chainlink/cre-sdk"
import type { EVMLog, Runtime } from "@chainlink/cre-sdk"

const onLogTrigger = (runtime: Runtime<Config>, log: EVMLog): string => {
  const topics = log.topics

  if (topics.length < 3) {
    throw new Error("Log missing required topics")
  }

  // topics[0] is the event signature
  runtime.log(`Event signature: ${bytesToHex(topics[0])}`)

  // topics[1] is the first indexed parameter (from address for Transfer)
  // Addresses are 32 bytes, but the actual address is the last 20 bytes
  const fromAddress = bytesToHex(topics[1].slice(12))
  runtime.log(`From address: ${fromAddress}`)

  // topics[2] is the second indexed parameter (to address for Transfer)
  const toAddress = bytesToHex(topics[2].slice(12))
  runtime.log(`To address: ${toAddress}`)

  // For non-indexed parameters, you'll need to decode log.data using viem
  runtime.log(`Data length: ${log.data.length} bytes`)

  return "Log processed"
}
```

---

### Method 2: Using viem's decodeEventLog

For more complex events or when you need to decode non-indexed parameters, you can use viem's `decodeEventLog` function. First, define your event ABI:

```typescript
import { decodeEventLog, parseAbi } from "viem"
import { bytesToHex } from "@chainlink/cre-sdk"
import type { EVMLog, Runtime } from "@chainlink/cre-sdk"

// Define your event ABI
const eventAbi = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
])

const onLogTrigger = (runtime: Runtime<Config>, log: EVMLog): string => {
  // Convert topics and data to hex format for viem
  const topics = log.topics.map((topic) => bytesToHex(topic)) as [`0x${string}`, ...`0x${string}`[]]
  const data = bytesToHex(log.data)

  // Decode the event
  const decodedLog = decodeEventLog({
    abi: eventAbi,
    data,
    topics,
  })

  runtime.log(`Event name: ${decodedLog.eventName}`)

  if (decodedLog.eventName === "Transfer") {
    const { from, to, value } = decodedLog.args
    runtime.log(`Transfer from ${from} to ${to}, value: ${value.toString()}`)
  } else if (decodedLog.eventName === "Approval") {
    const { owner, spender, value } = decodedLog.args
    runtime.log(`Approval by ${owner} to ${spender}, value: ${value.toString()}`)
  }

  return "Log decoded"
}
```

> **Note: Using Contract ABI Files**
>
> For complex workflows, consider defining your contract ABIs in separate TypeScript files (e.g., `contracts/abi/MyContract.ts`) and importing them. This approach provides better type safety and reusability.

> **Note: Type Assertion for Topics**
>
> The type assertion `as [`0x${string}`, ...`0x${string}`[]]` tells TypeScript that topics is a non-empty array of hex strings (required by viem's `decodeEventLog`). This ensures the event signature is always present as the first element.

---

### Method 3: Manual Decoding with viem Utilities

If you need fine-grained control, you can manually decode specific fields using viem's utilities:

```typescript
import { bytesToHex } from "@chainlink/cre-sdk"
import { decodeAbiParameters, parseAbiParameters } from "viem"
import type { EVMLog, Runtime } from "@chainlink/cre-sdk"

const onLogTrigger = (runtime: Runtime<Config>, log: EVMLog): string => {
  const topics = log.topics

  // Manually extract indexed parameters
  const fromAddress = bytesToHex(topics[1].slice(12))
  const toAddress = bytesToHex(topics[2].slice(12))

  // Decode non-indexed parameters from log.data
  const decodedData = decodeAbiParameters(parseAbiParameters("uint256 value"), bytesToHex(log.data))
  const value = decodedData[0]

  runtime.log(`Transfer: ${fromAddress} -> ${toAddress}, value: ${value.toString()}`)

  return "Log decoded"
}
```

---

## Complete Example

Here's a complete example that listens for ERC20 Transfer events and decodes them:

```typescript
import {
  EVMClient,
  handler,
  getNetwork,
  type Runtime,
  type EVMLog,
  Runner,
  bytesToHex,
  hexToBase64,
} from "@chainlink/cre-sdk"
import { keccak256, toBytes, decodeEventLog, parseAbi } from "viem"

type Config = {
  chainSelectorName: string
  tokenAddress: string
}

const eventAbi = parseAbi(["event Transfer(address indexed from, address indexed to, uint256 value)"])

const onLogTrigger = (runtime: Runtime<Config>, log: EVMLog): string => {
  const topics = log.topics.map((topic) => bytesToHex(topic)) as [`0x${string}`, ...`0x${string}`[]]
  const data = bytesToHex(log.data)

  const decodedLog = decodeEventLog({
    abi: eventAbi,
    data,
    topics,
  })

  const { from, to, value } = decodedLog.args
  runtime.log(`Transfer detected: ${from} -> ${to}, amount: ${value.toString()}`)

  return `Processed transfer of ${value.toString()}`
}

const initWorkflow = (config: Config) => {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Network not found: ${config.chainSelectorName}`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector)
  const transferEventHash = keccak256(toBytes("Transfer(address,address,uint256)"))

  return [
    handler(
      evmClient.logTrigger({
        addresses: [hexToBase64(config.tokenAddress)],
        topics: [{ values: [hexToBase64(transferEventHash)] }],
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
```

---

## ChainLease Example: Credit Check Workflow

```typescript
import {
  cre, type Runtime, type NodeRuntime,
  Runner, getNetwork, bytesToHex, EVMLog,
  handler,
  HTTPClient, hexToBase64, EVMClient,
  consensusIdenticalAggregation
} from "@chainlink/cre-sdk"
import { keccak256, toHex, decodeEventLog, toBytes } from "viem"

type Config = {
  chainSelectorName: string
  leaseAgreementAddress: string
}

// LeaseCreated event ABI
const leaseCreatedEventAbi = [
  {
    type: "event",
    name: "LeaseCreated",
    inputs: [
      { type: "uint256", name: "leaseId", indexed: true },
      { type: "uint256", name: "propertyId", indexed: true },
      { type: "address", name: "tenant", indexed: true },
      { type: "uint256", name: "monthlyRent", indexed: false },
    ],
  },
] as const

// Callback function that runs when LeaseCreated event is detected
const onLogTrigger = (runtime: Runtime<Config>, log: EVMLog): string => {
  runtime.log(`LeaseCreated event detected from ${bytesToHex(log.address)}`)
  
  const topics = log.topics.map(t => bytesToHex(t)) as [`0x${string}`, ...`0x${string}`[]]
  const data = bytesToHex(log.data)
  
  const decodedLog = decodeEventLog({ 
    abi: leaseCreatedEventAbi, 
    data, 
    topics 
  })
  
  runtime.log(`Event: ${decodedLog.eventName}`)
  
  const { leaseId, propertyId, tenant } = decodedLog.args
  
  runtime.log(`Lease ID: ${leaseId.toString()}`)
  runtime.log(`Property ID: ${propertyId.toString()}`)
  runtime.log(`Tenant: ${tenant}`)
  
  // 1. Call credit check API
  // 2. Submit result to contract
  // 3. Store audit trail
  
  return "Credit check workflow completed"
}

const initWorkflow = (config: Config) => {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Network not found: ${config.chainSelectorName}`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector)
  const leaseEventHash = keccak256(toBytes("LeaseCreated(uint256,uint256,address,uint256)"))

  return [
    handler(
      evmClient.logTrigger({
        addresses: [hexToBase64(config.leaseAgreementAddress)],
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
```

---

## ChainLease Example: Lease Notification Workflow

```typescript
import {
  cre,
  type Runtime,
  type NodeRuntime,
  Runner,
  getNetwork,
  bytesToHex,
  EVMLog,
  HTTPClient,
  hexToBase64,
  EVMClient,
} from "@chainlink/cre-sdk"
import { keccak256, decodeEventLog, toBytes } from "viem"

type Config = {
  chainSelectorName: string
  leaseAgreementAddress: string
  backendApi: {
    endpoint: string
    apiKey?: string
  }
}

// LeaseActivated event ABI
const leaseActivatedEventAbi = [
  {
    type: "event",
    name: "LeaseActivated",
    inputs: [
      { type: "uint256", name: "leaseId", indexed: true },
      { type: "address", name: "tenant", indexed: true },
      { type: "address", name: "landlord", indexed: true },
      { type: "uint256", name: "propertyId", indexed: false },
      { type: "uint256", name: "startDate", indexed: false },
      { type: "uint256", name: "endDate", indexed: false },
      { type: "uint256", name: "monthlyRent", indexed: false },
    ],
  },
] as const

const onLeaseActivatedTrigger = (runtime: Runtime<Config>, log: EVMLog): string => {
  runtime.log("=== ChainLease Lease Notification Workflow ===")
  
  const topics = log.topics.map((t) => bytesToHex(t)) as [`0x${string}`, ...`0x${string}`[]]
  const data = bytesToHex(log.data)

  const decodedLog = decodeEventLog({
    abi: leaseActivatedEventAbi,
    data,
    topics,
  })

  const { leaseId, tenant, landlord, propertyId, startDate, endDate, monthlyRent } = decodedLog.args
  
  runtime.log(`Lease ${leaseId.toString()} activated`)
  runtime.log(`Tenant: ${tenant}`)
  runtime.log(`Landlord: ${landlord}`)
  
  // Call backend API to send email notification
  // Backend fetches tenant email from database and sends welcome email
  
  return "Lease activation notification sent"
}

const initWorkflow = (config: Config) => {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Network not found: ${config.chainSelectorName}`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector)
  const eventHash = keccak256(toBytes("LeaseActivated(uint256,address,address,uint256,uint256,uint256,uint256)"))

  return [
    handler(
      evmClient.logTrigger({
        addresses: [hexToBase64(config.leaseAgreementAddress)],
        topics: [{ values: [hexToBase64(eventHash)] }],
        confidence: "CONFIDENCE_LEVEL_FINALIZED",
      }),
      onLeaseActivatedTrigger
    ),
  ]
}

export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}
```

---

## Testing Log Triggers in Simulation

To test your EVM log trigger during development, you can use the workflow simulator with a transaction hash and event index. The simulator fetches the log from your configured RPC and passes it to your callback function.

### Simulation Commands

```bash
# Interactive simulation (select trigger and provide tx hash)
bun x cre sim staging-settings

# Non-interactive simulation
bun x cre sim staging-settings --trigger 0 --tx-hash 0xabcdef... --event-index 0

# View logs during simulation
bun x cre logs staging-settings --follow
```

### Finding Transaction Hash and Event Index

1. Go to block explorer (e.g., Etherscan)
2. Find a transaction that emitted your target event
3. Click on "Logs" tab
4. Note the transaction hash and event index (position in logs array, starting from 0)

---

## Common Patterns

### Pattern 1: Listen to All Events from a Contract

```typescript
evmClient.logTrigger({
  addresses: [hexToBase64(contractAddress)],
  // No topics filter - listens to all events
})
```

### Pattern 2: Listen to Specific Event from Multiple Contracts

```typescript
evmClient.logTrigger({
  addresses: [
    hexToBase64(contract1),
    hexToBase64(contract2),
    hexToBase64(contract3)
  ],
  topics: [{ values: [hexToBase64(eventHash)] }],
})
```

### Pattern 3: Listen to Multiple Events from Same Contract

```typescript
evmClient.logTrigger({
  addresses: [hexToBase64(contractAddress)],
  topics: [{ 
    values: [
      hexToBase64(event1Hash), 
      hexToBase64(event2Hash),
      hexToBase64(event3Hash)
    ] 
  }],
})
```

### Pattern 4: Filter by Indexed Address Parameter

```typescript
const userAddress = "0x123..." as `0x${string}`

evmClient.logTrigger({
  addresses: [hexToBase64(contractAddress)],
  topics: [
    { values: [hexToBase64(eventHash)] },
    { values: [hexToBase64(padHex(userAddress, { size: 32 }))] }, // Filter by user
  ],
})
```

---

## Important Considerations

1. **Base64 Encoding**: Always use `hexToBase64()` for addresses and topics in production
2. **Topic Padding**: Indexed parameters must be padded to 32 bytes with `padHex()`
3. **Confidence Level**: Use `CONFIDENCE_LEVEL_FINALIZED` for production workflows to avoid reorgs
4. **Event Signature**: Always compute using `keccak256(toBytes("EventName(type1,type2,...)"))` with exact parameter types
5. **Address Extraction**: Address topics are 32 bytes but actual address is last 20 bytes (use `.slice(12)`)
6. **Type Safety**: Use `parseAbi()` or import contract ABIs for better TypeScript support

---

## Resources

- [CRE SDK Documentation](https://docs.chain.link/chainlink-functions/resources/service-responsibility)
- [Viem Documentation](https://viem.sh)
- [EVM Log Structure](https://docs.soliditylang.org/en/latest/abi-spec.html#events)
- [Simulating Workflows Guide](https://docs.chain.link/chainlink-functions/resources/service-responsibility)

---

**Last Updated:** February 21, 2026  
**ChainLease Development Team**
