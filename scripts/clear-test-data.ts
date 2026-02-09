/**
 * Clear Test Data Script
 *
 * This script clears all test data from the Byte Dashboard database
 * while preserving the schema and user accounts (synced from Clerk).
 *
 * Usage:
 *   npx tsx scripts/clear-test-data.ts
 *
 * IMPORTANT: This will delete ALL data for the specified org_id.
 * Run with caution!
 */

import { db } from "../lib/db";
import {
  notes,
  activityLog,
  formstackSubmissions,
  tasks,
  workflowExecutions,
  contacts,
  workflowDefinitions,
} from "../lib/db/schema";
import { eq } from "drizzle-orm";

// Target organization ID (Dan Hilse test account)
const TARGET_ORG_ID = "org_39JMtNqbQG7jxrQJ11xFDYWyKE5";

async function clearTestData() {
  console.log(`🗑️  Clearing test data for org: ${TARGET_ORG_ID}\n`);

  try {
    // Step 1: Delete notes
    await db
      .delete(notes)
      .where(eq(notes.orgId, TARGET_ORG_ID));
    console.log(`✓ Deleted notes`);

    // Step 2: Delete activity log
    await db
      .delete(activityLog)
      .where(eq(activityLog.orgId, TARGET_ORG_ID));
    console.log(`✓ Deleted activity log`);

    // Step 3: Delete formstack submissions
    await db
      .delete(formstackSubmissions)
      .where(eq(formstackSubmissions.orgId, TARGET_ORG_ID));
    console.log(`✓ Deleted formstack submissions`);

    // Step 4: Delete tasks
    await db
      .delete(tasks)
      .where(eq(tasks.orgId, TARGET_ORG_ID));
    console.log(`✓ Deleted tasks`);

    // Step 5: Delete workflows
    await db
      .delete(workflowExecutions)
      .where(eq(workflowExecutions.orgId, TARGET_ORG_ID));
    console.log(`✓ Deleted workflow executions`);

    // Step 6: Delete contacts
    await db
      .delete(contacts)
      .where(eq(contacts.orgId, TARGET_ORG_ID));
    console.log(`✓ Deleted contacts`);

    // Step 7: Delete workflow definitions
    await db
      .delete(workflowDefinitions)
      .where(eq(workflowDefinitions.orgId, TARGET_ORG_ID));
    console.log(`✓ Deleted workflow definitions`);

    // Optional: Delete formstack config (uncomment if needed)
    // const deletedConfig = await db
    //   .delete(formstackConfig)
    //   .where(eq(formstackConfig.orgId, TARGET_ORG_ID));
    // console.log(`✓ Deleted formstack config`);

    console.log(`\n✅ All test data cleared for org: ${TARGET_ORG_ID}`);
    console.log(`   (User accounts preserved - synced from Clerk)`);
  } catch (error) {
    console.error("❌ Error clearing test data:", error);
    throw error;
  }

  process.exit(0);
}

// Run the script
clearTestData();
