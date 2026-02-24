-- Migration: type_freq_to_plan_template
--
-- Moves `type` and `frequency` from task_templates (global) to plan_templates (per-plan).
-- Adds `type` directly onto tasks (stamped at generation time).
-- Makes tasks.template_id nullable (foundation for future ad-hoc tasks).
-- Adds AD_HOC to TaskType enum.
--
-- Strategy: expand-and-contract — add nullable columns, backfill from existing data,
-- enforce NOT NULL, then drop the old columns. DB is never in an inconsistent state.

-- Step 1: Extend enum (additive, no existing rows affected)
ALTER TYPE "TaskType" ADD VALUE IF NOT EXISTS 'AD_HOC';

-- Step 2: Add new columns to plan_templates (nullable first to allow backfill)
ALTER TABLE "plan_templates"
  ADD COLUMN IF NOT EXISTS "type"      "TaskType",
  ADD COLUMN IF NOT EXISTS "frequency" INTEGER;

-- Step 3: Backfill plan_templates.type and .frequency from their linked task_templates
UPDATE "plan_templates" pt
SET    "type"      = tt."type",
       "frequency" = tt."frequency"
FROM   "task_templates" tt
WHERE  pt."template_id" = tt."id";

-- Step 4: Enforce NOT NULL now that all rows are populated
ALTER TABLE "plan_templates"
  ALTER COLUMN "type"      SET NOT NULL,
  ALTER COLUMN "frequency" SET NOT NULL;

-- Step 5: Add type column to tasks (nullable first to allow backfill)
ALTER TABLE "tasks"
  ADD COLUMN IF NOT EXISTS "type" "TaskType";

-- Step 6: Backfill tasks.type from their linked task_templates
UPDATE "tasks" t
SET    "type" = tt."type"
FROM   "task_templates" tt
WHERE  t."template_id" = tt."id";

-- Step 7: Enforce NOT NULL on tasks.type
ALTER TABLE "tasks"
  ALTER COLUMN "type" SET NOT NULL;

-- Step 8: Make tasks.template_id nullable (PostgreSQL FKs naturally allow NULL;
--         the existing FK constraint tasks_template_id_fkey does not need to change)
ALTER TABLE "tasks"
  ALTER COLUMN "template_id" DROP NOT NULL;

-- Step 9: Drop type and frequency from task_templates (data already migrated above)
ALTER TABLE "task_templates"
  DROP COLUMN IF EXISTS "type",
  DROP COLUMN IF EXISTS "frequency";
