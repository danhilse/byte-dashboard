/**
 * Check what org IDs have data in the database
 */

import { db } from "../lib/db";
import { contacts, tasks, workflows, workflowDefinitions } from "../lib/db/schema";
import { sql } from "drizzle-orm";

async function checkOrgData() {
  console.log("📊 Checking database for organizations with data...\n");

  try {
    // Get all unique org_ids
    const allContacts = await db.select({ orgId: contacts.orgId }).from(contacts);
    const allTasks = await db.select({ orgId: tasks.orgId }).from(tasks);
    const allWorkflows = await db.select({ orgId: workflows.orgId }).from(workflows);
    const allDefinitions = await db.select({ orgId: workflowDefinitions.orgId }).from(workflowDefinitions);

    const orgIds = new Set([
      ...allContacts.map(c => c.orgId),
      ...allTasks.map(t => t.orgId),
      ...allWorkflows.map(w => w.orgId),
      ...allDefinitions.map(d => d.orgId),
    ]);

    if (orgIds.size === 0) {
      console.log("✅ Database is completely clean - no organization data found.");
    } else {
      console.log("Organizations with data:");
      console.log("=".repeat(80));

      for (const orgId of Array.from(orgIds).sort()) {
        const contactsCount = allContacts.filter(c => c.orgId === orgId).length;
        const tasksCount = allTasks.filter(t => t.orgId === orgId).length;
        const workflowsCount = allWorkflows.filter(w => w.orgId === orgId).length;
        const definitionsCount = allDefinitions.filter(d => d.orgId === orgId).length;

        console.log(`\nOrg ID: ${orgId}`);
        console.log(`  Contacts: ${contactsCount}`);
        console.log(`  Tasks: ${tasksCount}`);
        console.log(`  Workflows: ${workflowsCount}`);
        console.log(`  Workflow Definitions: ${definitionsCount}`);
      }

      console.log("\n" + "=".repeat(80));
    }
  } catch (error) {
    console.error("❌ Error checking org data:", error);
    throw error;
  }

  process.exit(0);
}

checkOrgData();
