# CRE Onchain Write Reference

## Overview

This comprehensive guide covers two critical aspects of writing data to the blockchain from CRE workflows:

1. **Building Consumer Contracts** - How to create secure contracts that receive data from workflows
2. **Writing Data Onchain** - How to encode and submit data from your workflow

**ChainLease Use Cases:**
- Submit credit check results to LeaseAgreement contract
- Update lease state after external verification
- Record payment confirmations onchain
- Store compliance audit trails

---

## Part 1: Building Consumer Contracts

### Core Concepts: The Onchain Data Flow

1. **Workflow Execution**: Your workflow produces a final, signed report
2. **EVM Write**: The EVM capability sends this report to the Chainlink-managed `KeystoneForwarder` contract
3. **Forwarder Validation**: The `KeystoneForwarder` validates the report's signatures
4. **Callback to Your Contract**: If valid, the forwarder calls `onReport()` on your consumer contract to deliver the data

> **Important**: Your workflow doesn't call your contract directly. It submits reports to the Chainlink `KeystoneForwarder`, which then validates and forwards the data to your contract.

---

### The IReceiver Standard

To be a valid target for the `KeystoneForwarder`, your consumer contract must satisfy two requirements:

#### 1. Implement the IReceiver Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC165} from "./IERC165.sol";

/// @title IReceiver - receives keystone reports
/// @notice Implementations must support the IReceiver interface through ERC165.
interface IReceiver is IERC165 {
  /// @notice Handles incoming keystone reports.
  /// @dev If this function call reverts, it can be retried with a higher gas
  /// limit. The receiver is responsible for discarding stale reports.
  /// @param metadata Report's metadata.
  /// @param report Workflow report.
  function onReport(
    bytes calldata metadata,
    bytes calldata report
  ) external;
}
```

**Parameters:**
- `metadata`: Contains information about the workflow (ID, name, owner). Encoded using `abi.encodePacked` with structure: `bytes32 workflowId`, `bytes10 workflowName`, `address workflowOwner`
- `report`: The raw, ABI-encoded data payload from your workflow

#### 2. Support ERC165 Interface Detection

ERC165 allows contracts to publish the interfaces they support. The `KeystoneForwarder` uses this to check if your contract supports the `IReceiver` interface before sending a report.

---

### Using ReceiverTemplate

#### Overview

While you can implement these standards manually, we provide an abstract contract, `ReceiverTemplate.sol`, that does the heavy lifting for you. **Inheriting from it is the recommended best practice.**

**Key features:**
- **Secure by Default**: Requires forwarder address at deployment
- **Layered Security**: Add optional workflow ID validation, workflow owner verification, or any combination
- **Flexible Configuration**: All permission settings can be updated via setter functions after deployment
- **Simplified Logic**: You only need to implement `_processReport(bytes calldata report)` with your business logic
- **Built-in Access Control**: Includes OpenZeppelin's `Ownable` for secure permission management
- **ERC165 Support**: Includes the necessary `supportsInterface` function
- **Metadata Access**: Helper function to decode workflow ID, name, and owner

#### Quick Start

The simplest way to use `ReceiverTemplate` is to inherit from it and implement the `_processReport` function:

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

#### Configuring Permissions

The forwarder address is configured at deployment via the constructor. After deploying, the owner can configure additional security checks:

```solidity
// Example: Update forwarder address (e.g., when moving from simulation to production)
myConsumer.setForwarderAddress(0xF8344CFd5c43616a4366C34E3EEE75af79a74482); // Ethereum Sepolia KeystoneForwarder

// Example: Add workflow ID check for additional security
myConsumer.setExpectedWorkflowId(0x1234...); // Your specific workflow ID

// Example: Add workflow owner check
myConsumer.setExpectedAuthor(0xYourAddress...);

// Example: Add workflow name check (requires author validation to be set)
myConsumer.setExpectedWorkflowName("my_workflow");

