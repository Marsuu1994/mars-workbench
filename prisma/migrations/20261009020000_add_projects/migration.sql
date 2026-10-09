-- Week model Phase 1: projects. A project is a goal plus an ordered path of
-- steps; each step is a Task with type = PROJECT and project_id set, whose
-- order is its instance_index (1-based step number). Additive only: no
-- existing row changes, no backfill.

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "goal" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "project_id" UUID;

-- CreateIndex
CREATE INDEX "idx_tasks_project_id_instance_index" ON "tasks"("project_id", "instance_index");

-- AddForeignKey
-- No cascade: projects are only ever archived, and done steps carry points
-- history.
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
