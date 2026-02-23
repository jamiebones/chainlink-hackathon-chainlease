# CRE HTTP POST Request Reference

## Overview

This comprehensive guide covers making HTTP POST requests from CRE workflows using the HTTPClient SDK. POST requests typically create resources or trigger actions, so this guide focuses on the **single-execution pattern** to ensure your request executes only once, even though multiple nodes in the DON run your workflow.

**ChainLease Use Cases:**
- Submit credit check results to external services
- Send email notifications via email APIs
- Trigger SMS alerts for lease events
- Post payment confirmations to accounting systems
- Create records in external databases
- Webhook notifications to tenant/landlord apps

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Single-Execution Pattern](#single-execution-pattern)
3. [The High-Level sendRequest Pattern (Recommended)](#1-the-high-level-sendrequest-pattern-recommended)
4. [The Low-Level runInNodeMode Pattern](#2-the-low-level-runinnodemode-pattern)
5. [ChainLease Examples](#chainlease-examples)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)
8. [Advanced Patterns](#advanced-patterns)

---

## Core Concepts

### Why POST Requests Need Special Handling

By default, all nodes in the DON execute HTTP requests. For POST, PUT, PATCH, and DELETE operations, this would cause:

- **Duplicate resource creation** (creating the same lease notification 10+ times)
- **Multiple emails sent** (tenant receives 10 identical emails)
- **Repeated webhook triggers** (external service receives duplicate notifications)
- **Inconsistent state** (if some requests succeed and others fail)

### The Solution: cacheSettings

Use `cacheSettings` in your HTTP request configuration. This enables a shared cache across nodes:

1. **First node** makes the HTTP request and stores the response in the cache
2. **Other nodes** check the cache first and reuse the cached response
3. **Result**: Only one actual HTTP call is made, while all nodes participate in consensus

> **✅ When to use cacheSettings**
>
> Use `cacheSettings` for all POST, PUT, PATCH, and DELETE requests unless your API is explicitly designed to be idempotent (safe to call multiple times). This is the standard pattern.

### Two Approaches

1. **sendRequest** (Recommended): High-level helper that simplifies requests
   - Use for single HTTP POST requests
   - Straightforward logic: prepare data → make request → return result
   - Clean code with minimal boilerplate

2. **runInNodeMode** (Low-Level): More control for complex scenarios
   - **Required when accessing secrets** (API keys, authentication tokens)
   - Multiple HTTP requests with logic between them
   - Conditional execution based on runtime conditions
   - Custom retry logic or complex error handling

### Important Limitations

> **⚠️ Redirects are NOT Supported**
>
> HTTP requests to URLs that return redirects (3xx status codes) will fail. Ensure the URL you provide is the final destination.

> **⚠️ Use runtime.now() for Timestamps**
>
> If your HTTP request includes timestamps (e.g., for authentication headers), use `runtime.now()` instead of `Date.now()`. This ensures all nodes use the same timestamp and reach consensus.

---

## Single-Execution Pattern

### Understanding cacheSettings

The `cacheSettings` object has two key properties:

```typescript
cacheSettings: {
  readFromCache: true,  // Enable reading cached responses
  maxAgeMs: 60000       // Accept cached responses up to 60 seconds old
}
```

**How it works:**

1. **Node 1** executes first:
   - Checks cache for response (cache miss)
   - Makes HTTP POST request
   - Stores response in shared cache with timestamp
   - Returns response for consensus

2. **Nodes 2-N** execute shortly after:
   - Check cache for response (cache hit)
   - Reuse cached response from Node 1
   - Skip HTTP request entirely
   - Use cached response for consensus

3. **All nodes** participate in consensus with the same response data

### Cache Configuration Guidelines

**maxAgeMs values:**

- `30000` (30 seconds): Fast-executing workflows, low latency requirements
- `60000` (60 seconds): **Recommended default** for most workflows
- `120000` (2 minutes): Slower APIs, workflows with complex logic
- `300000` (5 minutes): Very slow APIs or batch processing

**Rule of thumb:** Set `maxAgeMs` to be longer than your workflow's typical execution time across all nodes (usually 30-60 seconds is sufficient).

> **⚠️ Important: Not Perfect, But Reliable**
>
> The `cacheSettings` approach is a best-effort mechanism that works reliably in most scenarios. In rare cases (network partitions, timing edge cases), multiple requests may still occur. For critical operations requiring absolute guarantees, implement idempotency keys or additional safeguards at the API level.

---

## 1. The High-Level sendRequest Pattern (Recommended)

### Architecture

The pattern involves two key components:

1. **Data Posting Function**: Receives a `sendRequester` object and config. Prepares data, serializes to JSON, and sends POST request with `cacheSettings`.

2. **Main Handler**: Calls `httpClient.sendRequest()`, which returns a function that you call with your config.

### Step-by-Step Example

This example sends JSON data to a webhook using the single-execution pattern.

#### Step 1: Configure your workflow

`config.json`:

```json
{
  "schedule": "*/30 * * * * *",
  "webhookUrl": "https://webhook.site/<your-unique-id>"
}
```

#### Step 2: Define data types

```typescript
import {
  HTTPClient,
  ok,
  consensusIdenticalAggregation,
  type Runtime,
  type HTTPSendRequester,
  Runner,
} from "@chainlink/cre-sdk"
import { z } from "zod"

// Config schema
const configSchema = z.object({
  webhookUrl: z.string(),
  schedule: z.string(),
})

type Config = z.infer<typeof configSchema>

// Data to be sent
type MyData = {
  message: string
  value: number
}

// Response for consensus
type PostResponse = {
  statusCode: number
}
```

#### Step 3: Implement the POST request logic

```typescript
const postData = (sendRequester: HTTPSendRequester, config: Config): PostResponse => {
  // 1. Prepare the data to be sent
  const dataToSend: MyData = {
    message: "Hello there!",
    value: 77,
  }

  // 2. Serialize the data to JSON and encode as bytes
  const bodyBytes = new TextEncoder().encode(JSON.stringify(dataToSend))

  // 3. Convert to base64 for the request
  const body = Buffer.from(bodyBytes).toString("base64")

  // 4. Construct the POST request with cacheSettings
  const req = {
    url: config.webhookUrl,
    method: "POST" as const,
    body,
    headers: {
      "Content-Type": "application/json",
    },
    cacheSettings: {
      readFromCache: true,  // Enable reading from cache
      maxAgeMs: 60000       // Accept cached responses up to 60 seconds old
    },
  }

  // 5. Send the request and wait for the response
  const resp = sendRequester.sendRequest(req).result()

  if (!ok(resp)) {
    throw new Error(`HTTP request failed with status: ${resp.statusCode}`)
  }

  return { statusCode: resp.statusCode }
}
```

#### Step 4: Call sendRequest() from your handler

```typescript
const onCronTrigger = (runtime: Runtime<Config>): string => {
  const httpClient = new HTTPClient()

  const result = httpClient
    .sendRequest(
      runtime,
      postData,
      consensusIdenticalAggregation<PostResponse>()
    )(runtime.config) // Call with config
    .result()

  runtime.log(`Successfully sent data to webhook. Status: ${result.statusCode}`)
  return "Success"
}
```

### Complete Example

```typescript
import {
  CronCapability,
  HTTPClient,
  handler,
  ok,
  consensusIdenticalAggregation,
  type Runtime,
  type HTTPSendRequester,
  Runner,
} from "@chainlink/cre-sdk"
import { z } from "zod"

// Config schema
const configSchema = z.object({
  webhookUrl: z.string(),
  schedule: z.string(),
})

type Config = z.infer<typeof configSchema>

// Data to be sent
type MyData = {
  message: string
  value: number
}

// Response for consensus
type PostResponse = {
  statusCode: number
}

const postData = (sendRequester: HTTPSendRequester, config: Config): PostResponse => {
  // 1. Prepare the data to be sent
  const dataToSend: MyData = {
    message: "Hello there!",
    value: 77,
  }

  // 2. Serialize the data to JSON and encode as bytes
  const bodyBytes = new TextEncoder().encode(JSON.stringify(dataToSend))

  // 3. Convert to base64 for the request
  const body = Buffer.from(bodyBytes).toString("base64")

  // 4. Construct the POST request with cacheSettings
  const req = {
    url: config.webhookUrl,
    method: "POST" as const,
    body,
    headers: {
      "Content-Type": "application/json",
    },
    cacheSettings: {
      readFromCache: true,
      maxAgeMs: 60000,
    },
  }

  // 5. Send the request and wait for the response
  const resp = sendRequester.sendRequest(req).result()

  if (!ok(resp)) {
    throw new Error(`HTTP request failed with status: ${resp.statusCode}`)
  }

  return { statusCode: resp.statusCode }
}

const onCronTrigger = (runtime: Runtime<Config>): string => {
  const httpClient = new HTTPClient()

  const result = httpClient
    .sendRequest(
      runtime,
      postData,
      consensusIdenticalAggregation<PostResponse>()
    )(runtime.config)
    .result()

  runtime.log(`Successfully sent data to webhook. Status: ${result.statusCode}`)
  return "Success"
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
  const runner = await Runner.newRunner<Config>({
    configSchema,
  })
  await runner.run(initWorkflow)
}
```

---

## 2. The Low-Level runInNodeMode Pattern

For more complex scenarios, you can use the lower-level `runtime.runInNodeMode()` method directly. **This pattern is REQUIRED when you need to access secrets** (API keys, authentication tokens).

> **⚠️ Secrets Require runInNodeMode**
>
> The high-level `sendRequest()` method does not provide access to secrets. If you need to use API keys, authentication tokens, or any other secrets in your HTTP requests, you must use the `runInNodeMode` pattern.

### Example with Secrets

#### Configuration

`config.json`:

```json
{
  "webhookUrl": "https://api.example.com/webhook",
  "schedule": "*/30 * * * * *"
}
```

`secrets.yaml`:

```yaml
0:
  API_KEY: "your-secret-api-key-here"
```

#### Workflow Code

```typescript
import {
  CronCapability,
  HTTPClient,
  handler,
  ok,
  consensusIdenticalAggregation,
  type Runtime,
  type NodeRuntime,
  Runner,
} from "@chainlink/cre-sdk"
import { z } from "zod"

// Config and types
const configSchema = z.object({
  webhookUrl: z.string(),
  schedule: z.string(),
})

type Config = z.infer<typeof configSchema>

type MyData = {
  message: string
  value: number
}

type PostResponse = {
  statusCode: number
}

// Node-level function that runs on each node
const postData = (nodeRuntime: NodeRuntime<Config>): PostResponse => {
  // 1. Get the API key from secrets
  const secret = nodeRuntime.getSecret({ id: "API_KEY" }).result()
  const apiKey = secret.value

  const httpClient = new HTTPClient()

  // 2. Prepare the data
  const dataToSend: MyData = {
    message: "Hello there!",
    value: 77,
  }

  // 3. Serialize to JSON and encode as bytes
  const bodyBytes = new TextEncoder().encode(JSON.stringify(dataToSend))

  // 4. Convert to base64 for the request
  const body = Buffer.from(bodyBytes).toString("base64")

  // 5. Construct the POST request with API key in header
  const req = {
    url: nodeRuntime.config.webhookUrl,
    method: "POST" as const,
    body,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`, // Use the secret
    },
    cacheSettings: {
      readFromCache: true,
      maxAgeMs: 60000,
    },
  }

  // 6. Send the request
  const resp = httpClient.sendRequest(nodeRuntime, req).result()

  if (!ok(resp)) {
    throw new Error(`HTTP request failed with status: ${resp.statusCode}`)
  }

  return { statusCode: resp.statusCode }
}

const onCronTrigger = (runtime: Runtime<Config>): string => {
  const result = runtime
    .runInNodeMode(postData, consensusIdenticalAggregation<PostResponse>())()
    .result()

  runtime.log(`Successfully sent data to webhook. Status: ${result.statusCode}`)
  return "Success"
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
  const runner = await Runner.newRunner<Config>({
    configSchema,
  })
  await runner.run(initWorkflow)
}
```

---

## ChainLease Examples

### Example 1: Send Email Notification (LeaseActivated Event)

This workflow sends an email notification when a lease is activated.

#### Configuration

`config.json`:

```json
{
  "chainSelectorName": "ethereum-testnet-sepolia",
  "leaseAgreementAddress": "0xYourLeaseAgreementAddress",
  "emailApiUrl": "https://api.sendgrid.com/v3/mail/send"
}
```

`secrets.yaml`:

```yaml
0:
  SENDGRID_API_KEY: "your-sendgrid-api-key"
```

#### Workflow Code

```typescript
import {
  HTTPClient,
  EVMClient,
  getNetwork,
  handler,
  hexToBase64,
  bytesToHex,
  ok,
  type Runtime,
  type NodeRuntime,
  type EVMLog,
  consensusIdenticalAggregation,
  Runner,
} from "@chainlink/cre-sdk"
import { keccak256, toBytes, decodeEventLog } from "viem"
import { z } from "zod"

const configSchema = z.object({
  chainSelectorName: z.string(),
  leaseAgreementAddress: z.string(),
  emailApiUrl: z.string(),
})

type Config = z.infer<typeof configSchema>

// Response type for consensus
type EmailResponse = {
  statusCode: number
  messageId: string
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
      { type: "uint256", name: "startDate", indexed: false },
    ],
  },
] as const