// Example: Disable a check later
myConsumer.setExpectedWorkflowName(""); // Empty string disables the check
```

> **⚠️ For Simulation**
>
> When using `cre workflow simulate`, do not configure metadata-based validation checks (`setExpectedWorkflowId`, `setExpectedAuthor`, `setExpectedWorkflowName`). The simulation uses a `MockForwarder` that doesn't provide this metadata.

> **✅ Recommended Production Setup**
>
> The forwarder address is required at deployment and provides basic security. For production contracts, we strongly recommend adding additional validation:
> - Use `setExpectedWorkflowId()` if only one workflow writes to your contract (highest security)
> - Use `setExpectedAuthor()` if multiple workflows from the same owner write to your contract

**What the template handles for you:**
- Validates the caller address against the configured forwarder (required at deployment)
- Validates the workflow ID (if `expectedWorkflowId` is configured)
- Validates the workflow owner (if `expectedAuthor` is configured)
- Validates the workflow name (if both `expectedWorkflowName` AND `expectedAuthor` are configured)
- Implements ERC165 interface detection
- Provides access control via OpenZeppelin's `Ownable`
- Calls your `_processReport` function with validated data

**What you implement:**
- Pass the forwarder address to the constructor during deployment
- Your business logic in `_processReport`
- (Optional) Configure additional permissions after deployment using setter functions

#### How Workflow Names are Encoded

The `workflowName` field in the metadata uses the `bytes10` type rather than plaintext strings. When you call `setExpectedWorkflowName("my_workflow")`, the `ReceiverTemplate` automatically encodes it:

1. Compute SHA256 hash of the workflow name
2. Convert hash to hex string (64 characters)
3. Take the first 10 hex characters (e.g., "b76f3ae1de")
4. Hex-encode those 10 ASCII characters to get `bytes10` (20 hex characters / 10 bytes)

Example: `"my_workflow"` → SHA256 → `"b76f3ae1de..."` → hex-encode → `0x62373666336165316465`

> **⚠️ Workflow Name Validation Requires Author Validation**
>
> Workflow name validation is only performed when author validation is also configured. The code enforces this at runtime: if you set `expectedWorkflowName`, you must also set `expectedAuthor`, otherwise the validation will revert with `WorkflowNameRequiresAuthorValidation()`. This prevents the 40-bit collision attack by ensuring workflow names are validated in combination with the owner address.

Usage:
```solidity
// Set the expected author first (required)
myConsumer.setExpectedAuthor(0xYourAddress...);

// Then set the expected workflow name (only works with author validation)
myConsumer.setExpectedWorkflowName("my_workflow");

// To disable the workflow name check
myConsumer.setExpectedWorkflowName(""); // Empty string clears the stored value
```

---

### Working with Simulation

When you run `cre workflow simulate`, your workflow interacts with a `MockKeystoneForwarder` contract that does not provide workflow metadata (workflow_name, workflow_owner).

#### Deploying for Simulation

When deploying your consumer contract for simulation, pass the Mock Forwarder address to the constructor:

```solidity
// Deploy with MockForwarder address for Ethereum Sepolia simulation
address mockForwarder = 0x15fC6ae953E024d975e77382eEeC56A9101f9F88; // Ethereum Sepolia MockForwarder
MyConsumer myConsumer = new MyConsumer(mockForwarder);
```

> **⚠️ Important: Different Addresses for Simulation vs Production**
>
> The `MockKeystoneForwarder` address used during simulation is different from the `KeystoneForwarder` address used by deployed workflows. After testing with simulation, deploy a new instance with the production `KeystoneForwarder` address, or update the forwarder address using `setForwarderAddress()`.

#### Metadata-based Validation

Do not configure these validation checks during simulation - they require metadata that `MockKeystoneForwarder` doesn't provide:
- `setExpectedWorkflowId()`
- `setExpectedAuthor()`
- `setExpectedWorkflowName()`

Setting any of these will cause your simulation to fail.

#### Transitioning to Production

**Option 1: Deploy a new contract instance**

```solidity
// Deploy with production KeystoneForwarder address
address keystoneForwarder = 0xF8344CFd5c43616a4366C34E3EEE75af79a74482; // Ethereum Sepolia
MyConsumer myConsumer = new MyConsumer(keystoneForwarder);

