-- Enforce per-user ownership now that all existing rows have been backfilled
-- (see scripts/one-time/backfill-user.sql). chats stays nullable (deprecated)
-- and plan_templates has no user_id (scoped transitively via its plan).
ALTER TABLE "plans" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "task_templates" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "tasks" ALTER COLUMN "user_id" SET NOT NULL;