// Node-level function to send email
const sendEmail = (
  nodeRuntime: NodeRuntime<Config>,
  leaseId: string,
  tenant: string,
  landlord: string
): EmailResponse => {
  // 1. Get API key from secrets
  const secret = nodeRuntime.getSecret({ id: "SENDGRID_API_KEY" }).result()
  const apiKey = secret.value

  const httpClient = new HTTPClient()

  // 2. Prepare email data
  const emailData = {
    personalizations: [
      {
        to: [{ email: "tenant@example.com" }], // In production, fetch from database
        subject: `Lease ${leaseId} Activated - Welcome to Your New Home!`,
      },
    ],
    from: { email: "noreply@chainlease.com" },
    content: [
      {
        type: "text/html",
        value: `
          <h1>Your Lease is Active!</h1>
          <p>Congratulations! Your lease (ID: ${leaseId}) has been activated.</p>
          <p><strong>Tenant:</strong> ${tenant}</p>
          <p><strong>Landlord:</strong> ${landlord}</p>
          <p>Your first rent payment is due on the 1st of next month.</p>
          <p>Thank you for choosing ChainLease!</p>
        `,
      },
    ],
  }

  // 3. Serialize and encode
  const bodyBytes = new TextEncoder().encode(JSON.stringify(emailData))
  const body = Buffer.from(bodyBytes).toString("base64")

  // 4. Construct POST request with cacheSettings
  const req = {
    url: nodeRuntime.config.emailApiUrl,
    method: "POST" as const,
    body,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    cacheSettings: {
      readFromCache: true,
      maxAgeMs: 60000, // 60 seconds
    },
  }

  // 5. Send request
  const resp = httpClient.sendRequest(nodeRuntime, req).result()

  if (!ok(resp)) {
    throw new Error(`Email API returned status ${resp.statusCode}`)
  }

  // 6. Parse response to get message ID
  const responseBody = new TextDecoder().decode(resp.body)
  const responseData = JSON.parse(responseBody) as { messageId?: string }

  return {
    statusCode: resp.statusCode,
    messageId: responseData.messageId || "unknown",
  }
}

