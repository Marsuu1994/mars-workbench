-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_template_id_fkey";

-- AlterTable
ALTER TABLE "tasks" ALTER COLUMN "plan_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "task_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
