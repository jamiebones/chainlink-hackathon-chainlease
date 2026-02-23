# CRE Cron Trigger Reference

## Overview

The Cron trigger fires based on a time-based schedule, defined by a standard cron expression.

## Use Case Examples

- Periodically fetching data from an API
- Regularly checking an onchain state
- Regularly writing data to an onchain contract

**ChainLease Use Cases:**
- Daily rent payment monitoring
- Lease expiration checks
- Market analytics aggregation
- Overdue payment notifications

---

## Configuration and Handler

You create a Cron trigger by calling the `CronCapability.trigger()` method and register it with a handler inside your `initWorkflow` function.

When you configure a Cron trigger, you must provide a schedule using a standard cron expression. The expression can contain **5 or 6 fields**, where the optional 6th field represents seconds.

For help understanding or creating cron expressions, see [crontab.guru](https://crontab.guru) (note: this tool supports 5-field expressions; add a seconds field at the beginning for 6-field expressions).

### Examples:

| Description | Cron Expression |
|-------------|----------------|
| Every 30 seconds (6 fields) | `*/30 * * * * *` |
| Every minute, at second 0 (6 fields) | `0 * * * * *` |
| Every hour, at the top of the hour (6 fields) | `0 0 * * * *` |
| Every 5 minutes from 08:00 to 08:59, Monday to Friday (5 fields) | `*/5 8 * * 1-5` |
| Daily at midnight UTC (5 fields) | `0 0 * * *` |

---

## Timezone Support

By default, cron expressions use **UTC**. To specify a different timezone, prefix your cron expression with `TZ=<timezone>`, where `<timezone>` is an IANA timezone identifier (e.g., `America/New_York`, `Europe/London`, `Asia/Tokyo`).

### Examples with Timezones:

| Description | Cron Expression |
|-------------|----------------|
| Daily at midnight in New York | `TZ=America/New_York 0 0 * * *` |
| Every Sunday at 8 PM in Tokyo | `TZ=Asia/Tokyo 0 20 * * 0` |
| Every weekday at 9 AM in London | `TZ=Europe/London 0 9 * * 1-5` |

The timezone-aware scheduler automatically handles daylight saving time transitions, ensuring your workflows run at the correct local time throughout the year.

> **Note: Minimum Interval**  
> You cannot schedule a trigger to fire more frequently than once every 30 seconds.

---

## Basic Implementation

```typescript
import { CronCapability, handler, type Runtime, type CronPayload, Runner } from "@chainlink/cre-sdk"

type Config = {}

// Callback function that runs when the cron trigger fires
const onCronTrigger = (runtime: Runtime<Config>, payload: CronPayload): string => {
  if (payload.scheduledExecutionTime) {
    const seconds = payload.scheduledExecutionTime.seconds
    runtime.log(`Cron trigger fired at ${seconds}`)
  }
  // Your logic here...
  return "Trigger completed"
}

const initWorkflow = (config: Config) => {
  // Create the trigger - fires every 30 seconds in UTC
  const cronTrigger = new CronCapability().trigger({
    schedule: "*/30 * * * * *",
  })

  // Or use a timezone-aware schedule - fires daily at 9 AM Eastern Time
  // const cronTrigger = new CronCapability().trigger({
  //   schedule: "TZ=America/New_York 0 9 * * *",
  // })

  // Register a handler with the trigger and a callback function
  return [handler(cronTrigger, onCronTrigger)]
}

export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}
```

---

## Callback and Payload

When a Cron trigger fires, it passes a `CronPayload` object to your callback function. This payload contains the scheduled execution time.

### Simple Callback (Without Payload)

If you don't need access to the scheduled execution time, you can omit the payload parameter:

```typescript
// Simple callback without payload
const onCronTrigger = (runtime: Runtime<Config>): string => {
  runtime.log("Cron trigger fired")
  // Your logic here...
  return "Cron trigger completed"
}
```

### Callback with Payload

If you need to access the scheduled execution time, include the `CronPayload` parameter:

```typescript
const onCronTrigger = (runtime: Runtime<Config>, payload: CronPayload): string => {
  if (payload.scheduledExecutionTime) {
    // Convert timestamp to JavaScript Date (timestamp has 'seconds' and 'nanos' fields)
    const scheduledTime = new Date(
      Number(payload.scheduledExecutionTime.seconds) * 1000 + 
      payload.scheduledExecutionTime.nanos / 1000000
    )
    runtime.log(`Cron trigger fired at ${scheduledTime.toISOString()}`)
  }
  // Your logic here...
  return "Cron trigger completed"
}
```

---

## Testing Cron Triggers in Simulation

To test your cron trigger during development, you can use the workflow simulator. The simulator executes cron triggers immediately when selected, allowing you to test your logic without waiting for the scheduled time.

### Simulation Commands

```bash
# Interactive simulation (select trigger from menu)
bun x cre sim staging-settings

# Non-interactive simulation (specify trigger by index)
bun x cre sim staging-settings --trigger 0

# View logs during simulation
bun x cre logs staging-settings --follow
```

---

## ChainLease Example: Rent Payment Monitoring

```typescript
import { 
  CronCapability, 
  handler, 
  type Runtime, 
  type CronPayload, 
  Runner,
  EVMClient,
  getNetwork
} from "@chainlink/cre-sdk"

interface Config {
  evms: {
    chainSelectorName: string
    leaseAgreementAddress: string
  }
}

// Check for overdue rent payments
const onRentCheckTrigger = (runtime: Runtime<Config>, payload: CronPayload): string => {
  runtime.log("=== ChainLease Rent Monitoring Workflow ===")
  
  if (payload.scheduledExecutionTime) {
    const scheduledTime = new Date(
      Number(payload.scheduledExecutionTime.seconds) * 1000 + 
      payload.scheduledExecutionTime.nanos / 1000000
    )
    runtime.log(`Scheduled check time: ${scheduledTime.toISOString()}`)
  }
  
  // 1. Get active leases from contract
  // 2. Check if payment is overdue (>30 days since lastPaymentDate)
  // 3. Calculate late fees if applicable
  // 4. Send notifications to landlord/tenant
  // 5. Update lease status if needed
  
  runtime.log("Rent check completed")
  return "Rent monitoring workflow completed"
}

const initWorkflow = (config: Config) => {
  // Run daily at midnight UTC
  const cronTrigger = new CronCapability().trigger({
    schedule: "0 0 * * *",
  })

  return [handler(cronTrigger, onRentCheckTrigger)]
}

export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}
```

---

## ChainLease Example: Lease Expiration Check

```typescript
import { 
  CronCapability, 
  handler, 
  type Runtime, 
  type CronPayload, 
  Runner 
} from "@chainlink/cre-sdk"

interface Config {
  evms: {
    chainSelectorName: string
    leaseAgreementAddress: string
  }
  backendApi: {
    endpoint: string
    apiKey?: string
  }
}

// Check for expiring leases
const onLeaseExpirationCheck = (runtime: Runtime<Config>, payload: CronPayload): string => {
  runtime.log("=== ChainLease Lease Expiration Workflow ===")
  
  // 1. Query leases expiring in next 30 days
  // 2. Send renewal offers to tenants
  // 3. Notify landlords to prepare for potential vacancy
  // 4. For leases expiring today:
  //    - Execute completeLease() on-chain
  //    - Process security deposit return
  //    - Update property listing status
  //    - Archive lease data
  
  runtime.log("Lease expiration check completed")
  return "Lease expiration workflow completed"
}

const initWorkflow = (config: Config) => {
  // Run daily at 8 AM Eastern Time
  const cronTrigger = new CronCapability().trigger({
    schedule: "TZ=America/New_York 0 8 * * *",
  })

  return [handler(cronTrigger, onLeaseExpirationCheck)]
}

export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}
```

---

## Common Schedules for ChainLease

| Workflow | Schedule | Expression | Description |
|----------|----------|------------|-------------|
| **Rent Monitoring** | Daily at midnight UTC | `0 0 * * *` | Check for overdue payments |
| **Lease Expiration** | Daily at 8 AM ET | `TZ=America/New_York 0 8 * * *` | Handle renewals/move-outs |
| **Market Analytics** | Weekly on Sunday at 2 AM UTC | `0 2 * * 0` | Aggregate platform metrics |
| **Dispute Escalation** | Every 6 hours | `0 */6 * * *` | Monitor dispute timelines |
| **Payment Reminders** | Daily at 6 PM local time | `TZ=America/New_York 0 18 * * *` | Send payment reminders |

---

## Important Considerations

1. **Minimum Interval**: Cannot fire more frequently than once every 30 seconds
2. **Timezone Handling**: Always specify timezone for user-facing schedules (rent due dates, notifications)
3. **Gas Costs**: Cron triggers only charge CRE fees, not gas (unless writing to blockchain)
4. **Error Handling**: Always implement try-catch blocks for external API calls
5. **Consensus**: Use appropriate consensus mechanisms for critical operations
6. **Monitoring**: Log execution times and results for debugging

---

## Resources

- [CRE SDK Documentation](https://docs.chain.link/chainlink-functions/resources/service-responsibility)
- [Crontab Guru](https://crontab.guru) - Cron expression generator
- [IANA Timezone Database](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
- [Simulating Workflows Guide](https://docs.chain.link/chainlink-functions/resources/service-responsibility)

---

**Last Updated:** February 21, 2026  
**ChainLease Development Team**
