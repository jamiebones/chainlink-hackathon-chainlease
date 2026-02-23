# CRE Project Setup & Simulation Reference

## Overview

This comprehensive guide covers the complete process of setting up a CRE (Chainlink Runtime Environment) project from scratch, understanding the project structure, configuring workflows, and running local simulations. This is your starting point for CRE development before deploying to live networks.

**ChainLease Context:**
- Setting up the ChainLease CRE workflows project
- Configuring credit check, notification, and rent collection workflows
- Managing multiple workflows in a single project
- Environment-specific configurations (staging vs production)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Initialization](#project-initialization)
3. [Project Structure](#project-structure)
4. [Understanding Configuration Files](#understanding-configuration-files)
5. [Workflow Code Structure](#workflow-code-structure)
6. [Setting Up Your Environment](#setting-up-your-environment)
7. [Running Local Simulation](#running-local-simulation)
8. [ChainLease Project Setup](#chainlease-project-setup)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## Prerequisites

Before you begin, ensure you have:

### 1. CRE CLI Installed

See the [CRE Installation Guide](https://docs.chain.link/chainlink-functions/resources/install) for details.

Check your installation:
```bash
cre --version
```

### 2. CRE Account & Authentication

You must have a CRE account and be logged in with the CLI.

**Verify your authentication:**
```bash
cre whoami
```

**Expected output (if authenticated):**
```
Account details retrieved:

Email:           email@domain.com
Organization ID: org_AbCdEfGhIjKlMnOp
```

**If not logged in:**
```bash
cre login
```

Follow the prompts to authenticate.

### 3. Bun Runtime

You must have Bun version **1.2.21 or higher** installed.

**Check version:**
```bash
bun --version
```

**Install Bun:**
```bash
curl -fsSL https://bun.sh/install | bash
```

See [Install Bun](https://bun.sh/docs/installation) for more details.

### 4. Funded Sepolia Account

An Ethereum account with Sepolia ETH to pay for transaction gas fees.

**Get Sepolia ETH:**
- [faucets.chain.link](https://faucets.chain.link)

> **⚠️ Important**: You need the **raw 64-character private key** (without `0x` prefix) for configuration.

---

## Project Initialization

### Step 1: Verify Authentication

Before initializing your project, verify that you're logged in:

```bash
cre whoami
```

If you see an error, run:

```bash
cre login
```

### Step 2: Initialize Your Project

The CRE CLI provides an `init` command to scaffold a new project. It's an interactive process.

**Navigate to parent directory:**
```bash
cd ~/Coding_Directory/Projects
```

**Run the init command:**
```bash
cre init
```

**Provide details when prompted:**

1. **Project name**: `chainlease-workflows`
2. **Language**: Select `Typescript` and press Enter
3. **Pick a workflow template**: Select `Helloworld: Typescript Hello World example` (we'll start from scratch)
4. **Workflow name**: `credit-check-workflow`

The CLI creates a new `chainlease-workflows/` directory and initializes your first workflow.

### Step 3: What Gets Created

After running `cre init`, you'll have:

```
chainlease-workflows/
├── credit-check-workflow/
│   ├── config.production.json
│   ├── config.staging.json
│   ├── main.ts
│   ├── package.json
│   ├── README.md
│   ├── tsconfig.json
│   └── workflow.yaml
├── .env
├── .gitignore
├── project.yaml
└── secrets.yaml
```

---

## Project Structure

### Project vs Workflow

**Project**: The top-level directory (e.g., `chainlease-workflows/`)
- Contains project-wide files like `project.yaml`
- Holds shared configurations for all workflows
- **Can contain multiple workflows**, each in its own subdirectory

**Workflow**: A subdirectory (e.g., `credit-check-workflow/`)
- Contains source code and configuration for a single workflow
- Has its own `package.json` and `tsconfig.json`
- Independent and portable

### Key Files and Their Roles

| File | Role | Location |
|------|------|----------|
| `project.yaml` | Global configuration file. Contains shared settings like RPC URLs for different environments (called **targets**). | Project root |
| `secrets.yaml` | Stores references to secrets (e.g., API keys, private keys). Values are loaded from `.env` or secrets manager. | Project root |
| `.env` | Stores actual secrets and environment variables. **Never commit this file to version control.** | Project root |
| `.gitignore` | Prevents sensitive files (`.env`, `secrets.yaml`) from being committed to Git. | Project root |
| `workflow/` | A directory containing source code and configuration for a single workflow. | Project root |
| `├── main.ts` | **The heart of your workflow.** Where you write your TypeScript logic. This is the entry point that gets compiled to WASM. | Workflow dir |
| `├── package.json` | Manages dependencies for this specific workflow. Each workflow can have its own dependencies. | Workflow dir |
| `├── tsconfig.json` | TypeScript configuration for this workflow. Controls how TypeScript compiles your code. | Workflow dir |
| `├── workflow.yaml` | Contains configurations specific to this workflow (name, artifacts, entry point path, config file path, secrets file path). | Workflow dir |
| `├── config.staging.json` | Parameters for your workflow when using the `staging-settings` target. Accessed in code via `config` object. | Workflow dir |
| `└── config.production.json` | Parameters for your workflow when using the `production-settings` target. | Workflow dir |

---

## Understanding Configuration Files

### workflow.yaml

This file tells the CLI where to find your workflow files and how to configure it for different environments (targets).

**Default structure:**

```yaml
# ==========================================================================
staging-settings:
  user-workflow:
    workflow-name: "my-workflow-staging"
  workflow-artifacts:
    workflow-path: "./main.ts"
    config-path: "./config.staging.json"
    secrets-path: ""
# ==========================================================================
production-settings:
  user-workflow:
    workflow-name: "my-workflow-production"
  workflow-artifacts:
    workflow-path: "./main.ts"
    config-path: "./config.production.json"
    secrets-path: ""
```

**Key sections:**

- **Target names** (`staging-settings`, `production-settings`): Environment configuration sets. You can name targets whatever you want (e.g., `dev`, `test`, `prod`).
- **workflow-name**: Each target has its own workflow name with a suffix. This allows you to deploy the same workflow to different environments with distinct identities.
- **workflow-path**: `"./main.ts"` - The entry point for your TypeScript code
- **config-path**: Each target points to its own config file
- **secrets-path**: The location of your secrets file (can be empty if using `.env`)

**Usage:**

When you run:
```bash
cre workflow simulate credit-check-workflow --target staging-settings
```

The CLI reads configuration from the `staging-settings` section of `workflow.yaml`.

### config.staging.json / config.production.json

These files contain environment-specific parameters that your workflow code can access.

**Example:**

```json
{
  "schedule": "*/30 * * * * *",
  "chainSelectorName": "ethereum-testnet-sepolia",
  "leaseAgreementAddress": "0xYourContractAddress",
  "creditCheckApiUrl": "https://api.staging.creditcheck.com/verify"
}
```

**Accessing in code:**

```typescript
type Config = {
  schedule: string
  chainSelectorName: string
  leaseAgreementAddress: string
  creditCheckApiUrl: string
}

const onCronTrigger = (runtime: Runtime<Config>): string => {
  runtime.log(`Contract address: ${runtime.config.leaseAgreementAddress}`)
  // ... rest of workflow
}
```

### project.yaml

Global project configuration, typically containing RPC URLs and shared settings.

**Example:**

```yaml
staging-settings:
  evm-rpcs:
    ethereum-testnet-sepolia:
      - https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

production-settings:
  evm-rpcs:
    ethereum-mainnet:
      - https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
```

### secrets.yaml

References to secrets that will be resolved from `.env` or a secrets manager.

**Example:**

```yaml
0:
  CRE_ETH_PRIVATE_KEY: ${CRE_ETH_PRIVATE_KEY}
  SENDGRID_API_KEY: ${SENDGRID_API_KEY}
  TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN}
```

The `0` is the **slot ID** for secrets. Workflows reference secrets by slot ID.

### .env

Actual secret values. **Never commit this file to Git.**

**Example:**

```bash
# Ethereum Private Key (64 characters, no 0x prefix)
CRE_ETH_PRIVATE_KEY=your64characterprivatekeyhere

# API Keys
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
```

> **⚠️ Use the Raw Key**: Your private key must be the 64-character hexadecimal string. Do not include the `0x` prefix.

---

## Workflow Code Structure

### Basic Template

Every CRE workflow follows this structure:

```typescript
import { CronCapability, handler, Runner, type Runtime } from "@chainlink/cre-sdk"

// 1. Define your configuration type
type Config = {
  schedule: string
}

// 2. Define your handler function (your business logic)
const onCronTrigger = (runtime: Runtime<Config>): string => {
  runtime.log("Hello world! Workflow triggered.")
  return "Hello world!"
}

// 3. Initialize workflow (register triggers and handlers)
const initWorkflow = (config: Config) => {
  const cron = new CronCapability()

  return [handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)]
}

// 4. Export main function (entry point)
export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}
```

### Key Components

**1. Config Type**

Defines the shape of your configuration. TypeScript ensures type safety throughout your workflow.

```typescript
type Config = {
  schedule: string
  chainSelectorName: string
  contractAddress: string
}
```

**2. Handler Function**

The callback function that executes when the trigger fires. It receives the `runtime` object and returns a result.

```typescript
const onCronTrigger = (runtime: Runtime<Config>): string => {
  // Access config
  runtime.log(`Contract: ${runtime.config.contractAddress}`)
  
  // Your business logic here
  
  return "Success"
}
```

**3. initWorkflow Function**

Creates the workflow by registering handlers (trigger-callback pairs). This is where you define what events your workflow responds to.

```typescript
const initWorkflow = (config: Config) => {
  const cron = new CronCapability()

  return [
    handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)
  ]
}
```

**4. main Function**

The entry point that creates a `Runner`, passes your config type, and runs the workflow.

```typescript
export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}
```

> **Note: Automatic Execution**: You don't need to call `main()` at the end of your file—the SDK automatically executes it during compilation.

### Type Safety with TypeScript

The TypeScript SDK provides full type safety:

```typescript
type Config = {
  schedule: string
}

const runner = await Runner.newRunner<Config>()
```

By passing the `Config` type to `Runner.newRunner<Config>()`, TypeScript ensures your workflow receives the correct configuration shape.

### Optional: Runtime Validation with Zod

For runtime validation of your configuration, use schema validation libraries like Zod:

```typescript
import { z } from "zod"

const configSchema = z.object({
  schedule: z.string(),
  chainSelectorName: z.string(),
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
})

type Config = z.infer<typeof configSchema>

const runner = await Runner.newRunner<Config>({ configSchema })
```

This provides both compile-time type checking and runtime validation.

---

## Setting Up Your Environment

### Step 1: Configure Your Private Key

The simulator requires a private key to initialize its environment.

**Open `.env` in project root:**

```bash
# Replace with your own private key for your funded Sepolia account
CRE_ETH_PRIVATE_KEY=YOUR_64_CHARACTER_PRIVATE_KEY_HERE
```

> **⚠️ Never Commit .env Files**: The `.gitignore` file already prevents `.env` from being committed to Git.

### Step 2: Install Dependencies

Before simulating, install workflow dependencies.

**Navigate to workflow directory:**
```bash
cd chainlease-workflows/credit-check-workflow
```

**Install dependencies:**
```bash
bun install
```

**Expected output:**
```
bun install v1.2.23

$ bunx cre-setup
[cre-sdk-javy-plugin] Detected platform: darwin, arch: arm64
[cre-sdk-javy-plugin] Using cached binary: /Users/<user>/.cache/javy/v5.0.4/darwin-arm64/javy
✅ CRE TS SDK is ready to use.

+ @types/bun@1.2.21
+ @chainlink/cre-sdk@1.0.0

30 packages installed [4.71s]
```

The `postinstall` script automatically runs `bunx cre-setup` to set up WebAssembly compilation tools.

**Return to project root:**
```bash
cd ..
```

> **Note: Per-Workflow Dependencies**: Each workflow has its own `package.json`, allowing different SDK versions or dependencies per workflow. This makes workflows portable and easier to manage.

---

## Running Local Simulation

### What is Workflow Simulation?

Workflow simulation is a **local execution environment** that:
- Compiles your TypeScript code to WebAssembly
- Runs it on your machine (no network deployment)
- Allows you to test and debug before deploying to live networks
- Provides immediate feedback on your code

### Step 1: Run the Simulate Command

From your project root directory:

```bash
cre workflow simulate credit-check-workflow --target staging-settings
```

**What this does:**
1. Compiles your TypeScript code to WebAssembly
2. Uses the `staging-settings` target configuration from `workflow.yaml`
3. Spins up a local simulation environment
4. Executes your workflow

### Step 2: Review the Output

After the workflow compiles, the simulator detects triggers and runs the workflow.

**Example output:**

```
Workflow compiled
2025-11-03T19:04:21Z [SIMULATION] Simulator Initialized

2025-11-03T19:04:21Z [SIMULATION] Running trigger trigger=cron-trigger@1.0.0
2025-11-03T19:04:21Z [USER LOG] Hello world! Workflow triggered.

Workflow Simulation Result:
 "Hello world!"

2025-11-03T19:04:21Z [SIMULATION] Execution finished signal received
2025-11-03T19:04:21Z [SIMULATION] Skipping WorkflowEngineV2
```

**Understanding the output:**

- `[USER LOG]`: Output from your own code (`runtime.log()` calls). This is where you'll see your custom log messages.
- `[SIMULATION]`: System-level messages from the simulator showing internal state (initialization, trigger execution, completion).
- `Workflow Simulation Result`: The final return value of your workflow (whatever your handler function returns).

### Common Simulation Commands

```bash
# Basic simulation
cre workflow simulate my-workflow --target staging-settings

# With verbose logging
cre workflow simulate my-workflow --target staging-settings --verbose

# With specific config file override
cre workflow simulate my-workflow --target staging-settings --config-override ./custom-config.json
```

---

## ChainLease Project Setup

### Complete ChainLease Project Structure

```
chainlease-workflows/
├── credit-check-workflow/
│   ├── main.ts
│   ├── config.staging.json
│   ├── config.production.json
│   ├── workflow.yaml
│   ├── package.json
│   └── tsconfig.json
├── lease-notification-workflow/
│   ├── main.ts
│   ├── config.staging.json
│   ├── config.production.json
│   ├── workflow.yaml
│   ├── package.json
│   └── tsconfig.json
├── rent-collection-workflow/
│   ├── main.ts
│   ├── config.staging.json
│   ├── config.production.json
│   ├── workflow.yaml
│   ├── package.json
│   └── tsconfig.json
├── .env
├── .gitignore
├── project.yaml
└── secrets.yaml
```

### ChainLease project.yaml

```yaml
# Global project configuration
staging-settings:
  evm-rpcs:
    ethereum-testnet-sepolia:
      - https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

production-settings:
  evm-rpcs:
    ethereum-mainnet:
      - https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
    ethereum-testnet-sepolia:
      - https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
```

### ChainLease secrets.yaml

```yaml
0:
  CRE_ETH_PRIVATE_KEY: ${CRE_ETH_PRIVATE_KEY}
  SENDGRID_API_KEY: ${SENDGRID_API_KEY}
  TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN}
  CREDIT_CHECK_API_KEY: ${CREDIT_CHECK_API_KEY}
```

### ChainLease .env

```bash
# Ethereum Private Key (64 characters, no 0x prefix)
CRE_ETH_PRIVATE_KEY=your64characterprivatekeyhere

# Email Service (SendGrid)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxx

# SMS Service (Twilio)
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Credit Check API
CREDIT_CHECK_API_KEY=your_credit_check_api_key
```

### Example: Credit Check Workflow Configuration

**credit-check-workflow/workflow.yaml:**

```yaml
staging-settings:
  user-workflow:
    workflow-name: "chainlease-credit-check-staging"
  workflow-artifacts:
    workflow-path: "./main.ts"
    config-path: "./config.staging.json"
    secrets-path: "../secrets.yaml"

production-settings:
  user-workflow:
    workflow-name: "chainlease-credit-check-production"
  workflow-artifacts:
    workflow-path: "./main.ts"
    config-path: "./config.production.json"
    secrets-path: "../secrets.yaml"
```

**credit-check-workflow/config.staging.json:**

```json
{
  "chainSelectorName": "ethereum-testnet-sepolia",
  "leaseAgreementAddress": "0xYourLeaseAgreementStagingAddress",
  "creditCheckApiUrl": "https://api.staging.creditcheck.com/verify",
  "gasLimit": "500000"
}
```

**credit-check-workflow/config.production.json:**

```json
{
  "chainSelectorName": "ethereum-mainnet",
  "leaseAgreementAddress": "0xYourLeaseAgreementProductionAddress",
  "creditCheckApiUrl": "https://api.creditcheck.com/verify",
  "gasLimit": "500000"
}
```

### Setting Up Multiple Workflows

**Step 1: Create each workflow directory**

```bash
cd chainlease-workflows

# Add new workflow directories
mkdir lease-notification-workflow
mkdir rent-collection-workflow
```

**Step 2: Copy template files**

```bash
# Copy from existing workflow
cp credit-check-workflow/package.json lease-notification-workflow/
cp credit-check-workflow/tsconfig.json lease-notification-workflow/
cp credit-check-workflow/workflow.yaml lease-notification-workflow/

# Update workflow.yaml with new workflow name
```

**Step 3: Install dependencies for each workflow**

```bash
cd lease-notification-workflow
bun install
cd ..

cd rent-collection-workflow
bun install
cd ..
```

**Step 4: Simulate each workflow independently**

```bash
# Test credit check workflow
cre workflow simulate credit-check-workflow --target staging-settings

# Test lease notification workflow
cre workflow simulate lease-notification-workflow --target staging-settings

# Test rent collection workflow
cre workflow simulate rent-collection-workflow --target staging-settings
```

---

## Troubleshooting

### Issue: "you are not logged in, try running cre login"

**Solution:**
```bash
cre login
```

Follow the authentication prompts.

### Issue: "bun: command not found"

**Solution:**
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version
```

### Issue: "Network not found"

**Cause:** Missing or incorrect RPC configuration in `project.yaml`

**Solution:**
```yaml
staging-settings:
  evm-rpcs:
    ethereum-testnet-sepolia:
      - https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
```

### Issue: "Cannot read properties of undefined (reading 'contractAddress')"

**Cause:** Missing configuration field in `config.staging.json`

**Solution:** Ensure all fields defined in your `Config` type exist in your config file:

```typescript
type Config = {
  contractAddress: string  // Must exist in config.staging.json
}
```

### Issue: "Invalid private key"

**Cause:** Private key includes `0x` prefix or has incorrect length

**Solution:** Use raw 64-character hex string in `.env`:
```bash
# WRONG
CRE_ETH_PRIVATE_KEY=0x1234567890abcdef...

# CORRECT
CRE_ETH_PRIVATE_KEY=1234567890abcdef...
```

### Issue: Compilation errors during simulation

**Solution:**
```bash
# Clean and reinstall dependencies
cd my-workflow
rm -rf node_modules
rm bun.lockb
bun install

# Return to project root and retry
cd ..
cre workflow simulate my-workflow --target staging-settings
```

---

## Best Practices

### 1. Use Separate Configurations for Each Environment

```
workflow/
├── config.staging.json      # Staging configuration
├── config.production.json   # Production configuration
└── config.local.json        # Local development (optional)
```

### 2. Never Commit Secrets

Ensure `.gitignore` includes:
```
.env
secrets.yaml
*.key
*.pem
```

### 3. Use Descriptive Workflow Names

```yaml
# GOOD
workflow-name: "chainlease-credit-check-staging"

# BAD
workflow-name: "workflow-1"
```

### 4. Document Your Configuration

Add comments to config files:
```json
{
  // Cron schedule: Every 5 minutes
  "schedule": "*/5 * * * *",
  
  // Sepolia testnet contract address
  "leaseAgreementAddress": "0x123..."
}
```

### 5. Validate Config with Zod

```typescript
import { z } from "zod"

const configSchema = z.object({
  schedule: z.string(),
  chainSelectorName: z.string(),
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  gasLimit: z.string(),
})

type Config = z.infer<typeof configSchema>

const runner = await Runner.newRunner<Config>({ configSchema })
```

### 6. Test Locally Before Deploying

Always simulate workflows locally before deploying:
```bash
cre workflow simulate my-workflow --target staging-settings
```

### 7. Use Secrets Manager in Production

For production, use a dedicated secrets manager instead of `.env`:
- [1Password CLI](https://docs.chain.link/chainlink-functions/resources/secrets-1password)
- AWS Secrets Manager
- HashiCorp Vault

### 8. Version Your Configuration

Track configuration changes in Git (but not secrets):
```bash
git add credit-check-workflow/config.staging.json
git commit -m "Update credit check API endpoint"
```

### 9. Per-Workflow Dependencies

Each workflow can have different dependencies:
```json
// credit-check-workflow/package.json
{
  "dependencies": {
    "@chainlink/cre-sdk": "^1.0.0",
    "zod": "^3.22.0"
  }
}

// lease-notification-workflow/package.json
{
  "dependencies": {
    "@chainlink/cre-sdk": "^1.0.0",
    "viem": "^2.0.0"
  }
}
```

### 10. Log Appropriately

```typescript
// Development logs
runtime.log(`Processing lease ${leaseId}`)

// Production: Avoid logging sensitive data
// WRONG
runtime.log(`API Key: ${apiKey}`)

// CORRECT
runtime.log(`API authentication successful`)
```

---

## Summary

### Key Takeaways

1. **Project Structure**: Projects contain multiple workflows, each with independent configuration
2. **Configuration Files**:
   - `project.yaml` - Global project settings
   - `workflow.yaml` - Workflow-specific settings (targets, paths)
   - `config.*.json` - Environment-specific parameters
   - `secrets.yaml` - Secret references
   - `.env` - Actual secret values (never commit)
3. **Workflow Code**: TypeScript workflows follow a standard pattern: Config → Handler → initWorkflow → main
4. **Type Safety**: Use TypeScript types and optional Zod validation for config
5. **Simulation**: Local testing environment that compiles to WASM and runs on your machine
6. **Targets**: Environment configurations (staging-settings, production-settings) allow different setups for different environments

### ChainLease Setup Checklist

- [x] Install CRE CLI and authenticate (`cre login`)
- [x] Install Bun runtime
- [x] Initialize project (`cre init`)
- [x] Configure `project.yaml` with RPC URLs
- [x] Set up `.env` with private key and API keys
- [x] Create `secrets.yaml` with secret references
- [x] Configure each workflow's `workflow.yaml`
- [x] Create environment-specific config files (`config.staging.json`, `config.production.json`)
- [x] Install dependencies for each workflow (`bun install`)
- [x] Test with local simulation (`cre workflow simulate`)
- [x] Verify logs and output

---

## Next Steps

After completing project setup and simulation:

1. **Add EVM Log Triggers** - Listen for blockchain events (LeaseCreated, LeaseActivated)
2. **Make HTTP Requests** - Call external APIs (credit check, email, SMS)
3. **Read Onchain Data** - Query contract state (active leases, payment status)
4. **Write Onchain Data** - Submit results back to contracts
5. **Deploy to Testnet** - Move from simulation to live Sepolia network
6. **Deploy to Production** - Launch on Ethereum mainnet

---

## Resources

- [CRE CLI Documentation](https://docs.chain.link/chainlink-functions/resources/cli)
- [Project Configuration Guide](https://docs.chain.link/chainlink-functions/resources/project-config)
- [Managing Secrets with 1Password](https://docs.chain.link/chainlink-functions/resources/secrets-1password)
- [Core SDK Reference](https://docs.chain.link/chainlink-functions/api-reference/core)
- [Workflow Best Practices](https://docs.chain.link/chainlink-functions/resources/best-practices)

---

**Last Updated:** February 21, 2026  
**ChainLease Development Team**