// Event handler
const onLeaseActivated = (runtime: Runtime<Config>, log: EVMLog): string => {
  runtime.log(`LeaseActivated event detected`)

  const topics = log.topics.map((t) => bytesToHex(t)) as [`0x${string}`, ...`0x${string}`[]]
  const data = bytesToHex(log.data)

  const decodedLog = decodeEventLog({
    abi: leaseActivatedEventAbi,
    data,
    topics,
  })

  const { leaseId, tenant, landlord } = decodedLog.args

  runtime.log(`Sending email notification for lease ${leaseId.toString()}`)

  // Use runInNodeMode to access secrets
  const result = runtime
    .runInNodeMode(
      (nodeRuntime: NodeRuntime<Config>) =>
        sendEmail(nodeRuntime, leaseId.toString(), tenant, landlord),
      consensusIdenticalAggregation<EmailResponse>()
    )()
    .result()

  runtime.log(`Email sent successfully. Status: ${result.statusCode}, Message ID: ${result.messageId}`)

  return `Email sent for lease ${leaseId.toString()}`
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
  const leaseEventHash = keccak256(toBytes("LeaseActivated(uint256,address,address,uint256)"))

  return [
    handler(
      evmClient.logTrigger({
        addresses: [hexToBase64(config.leaseAgreementAddress)],
        topics: [{ values: [hexToBase64(leaseEventHash)] }],
        confidence: "CONFIDENCE_LEVEL_FINALIZED",
      }),
      onLeaseActivated
    ),
  ]
}

