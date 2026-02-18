CREATE TABLE "organization_field_visibility_policies" (
	"org_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"field_key" text NOT NULL,
	"role_key" text NOT NULL,
	"can_read" boolean DEFAULT false NOT NULL,
	"can_write" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_field_visibility_policies_org_id_entity_type_field_key_role_key_pk" PRIMARY KEY("org_id","entity_type","field_key","role_key"),
	CONSTRAINT "org_field_visibility_can_write_requires_read" CHECK (NOT "organization_field_visibility_policies"."can_write" OR "organization_field_visibility_policies"."can_read")
);
--> statement-breakpoint
CREATE INDEX "idx_org_field_visibility_org" ON "organization_field_visibility_policies" USING btree ("org_id");
--> statement-breakpoint
CREATE INDEX "idx_org_field_visibility_role" ON "organization_field_visibility_policies" USING btree ("org_id","role_key");
--> statement-breakpoint
CREATE INDEX "idx_org_field_visibility_entity_field" ON "organization_field_visibility_policies" USING btree ("org_id","entity_type","field_key");
