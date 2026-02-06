CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"application_id" uuid,
	"contact_id" uuid,
	"task_id" uuid,
	"action" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"contact_id" uuid NOT NULL,
	"workflow_template_id" uuid,
	"status" text DEFAULT 'submitted' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"source_id" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"address_line_1" text,
	"address_line_2" text,
	"city" text,
	"state" text,
	"zip" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "formstack_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"webhook_secret" text,
	"field_mappings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"default_workflow_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "formstack_config_org_id_unique" UNIQUE("org_id")
);
--> statement-breakpoint
CREATE TABLE "formstack_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"form_id" text NOT NULL,
	"submission_id" text NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"application_id" uuid,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"application_id" uuid,
	"contact_id" uuid,
	"task_id" uuid,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"is_internal" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "one_parent_only" CHECK ((
        (CASE WHEN "notes"."application_id" IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN "notes"."contact_id" IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN "notes"."task_id" IS NOT NULL THEN 1 ELSE 0 END)
      ) = 1)
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"application_id" uuid,
	"contact_id" uuid,
	"assigned_to" text,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'todo' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"due_date" date,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"statuses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_workflow_template_id_workflow_templates_id_fk" FOREIGN KEY ("workflow_template_id") REFERENCES "public"."workflow_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formstack_config" ADD CONSTRAINT "formstack_config_default_workflow_id_workflow_templates_id_fk" FOREIGN KEY ("default_workflow_id") REFERENCES "public"."workflow_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formstack_submissions" ADD CONSTRAINT "formstack_submissions_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activity_org" ON "activity_log" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_activity_entity" ON "activity_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_activity_time" ON "activity_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_activity_application" ON "activity_log" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_activity_contact" ON "activity_log" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_activity_task" ON "activity_log" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_applications_org" ON "applications" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_applications_contact" ON "applications" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_applications_status" ON "applications" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "idx_contacts_org" ON "contacts" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_contacts_email" ON "contacts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_contacts_name" ON "contacts" USING btree ("last_name","first_name");--> statement-breakpoint
CREATE INDEX "idx_formstack_org" ON "formstack_submissions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_formstack_processed" ON "formstack_submissions" USING btree ("processed");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_formstack_submission" ON "formstack_submissions" USING btree ("org_id","submission_id");--> statement-breakpoint
CREATE INDEX "idx_notes_entity" ON "notes" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_notes_org" ON "notes" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_notes_application" ON "notes" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_notes_contact" ON "notes" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_notes_task" ON "notes" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_org" ON "tasks" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_assigned" ON "tasks" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "idx_tasks_status" ON "tasks" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "idx_tasks_application" ON "tasks" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_position" ON "tasks" USING btree ("org_id","status","position");--> statement-breakpoint
CREATE INDEX "idx_users_org" ON "users" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_templates_org" ON "workflow_templates" USING btree ("org_id");