// Configure additional security checks
myConsumer.setExpectedWorkflowId(0xYourWorkflowId);
```

**Option 2: Update existing contract's forwarder**

```solidity
// Update forwarder to production KeystoneForwarder
myConsumer.setForwarderAddress(0xF8344CFd5c43616a4366C34E3EEE75af79a74482); // Ethereum Sepolia

// Add metadata-based validation
myConsumer.setExpectedWorkflowId(0xYourWorkflowId);
```

---

### Complete Consumer Contract Examples

#### Example 1: Simple Consumer Contract

This example inherits from `ReceiverTemplate` to store a temperature value.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import { ReceiverTemplate } from "./ReceiverTemplate.sol";

contract TemperatureConsumer is ReceiverTemplate {
  int256 public s_currentTemperature;
  event TemperatureUpdated(int256 newTemperature);

  // Constructor requires forwarder address
  constructor(address _forwarderAddress) ReceiverTemplate(_forwarderAddress) {}

  function _processReport(bytes calldata report) internal override {
    int256 newTemperature = abi.decode(report, (int256));
    s_currentTemperature = newTemperature;
    emit TemperatureUpdated(newTemperature);
  }
}
```

**Deployment:**

```solidity
// For simulation: Use MockForwarder address
address mockForwarder = 0x15fC6ae953E024d975e77382eEeC56A9101f9F88; // e.g. Ethereum Sepolia
TemperatureConsumer temperatureConsumer = new TemperatureConsumer(mockForwarder);

// For production: Use KeystoneForwarder address
address keystoneForwarder = 0xF8344CFd5c43616a4366C34E3EEE75af79a74482; // e.g. Ethereum Sepolia
TemperatureConsumer temperatureConsumer = new TemperatureConsumer(keystoneForwarder);
```

**Adding additional security after deployment:**

```solidity
// Add workflow ID check for highest security
temperatureConsumer.setExpectedWorkflowId(0xYourWorkflowId...);
```

#### Example 2: ChainLease Credit Check Consumer

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {ReceiverTemplate} from "./ReceiverTemplate.sol";

contract LeaseAgreement is ReceiverTemplate {
  enum LeaseState {
    Draft,
    PendingApproval,
    Active,
    Completed,
    Terminated
  }

  struct Lease {
    uint256 leaseId;
    address tenant;
    LeaseState state;
    bool creditCheckPassed;
    string verificationId;
  }

  mapping(uint256 => Lease) public leases;
  
  event CreditCheckCompleted(
    uint256 indexed leaseId, 
    bool passed, 
    string verificationId
  );

  constructor(
    address _forwarderAddress
  ) ReceiverTemplate(_forwarderAddress) {}

  // CRE workflow calls this via forwarder
  function _processReport(bytes calldata report) internal override {
    // Decode credit check result
    (uint256 leaseId, bool passed, string memory verificationId) = abi.decode(
      report, 
      (uint256, bool, string)
    );

    // Update lease with credit check result
    Lease storage lease = leases[leaseId];
    require(lease.leaseId != 0, "Lease does not exist");
    require(lease.state == LeaseState.Draft, "Invalid state");

    lease.creditCheckPassed = passed;
    lease.verificationId = verificationId;

    if (passed) {
      lease.state = LeaseState.PendingApproval;
    }

    emit CreditCheckCompleted(leaseId, passed, verificationId);
  }
}
```

#### Example 3: The Proxy Pattern

For more complex scenarios, separate your Chainlink-aware code from your core business logic using two contracts:

**The Logic Contract (ReserveManager.sol)**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract ReserveManager is Ownable {
  struct UpdateReserves {
    uint256 ethPrice;
    uint256 btcPrice;
  }

  address private s_proxyAddress;
  uint256 private s_lastEthPrice;
  uint256 private s_lastBtcPrice;
  uint256 private s_lastUpdateTime;

  event ReservesUpdated(uint256 ethPrice, uint256 btcPrice, uint256 updateTime);
  event ProxyAddressUpdated(address indexed previousProxy, address indexed newProxy);

  modifier onlyProxy() {
    require(msg.sender == s_proxyAddress, "Caller is not the authorized proxy");
    _;
  }

  constructor() Ownable(msg.sender) {}

  function setProxyAddress(address _proxyAddress) external onlyOwner {
    address previousProxy = s_proxyAddress;
    s_proxyAddress = _proxyAddress;
    emit ProxyAddressUpdated(previousProxy, _proxyAddress);
  }

  function updateReserves(UpdateReserves memory data) external onlyProxy {
    s_lastEthPrice = data.ethPrice;
    s_lastBtcPrice = data.btcPrice;
    s_lastUpdateTime = block.timestamp;
    emit ReservesUpdated(data.ethPrice, data.btcPrice, block.timestamp);
  }
}
```

