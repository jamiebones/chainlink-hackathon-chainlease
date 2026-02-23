# CRE Onchain Read Reference

## Overview

This guide explains how to read data from a smart contract from within your CRE workflow. The TypeScript SDK uses viem for ABI handling and the SDK's EVMClient to create a type-safe developer experience.

**ChainLease Use Cases:**
- Check if lease is overdue for payment
- Read property metadata (rent amount, deposit)
- Get active leases for rent collection workflow
- Verify tenant credit check status
- Read lease state and dates

---

## The Read Pattern

Reading from a contract follows this pattern:

1. **Define your contract ABI**: Create a TypeScript file with your contract's ABI using viem's `parseAbi` (inline) or store it in `contracts/abi/` for complex workflows
2. **Get network information**: Use the SDK's `getNetwork()` helper to look up chain selector and other network details
3. **Instantiate the EVM Client**: Create an `EVMClient` instance with the chain selector
4. **Encode the function call**: Use viem's `encodeFunctionData()` to ABI-encode your function call
5. **Encode the call message**: Use `encodeCallMsg()` to create a properly formatted call message with `from`, `to`, and `data`
6. **Call the contract**: Use `callContract(runtime, {...})` to execute the read operation
7. **Decode the result**: Use viem's `decodeFunctionResult()` to decode the returned data
8. **Await the result**: Call `.result()` on the returned object to get the consensus-verified result

---

## Step-by-Step Example

Let's read a value from a simple Storage contract with a `get() view returns (uint256)` function.

### 1. Define the Contract ABI

For simple contracts, you can define the ABI inline using viem's `parseAbi`:

```typescript
import { parseAbi } from "viem"

const storageAbi = parseAbi(["function get() view returns (uint256)"])
```

For complex workflows with multiple contracts, it's recommended to create separate ABI files in a `contracts/abi/` directory.

### 2. The Workflow Logic

Here's a complete example of reading from a Storage contract:

```typescript
import {
  CronCapability,
  EVMClient,
  getNetwork,
  encodeCallMsg,
  bytesToHex,
  LAST_FINALIZED_BLOCK_NUMBER,
  type Runtime,
  Runner,
} from "@chainlink/cre-sdk"
import { type Address, encodeFunctionData, decodeFunctionResult, parseAbi, zeroAddress } from "viem"
import { z } from "zod"

// Define config schema with Zod
const configSchema = z.object({
  contractAddress: z.string(),
  chainSelectorName: z.string(),
})

type Config = z.infer<typeof configSchema>

// Define the Storage contract ABI
const storageAbi = parseAbi(["function get() view returns (uint256)"])

const onCronTrigger = (runtime: Runtime<Config>): string => {
  // Get network information
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: runtime.config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Network not found: ${runtime.config.chainSelectorName}`)
  }

  // Create EVM client with chain selector
  const evmClient = new EVMClient(network.chainSelector.selector)

  // Encode the function call
  const callData = encodeFunctionData({
    abi: storageAbi,
    functionName: "get",
    args: [], // No arguments for this function
  })

  // Call the contract
  const contractCall = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: runtime.config.contractAddress as Address,
        data: callData,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result()

  // Decode the result (convert Uint8Array to hex string for viem)
  const storedValue = decodeFunctionResult({
    abi: storageAbi,
    functionName: "get",
    data: bytesToHex(contractCall.data),
  })

  runtime.log(`Successfully read storage value: ${storedValue.toString()}`)
  return storedValue.toString()
}

const initWorkflow = (config: Config) => {
  const cron = new CronCapability()
  return [
    cron.handler(
      cron.trigger({
        schedule: "*/10 * * * * *", // Every 10 seconds
      }),
      onCronTrigger
    ),
  ]
}

export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}
```

---

## Understanding the Components

### Type-Safe Addresses

Notice the `as Address` type assertion when passing `contractAddress` to `encodeCallMsg`. This tells TypeScript the string is a valid Ethereum address, which is required by viem's `encodeCallMsg` function. The `Address` type is imported from viem.

### Network Lookup with getNetwork()

The SDK provides a `getNetwork()` helper that looks up network information by name:

```typescript
const network = getNetwork({
  chainFamily: "evm",
  chainSelectorName: "ethereum-testnet-sepolia",
  isTestnet: true,
})

