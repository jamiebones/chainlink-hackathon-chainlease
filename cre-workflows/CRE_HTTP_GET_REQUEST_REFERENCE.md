# CRE HTTP GET Request Reference

## Overview

This comprehensive guide covers making HTTP GET requests from CRE workflows using the HTTPClient SDK. All HTTP requests are wrapped in a consensus mechanism to provide a single, reliable result across the decentralized oracle network (DON).

**ChainLease Use Cases:**
- Call external credit check APIs for tenant verification
- Fetch property listing data from third-party services
- Retrieve background check results
- Query rental market data for dynamic pricing
- Validate identity documents via external services

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [The sendRequest Pattern (Recommended)](#1-the-sendrequest-pattern-recommended)
3. [The runInNodeMode Pattern (Low-Level)](#2-the-runinnodemode-pattern-low-level)
4. [ChainLease Examples](#chainlease-examples)
5. [Consensus & Aggregation](#consensus--aggregation)
6. [Error Handling](#error-handling)
7. [Important Considerations](#important-considerations)
8. [Response Helper Functions](#response-helper-functions)

---

## Core Concepts

### Request Consensus

All HTTP requests execute on multiple DON nodes independently. The SDK provides consensus mechanisms to aggregate individual responses into a single, reliable result.

**Two approaches:**

1. **sendRequest** (Recommended): High-level helper that simplifies requests
   - Use for single HTTP GET requests
   - Straightforward logic: request → parse → return
   - Clean code with minimal boilerplate

2. **runInNodeMode** (Low-Level): More control for complex scenarios
   - Use for multiple HTTP requests with logic between them
   - Conditional execution based on runtime conditions
   - Custom retry logic or complex error handling
   - Complex data transformation (multiple APIs, combining results)

### Important Limitations

> **⚠️ Redirects are NOT Supported**
>
> HTTP requests to URLs that return redirects (3xx status codes) will fail. Ensure the URL you provide is the final destination and does not redirect to another URL.

> **⚠️ Use runtime.now() for Timestamps**
>
> If your HTTP request includes timestamps (e.g., for authentication headers or time-based queries), use `runtime.now()` instead of `Date.now()`. This ensures all nodes use the same timestamp and reach consensus.

---

## 1. The sendRequest Pattern (Recommended)

### Architecture

The pattern involves two key components:

1. **Fetching Function**: Receives a `sendRequester` object and additional arguments (like `config`). Contains your core logic—making the request, parsing the response, and returning a clean data object.

2. **Main Handler**: Calls `httpClient.sendRequest()`, which returns a function that you then call with your additional arguments.

This separation keeps your code clean and focused.

### Step-by-Step Example

This example shows a complete workflow that fetches the price of an asset, parses it into a typed object, and aggregates the results using field-based consensus.

#### Step 1: Configure your workflow

Add the API URL to your `config.json` file.

```json
{
  "schedule": "0 */5 * * * *",
  "apiUrl": "https://some-price-api.com/price?ids=ethereum"
}
```

#### Step 2: Define the response types

Define TypeScript types for the API response and your internal data model.

```typescript
import { HTTPClient, type Runtime, type HTTPSendRequester, Runner } from "@chainlink/cre-sdk"
import { z } from "zod"

// Config schema
const configSchema = z.object({
  schedule: z.string(),
  apiUrl: z.string(),
})

type Config = z.infer<typeof configSchema>

// PriceData is the clean, internal type that our workflow will use
type PriceData = {
  price: number
  lastUpdated: Date
}

// ExternalApiResponse is used to parse the nested JSON from the external API
type ExternalApiResponse = {
  ethereum: {
    usd: number
    last_updated_at: number
  }
}
```

#### Step 3: Implement the fetch and parse logic

Create the function that will be passed to `sendRequest()`. This function receives the `sendRequester` and `config` as parameters.

```typescript
const fetchAndParse = (sendRequester: HTTPSendRequester, config: Config): PriceData => {
  // 1. Construct the request
  const req = {
    url: config.apiUrl,
    method: "GET" as const,
  }

  // 2. Send the request using the provided sendRequester
  const resp = sendRequester.sendRequest(req).result()

  if (resp.statusCode !== 200) {
    throw new Error(`API returned status ${resp.statusCode}`)
  }

  // 3. Parse the raw JSON into our ExternalApiResponse type
  const bodyText = new TextDecoder().decode(resp.body)
  const externalResp = JSON.parse(bodyText) as ExternalApiResponse

  // 4. Transform into our internal PriceData type and return
  return {
    price: externalResp.ethereum.usd,
    lastUpdated: new Date(externalResp.ethereum.last_updated_at * 1000),
  }
}
```

#### Step 4: Call sendRequest() and aggregate results

In your `onCronTrigger` handler, call `httpClient.sendRequest()`. This returns a function that you call with `runtime.config`.

```typescript
import { HTTPClient, ConsensusAggregationByFields, median, type Runtime } from "@chainlink/cre-sdk"

const onCronTrigger = (runtime: Runtime<Config>): string => {
  const httpClient = new HTTPClient()

  // sendRequest returns a function that we call with runtime.config
  const result = httpClient
    .sendRequest(
      runtime,
      fetchAndParse,
      ConsensusAggregationByFields<PriceData>({
        price: median<number>(),
        lastUpdated: median<Date>(),
      })
    )(runtime.config) // Call the returned function with config
    .result()

  runtime.log(`Successfully fetched and aggregated price data: $${result.price} at ${result.lastUpdated.toISOString()}`)

  return `Price: ${result.price}`
}
```

### Complete Example

Here's the full workflow code:

```typescript
import {
  CronCapability,
  HTTPClient,
  handler,
  ConsensusAggregationByFields,
  median,
  type Runtime,
  type HTTPSendRequester,
  Runner,
} from "@chainlink/cre-sdk"
import { z } from "zod"

// Config schema
const configSchema = z.object({
  schedule: z.string(),
  apiUrl: z.string(),
})

type Config = z.infer<typeof configSchema>

// Types
type PriceData = {
  price: number
  lastUpdated: Date
}

type ExternalApiResponse = {
  ethereum: {
    usd: number
    last_updated_at: number
  }
}

// Fetch function receives sendRequester and config as parameters
const fetchAndParse = (sendRequester: HTTPSendRequester, config: Config): PriceData => {
  const req = {
    url: config.apiUrl,
    method: "GET" as const,
  }

  const resp = sendRequester.sendRequest(req).result()

  if (resp.statusCode !== 200) {
    throw new Error(`API returned status ${resp.statusCode}`)
  }

  const bodyText = new TextDecoder().decode(resp.body)
  const externalResp = JSON.parse(bodyText) as ExternalApiResponse

  return {
    price: externalResp.ethereum.usd,
    lastUpdated: new Date(externalResp.ethereum.last_updated_at * 1000),
  }
}

// Main workflow handler
const onCronTrigger = (runtime: Runtime<Config>): string => {
  const httpClient = new HTTPClient()

  const result = httpClient
    .sendRequest(
      runtime,
      fetchAndParse,
      ConsensusAggregationByFields<PriceData>({
        price: median<number>(),
        lastUpdated: median<Date>(),
      })
    )(runtime.config) // Call with config
    .result()

  runtime.log(`Successfully fetched price: $${result.price} at ${result.lastUpdated.toISOString()}`)

  return `Price: ${result.price}`
}

// Initialize workflow
const initWorkflow = (config: Config) => {
  return [
    handler(
      new CronCapability().trigger({
        schedule: config.schedule,
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

## 2. The runInNodeMode Pattern (Low-Level)

For more complex scenarios, you can use the lower-level `runtime.runInNodeMode()` method directly. This gives you more control but requires more boilerplate code.

### Architecture

The pattern works like a "map-reduce" for the DON:

- **Map**: You provide a function (e.g., `fetchPriceData`) that executes on every node
- **Reduce**: You provide a consensus aggregation to reduce the individual results into a single outcome

### Complete Example

The example below is functionally identical to the sendRequest example above, but implemented using the low-level pattern.

```typescript
import {
  CronCapability,
  HTTPClient,
  handler,
  ConsensusAggregationByFields,
  median,
  type Runtime,
  type NodeRuntime,
  Runner,
} from "@chainlink/cre-sdk"
import { z } from "zod"

// Config and types (same as before)
const configSchema = z.object({
  schedule: z.string(),
  apiUrl: z.string(),
})

type Config = z.infer<typeof configSchema>

type PriceData = {
  price: number
  lastUpdated: Date
}

type ExternalApiResponse = {
  ethereum: {
    usd: number
    last_updated_at: number
  }
}

// fetchPriceData is a function that runs on each individual node
const fetchPriceData = (nodeRuntime: NodeRuntime<Config>): PriceData => {
  // 1. Create HTTP client and fetch raw data
  const httpClient = new HTTPClient()

  const req = {
    url: nodeRuntime.config.apiUrl,
    method: "GET" as const,
  }

  const resp = httpClient.sendRequest(nodeRuntime, req).result()

  if (resp.statusCode !== 200) {
    throw new Error(`API returned status ${resp.statusCode}`)
  }

  // 2. Parse and transform the response
  const bodyText = new TextDecoder().decode(resp.body)
  const externalResp = JSON.parse(bodyText) as ExternalApiResponse

  return {
    price: externalResp.ethereum.usd,
    lastUpdated: new Date(externalResp.ethereum.last_updated_at * 1000),
  }
}

// Main workflow handler
const onCronTrigger = (runtime: Runtime<Config>): string => {
  const result = runtime
    .runInNodeMode(
      fetchPriceData,
      ConsensusAggregationByFields<PriceData>({
        price: median<number>(),
        lastUpdated: median<Date>(),
      })
    )()
    .result()

  runtime.log(`Successfully fetched price: $${result.price} at ${result.lastUpdated.toISOString()}`)

  return `Price: ${result.price}`
}

// Initialize workflow (same as before)
const initWorkflow = (config: Config) => {
  return [
    handler(
      new CronCapability().trigger({
        schedule: config.schedule,
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

## ChainLease Examples

### Example 1: Credit Check API Call (Event-Driven)

This workflow listens for `LeaseCreated` events and calls an external credit check API.

#### Configuration (config.json)

```json
{
  "chainSelectorName": "ethereum-testnet-sepolia",
  "leaseAgreementAddress": "0xYourLeaseAgreementAddress",
  "creditCheckApiUrl": "https://api.creditcheck.com/verify",
  "creditCheckApiKey": "your-api-key"
}
```

#### Workflow Code (main.ts)

```typescript
import {
  HTTPClient,
  EVMClient,
  getNetwork,
  handler,
  hexToBase64,
  bytesToHex,
  type Runtime,
  type HTTPSendRequester,
  consensusIdenticalAggregation,
  Runner,
  type EVMLog,
} from "@chainlink/cre-sdk"
import { keccak256, toBytes, decodeEventLog } from "viem"
import { z } from "zod"

const configSchema = z.object({
  chainSelectorName: z.string(),
  leaseAgreementAddress: z.string(),
  creditCheckApiUrl: z.string(),
  creditCheckApiKey: z.string(),
})

type Config = z.infer<typeof configSchema>

// Internal type for clean credit check result
type CreditCheckResult = {
  leaseId: string
  passed: boolean
  score: number
  verificationId: string
}

// External API response structure
type CreditCheckApiResponse = {
  status: string
  data: {
    credit_score: number
    approved: boolean
    verification_id: string
  }
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

// Fetch function using sendRequest pattern
const fetchCreditCheck = (
  sendRequester: HTTPSendRequester,
  config: Config,
  tenant: string,
  leaseId: string
): CreditCheckResult => {
  const req = {
    url: config.creditCheckApiUrl,
    method: "POST" as const,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.creditCheckApiKey}`,
    },
    body: new TextEncoder().encode(
      JSON.stringify({
        tenant_address: tenant,
        lease_id: leaseId,
        timestamp: Date.now(), // Use runtime.now() in production
      })
    ),
  }

  const resp = sendRequester.sendRequest(req).result()

  if (resp.statusCode !== 200) {
    throw new Error(`Credit check API returned status ${resp.statusCode}`)
  }

  const bodyText = new TextDecoder().decode(resp.body)
  const apiResponse = JSON.parse(bodyText) as CreditCheckApiResponse

  return {
    leaseId,
    passed: apiResponse.data.approved,
    score: apiResponse.data.credit_score,
    verificationId: apiResponse.data.verification_id,
  }
}

// Event handler
const onLeaseCreated = (runtime: Runtime<Config>, log: EVMLog): string => {
  runtime.log(`LeaseCreated event detected`)

  const topics = log.topics.map((t) => bytesToHex(t)) as [`0x${string}`, ...`0x${string}`[]]
  const data = bytesToHex(log.data)

  const decodedLog = decodeEventLog({
    abi: leaseCreatedEventAbi,
    data,
    topics,
  })

  const { leaseId, tenant } = decodedLog.args

  runtime.log(`Processing credit check for lease ${leaseId.toString()}, tenant: ${tenant}`)

  // Call credit check API using sendRequest pattern
  const httpClient = new HTTPClient()
  const result = httpClient
    .sendRequest(
      runtime,
      fetchCreditCheck,
      consensusIdenticalAggregation<CreditCheckResult>()
    )(runtime.config, tenant, leaseId.toString())
    .result()

  runtime.log(`Credit check completed: ${result.passed ? "PASSED" : "FAILED"} (Score: ${result.score})`)

  // Next step: Write result back to contract (see CRE_ONCHAIN_WRITE_REFERENCE.md)

  return `Lease ${result.leaseId}: ${result.passed ? "APPROVED" : "REJECTED"}`
}

// Initialize workflow
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
      onLeaseCreated
    ),
  ]
}

export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}
```

### Example 2: Background Check API (Cron-Based)

This workflow runs daily to check pending lease applications against a background check API.

#### Configuration (config.json)

```json
{
  "schedule": "0 0 10 * * *",
  "chainSelectorName": "ethereum-testnet-sepolia",
  "leaseAgreementAddress": "0xYourLeaseAgreementAddress",
  "backgroundCheckApiUrl": "https://api.backgroundcheck.com/verify",
  "backgroundCheckApiKey": "your-api-key"
}
```

#### Workflow Code (main.ts)

```typescript
import {
  CronCapability,
  HTTPClient,
  EVMClient,
  getNetwork,
  handler,
  type Runtime,
  type HTTPSendRequester,
  consensusIdenticalAggregation,
  Runner,
} from "@chainlink/cre-sdk"
import { encodeFunctionData, decodeFunctionResult, parseAbi } from "viem"
import { z } from "zod"

const configSchema = z.object({
  schedule: z.string(),
  chainSelectorName: z.string(),
  leaseAgreementAddress: z.string(),
  backgroundCheckApiUrl: z.string(),
  backgroundCheckApiKey: z.string(),
})

type Config = z.infer<typeof configSchema>

type BackgroundCheckResult = {
  tenant: string
  passed: boolean
  riskScore: number
  verificationId: string
}

type BackgroundCheckApiResponse = {
  status: string
  data: {
    risk_score: number
    passed: boolean
    verification_id: string
  }
}

// Fetch function
const fetchBackgroundCheck = (
  sendRequester: HTTPSendRequester,
  config: Config,
  tenant: string
): BackgroundCheckResult => {
  const req = {
    url: `${config.backgroundCheckApiUrl}?address=${tenant}`,
    method: "GET" as const,
    headers: {
      Authorization: `Bearer ${config.backgroundCheckApiKey}`,
    },
  }

  const resp = sendRequester.sendRequest(req).result()

  if (resp.statusCode !== 200) {
    throw new Error(`Background check API returned status ${resp.statusCode}`)
  }

  const bodyText = new TextDecoder().decode(resp.body)
  const apiResponse = JSON.parse(bodyText) as BackgroundCheckApiResponse

  return {
    tenant,
    passed: apiResponse.data.passed,
    riskScore: apiResponse.data.risk_score,
    verificationId: apiResponse.data.verification_id,
  }
}

// Cron handler
const onCronTrigger = (runtime: Runtime<Config>): string => {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: runtime.config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Network not found`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector)

  // 1. Read pending applications from contract
  const leaseAbi = parseAbi([
    "function getPendingApplications() external view returns (address[])",
  ])

  const calldata = encodeFunctionData({
    abi: leaseAbi,
    functionName: "getPendingApplications",
    args: [],
  })

  const callResponse = evmClient
    .call(runtime, {
      to: runtime.config.leaseAgreementAddress as `0x${string}`,
      data: calldata,
    })
    .result()

  const pendingTenants = decodeFunctionResult({
    abi: leaseAbi,
    functionName: "getPendingApplications",
    data: callResponse.data,
  }) as string[]

  runtime.log(`Found ${pendingTenants.length} pending applications`)

  if (pendingTenants.length === 0) {
    return "No pending applications to check"
  }

  // 2. Check first pending application (expand for batch processing)
  const tenant = pendingTenants[0]
  const httpClient = new HTTPClient()

  const result = httpClient
    .sendRequest(
      runtime,
      fetchBackgroundCheck,
      consensusIdenticalAggregation<BackgroundCheckResult>()
    )(runtime.config, tenant)
    .result()

  runtime.log(`Background check for ${result.tenant}: ${result.passed ? "PASSED" : "FAILED"} (Risk: ${result.riskScore})`)

  // Next step: Write result back to contract

  return `Checked ${result.tenant}: ${result.passed ? "PASSED" : "FAILED"}`
}

// Initialize workflow
const initWorkflow = (config: Config) => {
  return [
    handler(
      new CronCapability().trigger({
        schedule: config.schedule,
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

### Example 3: Property Listing Verification (Complex Multi-Step)

This example uses `runInNodeMode` for complex logic with multiple API calls.

```typescript
import {
  CronCapability,
  HTTPClient,
  handler,
  type Runtime,
  type NodeRuntime,
  consensusIdenticalAggregation,
  Runner,
} from "@chainlink/cre-sdk"
import { z } from "zod"

const configSchema = z.object({
  schedule: z.string(),
  propertyApiUrl: z.string(),
  geocodingApiUrl: z.string(),
  complianceApiUrl: z.string(),
})

type Config = z.infer<typeof configSchema>

type PropertyVerificationResult = {
  propertyId: string
  exists: boolean
  coordinates: { lat: number; lng: number } | null
  compliant: boolean
}

// Complex multi-step function using runInNodeMode
const verifyProperty = (nodeRuntime: NodeRuntime<Config>): PropertyVerificationResult => {
  const httpClient = new HTTPClient()
  const propertyId = "PROP-12345" // In practice, from contract or config

  // Step 1: Check if property exists
  const propertyReq = {
    url: `${nodeRuntime.config.propertyApiUrl}/properties/${propertyId}`,
    method: "GET" as const,
  }

  const propertyResp = httpClient.sendRequest(nodeRuntime, propertyReq).result()

  if (propertyResp.statusCode === 404) {
    return {
      propertyId,
      exists: false,
      coordinates: null,
      compliant: false,
    }
  }

  if (propertyResp.statusCode !== 200) {
    throw new Error(`Property API error: ${propertyResp.statusCode}`)
  }

  const propertyData = JSON.parse(new TextDecoder().decode(propertyResp.body)) as {
    address: string
    city: string
    state: string
  }

  // Step 2: Geocode address
  const geocodeReq = {
    url: `${nodeRuntime.config.geocodingApiUrl}?address=${encodeURIComponent(propertyData.address)}`,
    method: "GET" as const,
  }

  const geocodeResp = httpClient.sendRequest(nodeRuntime, geocodeReq).result()

  if (geocodeResp.statusCode !== 200) {
    throw new Error(`Geocoding API error: ${geocodeResp.statusCode}`)
  }

  const geocodeData = JSON.parse(new TextDecoder().decode(geocodeResp.body)) as {
    lat: number
    lng: number
  }

  // Step 3: Check compliance based on location
  const complianceReq = {
    url: `${nodeRuntime.config.complianceApiUrl}?lat=${geocodeData.lat}&lng=${geocodeData.lng}`,
    method: "GET" as const,
  }

  const complianceResp = httpClient.sendRequest(nodeRuntime, complianceReq).result()

  if (complianceResp.statusCode !== 200) {
    throw new Error(`Compliance API error: ${complianceResp.statusCode}`)
  }

  const complianceData = JSON.parse(new TextDecoder().decode(complianceResp.body)) as {
    compliant: boolean
  }

  // Return aggregated result
  return {
    propertyId,
    exists: true,
    coordinates: geocodeData,
    compliant: complianceData.compliant,
  }
}

// Cron handler using runInNodeMode
const onCronTrigger = (runtime: Runtime<Config>): string => {
  const result = runtime
    .runInNodeMode(verifyProperty, consensusIdenticalAggregation<PropertyVerificationResult>())()
    .result()

  runtime.log(`Property verification: ${result.propertyId} - Exists: ${result.exists}, Compliant: ${result.compliant}`)

  return `Property ${result.propertyId}: ${result.compliant ? "COMPLIANT" : "NON-COMPLIANT"}`
}

const initWorkflow = (config: Config) => {
  return [
    handler(
      new CronCapability().trigger({
        schedule: config.schedule,
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

## Consensus & Aggregation

When multiple DON nodes execute HTTP requests, you need to aggregate their responses into a single result. The SDK provides several consensus strategies:

### consensusIdenticalAggregation

Use when all nodes should return identical results (exact match required).

```typescript
import { consensusIdenticalAggregation } from "@chainlink/cre-sdk"

const result = httpClient
  .sendRequest(
    runtime,
    fetchAndParse,
    consensusIdenticalAggregation<CreditCheckResult>()
  )(runtime.config, tenant, leaseId)
  .result()
```

**Use cases:**
- API responses with deterministic data (credit check status, verification IDs)
- Boolean results (approved/rejected)
- Fixed string values

### ConsensusAggregationByFields

Use when different fields need different aggregation strategies.

```typescript
import { ConsensusAggregationByFields, median, mode } from "@chainlink/cre-sdk"

const result = httpClient
  .sendRequest(
    runtime,
    fetchAndParse,
    ConsensusAggregationByFields<PriceData>({
      price: median<number>(), // Median of all price values
      lastUpdated: median<Date>(), // Median of timestamps
      status: mode<string>(), // Most common status string
    })
  )(runtime.config)
  .result()
```

**Available aggregators:**
- `median<T>()`: Median value (numeric or temporal data)
- `mode<T>()`: Most common value (categorical data)
- `first<T>()`: First value received
- `last<T>()`: Last value received

**Use cases:**
- Numeric data prone to outliers (prices, scores)
- Mixed response types (numeric + categorical fields)
- Temporal data (timestamps, dates)

### Custom Aggregation

For advanced scenarios, implement custom aggregation logic:

```typescript
const customAggregation = {
  aggregate: (values: CreditCheckResult[]): CreditCheckResult => {
    // Custom logic: Require 2/3 majority for approval
    const approvalCount = values.filter(v => v.passed).length
    const passed = approvalCount >= Math.ceil(values.length * 0.67)
    
    // Use median score
    const scores = values.map(v => v.score).sort((a, b) => a - b)
    const medianScore = scores[Math.floor(scores.length / 2)]
    
    return {
      leaseId: values[0].leaseId,
      passed,
      score: medianScore,
      verificationId: values[0].verificationId,
    }
  }
}
```

---

## Error Handling

### HTTP Status Codes

Always check status codes and handle errors appropriately:

```typescript
const fetchAndParse = (sendRequester: HTTPSendRequester, config: Config): Result => {
  const req = {
    url: config.apiUrl,
    method: "GET" as const,
  }

  const resp = sendRequester.sendRequest(req).result()

  // Handle specific status codes
  if (resp.statusCode === 404) {
    throw new Error(`Resource not found: ${config.apiUrl}`)
  }

  if (resp.statusCode === 429) {
    throw new Error(`Rate limit exceeded`)
  }

  if (resp.statusCode >= 500) {
    throw new Error(`Server error: ${resp.statusCode}`)
  }

  if (resp.statusCode !== 200) {
    throw new Error(`Unexpected status: ${resp.statusCode}`)
  }

  // Parse response...
  const bodyText = new TextDecoder().decode(resp.body)
  return JSON.parse(bodyText) as Result
}
```

### Parsing Errors

Validate API responses before using them:

```typescript
const fetchAndParse = (sendRequester: HTTPSendRequester, config: Config): CreditCheckResult => {
  const resp = sendRequester.sendRequest(req).result()

  if (resp.statusCode !== 200) {
    throw new Error(`API returned status ${resp.statusCode}`)
  }

  const bodyText = new TextDecoder().decode(resp.body)
  let apiResponse: CreditCheckApiResponse

  try {
    apiResponse = JSON.parse(bodyText) as CreditCheckApiResponse
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${error}`)
  }

  // Validate required fields
  if (!apiResponse.data || typeof apiResponse.data.approved !== 'boolean') {
    throw new Error(`Invalid API response structure`)
  }

  return {
    leaseId: config.leaseId,
    passed: apiResponse.data.approved,
    score: apiResponse.data.credit_score ?? 0,
    verificationId: apiResponse.data.verification_id ?? "unknown",
  }
}
```

### Network Errors

Network errors (timeouts, connection failures) are handled automatically by the CRE runtime. If a node fails to fetch data, other nodes will continue, and consensus will be reached based on successful responses.

**Timeout Configuration:**

```typescript
const req = {
  url: config.apiUrl,
  method: "GET" as const,
  timeout: "10s", // 10 second timeout
}
```

---

## Important Considerations

### 1. Redirects are NOT Supported

> **⚠️ Critical Limitation**
>
> HTTP requests to URLs that return redirects (3xx status codes) will fail. Ensure the URL you provide is the final destination.

```typescript
// WRONG - If this URL redirects, the request will fail
const req = {
  url: "http://example.com/redirect-endpoint",
  method: "GET" as const,
}

// CORRECT - Use the final destination URL
const req = {
  url: "https://api.example.com/v2/data",
  method: "GET" as const,
}
```

### 2. Use runtime.now() for Timestamps

All DON nodes must use the same timestamp to reach consensus. Use `runtime.now()` instead of `Date.now()`.

```typescript
// WRONG - Each node will have a different timestamp
const timestamp = Date.now()

// CORRECT - All nodes use the same timestamp
const timestamp = runtime.now()
```

**Example in request:**

```typescript
const fetchWithTimestamp = (sendRequester: HTTPSendRequester, config: Config, runtime: Runtime<Config>): Result => {
  const req = {
    url: config.apiUrl,
    method: "POST" as const,
    headers: {
      "Content-Type": "application/json",
      "X-Timestamp": runtime.now().toString(),
    },
    body: new TextEncoder().encode(
      JSON.stringify({
        tenant: config.tenant,
        timestamp: runtime.now(), // Use runtime.now()
      })
    ),
  }

  const resp = sendRequester.sendRequest(req).result()
  // ... parse and return
}
```

### 3. Request Timeouts

Configure timeouts to prevent hanging requests:

```typescript
const req = {
  url: config.apiUrl,
  method: "GET" as const,
  timeout: "8s", // 8 second timeout (string format)
}
```

Default timeout varies by capability. Always specify explicit timeouts for production workflows.

### 4. Authentication

For APIs requiring authentication:

```typescript
const req = {
  url: config.apiUrl,
  method: "GET" as const,
  headers: {
    Authorization: `Bearer ${config.apiKey}`,
    "X-API-Key": config.apiKey, // Alternative auth pattern
  },
}
```

**Security Note:** Store API keys in `secrets.yaml`, not `config.json`:

```yaml
# secrets.yaml
0:
  creditCheckApiKey: "your-secret-key"
```

```json
// config.json
{
  "creditCheckApiKey": "${creditCheckApiKey}"
}
```

### 5. Response Body Parsing

Always use `TextDecoder` to decode response bodies:

```typescript
// Parse JSON response
const bodyText = new TextDecoder().decode(resp.body)
const data = JSON.parse(bodyText) as YourType

// Parse plain text response
const bodyText = new TextDecoder().decode(resp.body)
runtime.log(`Response: ${bodyText}`)
```

### 6. Rate Limiting

Consider API rate limits when designing workflows:

- For event-driven workflows: Ensure your trigger frequency doesn't exceed API limits
- For cron workflows: Set appropriate schedules
- Implement exponential backoff for retries (custom logic in `runInNodeMode`)

---

## Response Helper Functions

The SDK provides utility functions to simplify working with HTTP responses:

### ok()

Check if response status is 2xx:

```typescript
import { ok } from "@chainlink/cre-sdk"

const resp = sendRequester.sendRequest(req).result()

if (!ok(resp)) {
  throw new Error(`Request failed with status ${resp.statusCode}`)
}
```

### text()

Decode response body as text:

```typescript
import { text } from "@chainlink/cre-sdk"

const resp = sendRequester.sendRequest(req).result()
const bodyText = text(resp)
runtime.log(`Response: ${bodyText}`)
```

### json()

Decode response body as JSON:

```typescript
import { json } from "@chainlink/cre-sdk"

const resp = sendRequester.sendRequest(req).result()
const data = json<CreditCheckApiResponse>(resp)
runtime.log(`Credit score: ${data.data.credit_score}`)
```

### getHeader()

Extract specific header value:

```typescript
import { getHeader } from "@chainlink/cre-sdk"

const resp = sendRequester.sendRequest(req).result()
const rateLimit = getHeader(resp.headers, "X-RateLimit-Remaining")
runtime.log(`Remaining requests: ${rateLimit}`)
```

---

## Request Customization

### Headers

```typescript
const req = {
  url: config.apiUrl,
  method: "GET" as const,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
    "User-Agent": "ChainLease-CRE/1.0",
    "X-Custom-Header": "value",
  },
}
```

### Body (for POST/PUT)

```typescript
const req = {
  url: config.apiUrl,
  method: "POST" as const,
  headers: {
    "Content-Type": "application/json",
  },
  body: new TextEncoder().encode(
    JSON.stringify({
      tenant: config.tenant,
      leaseId: config.leaseId,
      timestamp: runtime.now(),
    })
  ),
}
```

### Timeout

```typescript
const req = {
  url: config.apiUrl,
  method: "GET" as const,
  timeout: "5s", // 5 second timeout
}
```

### Cache Settings

```typescript
const req = {
  url: config.apiUrl,
  method: "GET" as const,
  cache: {
    enabled: true,
    ttl: "60s", // Cache for 60 seconds
  },
}
```

---

## Best Practices

1. **Use sendRequest for simple cases**: Start with the high-level pattern. Only use `runInNodeMode` when you need complex logic.

2. **Type safety**: Always define TypeScript types for API responses and internal data models.

3. **Error handling**: Check status codes, validate response structure, handle parsing errors.

4. **Consensus strategy**: Choose appropriate aggregation based on data type:
   - Identical aggregation for deterministic data
   - Field-based aggregation for mixed types
   - Custom aggregation for complex requirements

5. **Timeouts**: Always specify explicit timeouts to prevent hanging requests.

6. **Authentication**: Store API keys in `secrets.yaml`, not `config.json`.

7. **Logging**: Add meaningful logs for debugging and monitoring.

8. **Testing**: Test with simulation before deploying to production.

---

## Summary

### sendRequest Pattern (Recommended)
- Simple, clean API for single HTTP requests
- Automatic consensus handling
- Separation of fetch logic and main handler
- Use for 90% of HTTP request scenarios

### runInNodeMode Pattern (Advanced)
- Full control over execution flow
- Multiple requests with conditional logic
- Custom retry and error handling
- Use for complex multi-step workflows

### ChainLease Use Cases
- Credit check API calls (event-driven)
- Background checks (cron-based)
- Property listing verification (multi-step)
- Rental market data fetching
- Identity document validation

---

## Resources

- [CRE SDK Documentation](https://docs.chain.link/chainlink-functions)
- [HTTP Client SDK Reference](https://docs.chain.link/chainlink-functions/api-reference/http-client)
- [Consensus & Aggregation Reference](https://docs.chain.link/chainlink-functions/api-reference/consensus)
- [Using Time in Workflows](https://docs.chain.link/chainlink-functions/resources/time)

---

**Last Updated:** February 21, 2026  
**ChainLease Development Team**