**The Proxy Contract (UpdateReservesProxy.sol)**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { ReserveManager } from "./ReserveManager.sol";
import { ReceiverTemplate } from "./ReceiverTemplate.sol";

contract UpdateReservesProxy is ReceiverTemplate {
  ReserveManager private s_reserveManager;

  constructor(
    address _forwarderAddress, 
    address reserveManagerAddress
  ) ReceiverTemplate(_forwarderAddress) {
    s_reserveManager = ReserveManager(reserveManagerAddress);
  }

  function _processReport(bytes calldata report) internal override {
    ReserveManager.UpdateReserves memory updateReservesData = abi.decode(
      report, 
      (ReserveManager.UpdateReserves)
    );
    s_reserveManager.updateReserves(updateReservesData);
  }
}
```

**How it Works:**

1. Deploy the Logic Contract: Deploy `ReserveManager.sol`
2. Deploy the Proxy Contract: Deploy `UpdateReservesProxy.sol`, passing forwarder address and `ReserveManager` address
3. Link the Contracts: Call `setProxyAddress` on `ReserveManager` with the proxy address
4. Configure Permissions: Add workflow ID validation to the proxy
5. Configure Workflow: Use the proxy address as the receiver in your workflow config

---

### Security Considerations

#### Forwarder Address

The forwarder address is the foundation of your contract's security. The `KeystoneForwarder` contract performs cryptographic verification of DON signatures before calling your consumer. By requiring the forwarder address in the constructor, `ReceiverTemplate` ensures your contract is secure from deployment.

> **⚠️ Never set forwarder to address(0) in production**
>
> While the `setForwarderAddress()` function allows updating to `address(0)`, this disables the critical security check and allows anyone to call your `onReport()` function with arbitrary data. Only use `address(0)` for testing if you fully understand the implications.

#### Replay Protection

The `KeystoneForwarder` contract includes built-in replay protection that prevents successful reports from being executed multiple times. By requiring the forwarder address at construction time, `ReceiverTemplate` ensures your consumer benefits from this protection automatically.

> **Note: Failed Reports Can Be Retried**
>
> If a report fails (reverts), the forwarder's replay protection allows it to be retried. This is safe because reverts undo all state changes, ensuring no duplicate effects occur in your contract.

#### Additional Validation Layers

The forwarder address provides baseline security, but you can add additional validation for defense-in-depth:

- **expectedWorkflowId**: Ensures only one specific workflow can update your contract (highest security)
- **expectedAuthor**: Restricts to workflows owned by a specific address
- **expectedWorkflowName**: Can be used with `expectedAuthor` for additional validation

#### Workflow Name Validation

> **⚠️ Workflow Name Validation Requires Author Validation**
>
> The `expectedWorkflowName` check in `ReceiverTemplate.onReport()` requires author validation to be configured:
> - **Collision Risk**: Workflow names use only 40-bit truncation (`bytes10`), making collision attacks computationally feasible when used alone
> - **Unique per owner**: Workflow names are unique per owner but not across different owners
> - **Runtime enforcement**: The code enforces that if `expectedWorkflowName` is set, `expectedAuthor` must also be set

#### Best Practices

1. **Always deploy with a valid forwarder address** - The constructor requires this for security. Use `MockForwarder` for simulation, `KeystoneForwarder` for production
2. **Add additional validation for production**:
   - Single workflow: Use `setExpectedWorkflowId()` (highest security)
   - Multiple workflows from same owner: Use `setExpectedAuthor()`
   - Multiple workflows from different owners: Implement custom validation logic
3. **Keep your owner key secure** - The owner can update all permission settings
4. **Test permission configurations** - Verify your security settings work as expected before production deployment

---

## Part 2: Writing Data Onchain

### The Write Pattern

Writing data onchain with the TypeScript SDK follows this pattern:

1. ABI-encode your data using viem's `encodeAbiParameters()`
2. Generate a signed report using `runtime.report()`
3. Submit the report using `evmClient.writeReport()`
4. Check the transaction status and handle the result

---

### Writing a Single Value

#### Step 1: Set up your imports

```typescript
import { EVMClient, getNetwork, hexToBase64, bytesToHex, TxStatus, type Runtime } from "@chainlink/cre-sdk"
import { encodeAbiParameters, parseAbiParameters } from "viem"
```

#### Step 2: ABI-encode your value

Use viem's `encodeAbiParameters()` to encode a single value:

```typescript
// For a single uint256
const reportData = encodeAbiParameters(parseAbiParameters("uint256"), [12345n])