// Returns network info including:
// - chainSelector.selector (numeric ID)
// - name
// - chainType
```

**Available Networks:**
- `ethereum-testnet-sepolia`
- `optimism-testnet-sepolia`
- `arbitrum-testnet-sepolia`
- `polygon-testnet-amoy`
- `base-testnet-sepolia`
- And many more...

---

## Block Number Options

When calling `callContract()`, you can specify which block to read from:

- **LAST_FINALIZED_BLOCK_NUMBER**: Read from the last finalized block (recommended for production)
- **LATEST_BLOCK_NUMBER**: Read from the latest block
- **Custom block number**: Use a `BigIntJson` object for custom finality depths or historical queries

```typescript
import { LAST_FINALIZED_BLOCK_NUMBER, LATEST_BLOCK_NUMBER } from "@chainlink/cre-sdk"

// Read from finalized block (most common)
const contractCall = evmClient.callContract(runtime, {
  call: encodeCallMsg({...}),
  blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
}).result()

// Or read from latest block
const contractCall = evmClient.callContract(runtime, {
  call: encodeCallMsg({...}),
  blockNumber: LATEST_BLOCK_NUMBER,
}).result()
```

### Custom Block Depths

For use cases requiring fixed confirmation thresholds (e.g., regulatory compliance) or historical state verification, you can specify an exact block number.

**Example 1 - Read from a specific historical block:**

```typescript
import { blockNumber } from '@chainlink/cre-sdk'

const historicalBlock = 9767655n
const contractCall = evmClient.callContract(runtime, {
  call: encodeCallMsg({...}),
  blockNumber: blockNumber(historicalBlock),
}).result()
```

**Example 2 - Read from 500 blocks ago for custom finality:**

```typescript
import { protoBigIntToBigint, blockNumber } from '@chainlink/cre-sdk'

// Get the latest block number
const latestHeader = evmClient.headerByNumber(runtime, {}).result()
if (!latestHeader.header?.blockNumber) {
  throw new Error("Failed to get latest block number")
}

// Convert protobuf BigInt to native bigint and calculate custom block
const latestBlockNum = protoBigIntToBigint(latestHeader.header.blockNumber)
const customBlock = latestBlockNum - 500n

// Call the contract at the custom block height
const contractCall = evmClient.callContract(runtime, {
  call: encodeCallMsg({...}),
  blockNumber: blockNumber(customBlock),
}).result()
```

**Helper functions:**

- `protoBigIntToBigint(pb)` — Converts a protobuf BigInt (returned by SDK methods like `headerByNumber`) to a native JavaScript bigint. Use this when you need to perform arithmetic on block numbers.

- `blockNumber(n)` — Converts a native bigint, number, or string to the protobuf BigInt JSON format required by SDK methods. This is an alias for `bigintToProtoBigInt`.

---

## Encoding Call Messages with encodeCallMsg()

The `encodeCallMsg()` helper converts your hex-formatted call data into the base64 format required by the EVM capability:

```typescript
import { encodeCallMsg } from "@chainlink/cre-sdk"
import { zeroAddress } from "viem"

const callMsg = encodeCallMsg({
  from: zeroAddress, // Caller address (typically zeroAddress for view functions)
  to: "0xYourContractAddress", // Contract address
  data: callData, // ABI-encoded function call from encodeFunctionData()
})
```

This helper is required because the underlying EVM capability expects addresses and data in base64 format, not hex.

---

## ABI Encoding/Decoding with viem

The TypeScript SDK relies on viem for all ABI operations:

- **encodeFunctionData()**: Encodes a function call into bytes
- **decodeFunctionResult()**: Decodes the returned bytes into TypeScript types
- **parseAbi()**: Parses human-readable ABI strings into typed ABI objects

---

## The .result() Pattern

All CRE capability calls return objects with a `.result()` method. Calling `.result()` blocks execution synchronously (within the WASM environment) and waits for the consensus-verified result.

```typescript
// This returns an object with a .result() method
const callObject = evmClient.callContract(runtime, {
  call: encodeCallMsg({...}),
  blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
})

