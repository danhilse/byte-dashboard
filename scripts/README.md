# Database Scripts

This directory contains utility scripts for managing the Byte Dashboard database.

## Clear Test Data

Clears all test data from the database for a specific organization while preserving:
- Database schema
- User accounts (synced from Clerk)
- Formstack configuration (optional)

### Usage

**Option 1: Using npm script (recommended)**
```bash
npm run db:clear
```

**Option 2: Using tsx directly**
```bash
npx tsx --env-file=.env.local scripts/clear-test-data.ts
```

**Option 3: Using raw SQL**
```bash
# Update the org_id in the SQL file first
psql $DATABASE_URL -f scripts/clear-test-data.sql
```

### What Gets Deleted

The script deletes data in the following order (respecting foreign key constraints):

1. **Notes** - All notes attached to workflows, contacts, and tasks
2. **Activity Log** - All activity history
3. **Formstack Submissions** - All webhook payloads
4. **Tasks** - All tasks (standalone and workflow-generated)
5. **Workflows** - All workflow executions/instances
6. **Contacts** - All contact/people records
7. **Workflow Definitions** - All workflow blueprints

### Safety

- **Organization-scoped**: Only deletes data for the specified `org_id`
- **User preservation**: Does not delete user accounts (synced from Clerk)
- **Type-safe**: TypeScript version uses Drizzle ORM for compile-time safety
- **Idempotent**: Safe to run multiple times

### Configuration

To change the target organization, edit the `TARGET_ORG_ID` constant in:
- `scripts/clear-test-data.ts` (line 20)
- `scripts/clear-test-data.sql` (line 11)

Default: `org_2rEpAiJOqtVLaDbD1W5HbOa4aQH` (Dan Hilse test account)

## Other Scripts

- `create-test-contact.ts` - Create a test contact
- `check-tasks.ts` - Check task data
- `fix-schema.ts` - Schema migration utilities
- `seed-test-contacts.sql` - Seed SQL for test contacts

## Auth Provisioning (Clerk Org)

Creates or reuses a Clerk organization, ensures the target owner user has admin membership, and syncs local DB user/membership rows.
The script fails by default if the org is owned by a different user than the requested owner.

### Usage

Dry run (recommended first):

```bash
npm run auth:provision:fayette:dry-run
```

Apply:

```bash
npm run auth:provision:fayette
```

Optional flags:

- `--owner-email <email>` (env: `AUTH_PROVISION_OWNER_EMAIL`, legacy `FAYETTE_OWNER_EMAIL`)
- `--owner-user-id <id>` (env: `AUTH_PROVISION_OWNER_USER_ID`, legacy `FAYETTE_OWNER_USER_ID`)
- `--org-name <name>` (env: `AUTH_PROVISION_ORG_NAME`, legacy `FAYETTE_ORG_NAME`)
- `--org-slug <slug>` (env: `AUTH_PROVISION_ORG_SLUG`, legacy `FAYETTE_ORG_SLUG`)
- `--org-id <id>` to target an existing Clerk org directly (no slug lookup/create)
- `--allow-owner-mismatch` to continue even when org ownership differs from the target owner
- `--skip-db-sync` to update Clerk only

Script file: `scripts/provision-fayette-org.ts`

### Current Test Tenant (Dan)

For this environment, use Dan's existing org/user for auth testing:

- User: `user_39MlXgMvThKGTPaokpN2c2OaQDB` (`danhilse@gmail.com`)
- Org: `org_39MlYSFs7Zj040mAH9mAyoqDZZJ` (`dan-s-organization-1770513867`)

Dry run:

```bash
npm run auth:provision:dan:dry-run
```

Apply:

```bash
npm run auth:provision:dan
```
