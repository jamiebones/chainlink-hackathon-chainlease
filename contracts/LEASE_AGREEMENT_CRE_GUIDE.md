# LeaseAgreement IReceiver Implementation Guide

## Overview
The LeaseAgreement contract implements Chainlink's official `IReceiver` interface to receive credit check results from CRE workflows through the KeystoneForwarder.

## Architecture

```
CRE Workflow → KeystoneForwarder → LeaseAgreement.onReport()
                (validates report)    (processes credit check)
```

## Implementation Approach

**Direct IReceiver Implementation** - LeaseAgreement directly implements the official `@chainlink/contracts` IReceiver interface without custom base contracts.

### Imports
```solidity
import {IReceiver} from "@chainlink/contracts/src/v0.8/keystone/interfaces/IReceiver.sol";
```

## Key Changes to LeaseAgreement

### 1. Inheritance Change
```solidity
// Updated implementation
contract LeaseAgreement is ReentrancyGuard, Ownable, IReceiver
```

### 2. Required Functions

**onReport()** - Receives credit check data from KeystoneForwarder:
```solidity
function onReport(
    bytes calldata metadata,
    bytes calldata report
) external override {
    // Verify caller is the authorized forwarder
    if (msg.sender != s_forwarderAddress) {
        revert UnauthorizedSender(msg.sender);
    }
    
    // Decode and process report
    (uint256 leaseId, bool passed, string memory verificationId) = 
        abi.decode(report, (uint256, bool, string));
    
    _updateCreditCheckStatus(leaseId, passed, verificationId);
}
```

**supportsInterface()** - ERC165 interface detection:
```solidity
function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
    return interfaceId == type(IReceiver).interfaceId || 
           interfaceId == 0x01ffc9a7; // ERC165
}
```

### 2. Constructor Update
```solidity
constructor(
    address _propertyNFT,
    address _forwarderAddress  // Chainlink Forwarder address
) Ownable(msg.sender) {
    require(_propertyNFT != address(0), "Invalid PropertyNFT address");
    require(_forwarderAddress != address(0), "Invalid forwarder address");
    propertyNFT = PropertyNFT(_propertyNFT);
    s_forwarderAddress = _forwarderAddress;
}
```

**Forwarder Addresses:**
- **Simulation (MockForwarder):** `0x15fC6ae953E024d975e77382eEeC56A9101f9F88` (Ethereum Sepolia)
- **Production (KeystoneForwarder):** `0xF8344CFd5c43616a4366C34E3EEE75af79a74482` (Ethereum Sepolia)

### 3. Lease Struct Update
Added `verificationId` field for audit trail:
```solidity
struct Lease {
    // ... existing fields
    string verificationId;  // NEW: External verification ID
    // ... existing fields
}
```

### 4. Security Functions

**setForwarderAddress()** - Update forwarder (owner only):
```solidity
function setForwarderAddress(address _forwarderAddress) external onlyOwner {
    s_forwarderAddress = _forwarderAddress;
}
```

**getForwarderAddress()** - View current forwarder:
```solidity
function getForwarderAddress() external view returns (address) {
    return s_forwarderAddress;
}
```

## Deployment Steps

### 1. Deploy PropertyNFT (if not already deployed)
```solidity
PropertyNFT propertyNFT = new PropertyNFT();
```

### 2. Deploy LeaseAgreement with Forwarder

**For Simulation:**
```solidity
address mockForwarder = 0x15fC6ae953E024d975e77382eEeC56A9101f9F88; // Sepolia
LeaseAgreement leaseAgreement = new LeaseAgreement(
    address(propertyNFT),
    mockForwarder
);
```

**For Production:**
```solidity
address keystoneForwarder = 0xF8344CFd5c43616a4366C34E3EEE75af79a74482; // Sepolia
LeaseAgreement leaseAgreement = new LeaseAgreement(
    address(propertyNFT),
    keystoneForwarder
);
```