export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}
```

### Example 2: Webhook Notification for Payment Received

This workflow sends a webhook notification to the landlord's app when rent payment is received.

#### Configuration

`config.json`:

```json
{
  "chainSelectorName": "ethereum-testnet-sepolia",
  "paymentEscrowAddress": "0xYourPaymentEscrowAddress",
  "webhookBaseUrl": "https://api.landlord-app.com/webhooks"
}
```

`secrets.yaml`:

```yaml
0:
  WEBHOOK_SECRET: "webhook-signing-secret"
```

#### Workflow Code

```typescript
import {
  HTTPClient,
  EVMClient,
  getNetwork,
  handler,
  hexToBase64,
  bytesToHex,
  ok,
  type Runtime,
  type NodeRuntime,
  type EVMLog,
  consensusIdenticalAggregation,
  Runner,
} from "@chainlink/cre-sdk"
import { keccak256, toBytes, decodeEventLog, parseUnits } from "viem"
import { z } from "zod"

const configSchema = z.object({
  chainSelectorName: z.string(),
  paymentEscrowAddress: z.string(),
  webhookBaseUrl: z.string(),
})

type Config = z.infer<typeof configSchema>

type WebhookResponse = {
  statusCode: number
  success: boolean
}

// PaymentReceived event ABI
const paymentReceivedEventAbi = [
  {
    type: "event",
    name: "PaymentReceived",
    inputs: [
      { type: "uint256", name: "leaseId", indexed: true },
      { type: "address", name: "from", indexed: true },
      { type: "uint256", name: "amount", indexed: false },
      { type: "uint256", name: "timestamp", indexed: false },
    ],
  },
] as const

// Generate HMAC signature for webhook security
const generateSignature = (payload: string, secret: string): string => {
  // In production, use proper HMAC-SHA256 implementation
  // This is a simplified example
  return Buffer.from(`${payload}:${secret}`).toString("base64")
}

