-- Phase A: Preflight audit - detect cross-org rows that would violate composite FKs
DO $$
DECLARE bad_count INTEGER;
BEGIN
  SELECT count(*) INTO bad_count FROM workflow_executions we
    JOIN contacts c ON we.contact_id = c.id WHERE we.org_id <> c.org_id;
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'Found % workflow_executions with cross-org contact_id', bad_count;
  END IF;

  SELECT count(*) INTO bad_count FROM workflow_executions we
    JOIN workflow_definitions wd ON we.workflow_definition_id = wd.id WHERE we.org_id <> wd.org_id;
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'Found % workflow_executions with cross-org workflow_definition_id', bad_count;
  END IF;

  SELECT count(*) INTO bad_count FROM tasks t
    JOIN contacts c ON t.contact_id = c.id WHERE t.org_id <> c.org_id;
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'Found % tasks with cross-org contact_id', bad_count;
  END IF;

  SELECT count(*) INTO bad_count FROM tasks t
    JOIN workflow_executions we ON t.workflow_execution_id = we.id WHERE t.org_id <> we.org_id;
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'Found % tasks with cross-org workflow_execution_id', bad_count;
  END IF;
END $$;
--> statement-breakpoint

-- Phase B: Add composite unique constraints on parent tables
ALTER TABLE "contacts" ADD CONSTRAINT "uq_contacts_org_id" UNIQUE ("org_id", "id");--> statement-breakpoint
ALTER TABLE "workflow_definitions" ADD CONSTRAINT "uq_workflow_definitions_org_id" UNIQUE ("org_id", "id");--> statement-breakpoint
ALTER TABLE "workflow_executions" ADD CONSTRAINT "uq_workflow_executions_org_id" UNIQUE ("org_id", "id");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "uq_tasks_org_id" UNIQUE ("org_id", "id");--> statement-breakpoint

-- Phase C: Drop 12 old single-column FKs
ALTER TABLE "workflow_executions" DROP CONSTRAINT "workflow_executions_contact_id_contacts_id_fk";--> statement-breakpoint
ALTER TABLE "workflow_executions" DROP CONSTRAINT "workflow_executions_workflow_definition_id_workflow_definitions_id_fk";--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_workflow_execution_id_workflow_executions_id_fk";--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_contact_id_contacts_id_fk";--> statement-breakpoint
ALTER TABLE "notes" DROP CONSTRAINT "notes_workflow_execution_id_workflow_executions_id_fk";--> statement-breakpoint
ALTER TABLE "notes" DROP CONSTRAINT "notes_contact_id_contacts_id_fk";--> statement-breakpoint
ALTER TABLE "notes" DROP CONSTRAINT "notes_task_id_tasks_id_fk";--> statement-breakpoint
ALTER TABLE "activity_log" DROP CONSTRAINT "activity_log_workflow_execution_id_workflow_executions_id_fk";--> statement-breakpoint
ALTER TABLE "activity_log" DROP CONSTRAINT "activity_log_contact_id_contacts_id_fk";--> statement-breakpoint
ALTER TABLE "activity_log" DROP CONSTRAINT "activity_log_task_id_tasks_id_fk";--> statement-breakpoint
ALTER TABLE "formstack_config" DROP CONSTRAINT "formstack_config_default_workflow_definition_id_workflow_definitions_id_fk";--> statement-breakpoint
ALTER TABLE "formstack_submissions" DROP CONSTRAINT "formstack_submissions_workflow_execution_id_workflow_executions_id_fk";--> statement-breakpoint

-- Phase D: Add 12 composite FKs (preserving original ON DELETE behavior)
ALTER TABLE "workflow_executions" ADD CONSTRAINT "fk_workflow_executions_contact" FOREIGN KEY ("org_id","contact_id") REFERENCES "public"."contacts"("org_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_executions" ADD CONSTRAINT "fk_workflow_executions_definition" FOREIGN KEY ("org_id","workflow_definition_id") REFERENCES "public"."workflow_definitions"("org_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "fk_tasks_workflow_execution" FOREIGN KEY ("org_id","workflow_execution_id") REFERENCES "public"."workflow_executions"("org_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "fk_tasks_contact" FOREIGN KEY ("org_id","contact_id") REFERENCES "public"."contacts"("org_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "fk_notes_workflow_execution" FOREIGN KEY ("org_id","workflow_execution_id") REFERENCES "public"."workflow_executions"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "fk_notes_contact" FOREIGN KEY ("org_id","contact_id") REFERENCES "public"."contacts"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "fk_notes_task" FOREIGN KEY ("org_id","task_id") REFERENCES "public"."tasks"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "fk_activity_log_workflow_execution" FOREIGN KEY ("org_id","workflow_execution_id") REFERENCES "public"."workflow_executions"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "fk_activity_log_contact" FOREIGN KEY ("org_id","contact_id") REFERENCES "public"."contacts"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "fk_activity_log_task" FOREIGN KEY ("org_id","task_id") REFERENCES "public"."tasks"("org_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formstack_config" ADD CONSTRAINT "fk_formstack_config_definition" FOREIGN KEY ("org_id","default_workflow_definition_id") REFERENCES "public"."workflow_definitions"("org_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formstack_submissions" ADD CONSTRAINT "fk_formstack_submissions_workflow_execution" FOREIGN KEY ("org_id","workflow_execution_id") REFERENCES "public"."workflow_executions"("org_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- Phase E: Add composite child indexes for FK enforcement performance
CREATE INDEX "idx_workflow_executions_org_contact" ON "workflow_executions" USING btree ("org_id","contact_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_executions_org_definition" ON "workflow_executions" USING btree ("org_id","workflow_definition_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_org_contact" ON "tasks" USING btree ("org_id","contact_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_org_workflow_execution" ON "tasks" USING btree ("org_id","workflow_execution_id");--> statement-breakpoint
CREATE INDEX "idx_notes_org_workflow_execution" ON "notes" USING btree ("org_id","workflow_execution_id");--> statement-breakpoint
CREATE INDEX "idx_notes_org_contact" ON "notes" USING btree ("org_id","contact_id");--> statement-breakpoint
CREATE INDEX "idx_notes_org_task" ON "notes" USING btree ("org_id","task_id");--> statement-breakpoint
CREATE INDEX "idx_activity_org_workflow_execution" ON "activity_log" USING btree ("org_id","workflow_execution_id");--> statement-breakpoint
CREATE INDEX "idx_activity_org_contact" ON "activity_log" USING btree ("org_id","contact_id");--> statement-breakpoint
CREATE INDEX "idx_activity_org_task" ON "activity_log" USING btree ("org_id","task_id");--> statement-breakpoint
CREATE INDEX "idx_formstack_org_workflow_execution" ON "formstack_submissions" USING btree ("org_id","workflow_execution_id");--> statement-breakpoint
CREATE INDEX "idx_formstack_config_org_definition" ON "formstack_config" USING btree ("org_id","default_workflow_definition_id");
