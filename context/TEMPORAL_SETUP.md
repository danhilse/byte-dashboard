# Temporal Setup Guide

This guide explains how to set up Temporal for the Byte Dashboard project.

## Option 1: Local Development (Recommended for Getting Started)

### 1. Install Temporal CLI

```bash
# macOS (via Homebrew)
brew install temporal

# Or use the install script
curl -sSf https://temporal.download/cli.sh | sh
```

### 2. Start Temporal Server

```bash
# Start Temporal server with Web UI
temporal server start-dev

# This will start:
# - Temporal Server on localhost:7233
# - Temporal Web UI on http://localhost:8233
```

### 3. Configure Environment Variables

Update your `.env.local`:

```bash
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
```

### 4. Start the Worker

In a new terminal:

```bash
npm run worker:dev
```

You should see: `Worker connected to Temporal at localhost:7233 (namespace: default)`

### 5. Test the Setup

Make a test API call:

```bash
curl -X POST http://localhost:3000/api/workflows/hello \
  -H "Content-Type: application/json" \
  -d '{"name": "World", "email": "test@example.com"}'
```

Expected response:
```json
{
  "workflowId": "hello-World-1234567890",
  "result": {
    "greeting": "Hello, World!",
    "emailSent": true
  }
}
```

### 6. View Workflows in Temporal UI

Open http://localhost:8233 and you'll see:
- Workflow executions
- Workflow history
- Activity executions
- Workflow logs

---

## Option 2: Temporal Cloud (Recommended for Production)

### 1. Create Temporal Cloud Account

1. Go to https://cloud.temporal.io
2. Sign up for a free account
3. Create a namespace (e.g., `byte-dashboard-dev`)

### 2. Generate Client Certificates

In Temporal Cloud:
1. Navigate to your namespace
2. Go to "Certificates"
3. Click "Create Certificate"
4. Download both:
   - Client certificate (`.pem`)
   - Private key (`.key`)

### 3. Configure Environment Variables

Base64-encode your certificates:

```bash
# Encode certificate
cat client-cert.pem | base64 > cert.base64

# Encode private key
cat client-key.key | base64 > key.base64
```

Update your `.env.local`:

```bash
TEMPORAL_ADDRESS=your-namespace.your-account-id.tmprl.cloud:7233
TEMPORAL_NAMESPACE=your-namespace
TEMPORAL_CLIENT_CERT=<paste contents of cert.base64>
TEMPORAL_CLIENT_KEY=<paste contents of key.base64>
```

### 4. Start the Worker

```bash
npm run worker:dev
```

You should see: `Worker connected to Temporal at your-namespace.tmprl.cloud:7233`

### 5. Test the Setup

Same as local development - make a test API call and view results in Temporal Cloud UI.

---

## Production Deployment

### Next.js App (Vercel)

The Next.js app on Vercel:
- **Does NOT run workers**
- Only starts workflows via API routes
- Connects to Temporal Cloud via the client

Environment variables in Vercel:
```
TEMPORAL_ADDRESS=your-namespace.tmprl.cloud:7233
TEMPORAL_NAMESPACE=your-namespace
TEMPORAL_CLIENT_CERT=<base64-encoded cert>
TEMPORAL_CLIENT_KEY=<base64-encoded key>
```

### Worker (Railway or separate server)

The worker must run as a separate long-running process:

1. **Option A: Railway**
   - Create a new service
   - Connect GitHub repo
   - Set start command: `npm run worker:start`
   - Add same Temporal environment variables

2. **Option B: Separate VPS**
   - Deploy worker code
   - Run with PM2 or systemd
   - Ensure it can connect to Temporal Cloud

**Important:** Workers must run continuously to process workflows. If the worker is down, workflows will queue and execute when it comes back online.

---

## Workflow Development

### Creating a New Workflow

1. **Define the workflow** (`lib/workflows/my-workflow.ts`):
```typescript
import { proxyActivities } from "@temporalio/workflow"
import type * as activities from "../activities"

const { myActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: "1 minute",
})

export async function myWorkflow(input: MyInput): Promise<MyOutput> {
  const result = await myActivity(input.data)
  return { success: true, result }
}
```

2. **Create activities** (`lib/activities/my-activity.ts`):
```typescript
export async function myActivity(data: string): Promise<string> {
  // Do actual work: DB calls, API calls, etc.
  return `Processed: ${data}`
}
```

3. **Export activity** (`lib/activities/index.ts`):
```typescript
export * from "./my-activity"
```

4. **Create API route** (`app/api/workflows/my-workflow/route.ts`):
```typescript
import { getTemporalClient } from "@/lib/temporal/client"

export async function POST(req: Request) {
  const body = await req.json()
  const client = await getTemporalClient()

  const handle = await client.workflow.start("myWorkflow", {
    taskQueue: "byte-dashboard",
    args: [body],
    workflowId: `my-workflow-${Date.now()}`,
  })

  return Response.json({ workflowId: handle.workflowId })
}
```

5. **Restart the worker** to pick up new workflow code

### Testing Workflows Locally

```bash
# Terminal 1: Start Temporal server
temporal server start-dev

# Terminal 2: Start worker
npm run worker:dev

# Terminal 3: Start Next.js app
npm run dev

# Terminal 4: Make API calls
curl -X POST http://localhost:3000/api/workflows/my-workflow \
  -H "Content-Type: application/json" \
  -d '{"data": "test"}'
```

---

## Troubleshooting

### Worker won't connect

**Error:** `Connection refused at localhost:7233`

**Solution:** Make sure Temporal server is running (`temporal server start-dev`)

---

### Certificate errors with Temporal Cloud

**Error:** `Invalid certificate`

**Solution:**
1. Ensure certificates are base64-encoded correctly
2. Check for extra whitespace or newlines
3. Re-download certificates from Temporal Cloud

---

### Workflow not executing

**Possible causes:**
1. Worker not running
2. Worker connected to wrong namespace
3. Workflow code has syntax errors
4. Activity timeout too short

**Debug steps:**
1. Check worker logs
2. Check Temporal UI for workflow execution
3. Look for errors in workflow history

---

### Activities timing out

**Error:** `Activity timed out`

**Solution:** Increase timeout in workflow:
```typescript
const { myActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: "5 minutes", // Increase this
})
```

---

## Resources

- [Temporal Documentation](https://docs.temporal.io)
- [TypeScript SDK Guide](https://docs.temporal.io/dev-guide/typescript)
- [Temporal Cloud](https://cloud.temporal.io)
- [Temporal CLI Reference](https://docs.temporal.io/cli)