// Node-level function to send webhook
const sendWebhook = (
  nodeRuntime: NodeRuntime<Config>,
  leaseId: string,
  from: string,
  amount: string
): WebhookResponse => {
  // 1. Get webhook secret from secrets
  const secret = nodeRuntime.getSecret({ id: "WEBHOOK_SECRET" }).result()
  const webhookSecret = secret.value

  const httpClient = new HTTPClient()

  // 2. Prepare webhook payload
  const webhookPayload = {
    event: "payment_received",
    data: {
      leaseId,
      from,
      amount,
      currency: "ETH",
      timestamp: Date.now(),
    },
  }

  const payloadString = JSON.stringify(webhookPayload)

  // 3. Generate signature for webhook verification
  const signature = generateSignature(payloadString, webhookSecret)

  // 4. Serialize and encode
  const bodyBytes = new TextEncoder().encode(payloadString)
  const body = Buffer.from(bodyBytes).toString("base64")

  // 5. Construct POST request with cacheSettings
  const req = {
    url: `${nodeRuntime.config.webhookBaseUrl}/payment-received`,
    method: "POST" as const,
    body,
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Signature": signature,
    },
    cacheSettings: {
      readFromCache: true,
      maxAgeMs: 60000,
    },
  }

  // 6. Send request
  const resp = httpClient.sendRequest(nodeRuntime, req).result()

  if (!ok(resp)) {
    throw new Error(`Webhook API returned status ${resp.statusCode}`)
  }

  return {
    statusCode: resp.statusCode,
    success: true,
  }
}

// Event handler
const onPaymentReceived = (runtime: Runtime<Config>, log: EVMLog): string => {
  runtime.log(`PaymentReceived event detected`)

  const topics = log.topics.map((t) => bytesToHex(t)) as [`0x${string}`, ...`0x${string}`[]]
  const data = bytesToHex(log.data)

  const decodedLog = decodeEventLog({
    abi: paymentReceivedEventAbi,
    data,
    topics,
  })

  const { leaseId, from, amount } = decodedLog.args

  runtime.log(`Payment of ${amount.toString()} received for lease ${leaseId.toString()}`)

  // Use runInNodeMode to access secrets
  const result = runtime
    .runInNodeMode(
      (nodeRuntime: NodeRuntime<Config>) =>
        sendWebhook(nodeRuntime, leaseId.toString(), from, amount.toString()),
      consensusIdenticalAggregation<WebhookResponse>()
    )()
    .result()

  runtime.log(`Webhook sent successfully. Status: ${result.statusCode}`)

  return `Webhook sent for lease ${leaseId.toString()}`
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
  const paymentEventHash = keccak256(toBytes("PaymentReceived(uint256,address,uint256,uint256)"))

  return [
    handler(
      evmClient.logTrigger({
        addresses: [hexToBase64(config.paymentEscrowAddress)],
        topics: [{ values: [hexToBase64(paymentEventHash)] }],
        confidence: "CONFIDENCE_LEVEL_FINALIZED",
      }),
      onPaymentReceived
    ),
  ]
}

export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}
```

### Example 3: SMS Alert for Overdue Rent (Cron-Based)

This workflow checks for overdue rent daily and sends SMS alerts via Twilio API.

#### Configuration

`config.json`:

```json
{
  "schedule": "0 0 10 * * *",
  "chainSelectorName": "ethereum-testnet-sepolia",
  "leaseAgreementAddress": "0xYourLeaseAgreementAddress",
  "twilioApiUrl": "https://api.twilio.com/2010-04-01/Accounts/{AccountSID}/Messages.json"
}
```

`secrets.yaml`:

```yaml
0:
  TWILIO_ACCOUNT_SID: "your-account-sid"
  TWILIO_AUTH_TOKEN: "your-auth-token"
  TWILIO_PHONE_NUMBER: "+1234567890"
```

#### Workflow Code

```typescript
import {
  CronCapability,
  HTTPClient,
  EVMClient,
  getNetwork,
  handler,
  ok,
  type Runtime,
  type NodeRuntime,
  consensusIdenticalAggregation,
  Runner,
} from "@chainlink/cre-sdk"
import { encodeFunctionData, decodeFunctionResult, parseAbi } from "viem"
import { z } from "zod"

const configSchema = z.object({
  schedule: z.string(),
  chainSelectorName: z.string(),
  leaseAgreementAddress: z.string(),
  twilioApiUrl: z.string(),
})

type Config = z.infer<typeof configSchema>

type SMSResponse = {
  statusCode: number
  messagesSent: number
}

