# Temporal Test Checklist

Follow these steps to complete Phase 1 Temporal setup and testing.

## Prerequisites

- [ ] Install Temporal CLI: `brew install temporal`

## Testing Steps

### Step 1: Start Temporal Server

```bash
temporal server start-dev
```

**Expected output:**
```
CLI 1.x.x
Server:   1.x.x
UI:       http://localhost:8233
```

✅ **Success criteria:** Server starts without errors

---

### Step 2: Start the Worker

In a new terminal:

```bash
npm run worker:dev
```

**Expected output:**
```
Worker connected to Temporal at localhost:7233 (namespace: default)
Temporal worker started
```

✅ **Success criteria:** Worker connects and stays running

---

### Step 3: Start Next.js Dev Server

In a new terminal:

```bash
npm run dev
```

**Expected output:**
```
✓ Ready in X.Xs
○ Local: http://localhost:3000
```

✅ **Success criteria:** Server starts on port 3000

---

### Step 4: Test Workflow Execution

```bash
curl -X POST http://localhost:3000/api/workflows/hello \
  -H "Content-Type: application/json" \
  -d '{"name": "World", "email": "test@example.com"}'
```

**Expected response:**
```json
{
  "workflowId": "hello-World-1234567890",
  "result": {
    "greeting": "Hello, World!",
    "emailSent": true
  }
}
```

✅ **Success criteria:** 200 status code with workflowId and result

---

### Step 5: Check Worker Logs

Look at the worker terminal. You should see:

```
Activity: Greeting World
Activity: Sending welcome email to test@example.com
Activity: Welcome email sent to test@example.com
```

✅ **Success criteria:** Activities execute in correct order

---

### Step 6: View in Temporal UI

1. Open http://localhost:8233
2. Click on "Workflows" in the sidebar
3. Find your workflow (starts with "hello-World-")
4. Click to view details

**You should see:**
- Status: Completed
- Workflow ID: `hello-World-<timestamp>`
- Activities: `greet` and `sendWelcomeEmail` both completed
- Full execution history

✅ **Success criteria:** Workflow shows as "Completed" with all activities successful

---

### Step 7: Test Workflow Status API

Copy the workflowId from step 4 and run:

```bash
curl "http://localhost:3000/api/workflows/hello?workflowId=hello-World-1234567890"
```

**Expected response:**
```json
{
  "workflowId": "hello-World-1234567890",
  "status": "COMPLETED",
  "startTime": "2026-02-06T..."
}
```

✅ **Success criteria:** 200 status code with workflow status

---

### Step 8: Test Signal Handling (Advanced)

This will be implemented in Phase 6 for real workflows, but the infrastructure is ready.

---

## Troubleshooting

### Worker won't connect

**Symptom:** `Error: Connection refused`

**Fix:**
1. Check Temporal server is running (step 1)
2. Verify port 7233 is not blocked
3. Check `TEMPORAL_ADDRESS` in `.env.local`

---

### Workflow times out

**Symptom:** API call takes >1 minute and fails

**Fix:**
1. Check worker logs for errors
2. Ensure worker is running
3. Check activities complete successfully

---

### "Module not found" errors

**Symptom:** Worker crashes with import errors

**Fix:**
```bash
# Reinstall dependencies
npm install
```

---

## Phase 1 Complete! 🎉

Once all steps above pass, Phase 1 is complete:

- [x] Auth & Multi-tenant Setup
- [x] Database & ORM
- [x] **Temporal Setup** ✅
- [x] UI Foundation

**Next:** Move to Phase 3 (Tasks & Kanban) or Phase 6 (Real Workflows)