// For a single address
const reportData = encodeAbiParameters(
  parseAbiParameters("address"), 
  ["0x1234567890123456789012345678901234567890"]
)

// For a single bool
const reportData = encodeAbiParameters(parseAbiParameters("bool"), [true])
```

> **⚠️ Always use bigint for Solidity integers**
>
> JavaScript `number` loses precision for values above ~9 quadrillion (`Number.MAX_SAFE_INTEGER`). This causes silent precision loss — your workflow sends the wrong value without any error.
>
> Always use bigint (with the `n` suffix) for all Solidity integer types: `12345n`, `1000000000000000000n`, etc.

```typescript
// WRONG - silent precision loss
const amount = 10000000000000001 // 10 quadrillion + 1
// Silently becomes 10000000000000000 (the +1 vanishes)

// CORRECT - use bigint
const amount = 10000000000000001n // Stays exactly 10000000000000001
```

> **⚠️ Use safe scaling for decimal values**
>
> When scaling values to match a token's decimals (e.g., converting "1.5" to `1500000000000000000n`), use viem's `parseUnits()` instead of `BigInt(value * 1e18)`. Floating-point multiplication causes silent precision loss.

```typescript
import { parseUnits } from "viem"

// WRONG - precision loss
const amount = BigInt(1.5 * 1e18)

// CORRECT - safe conversion
const amount = parseUnits("1.5", 18)
```

#### Step 3: Generate the signed report

Convert the encoded data to base64 and generate a report:

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

**Report parameters:**
- `encodedPayload`: Your ABI-encoded data converted to base64
- `encoderName`: Always `"evm"` for EVM chains
- `signingAlgo`: Always `"ecdsa"` for EVM chains
- `hashingAlgo`: Always `"keccak256"` for EVM chains

#### Step 4: Submit to the blockchain

```typescript
const writeResult = evmClient
  .writeReport(runtime, {
    receiver: config.consumerAddress,
    report: reportResponse,
    gasConfig: {
      gasLimit: config.gasLimit,
    },
  })
  .result()
```

**WriteReport parameters:**
- `receiver`: The address of your consumer contract (must implement `IReceiver`)
- `report`: The signed report from `runtime.report()`
- `gasConfig.gasLimit`: Gas limit for the transaction (as a string, e.g., `"500000"`)

#### Step 5: Check the transaction status

```typescript
if (writeResult.txStatus === TxStatus.SUCCESS) {
  const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32))
  runtime.log(`Transaction successful: ${txHash}`)
  return txHash
}

