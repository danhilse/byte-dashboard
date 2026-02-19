CREATE TABLE "organization_email_settings" (
	"org_id" text PRIMARY KEY NOT NULL,
	"allowed_from_emails" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_org_email_settings_updated" ON "organization_email_settings" USING btree ("updated_at");
