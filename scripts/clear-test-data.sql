-- Clear Test Data Script
-- This script clears all test data from the Byte Dashboard database
-- while preserving the schema and user accounts (synced from Clerk)
--
-- IMPORTANT: This will delete ALL data for the specified org_id
-- Run with caution!

-- Variables (update org_id if needed)
-- Replace 'org_2rEpAiJOqtVLaDbD1W5HbOa4aQH' with your actual org ID
DO $$
DECLARE
    target_org_id text := 'org_2rEpAiJOqtVLaDbD1W5HbOa4aQH'; -- Dan Hilse test account
BEGIN
    -- Step 1: Delete notes (references workflows, contacts, tasks)
    DELETE FROM notes WHERE org_id = target_org_id;
    RAISE NOTICE 'Deleted notes for org: %', target_org_id;

    -- Step 2: Delete activity log (references workflows, contacts, tasks)
    DELETE FROM activity_log WHERE org_id = target_org_id;
    RAISE NOTICE 'Deleted activity_log for org: %', target_org_id;

    -- Step 3: Delete formstack submissions (references workflows)
    DELETE FROM formstack_submissions WHERE org_id = target_org_id;
    RAISE NOTICE 'Deleted formstack_submissions for org: %', target_org_id;

    -- Step 4: Delete tasks (references workflows, contacts, users)
    DELETE FROM tasks WHERE org_id = target_org_id;
    RAISE NOTICE 'Deleted tasks for org: %', target_org_id;

    -- Step 5: Delete workflows (references contacts, workflow_definitions)
    DELETE FROM workflows WHERE org_id = target_org_id;
    RAISE NOTICE 'Deleted workflows for org: %', target_org_id;

    -- Step 6: Delete contacts
    DELETE FROM contacts WHERE org_id = target_org_id;
    RAISE NOTICE 'Deleted contacts for org: %', target_org_id;

    -- Step 7: Delete workflow definitions
    DELETE FROM workflow_definitions WHERE org_id = target_org_id;
    RAISE NOTICE 'Deleted workflow_definitions for org: %', target_org_id;

    -- Optional: Delete formstack config (uncomment if needed)
    -- DELETE FROM formstack_config WHERE org_id = target_org_id;
    -- RAISE NOTICE 'Deleted formstack_config for org: %', target_org_id;

    -- Note: We preserve users table (synced from Clerk)

    RAISE NOTICE 'All test data cleared for org: %', target_org_id;
END $$;
