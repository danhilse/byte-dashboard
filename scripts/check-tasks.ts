/**
 * Quick script to check if tasks were created by workflows
 */
import { db } from "../lib/db/index.js";
import { tasks } from "../lib/db/schema.js";

async function checkTasks() {
  console.log("Fetching tasks from database...\n");

  const allTasks = await db.select().from(tasks).orderBy(tasks.createdAt);

  console.log(`Found ${allTasks.length} tasks:\n`);

  allTasks.forEach((task, i) => {
    console.log(`${i + 1}. ${task.title}`);
    console.log(`   ID: ${task.id}`);
    console.log(`   Type: ${task.taskType}`);
    console.log(`   Status: ${task.status}`);
    console.log(`   Workflow ID: ${task.workflowId || 'none'}`);
    console.log(`   Created: ${task.createdAt}`);
    console.log('');
  });

  process.exit(0);
}

checkTasks();