// This blocks and returns the actual result
const contractCall = callObject.result()
```

This pattern is consistent across all SDK capabilities (EVM, HTTP, etc.).

---

## Solidity-to-TypeScript Type Mappings

Viem automatically handles type conversions:

| Solidity Type | TypeScript Type |
|---------------|-----------------|
| `uint8`, `uint256`, etc. | `bigint` |
| `int8`, `int256`, etc. | `bigint` |
| `address` | `string` |
| `bool` | `boolean` |
| `string` | `string` |
| `bytes`, `bytes32`, etc. | `Uint8Array` |

> **⚠️ Use safe scaling for decimal conversions**
>
> When converting values read from contracts (e.g., token balances, prices) to human-readable formats, use viem's `formatUnits()` instead of `Number(value) / 1e18`. Floating-point division causes silent precision loss for large bigint values.

**Example:**

```typescript
import { formatUnits } from "viem"

// ❌ BAD - Silent precision loss
const rentInEth = Number(rentAmount) / 1e18

// ✅ GOOD - Safe conversion
const rentInEth = formatUnits(rentAmount, 18)
```

---

## Complete Example with Configuration

### Main Workflow File (main.ts)

```typescript
import {
  CronCapability,
  EVMClient,
  getNetwork,
  encodeCallMsg,
  bytesToHex,
  LAST_FINALIZED_BLOCK_NUMBER,
  type Runtime,
  Runner,
} from "@chainlink/cre-sdk"
import { type Address, encodeFunctionData, decodeFunctionResult, parseAbi, zeroAddress } from "viem"
import { z } from "zod"

const configSchema = z.object({
  contractAddress: z.string(),
  chainSelectorName: z.string(),
})

type Config = z.infer<typeof configSchema>

const storageAbi = parseAbi(["function get() view returns (uint256)"])

