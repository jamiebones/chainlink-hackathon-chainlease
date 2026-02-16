# Chainlink Runtime Environment (CRE) Skills

## Overview
**CRE** = **Chainlink Runtime Environment** - A platform for building and deploying blockchain workflows that can:
- Execute off-chain computations
- Read from blockchain contracts
- Write data back to blockchain contracts
- Interact with external APIs
- Use Chainlink oracles and services

---

## Core Architecture: Onchain Write Flow

### 1. Data Flow Process
```
Workflow → Signed Report → KeystoneForwarder Contract → Consumer Contract
```

**Steps:**
1. **Workflow Execution**: Your workflow produces a final signed report
2. **EVM Write**: The EVM capability sends the report to the Chainlink-managed `KeystoneForwarder` contract
3. **Forwarder Validation**: The `KeystoneForwarder` validates the report's cryptographic signatures
4. **Callback**: If valid, the forwarder calls `onReport(bytes metadata, bytes report)` on your consumer contract

### 2. Security Layers
- **DON Signatures**: Cryptographic verification by Decentralized Oracle Network
- **Forwarder Address**: Required at deployment time
- **Workflow ID**: Optional validation for single-workflow scenarios
- **Workflow Owner**: Optional validation for multi-workflow scenarios
- **Workflow Name**: Optional validation (requires owner validation)

---

## Building Consumer Contracts

### Required Interfaces

#### IReceiver Interface
**Official Chainlink Import:**
```solidity
import {IReceiver} from "@chainlink/contracts/src/v0.8/keystone/interfaces/IReceiver.sol";
```

Interface definition:
```solidity
interface IReceiver is IERC165 {
  function onReport(
    bytes calldata metadata,
    bytes calldata report
  ) external;
}
```

**Parameters:**
- `metadata`: Contains workflow information (workflowId, workflowName, workflowOwner)
  - Encoded as: `abi.encodePacked(bytes32 workflowId, bytes10 workflowName, address workflowOwner)`
- `report`: The raw, ABI-encoded data payload from your workflow

#### ERC165 Support
Must implement `supportsInterface` to allow the forwarder to detect the IReceiver interface.

---

### ReceiverTemplate (Recommended Base Contract)