// Node-level function to send SMS
const sendOverdueAlerts = (nodeRuntime: NodeRuntime<Config>): SMSResponse => {
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: nodeRuntime.config.chainSelectorName,
    isTestnet: true,
  })

  if (!network) {
    throw new Error(`Network not found`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector)

  // 1. Get overdue leases from contract
  const leaseAbi = parseAbi(["function getOverdueLeases() external view returns (uint256[])"])

  const calldata = encodeFunctionData({
    abi: leaseAbi,
    functionName: "getOverdueLeases",
    args: [],
  })

  const callResponse = evmClient
    .call(nodeRuntime, {
      to: nodeRuntime.config.leaseAgreementAddress as `0x${string}`,
      data: calldata,
    })
    .result()

  const overdueLeases = decodeFunctionResult({
    abi: leaseAbi,
    functionName: "getOverdueLeases",
    data: callResponse.data,
  }) as bigint[]

  if (overdueLeases.length === 0) {
    return { statusCode: 200, messagesSent: 0 }
  }

  nodeRuntime.log(`Found ${overdueLeases.length} overdue leases`)

  // 2. Get Twilio credentials from secrets
  const accountSid = nodeRuntime.getSecret({ id: "TWILIO_ACCOUNT_SID" }).result().value
  const authToken = nodeRuntime.getSecret({ id: "TWILIO_AUTH_TOKEN" }).result().value
  const fromPhone = nodeRuntime.getSecret({ id: "TWILIO_PHONE_NUMBER" }).result().value

  const httpClient = new HTTPClient()

  // 3. Send SMS for first overdue lease (expand for batch processing)
  const leaseId = overdueLeases[0].toString()

  // Prepare SMS data (application/x-www-form-urlencoded format)
  const smsData = `To=+1234567890&From=${encodeURIComponent(fromPhone)}&Body=${encodeURIComponent(
    `RENT OVERDUE: Your rent for lease ${leaseId} is overdue. Please pay immediately to avoid late fees.`
  )}`

  const bodyBytes = new TextEncoder().encode(smsData)
  const body = Buffer.from(bodyBytes).toString("base64")

  // 4. Create Basic Auth header
  const authString = Buffer.from(`${accountSid}:${authToken}`).toString("base64")

  // 5. Construct POST request with cacheSettings
  const twilioUrl = nodeRuntime.config.twilioApiUrl.replace("{AccountSID}", accountSid)

  const req = {
    url: twilioUrl,
    method: "POST" as const,
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${authString}`,
    },
    cacheSettings: {
      readFromCache: true,
      maxAgeMs: 60000,
    },
  }

  // 6. Send request
  const resp = httpClient.sendRequest(nodeRuntime, req).result()

  if (!ok(resp)) {
    throw new Error(`Twilio API returned status ${resp.statusCode}`)
  }

  nodeRuntime.log(`SMS alert sent for lease ${leaseId}`)

  return {
    statusCode: resp.statusCode,
    messagesSent: 1,
  }
}

// Cron handler
const onCronTrigger = (runtime: Runtime<Config>): string => {
  const result = runtime
    .runInNodeMode(sendOverdueAlerts, consensusIdenticalAggregation<SMSResponse>())()
    .result()

  runtime.log(`Overdue alerts sent: ${result.messagesSent}`)

  return `Sent ${result.messagesSent} alerts`
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

## Error Handling

### HTTP Status Codes

Always check status codes and handle errors appropriately:

```typescript
const postData = (sendRequester: HTTPSendRequester, config: Config): PostResponse => {
  const req = {
    url: config.apiUrl,
    method: "POST" as const,
    body,
    headers: { "Content-Type": "application/json" },
    cacheSettings: {
      readFromCache: true,
      maxAgeMs: 60000,
    },
  }

  const resp = sendRequester.sendRequest(req).result()

  // Handle specific status codes
  if (resp.statusCode === 401) {
    throw new Error(`Authentication failed - check API key`)
  }

  if (resp.statusCode === 403) {
    throw new Error(`Forbidden - insufficient permissions`)
  }

  if (resp.statusCode === 429) {
    throw new Error(`Rate limit exceeded - reduce request frequency`)
  }

  if (resp.statusCode >= 500) {
    throw new Error(`Server error: ${resp.statusCode}`)
  }

  if (!ok(resp)) {
    throw new Error(`Unexpected status: ${resp.statusCode}`)
  }

  return { statusCode: resp.statusCode }
}
```

### Response Validation

Validate API responses before using them:

```typescript
const sendEmail = (
  nodeRuntime: NodeRuntime<Config>,
  recipient: string,
  message: string
): EmailResponse => {
  const httpClient = new HTTPClient()

  // ... prepare and send request ...

  const resp = httpClient.sendRequest(nodeRuntime, req).result()

  if (!ok(resp)) {
    throw new Error(`Email API failed: ${resp.statusCode}`)
  }

  // Parse and validate response
  const bodyText = new TextDecoder().decode(resp.body)
  let responseData: { messageId?: string; status?: string }

  try {
    responseData = JSON.parse(bodyText)
  } catch (error) {
    throw new Error(`Failed to parse email API response: ${error}`)
  }

  // Validate required fields
  if (!responseData.messageId) {
    throw new Error(`Email API did not return message ID`)
  }

  return {
    statusCode: resp.statusCode,
    messageId: responseData.messageId,
  }
}
```

### Retry Logic (runInNodeMode)

Implement custom retry logic for transient failures:

```typescript
const sendWebhookWithRetry = (
  nodeRuntime: NodeRuntime<Config>,
  payload: WebhookPayload,
  maxRetries: number = 3
): WebhookResponse => {
  const httpClient = new HTTPClient()

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const bodyBytes = new TextEncoder().encode(JSON.stringify(payload))
      const body = Buffer.from(bodyBytes).toString("base64")

      const req = {
        url: nodeRuntime.config.webhookUrl,
        method: "POST" as const,
        body,
        headers: { "Content-Type": "application/json" },
        cacheSettings: {
          readFromCache: true,
          maxAgeMs: 60000,
        },
      }

      const resp = httpClient.sendRequest(nodeRuntime, req).result()

      if (ok(resp)) {
        return { statusCode: resp.statusCode, success: true }
      }

      // Retry on 5xx errors
      if (resp.statusCode >= 500 && attempt < maxRetries) {
        nodeRuntime.log(`Webhook attempt ${attempt} failed with ${resp.statusCode}, retrying...`)
        continue
      }

      throw new Error(`Webhook failed with status ${resp.statusCode}`)
    } catch (error) {
      if (attempt === maxRetries) {
        throw error
      }
      nodeRuntime.log(`Attempt ${attempt} failed: ${error}, retrying...`)
    }
  }

  throw new Error(`Webhook failed after ${maxRetries} attempts`)
}
```

---

## Best Practices

### 1. Always Use cacheSettings for POST Requests

```typescript
// GOOD - Single execution
const req = {
  url: config.apiUrl,
  method: "POST" as const,
  body,
  cacheSettings: {
    readFromCache: true,
    maxAgeMs: 60000,
  },
}