const onCronTrigger = (runtime: Runtime<Config>): string => {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: runtime.config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Network not found: ${runtime.config.chainSelectorName}`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector)

  const callData = encodeFunctionData({
    abi: storageAbi,
    functionName: "get",
    args: [],
  })

  const contractCall = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: runtime.config.contractAddress as Address,
        data: callData,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result()

  const storedValue = decodeFunctionResult({
    abi: storageAbi,
    functionName: "get",
    data: bytesToHex(contractCall.data),
  })

  runtime.log(`Storage value: ${storedValue.toString()}`)
  return storedValue.toString()
}

const initWorkflow = (config: Config) => {
  const cron = new CronCapability()
  return [
    cron.handler(
      cron.trigger({
        schedule: "*/10 * * * * *",
      }),
      onCronTrigger
    ),
  ]
}

export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}
```

### Configuration File (config.json)

```json
{
  "contractAddress": "0xa17CF997C28FF154eDBae1422e6a50BeF23927F4",
  "chainSelectorName": "ethereum-testnet-sepolia"
}
```

> **Note: Chain Names**
>
> The `chainSelectorName` should match one of the supported networks in the SDK. Use the chain selector name format like "ethereum-testnet-sepolia".

---

## Working with Complex ABIs

For workflows with multiple contracts or complex ABIs, organize them in separate files:

### Contract ABI File (contracts/abi/Storage.ts)

```typescript
import { parseAbi } from "viem"

export const Storage = parseAbi([
  "function get() view returns (uint256)", 
  "function set(uint256 value) external"
])
```

### Export File (contracts/abi/index.ts)

```typescript
export { Storage } from "./Storage"
```

### Import in Workflow

```typescript
import { Storage } from "../contracts/abi"

const callData = encodeFunctionData({
  abi: Storage,
  functionName: "get",
  args: [],
})
```

This pattern provides better organization, reusability, and type safety across your workflow.

---

## ChainLease Example: Check Overdue Payments

```typescript
import {
  CronCapability,
  EVMClient,
  getNetwork,
  encodeCallMsg,
  bytesToHex,
  LAST_FINALIZED_BLOCK_NUMBER,
  type Runtime,
  Runner,
} from "@chainlink/cre-sdk"
import { type Address, encodeFunctionData, decodeFunctionResult, parseAbi, zeroAddress } from "viem"
import { z } from "zod"

const configSchema = z.object({
  leaseAgreementAddress: z.string(),
  chainSelectorName: z.string(),
})

type Config = z.infer<typeof configSchema>

// LeaseAgreement contract ABI (partial)
const leaseAgreementAbi = parseAbi([
  "function getActiveLeases() view returns (uint256[])",
  "function isPaymentOverdue(uint256 leaseId) view returns (bool)",
  "function getLease(uint256 leaseId) view returns (tuple(uint256 leaseId, uint256 propertyId, address landlord, address tenant, uint256 monthlyRent, uint256 securityDeposit, uint256 startDate, uint256 endDate, uint256 duration, uint8 state, bytes32 worldIdNullifierHash, bool creditCheckPassed, string verificationId, uint256 lastPaymentDate, uint256 createdAt))"
])

const onCronTrigger = (runtime: Runtime<Config>): string => {
  runtime.log("=== ChainLease Rent Monitoring Workflow ===")
  
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: runtime.config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Network not found: ${runtime.config.chainSelectorName}`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector)

  // Step 1: Get all active leases
  const getActiveLeasesData = encodeFunctionData({
    abi: leaseAgreementAbi,
    functionName: "getActiveLeases",
    args: [],
  })

  const activeLeasesCall = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: runtime.config.leaseAgreementAddress as Address,
        data: getActiveLeasesData,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result()

  const activeLeaseIds = decodeFunctionResult({
    abi: leaseAgreementAbi,
    functionName: "getActiveLeases",
    data: bytesToHex(activeLeasesCall.data),
  }) as bigint[]

  runtime.log(`Found ${activeLeaseIds.length} active leases`)

  // Step 2: Check each lease for overdue payments
  let overdueCount = 0
  for (const leaseId of activeLeaseIds) {
    const isOverdueData = encodeFunctionData({
      abi: leaseAgreementAbi,
      functionName: "isPaymentOverdue",
      args: [leaseId],
    })

    const isOverdueCall = evmClient
      .callContract(runtime, {
        call: encodeCallMsg({
          from: zeroAddress,
          to: runtime.config.leaseAgreementAddress as Address,
          data: isOverdueData,
        }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    const isOverdue = decodeFunctionResult({
      abi: leaseAgreementAbi,
      functionName: "isPaymentOverdue",
      data: bytesToHex(isOverdueCall.data),
    })

    if (isOverdue) {
      overdueCount++
      runtime.log(`⚠️ Lease #${leaseId.toString()} is OVERDUE`)
      
      // Here you would:
      // 1. Send notification to landlord
      // 2. Send reminder to tenant
      // 3. Calculate late fees
      // 4. Log to database
    }
  }

  runtime.log(`Total overdue leases: ${overdueCount}`)
  return `Checked ${activeLeaseIds.length} leases, ${overdueCount} overdue`
}

const initWorkflow = (config: Config) => {
  const cron = new CronCapability()
  return [
    cron.handler(
      cron.trigger({
        schedule: "0 0 * * *", // Daily at midnight
      }),
      onCronTrigger
    ),
  ]
}

export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}
```

---

## ChainLease Example: Read Lease Details

```typescript
import {
  EVMClient,
  getNetwork,
  encodeCallMsg,
  bytesToHex,
  LAST_FINALIZED_BLOCK_NUMBER,
  type Runtime,
} from "@chainlink/cre-sdk"
import { type Address, encodeFunctionData, decodeFunctionResult, parseAbi, zeroAddress, formatEther } from "viem"

const leaseAgreementAbi = parseAbi([
  "function getLease(uint256 leaseId) view returns (tuple(uint256 leaseId, uint256 propertyId, address landlord, address tenant, uint256 monthlyRent, uint256 securityDeposit, uint256 startDate, uint256 endDate, uint256 duration, uint8 state, bytes32 worldIdNullifierHash, bool creditCheckPassed, string verificationId, uint256 lastPaymentDate, uint256 createdAt))"
])

const readLeaseDetails = (runtime: Runtime<Config>, leaseId: bigint): void => {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: runtime.config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Network not found`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector)

  const callData = encodeFunctionData({
    abi: leaseAgreementAbi,
    functionName: "getLease",
    args: [leaseId],
  })

  const contractCall = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: runtime.config.leaseAgreementAddress as Address,
        data: callData,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result()

  const lease = decodeFunctionResult({
    abi: leaseAgreementAbi,
    functionName: "getLease",
    data: bytesToHex(contractCall.data),
  })

  // Access lease data with proper typing
  runtime.log(`Lease ID: ${lease.leaseId.toString()}`)
  runtime.log(`Property ID: ${lease.propertyId.toString()}`)
  runtime.log(`Landlord: ${lease.landlord}`)
  runtime.log(`Tenant: ${lease.tenant}`)
  runtime.log(`Monthly Rent: ${formatEther(lease.monthlyRent)} ETH`) // Safe conversion
  runtime.log(`Security Deposit: ${formatEther(lease.securityDeposit)} ETH`)
  runtime.log(`Credit Check Passed: ${lease.creditCheckPassed}`)
  runtime.log(`State: ${lease.state}`) // 0=Draft, 1=PendingApproval, 2=Active, etc.
}
```

---

## Common Patterns

### Pattern 1: Read Multiple Values

```typescript
// Read lease count
const totalLeasesData = encodeFunctionData({
  abi: leaseAbi,
  functionName: "totalLeases",
  args: [],
})

const totalLeasesCall = evmClient.callContract(runtime, {
  call: encodeCallMsg({
    from: zeroAddress,
    to: contractAddress as Address,
    data: totalLeasesData,
  }),
  blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
}).result()

const totalLeases = decodeFunctionResult({
  abi: leaseAbi,
  functionName: "totalLeases",
  data: bytesToHex(totalLeasesCall.data),
})

// Then iterate and read each lease
for (let i = 1n; i <= totalLeases; i++) {
  // Read individual lease details...
}
```

### Pattern 2: Read with Parameters

```typescript
const isOverdueData = encodeFunctionData({
  abi: leaseAbi,
  functionName: "isPaymentOverdue",
  args: [leaseId], // Pass parameters
})

const result = evmClient.callContract(runtime, {
  call: encodeCallMsg({
    from: zeroAddress,
    to: contractAddress as Address,
    data: isOverdueData,
  }),
  blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
}).result()

const isOverdue = decodeFunctionResult({
  abi: leaseAbi,
  functionName: "isPaymentOverdue",
  data: bytesToHex(result.data),
})
```

### Pattern 3: Read Address Arrays

```typescript
const arrayData = encodeFunctionData({
  abi: leaseAbi,
  functionName: "getTenantLeases",
  args: [tenantAddress],
})

const result = evmClient.callContract(runtime, {
  call: encodeCallMsg({
    from: zeroAddress,
    to: contractAddress as Address,
    data: arrayData,
  }),
  blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
}).result()

const leaseIds = decodeFunctionResult({
  abi: leaseAbi,
  functionName: "getTenantLeases",
  data: bytesToHex(result.data),
}) as bigint[] // Type assertion for array
```

---

## Important Considerations

1. **Type Safety**: Always use `as Address` for contract addresses when passing to `encodeCallMsg()`
2. **Block Finality**: Use `LAST_FINALIZED_BLOCK_NUMBER` for production to avoid reorg issues
3. **Decimal Conversion**: Use `formatUnits()` from viem, not floating-point division
4. **Error Handling**: Wrap contract calls in try-catch blocks for robust workflows
5. **ABI Organization**: Store complex ABIs in separate files for better maintainability
6. **Consensus**: The `.result()` call waits for consensus verification across DON nodes

---

## Error Handling Example

```typescript
const onCronTrigger = (runtime: Runtime<Config>): string => {
  try {
    const network = getNetwork({
      chainFamily: "evm",
      chainSelectorName: runtime.config.chainSelectorName,
      isTestnet: true,
    })

    if (!network) {
      throw new Error(`Network not found: ${runtime.config.chainSelectorName}`)
    }

    const evmClient = new EVMClient(network.chainSelector.selector)

    const callData = encodeFunctionData({
      abi: storageAbi,
      functionName: "get",
      args: [],
    })

    const contractCall = evmClient
      .callContract(runtime, {
        call: encodeCallMsg({
          from: zeroAddress,
          to: runtime.config.contractAddress as Address,
          data: callData,
        }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    const value = decodeFunctionResult({
      abi: storageAbi,
      functionName: "get",
      data: bytesToHex(contractCall.data),
    })

    runtime.log(`Successfully read value: ${value.toString()}`)
    return value.toString()
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    runtime.log(`Error reading contract: ${errorMsg}`)
    throw error // Re-throw to mark workflow execution as failed
  }
}
```

---

## Resources

- [CRE SDK Documentation](https://docs.chain.link/chainlink-functions/resources/service-responsibility)
- [Viem Documentation](https://viem.sh)
- [EVM Client SDK Reference](https://docs.chain.link/chainlink-functions/resources/service-responsibility)
- [Safe Decimal Scaling](https://viem.sh/docs/utilities/formatUnits.html)

---

**Last Updated:** February 21, 2026  
**ChainLease Development Team**