**Note:** While Chainlink provides the `IReceiver` interface in `@chainlink/contracts`, the `ReceiverTemplate` is provided as **reference implementation code** in their documentation, not as an exported contract. You should implement it yourself based on the [official documentation](https://docs.chain.link/cre/guides/workflow/using-evm-client/onchain-write/building-consumer-contracts).

**Import Path (for IReceiver):**
```solidity
import {IReceiver} from "@chainlink/contracts/src/v0.8/keystone/interfaces/IReceiver.sol";
```

**ReceiverTemplate Features:**
- Secure by default - requires forwarder address at deployment
- Layered security: forwarder + optional workflow ID/owner/name validation
- Built-in access control via OpenZeppelin's `Ownable`
- ERC165 support included
- Metadata decoding helper functions

**Basic Implementation:**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {ReceiverTemplate} from "./ReceiverTemplate.sol";

contract MyConsumer is ReceiverTemplate {
  uint256 public s_storedValue;
  event ValueUpdated(uint256 newValue);

  // Constructor requires forwarder address
  constructor(
    address _forwarderAddress
  ) ReceiverTemplate(_forwarderAddress) {}

  // Implement your business logic here
  function _processReport(
    bytes calldata report
  ) internal override {
    uint256 newValue = abi.decode(report, (uint256));
    s_storedValue = newValue;
    emit ValueUpdated(newValue);
  }
}
```

---

### Forwarder Addresses

**For Simulation (MockForwarder):**
- Ethereum Sepolia: `0x15fC6ae953E024d975e77382eEeC56A9101f9F88`
- Use for `cre workflow simulate`

**For Production (KeystoneForwarder):**
- Ethereum Sepolia: `0xF8344CFd5c43616a4366C34E3EEE75af79a74482`
- Use for deployed workflows

**Important:** Different addresses for simulation vs production. Update before production deployment.

---

### Configuring Security Permissions

**After Deployment:**
```solidity
// Update forwarder address (e.g., simulation → production)
myConsumer.setForwarderAddress(0xF8344CFd5c43616a4366C34E3EEE75af79a74482);

// Add workflow ID check (highest security for single workflow)
myConsumer.setExpectedWorkflowId(0x1234...);

// Add workflow owner check (for multiple workflows from same owner)
myConsumer.setExpectedAuthor(0xYourAddress...);

// Add workflow name check (requires author validation)
myConsumer.setExpectedWorkflowName("my_workflow");
```

**Security Best Practices:**
1. Always deploy with valid forwarder address
2. For production: Add `setExpectedWorkflowId()` (single workflow) or `setExpectedAuthor()` (multiple workflows)
3. Never set forwarder to `address(0)` in production
4. Workflow name validation requires author validation

---

### Simulation Limitations

**Do NOT configure during simulation:**
- `setExpectedWorkflowId()`
- `setExpectedAuthor()`
- `setExpectedWorkflowName()`

Reason: `MockKeystoneForwarder` doesn't provide metadata. These checks will cause simulation to fail.

---

### Advanced Pattern: Proxy Architecture

**Use Case:** Separate Chainlink-aware code from business logic

**Components:**
1. **Logic Contract**: Holds state and core business functions (no Chainlink knowledge)
2. **Proxy Contract**: Inherits `ReceiverTemplate`, validates reports, forwards to Logic Contract

**Example Logic Contract:**
```solidity
contract ReserveManager is Ownable {
  struct UpdateReserves {
    uint256 ethPrice;
    uint256 btcPrice;
  }
  
  address private s_proxyAddress;
  
  modifier onlyProxy() {
    require(msg.sender == s_proxyAddress, "Caller is not the authorized proxy");
    _;
  }
  
  function setProxyAddress(address _proxyAddress) external onlyOwner {
    s_proxyAddress = _proxyAddress;
  }
  
  function updateReserves(UpdateReserves memory data) external onlyProxy {
    // Business logic here
  }
}
```

**Example Proxy Contract:**
```solidity
contract UpdateReservesProxy is ReceiverTemplate {
  ReserveManager private s_reserveManager;

  constructor(
    address _forwarderAddress,
    address reserveManagerAddress
  ) ReceiverTemplate(_forwarderAddress) {
    s_reserveManager = ReserveManager(reserveManagerAddress);
  }

  function _processReport(bytes calldata report) internal override {
    ReserveManager.UpdateReserves memory data = 
      abi.decode(report, (ReserveManager.UpdateReserves));
    s_reserveManager.updateReserves(data);
  }
}
```

**Deployment Flow:**
1. Deploy Logic Contract (ReserveManager)
2. Deploy Proxy Contract with forwarder + logic contract addresses
3. Call `setProxyAddress()` on Logic Contract to authorize Proxy
4. Configure Proxy permissions (workflow ID, etc.)
5. Update workflow config to use Proxy address

---

## Writing Data Onchain (TypeScript SDK)

### The Write Pattern

**4-Step Process:**
1. ABI-encode your data
2. Generate signed report
3. Submit to blockchain
4. Check transaction status

### Step-by-Step Implementation

#### 1. Setup Imports
```typescript
import { 
  EVMClient, 
  getNetwork, 
  hexToBase64, 
  bytesToHex, 
  TxStatus, 
  type Runtime 
} from "@chainlink/cre-sdk"
import { encodeAbiParameters, parseAbiParameters } from "viem"
```

#### 2. ABI-Encode Data

**Single Value:**
```typescript
// uint256
const reportData = encodeAbiParameters(
  parseAbiParameters("uint256"), 
  [12345n]
)

// address
const reportData = encodeAbiParameters(
  parseAbiParameters("address"), 
  ["0x1234567890123456789012345678901234567890"]
)

// bool
const reportData = encodeAbiParameters(
  parseAbiParameters("bool"), 
  [true]
)
```

**Struct:**
```typescript
// struct CalculatorResult { uint256 offchainValue; int256 onchainValue; uint256 finalResult; }
const reportData = encodeAbiParameters(
  parseAbiParameters("uint256 offchainValue, int256 onchainValue, uint256 finalResult"),
  [100n, 50n, 150n]
)
```

**Arrays:**
```typescript
// uint256[]
const reportData = encodeAbiParameters(
  parseAbiParameters("uint256[]"), 
  [[100n, 200n, 300n]]
)

// address[]
const reportData = encodeAbiParameters(
  parseAbiParameters("address[]"), 
  [["0xAddress1", "0xAddress2"]]
)
```

**Nested Structs:**
```typescript
// struct with nested: ReserveData { uint256 total, Asset { address token, uint256 balance } }
const reportData = encodeAbiParameters(
  parseAbiParameters("uint256 total, (address token, uint256 balance) asset"),
  [1000n, ["0xTokenAddress", 500n]]
)
```

**CRITICAL: Always use `bigint` for Solidity integers**
```typescript
// ❌ WRONG - silent precision loss
const amount = 10000000000000001 // JavaScript number

// ✅ CORRECT - use bigint
const amount = 10000000000000001n // BigInt preserves precision
```

#### 3. Generate Signed Report
```typescript
const reportResponse = runtime
  .report({
    encodedPayload: hexToBase64(reportData),
    encoderName: "evm",
    signingAlgo: "ecdsa",
    hashingAlgo: "keccak256",
  })
  .result()
```

**Parameters:**
- `encodedPayload`: ABI-encoded data converted to base64
- `encoderName`: Always `"evm"` for EVM chains
- `signingAlgo`: Always `"ecdsa"` for EVM chains
- `hashingAlgo`: Always `"keccak256"` for EVM chains

#### 4. Submit to Blockchain
```typescript
const writeResult = evmClient
  .writeReport(runtime, {
    receiver: config.consumerAddress, // Your consumer contract address
    report: reportResponse,
    gasConfig: {
      gasLimit: config.gasLimit, // e.g., "500000"
    },
  })
  .result()
```

#### 5. Check Transaction Status
```typescript
if (writeResult.txStatus === TxStatus.SUCCESS) {
  const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32))
  runtime.log(`Transaction successful: ${txHash}`)
  return txHash
} else if (writeResult.txStatus === TxStatus.REVERTED) {
  throw new Error(`Transaction reverted: ${writeResult.errorMessage}`)
} else if (writeResult.txStatus === TxStatus.FATAL) {
  throw new Error(`Fatal error: ${writeResult.errorMessage}`)
}
```

---

### Organizing ABIs for Reusability

**File Structure:**
```
my-cre-project/
├── contracts/
│   └── abi/
│       ├── ConsumerContract.ts    # Consumer contract data structures
│       └── index.ts                # Export all ABIs
├── my-workflow/
│   └── main.ts
└── project.yaml
```

**Example ABI File (contracts/abi/ConsumerContract.ts):**
```typescript
import { parseAbiParameters } from "viem"

