ALTER TABLE "workflow_executions"
ADD COLUMN IF NOT EXISTS "workflow_execution_state" text DEFAULT 'running' NOT NULL;
--> statement-breakpoint
ALTER TABLE "workflow_executions"
ADD COLUMN IF NOT EXISTS "error_definition" text;
--> statement-breakpoint
UPDATE "workflow_executions"
SET "workflow_execution_state" = CASE
  WHEN "status" = 'failed' THEN 'error'
  WHEN "status" = 'timeout' THEN 'timeout'
  WHEN "completed_at" IS NOT NULL THEN 'completed'
  ELSE 'running'
END;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_workflow_executions_state"
ON "workflow_executions" USING btree ("org_id", "workflow_execution_state");
