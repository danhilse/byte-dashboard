DROP INDEX IF EXISTS "idx_users_org";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_users_roles";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "org_id";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "role";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "roles";
