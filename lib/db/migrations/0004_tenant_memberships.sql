CREATE TABLE "organization_memberships" (
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"clerk_role" text,
	"role" text DEFAULT 'member' NOT NULL,
	"roles" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_memberships_org_id_user_id_pk" PRIMARY KEY("org_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_organization_memberships_org" ON "organization_memberships" USING btree ("org_id");
--> statement-breakpoint
CREATE INDEX "idx_organization_memberships_user" ON "organization_memberships" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_organization_memberships_roles" ON "organization_memberships" USING gin ("roles");
--> statement-breakpoint
INSERT INTO "organization_memberships" (
	"org_id",
	"user_id",
	"clerk_role",
	"role",
	"roles",
	"created_at",
	"updated_at"
)
SELECT
	"org_id",
	"id",
	NULL,
	CASE
		WHEN lower(regexp_replace(coalesce("role", ''), '^org:', '')) IN ('', 'user') THEN 'member'
		ELSE lower(regexp_replace("role", '^org:', ''))
	END,
	CASE
		WHEN cardinality("roles") > 0 THEN ARRAY(
			SELECT CASE
				WHEN lower(regexp_replace(r, '^org:', '')) IN ('', 'user') THEN 'member'
				ELSE lower(regexp_replace(r, '^org:', ''))
			END
			FROM unnest("roles") AS r
		)::text[]
		ELSE ARRAY[
			CASE
				WHEN lower(regexp_replace(coalesce("role", ''), '^org:', '')) IN ('', 'user') THEN 'member'
				ELSE lower(regexp_replace("role", '^org:', ''))
			END
		]::text[]
	END,
	"created_at",
	"updated_at"
FROM "users"
ON CONFLICT ("org_id","user_id") DO NOTHING;