export const CalculatorResultParams = parseAbiParameters(
  "uint256 offchainValue, int256 onchainValue, uint256 finalResult"
)

export type CalculatorResult = {
  offchainValue: bigint
  onchainValue: bigint
  finalResult: bigint
}
```

**Index File (contracts/abi/index.ts):**
```typescript
export { CalculatorResultParams, type CalculatorResult } from "./ConsumerContract"
```

**Usage in Workflow:**
```typescript
import { CalculatorResultParams, type CalculatorResult } from "../contracts/abi"

const data: CalculatorResult = {
  offchainValue: 100n,
  onchainValue: 50n,
  finalResult: 150n,
}

const reportData = encodeAbiParameters(CalculatorResultParams, [
  data.offchainValue,
  data.onchainValue,
  data.finalResult,
])
```

---

### Type Conversions (JS/TS → Solidity)

| Solidity Type | TypeScript Type | Example |
|---------------|----------------|---------|
| uint256, uint8, etc. | bigint | `12345n` |
| int256, int8, etc. | bigint | `-12345n` |
| address | string (hex) | `"0x1234..."` |
| bool | boolean | `true` |
| bytes, bytes32 | Uint8Array or hex string | `new Uint8Array(...)` or `"0xabcd..."` |
| string | string | `"Hello"` |
| Arrays | Array | `[100n, 200n]` |
| Struct | Tuple | `[100n, "0x...", true]` |

---

### Helper Functions
```typescript
import { hexToBase64, bytesToHex } from "@chainlink/cre-sdk"

// Convert hex string to base64 (for report generation)
const base64 = hexToBase64(hexString)