throw new Error(`Transaction failed with status: ${writeResult.txStatus}`)
```

---

### Writing a Struct

#### Your consumer contract

Let's say your consumer contract expects data in this format:

```solidity
struct CalculatorResult {
  uint256 offchainValue;
  int256 onchainValue;
  uint256 finalResult;
}
```

#### Step 1: ABI-encode the struct

Use viem to encode all fields as a tuple:

```typescript
const reportData = encodeAbiParameters(
  parseAbiParameters("uint256 offchainValue, int256 onchainValue, uint256 finalResult"),
  [100n, 50n, 150n]
)
```

> **Note: Struct encoding**
>
> In viem, structs are encoded as tuples. List all fields with their types and names, then provide the values in the same order. The field names help with readability but don't affect encoding.

#### Step 2: Generate and submit

The rest of the process is identical to writing a single value:

```typescript
// Generate signed report
const reportResponse = runtime
  .report({
    encodedPayload: hexToBase64(reportData),
    encoderName: "evm",
    signingAlgo: "ecdsa",
    hashingAlgo: "keccak256",
  })
  .result()

// Submit to blockchain
const writeResult = evmClient
  .writeReport(runtime, {
    receiver: config.consumerAddress,
    report: reportResponse,
    gasConfig: {
      gasLimit: config.gasLimit,
    },
  })
  .result()

// Check status
if (writeResult.txStatus === TxStatus.SUCCESS) {
  runtime.log(`Successfully wrote struct to contract`)
}
```

---

### Organizing ABIs for Reusable Data Structures

For workflows that interact with consumer contracts multiple times or use complex data structures, organizing your ABI definitions in dedicated files improves code maintainability and type safety.

#### File Structure

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

#### Creating an ABI File

`contracts/abi/ConsumerContract.ts`:

```typescript
import { parseAbiParameters } from "viem"

// Define the ABI parameters for your struct
export const CalculatorResultParams = parseAbiParameters(
  "uint256 offchainValue, int256 onchainValue, uint256 finalResult"
)

// Define the TypeScript type for type safety
export type CalculatorResult = {
  offchainValue: bigint
  onchainValue: bigint
  finalResult: bigint
}
```

#### Creating an Index File

`contracts/abi/index.ts`:

```typescript
export { CalculatorResultParams, type CalculatorResult } from "./ConsumerContract"
```

#### Using the Organized ABI

```typescript
import { EVMClient, getNetwork, hexToBase64, bytesToHex, TxStatus, type Runtime } from "@chainlink/cre-sdk"
import { encodeAbiParameters } from "viem"
import { CalculatorResultParams, type CalculatorResult } from "../contracts/abi"