// BAD - Will execute on every node (duplicate requests)
const req = {
  url: config.apiUrl,
  method: "POST" as const,
  body,
  // Missing cacheSettings!
}
```

### 2. Use Secrets for Authentication

```typescript
// GOOD - Secrets in secrets.yaml
const secret = nodeRuntime.getSecret({ id: "API_KEY" }).result()
const apiKey = secret.value

// BAD - API key in config.json (visible to everyone)
const apiKey = config.apiKey
```

### 3. Set Appropriate maxAgeMs

```typescript
// Fast workflow (most common)
cacheSettings: {
  readFromCache: true,
  maxAgeMs: 60000, // 60 seconds - recommended default
}

// Slow workflow or API
cacheSettings: {
  readFromCache: true,
  maxAgeMs: 120000, // 2 minutes
}

// Very fast workflow
cacheSettings: {
  readFromCache: true,
  maxAgeMs: 30000, // 30 seconds
}
```

### 4. Body Encoding Pattern

```typescript
// Always follow this pattern for JSON POST requests:

// 1. Prepare data object
const data = { key: "value" }

// 2. Serialize to JSON string
const jsonString = JSON.stringify(data)

// 3. Encode to bytes
const bodyBytes = new TextEncoder().encode(jsonString)

// 4. Convert to base64
const body = Buffer.from(bodyBytes).toString("base64")

// 5. Use in request
const req = {
  method: "POST" as const,
  body, // Base64 encoded
  headers: { "Content-Type": "application/json" },
}
```

### 5. Use runtime.now() for Timestamps

```typescript
// WRONG - Each node has different timestamp
const payload = {
  tenant: config.tenant,
  timestamp: Date.now(), // Different on each node
}

// CORRECT - All nodes use same timestamp
const payload = {
  tenant: config.tenant,
  timestamp: runtime.now(), // Same on all nodes
}
```

### 6. Error Handling and Logging

```typescript
const sendNotification = (
  nodeRuntime: NodeRuntime<Config>,
  message: string
): NotificationResponse => {
  try {
    nodeRuntime.log(`Sending notification: ${message}`)

    // ... prepare and send request ...

    const resp = httpClient.sendRequest(nodeRuntime, req).result()

    if (!ok(resp)) {
      nodeRuntime.log(`WARNING: Notification failed with status ${resp.statusCode}`)
      throw new Error(`Notification API returned ${resp.statusCode}`)
    }

    nodeRuntime.log(`Notification sent successfully`)
    return { statusCode: resp.statusCode, success: true }
  } catch (error) {
    nodeRuntime.log(`ERROR: Failed to send notification: ${error}`)
    throw error
  }
}
```

### 7. Consensus Strategy Selection

```typescript
// For POST responses with deterministic data
import { consensusIdenticalAggregation } from "@chainlink/cre-sdk"

const result = httpClient
  .sendRequest(runtime, postData, consensusIdenticalAggregation<PostResponse>())
  .result()

// For POST responses with varying data (use field-based aggregation)
import { ConsensusAggregationByFields, mode, first } from "@chainlink/cre-sdk"

const result = httpClient
  .sendRequest(
    runtime,
    postData,
    ConsensusAggregationByFields<PostResponse>({
      statusCode: mode<number>(), // Most common status
      messageId: first<string>(), // Just need one message ID
    })
  )
  .result()