// Convert Uint8Array to hex string (for logging, display)
const hex = bytesToHex(uint8Array)
```

---

## Complete Workflow Example

```typescript
import {
  CronCapability,
  EVMClient,
  getNetwork,
  hexToBase64,
  bytesToHex,
  TxStatus,
  type Runtime,
  Runner,
} from "@chainlink/cre-sdk"
import { encodeAbiParameters, parseAbiParameters } from "viem"
import { z } from "zod"

const configSchema = z.object({
  schedule: z.string(),
  chainSelectorName: z.string(),
  consumerAddress: z.string(),
  gasLimit: z.string(),
})

type Config = z.infer<typeof configSchema>

const writeDataOnchain = (runtime: Runtime<Config>): string => {
  // Get network info
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: runtime.config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Network not found: ${runtime.config.chainSelectorName}`)
  }

  // Create EVM client
  const evmClient = new EVMClient(network.chainSelector.selector)

  // 1. Encode your data
  const reportData = encodeAbiParameters(
    parseAbiParameters("uint256 offchainValue, int256 onchainValue, uint256 finalResult"),
    [100n, 50n, 150n]
  )

  // 2. Generate signed report
  const reportResponse = runtime
    .report({
      encodedPayload: hexToBase64(reportData),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result()

  // 3. Submit to blockchain
  const writeResult = evmClient
    .writeReport(runtime, {
      receiver: runtime.config.consumerAddress,
      report: reportResponse,
      gasConfig: {
        gasLimit: runtime.config.gasLimit,
      },
    })
    .result()

  // 4. Check status
  if (writeResult.txStatus === TxStatus.SUCCESS) {
    const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32))
    runtime.log(`Transaction successful: ${txHash}`)
    return txHash
  }

  throw new Error(`Transaction failed with status: ${writeResult.txStatus}`)
}

const initWorkflow = (config: Config) => {
  const cron = new CronCapability()
  return [
    cron.handler(
      cron.trigger({
        schedule: config.schedule,
      }),
      writeDataOnchain
    ),
  ]
}

export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}
```

**Config (config.json):**
```json
{
  "schedule": "0 */5 * * * *",
  "chainSelectorName": "ethereum-testnet-sepolia",
  "consumerAddress": "0xYourConsumerContractAddress",
  "gasLimit": "500000"
}
```

---

## Common Patterns & Best Practices

### 1. Error Handling
- Always check `writeResult.txStatus`
- Handle `SUCCESS`, `REVERTED`, and `FATAL` statuses
- Log error messages for debugging

### 2. Gas Configuration
- Set appropriate `gasLimit` based on contract complexity
- Too low = transaction reverts
- Monitor gas usage and adjust as needed

### 3. Replay Protection
- Built into `KeystoneForwarder`
- Failed reports can be retried (reverts undo state changes)
- Successful reports cannot be replayed

### 4. Testing Flow
1. Start with simulation using `MockForwarder`
2. Test without metadata-based validation
3. Deploy to production with `KeystoneForwarder`
4. Add metadata-based validation (workflow ID, etc.)

### 5. Security Checklist
- ✅ Deploy with valid forwarder address
- ✅ Add workflow ID or author validation for production
- ✅ Never set forwarder to `address(0)` in production
- ✅ Keep owner key secure
- ✅ Test permission configurations before production

---

## Key Differences from Traditional Oracle Patterns

1. **Indirect Communication**: Workflows don't call consumer contracts directly; they go through the KeystoneForwarder
2. **Signature Validation**: The forwarder validates DON signatures before calling your contract
3. **Standardized Interface**: All consumer contracts must implement `IReceiver`
4. **Layered Security**: Multiple validation layers (forwarder, workflow ID, owner, name)
5. **Report-Based**: Data is packaged as signed reports, not direct function calls

---

## References
- [CRE Documentation](https://docs.chain.link/cre)
- [Building Consumer Contracts](https://docs.chain.link/cre/guides/workflow/using-evm-client/onchain-write/building-consumer-contracts)
- [Writing Data Onchain](https://docs.chain.link/cre/guides/workflow/using-evm-client/onchain-write/writing-data-onchain)
- [Forwarder Directory](https://docs.chain.link/cre/guides/workflow/using-evm-client/forwarder-directory)
- [EVM Client Reference](https://docs.chain.link/cre/reference/sdk/evm-client-ts)
