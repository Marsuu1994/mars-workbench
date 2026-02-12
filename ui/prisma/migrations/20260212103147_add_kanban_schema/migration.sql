-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('WEEKLY');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'PENDING_UPDATE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'DOING', 'DONE', 'EXPIRED');

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "period_type" "PeriodType" NOT NULL,
    "period_key" TEXT NOT NULL,
    "description" TEXT,
    "status" "PlanStatus" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_templates" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "type" "TaskType" NOT NULL,
    "frequency" INTEGER NOT NULL,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_templates" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "points" INTEGER NOT NULL,
    "status" "TaskStatus" NOT NULL,
    "for_date" DATE,
    "period_key" TEXT,
    "instance_index" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "done_at" TIMESTAMPTZ,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_plans_user_id_status" ON "plans"("user_id", "status");

-- CreateIndex
CREATE INDEX "idx_task_templates_user_id_is_archived" ON "task_templates"("user_id", "is_archived");

-- CreateIndex
CREATE INDEX "idx_plan_templates_template_id" ON "plan_templates"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_templates_plan_id_template_id_key" ON "plan_templates"("plan_id", "template_id");

-- CreateIndex
CREATE INDEX "idx_tasks_plan_id_status" ON "tasks"("plan_id", "status");

-- CreateIndex
CREATE INDEX "idx_tasks_plan_id_for_date" ON "tasks"("plan_id", "for_date");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_plan_id_template_id_for_date_instance_index_key" ON "tasks"("plan_id", "template_id", "for_date", "instance_index");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_plan_id_template_id_period_key_instance_index_key" ON "tasks"("plan_id", "template_id", "period_key", "instance_index");

-- AddForeignKey
ALTER TABLE "plan_templates" ADD CONSTRAINT "plan_templates_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_templates" ADD CONSTRAINT "plan_templates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "task_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "task_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
