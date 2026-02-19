ALTER TABLE "organization_email_settings"
ADD COLUMN "default_from_email" text;
--> statement-breakpoint
ALTER TABLE "organization_email_settings"
ADD COLUMN "templates" jsonb DEFAULT '[]'::jsonb NOT NULL;