### 3. Configure Additional Security (Optional but Recommended)

```solidity
// Add workflow ID validation (highest security)
leaseAgreement.setExpectedWorkflowId(0xYourWorkflowId...);

// OR add workflow owner validation
leaseAgreement.setExpectedAuthor(0xYourAddress...);
```

### 4. Update CRE Workflow Config

Update `config.production.json` or `config.staging.json`:
```json
{
  "evms": [
    {
      "chainSelectorName": "ethereum-testnet-sepolia",
      "leaseAgreementAddress": "0xYourDeployedLeaseAgreementAddress",
      "gasLimit": "500000"
    }
  ]
}
```

## Data Flow

### From Workflow to Contract

**1. Workflow encodes data (evm.ts):**
```typescript
const reportData = encodeAbiParameters(
    parseAbiParameters("uint256 leaseId, bool passed, string verificationId"),
    [leaseId, passed, verificationId]
);
```

**2. Workflow generates signed report:**
```typescript
const reportResponse = runtime.report({
    encodedPayload: hexToBase64(reportData),
    encoderName: "evm",
    signingAlgo: "ecdsa",
    hashingAlgo: "keccak256",
}).result();
```

**3. Workflow submits to contract:**
```typescript
evmClient.writeReport(runtime, {
    receiver: leaseAgreementAddress,
    report: reportResponse,
    gasConfig: { gasLimit: "500000" }
});
```

**4. KeystoneForwarder validates and calls:**
```solidity
// Forwarder calls: leaseAgreement.onReport(metadata, report)
```

**5. LeaseAgreement processes:**
```solidity
onReport(metadata, report) → _updateCreditCheckStatus(leaseId, passed, verificationId)
```

## Testing

### Simulation Mode

1. Deploy with MockForwarder address
2. Run: `cre workflow simulate`

### Production Mode

1. Deploy with KeystoneForwarder address
2. Deploy workflow: `cre workflow deploy`

## Security

### Built-in Security
✅ Forwarder address validation (validates msg.sender)
✅ DON signature verification (handled by KeystoneForwarder)
✅ Replay protection (handled by KeystoneForwarder)
✅ Owner access control

### Additional Security Options
For more advanced validation (workflow ID, owner, name), you can extend the `onReport` function to decode and validate the `metadata` parameter using the pattern shown in Chainlink's `KeystoneFeedsConsumer` example.

### Emergency Override
The `manualCreditCheckOverride()` function allows the owner to manually set credit check status in case of workflow issues. Use with caution.

## Events

### CreditCheckCompleted
```solidity
event CreditCheckCompleted(
    uint256 indexed leaseId,
    bool passed,
    string verificationId
);
```

Emitted when credit check is processed, includes verification ID for audit trail.

## Troubleshooting

### "InvalidSender" Error
- Check that the forwarder address is correct
- Verify you're calling from the expected forwarder
- For simulation, use MockForwarder address

### "InvalidWorkflowId" Error
- Remove workflow ID validation during simulation
- Ensure workflow ID matches configured value in production

### "Lease does not exist" Error
- Verify the leaseId exists (created via `createLease()`)
- Check that the workflow is using the correct leaseId

### Transaction Reverts
- Ensure lease is in `Draft` state
- Check gas limit is sufficient (recommended: 500000+)
- Verify report encoding matches contract expectations

## Migration from Old Contract

If you have an existing LeaseAgreement deployment:

1. Deploy new LeaseAgreement with forwarder address
2. Migrate state (if needed) using owner functions
3. Update CRE workflow config with new address
4. Test with simulation before production deployment
5. Configure security settings (workflow ID, etc.)

## Related Files

- Workflow: `cre-workflows/chainlease-workflows/credit-check-workflow/evm.ts`
- Config: `cre-workflows/chainlease-workflows/credit-check-workflow/config.*.json`
- Skills: `.copilot/chainlink-cre-skills.md`