const writeDataOnchain = (runtime: Runtime<Config>): string => {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: runtime.config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Network not found`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector)

  // Create type-safe data object
  const data: CalculatorResult = {
    offchainValue: 100n,
    onchainValue: 50n,
    finalResult: 150n,
  }

  // Encode using imported ABI parameters
  const reportData = encodeAbiParameters(CalculatorResultParams, [
    data.offchainValue,
    data.onchainValue,
    data.finalResult,
  ])

  // Generate and submit report
  const reportResponse = runtime
    .report({
      encodedPayload: hexToBase64(reportData),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result()

  const writeResult = evmClient
    .writeReport(runtime, {
      receiver: runtime.config.consumerAddress,
      report: reportResponse,
      gasConfig: { gasLimit: runtime.config.gasLimit },
    })
    .result()

  if (writeResult.txStatus === TxStatus.SUCCESS) {
    const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32))
    return txHash
  }

  throw new Error(`Transaction failed`)
}
```

---

### ChainLease Complete Example: Credit Check Workflow

#### Configuration (config.json)

```json
{
  "chainSelectorName": "ethereum-testnet-sepolia",
  "leaseAgreementAddress": "0xYourLeaseAgreementContractAddress",
  "gasLimit": "500000"
}
```

#### Workflow Code (main.ts)

```typescript
import {
  cre,
  type Runtime,
  Runner,
  getNetwork,
  bytesToHex,
  EVMLog,
  handler,
  HTTPClient,
  hexToBase64,
  EVMClient,
  TxStatus,
  consensusIdenticalAggregation
} from "@chainlink/cre-sdk"
import { keccak256, decodeEventLog, toBytes, encodeAbiParameters, parseAbiParameters } from "viem"
import { z } from "zod"

const configSchema = z.object({
  chainSelectorName: z.string(),
  leaseAgreementAddress: z.string(),
  gasLimit: z.string(),
})

type Config = z.infer<typeof configSchema>

interface CreditCheckResponse {
  leaseId: number
  passed: boolean
  verificationId: string
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

// Process credit check and write result onchain
const submitCreditCheckResult = (
  runtime: Runtime<Config>, 
  leaseId: bigint, 
  passed: boolean, 
  verificationId: string
): string => {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: runtime.config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Network not found`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector)

  // 1. ABI-encode credit check result (leaseId, passed, verificationId)
  const reportData = encodeAbiParameters(
    parseAbiParameters("uint256 leaseId, bool passed, string verificationId"),
    [leaseId, passed, verificationId]
  )

  runtime.log(`Encoded credit check result for lease ${leaseId.toString()}`)

  // 2. Generate signed report
  const reportResponse = runtime
    .report({
      encodedPayload: hexToBase64(reportData),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result()

  runtime.log(`Generated signed report`)

  // 3. Submit to blockchain (forwarder will call LeaseAgreement.onReport)
  const writeResult = evmClient
    .writeReport(runtime, {
      receiver: runtime.config.leaseAgreementAddress,
      report: reportResponse,
      gasConfig: {
        gasLimit: runtime.config.gasLimit,
      },
    })
    .result()

  // 4. Check status
  if (writeResult.txStatus === TxStatus.SUCCESS) {
    const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32))
    runtime.log(`Credit check result submitted: ${txHash}`)
    return txHash
  }

  throw new Error(`Transaction failed with status: ${writeResult.txStatus}`)
}

// Callback function when LeaseCreated event is detected
const onLogTrigger = (runtime: Runtime<Config>, log: EVMLog): string => {
  runtime.log(`LeaseCreated event detected`)
  
  const topics = log.topics.map(t => bytesToHex(t)) as [`0x${string}`, ...`0x${string}`[]]
  const data = bytesToHex(log.data)
  
  const decodedLog = decodeEventLog({ 
    abi: leaseCreatedEventAbi, 
    data, 
    topics 
  })
  
  const { leaseId, tenant } = decodedLog.args
  
  runtime.log(`Lease ID: ${leaseId.toString()}, Tenant: ${tenant}`)
  
  // 1. Call credit check API (mock example)
  const httpClient = new HTTPClient()
  const creditCheckResult = httpClient
    .sendRequest(
      runtime,
      {
        url: "https://api.creditcheck.com/verify",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant, leaseId: leaseId.toString() })
      },
      consensusIdenticalAggregation<CreditCheckResponse>()
    )(runtime.config, { tenant, leaseId })
    .result()
  
  runtime.log(`Credit check completed: ${creditCheckResult.passed ? 'PASSED' : 'FAILED'}`)
  
  // 2. Submit result to contract
  const txHash = submitCreditCheckResult(
    runtime, 
    leaseId, 
    creditCheckResult.passed, 
    creditCheckResult.verificationId
  )
  
  return `Processed lease ${leaseId.toString()}, tx: ${txHash}`
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
        topics: [{ values: [hexToBase64(leaseEventHash)] }],
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

### Working with Complex Types

#### Arrays

```typescript
// Array of uint256
const reportData = encodeAbiParameters(
  parseAbiParameters("uint256[]"), 
  [[100n, 200n, 300n]]
)

// Array of addresses
const reportData = encodeAbiParameters(
  parseAbiParameters("address[]"), 
  [["0xAddress1", "0xAddress2", "0xAddress3"]]
)
```

