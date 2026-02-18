CREATE TABLE "organization_role_definitions" (
	"org_id" text NOT NULL,
	"role_key" text NOT NULL,
	"display_name" text NOT NULL,
	"permissions" text[] DEFAULT '{}' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_role_definitions_org_id_role_key_pk" PRIMARY KEY("org_id","role_key")
);
--> statement-breakpoint
CREATE INDEX "idx_org_role_definitions_org" ON "organization_role_definitions" USING btree ("org_id");
--> statement-breakpoint
CREATE INDEX "idx_org_role_definitions_permissions" ON "organization_role_definitions" USING gin ("permissions");
--> statement-breakpoint
INSERT INTO "organization_role_definitions" (
	"org_id",
	"role_key",
	"display_name",
	"permissions",
	"is_system",
	"created_at",
	"updated_at"
)
SELECT DISTINCT
	m."org_id",
	lower(regexp_replace(r, '^org:', '')) AS "role_key",
	initcap(replace(lower(regexp_replace(r, '^org:', '')), '-', ' ')) AS "display_name",
	'{}'::text[] AS "permissions",
	false AS "is_system",
	now(),
	now()
FROM "organization_memberships" m,
	unnest(m."roles") AS r
WHERE lower(regexp_replace(r, '^org:', '')) NOT IN ('owner', 'admin', 'member', 'user', 'guest')
ON CONFLICT ("org_id","role_key") DO NOTHING;
