/**
 * Fix schema issues with workflows table
 */
import { sql } from "drizzle-orm";
import { db } from "../lib/db/index.js";

async function fixSchema() {
  console.log("Fixing workflows table schema...");

  try {
    // Drop the incorrectly typed column if it exists
    await db.execute(sql`
      ALTER TABLE workflows DROP COLUMN IF EXISTS definition_version
    `);
    console.log("✅ Dropped old definition_version column");

    // Add it back with correct type
    await db.execute(sql`
      ALTER TABLE workflows ADD COLUMN definition_version integer
    `);
    console.log("✅ Added definition_version column as integer");

    // Fix JSONB defaults
    await db.execute(sql`
      ALTER TABLE workflows
      ALTER COLUMN variables SET DEFAULT '{}'::jsonb
    `);
    console.log("✅ Fixed variables default");

    await db.execute(sql`
      ALTER TABLE workflows
      ALTER COLUMN metadata SET DEFAULT '{}'::jsonb
    `);
    console.log("✅ Fixed metadata default");

    console.log("\n✅ Schema fixes complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing schema:", error);
    process.exit(1);
  }
}

fixSchema();