#### Nested Structs

```typescript
// Struct with nested struct: ReserveData { uint256 total, Asset { address token, uint256 balance } }
const reportData = encodeAbiParameters(
  parseAbiParameters("uint256 total, (address token, uint256 balance) asset"), 
  [1000n, ["0xTokenAddress", 500n]]
)
```

#### Multiple Parameters with Mixed Types

```typescript
// address recipient, uint256 amount, bool isActive
const reportData = encodeAbiParameters(
  parseAbiParameters("address recipient, uint256 amount, bool isActive"), 
  ["0xRecipientAddress", 42000n, true]
)
```

---

### Type Conversions

#### JavaScript/TypeScript to Solidity

| Solidity Type | TypeScript Type | Example |
|---------------|-----------------|---------|
| `uint256`, `uint8`, etc. | `bigint` | `12345n` |
| `int256`, `int8`, etc. | `bigint` | `-12345n` |
| `address` | `string` (hex) | `"0x1234..."` |
| `bool` | `boolean` | `true` |
| `bytes`, `bytes32` | `Uint8Array` or hex string | `new Uint8Array(...)` or `"0xabcd..."` |
| `string` | `string` | `"Hello"` |
| Arrays | `Array` | `[100n, 200n]` |
| Struct | Tuple | `[100n, "0x...", true]` |

#### Helper Functions

```typescript
import { hexToBase64, bytesToHex } from "@chainlink/cre-sdk"

// Convert hex string to base64 (for report generation)
const base64 = hexToBase64(hexString)

// Convert Uint8Array to hex string (for logging, display)
const hex = bytesToHex(uint8Array)
```

---

### Handling Errors

Always check the transaction status and handle potential failures:

```typescript
const writeResult = evmClient
  .writeReport(runtime, {
    receiver: config.consumerAddress,
    report: reportResponse,
    gasConfig: {
      gasLimit: config.gasLimit,
    },
  })
  .result()

// Check for success
if (writeResult.txStatus === TxStatus.SUCCESS) {
  runtime.log(`Success! TxHash: ${bytesToHex(writeResult.txHash || new Uint8Array(32))}`)
} else if (writeResult.txStatus === TxStatus.REVERTED) {
  runtime.log(`Transaction reverted: ${writeResult.errorMessage || "Unknown error"}`)
  throw new Error(`Write failed: ${writeResult.errorMessage}`)
} else if (writeResult.txStatus === TxStatus.FATAL) {
  runtime.log(`Fatal error: ${writeResult.errorMessage || "Unknown error"}`)
  throw new Error(`Fatal write error: ${writeResult.errorMessage}`)
}
```

> **⚠️ Gas Limit Configuration**
>
> Make sure your `gasLimit` is sufficient for your transaction. If it's too low, the transaction will run out of gas and revert.

---

## Summary

### Building Consumer Contracts

1. Inherit from `ReceiverTemplate` for secure, validated data reception
2. Implement `_processReport()` with your business logic
3. Deploy with forwarder address (MockForwarder for simulation, KeystoneForwarder for production)
4. Add additional validation layers (`setExpectedWorkflowId`, `setExpectedAuthor`)
5. Test thoroughly before production deployment

### Writing Data Onchain

1. ABI-encode your data with `encodeAbiParameters()`
2. Generate signed report with `runtime.report()`
3. Submit with `evmClient.writeReport()`
4. Check `txStatus` and handle errors
5. Always use `bigint` for integer types, `parseUnits()` for decimals

---

## Resources

- [CRE SDK Documentation](https://docs.chain.link/chainlink-functions/resources/service-responsibility)
- [Viem Documentation](https://viem.sh)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [ERC165 Interface Detection](https://eips.ethereum.org/EIPS/eip-165)

---

**Last Updated:** February 21, 2026  
**ChainLease Development Team**