```

---

## Advanced Patterns

### Conditional POST Requests

Only send POST request if certain conditions are met:

```typescript
const sendConditionalNotification = (nodeRuntime: NodeRuntime<Config>): NotificationResponse => {
  const evmClient = new EVMClient(/* ... */)

  // Read lease state from contract
  const leaseState = /* ... read from contract ... */ 2 // Active state

  // Only send notification if lease is active
  if (leaseState !== 2) {
    nodeRuntime.log(`Lease not active, skipping notification`)
    return { statusCode: 200, skipped: true }
  }

  // Proceed with POST request
  const httpClient = new HTTPClient()
  // ... send notification ...
}
```

### Batch POST Requests

Send multiple POST requests for batch processing:

```typescript
const sendBatchNotifications = (nodeRuntime: NodeRuntime<Config>): BatchResponse => {
  const httpClient = new HTTPClient()

  // Get list of recipients from contract
  const recipients = /* ... read from contract ... */ ["0x123...", "0x456..."]

  const results: PostResponse[] = []

  for (const recipient of recipients) {
    // Each request uses cacheSettings for single execution
    const body = preparebody(recipient)

    const req = {
      url: nodeRuntime.config.notificationApiUrl,
      method: "POST" as const,
      body,
      headers: { "Content-Type": "application/json" },
      cacheSettings: {
        readFromCache: true,
        maxAgeMs: 60000,
      },
    }

    const resp = httpClient.sendRequest(nodeRuntime, req).result()

    results.push({ statusCode: resp.statusCode })
  }

  return { totalSent: results.length, results }
}
```

### Form Data POST Requests

Send form data instead of JSON:

```typescript
const sendFormData = (sendRequester: HTTPSendRequester, config: Config): PostResponse => {
  // Prepare form data (application/x-www-form-urlencoded)
  const formData = `field1=${encodeURIComponent("value1")}&field2=${encodeURIComponent("value2")}`

  const bodyBytes = new TextEncoder().encode(formData)
  const body = Buffer.from(bodyBytes).toString("base64")

  const req = {
    url: config.apiUrl,
    method: "POST" as const,
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    cacheSettings: {
      readFromCache: true,
      maxAgeMs: 60000,
    },
  }

  const resp = sendRequester.sendRequest(req).result()

  if (!ok(resp)) {
    throw new Error(`Request failed: ${resp.statusCode}`)
  }

  return { statusCode: resp.statusCode }
}
```

### Webhook Signature Verification

Generate HMAC signatures for secure webhooks:

```typescript
import { createHmac } from "crypto"

const sendSecureWebhook = (nodeRuntime: NodeRuntime<Config>, payload: any): WebhookResponse => {
  const secret = nodeRuntime.getSecret({ id: "WEBHOOK_SECRET" }).result().value

  const payloadString = JSON.stringify(payload)

  // Generate HMAC-SHA256 signature
  const signature = createHmac("sha256", secret).update(payloadString).digest("hex")

  const bodyBytes = new TextEncoder().encode(payloadString)
  const body = Buffer.from(bodyBytes).toString("base64")

  const httpClient = new HTTPClient()

  const req = {
    url: nodeRuntime.config.webhookUrl,
    method: "POST" as const,
    body,
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Signature": signature, // Recipient can verify
      "X-Webhook-Timestamp": nodeRuntime.now().toString(),
    },
    cacheSettings: {
      readFromCache: true,
      maxAgeMs: 60000,
    },
  }

  const resp = httpClient.sendRequest(nodeRuntime, req).result()

  if (!ok(resp)) {
    throw new Error(`Webhook failed: ${resp.statusCode}`)
  }

  return { statusCode: resp.statusCode, success: true }
}
```

---

## Summary

### Key Takeaways

1. **Always use cacheSettings** for POST requests to ensure single execution
2. **Use sendRequest** for simple cases; use **runInNodeMode** when you need secrets
3. **Set maxAgeMs** appropriately (60 seconds is a good default)
4. **Store API keys** in `secrets.yaml`, never in `config.json`
5. **Always check response status codes** and handle errors gracefully
6. **Use runtime.now()** instead of `Date.now()` for timestamps
7. **Follow the body encoding pattern**: data → JSON → bytes → base64

### ChainLease Use Cases Summary

- **Email notifications** (LeaseActivated, PaymentReceived)
- **SMS alerts** (Overdue rent, lease expiration warnings)
- **Webhook notifications** (Integration with tenant/landlord apps)
- **Third-party integrations** (Accounting systems, property management platforms)
- **Audit logging** (External compliance systems)

---

## Resources

- [CRE SDK Documentation](https://docs.chain.link/chainlink-functions)
- [HTTP Client SDK Reference](https://docs.chain.link/chainlink-functions/api-reference/http-client)
- [Using Secrets in Workflows](https://docs.chain.link/chainlink-functions/resources/secrets)
- [Using Time in Workflows](https://docs.chain.link/chainlink-functions/resources/time)
- [Consensus & Aggregation Reference](https://docs.chain.link/chainlink-functions/api-reference/consensus)

---

**Last Updated:** February 21, 2026  
**ChainLease Development Team**
