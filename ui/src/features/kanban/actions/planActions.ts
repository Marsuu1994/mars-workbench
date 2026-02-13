"use server";

import { revalidatePath } from "next/cache";
import { createPlanSchema, updatePlanSchema } from "../schemas";
import {
  getActivePlan,
  createPlan,
  updatePlan,
  updateLastSyncDate,
} from "@/lib/db/plans";
import {
  createManyPlanTemplates,
  deletePlanTemplatesByPlanId,
} from "@/lib/db/planTemplates";
import { getTaskTemplateById } from "@/lib/db/taskTemplates";
import { createManyTasks } from "@/lib/db/tasks";
import { TaskType, TaskStatus } from "@/generated/prisma/client";
import { getTodayDate, getISOWeekKey } from "../utils/dateUtils";

export async function createPlanAction(input: unknown) {
  const parsed = createPlanSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const { periodType, description, templateIds } = parsed.data;

  // Check no existing active plan
  const existing = await getActivePlan();
  if (existing) {
    return { error: { formErrors: ["An active plan already exists"], fieldErrors: {} } };
  }

  const today = getTodayDate();
  const periodKey = getISOWeekKey(today);

  // Create plan
  const plan = await createPlan({ periodType, periodKey, description });

  // Link templates
  await createManyPlanTemplates(plan.id, templateIds);

  // Generate initial tasks
  await generateTasksForPlan(plan.id, plan.periodKey, templateIds, today);

  // Mark sync as done — prevents redundant sync on first page load
  await updateLastSyncDate(plan.id, today);

  revalidatePath("/kanban");
  return { data: plan };
}

export async function updatePlanAction(planId: string, input: unknown) {
  const parsed = updatePlanSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const { description, templateIds } = parsed.data;

  // Update description if provided
  if (description !== undefined) {
    await updatePlan(planId, { description });
  }

  // Rebuild template links if templateIds changed
  if (templateIds) {
    await deletePlanTemplatesByPlanId(planId);
    await createManyPlanTemplates(planId, templateIds);

    // Regenerate tasks for new template set
    const today = getTodayDate();
    const periodKey = getISOWeekKey(today);
    await generateTasksForPlan(planId, periodKey, templateIds, today);

    // Mark sync as done — prevents redundant sync on next page load
    await updateLastSyncDate(planId, today);
  }

  revalidatePath("/kanban");
  return { data: { success: true } };
}

async function generateTasksForPlan(
  planId: string,
  periodKey: string,
  templateIds: string[],
  today: Date
) {
  const taskData: Parameters<typeof createManyTasks>[0] = [];

  for (const templateId of templateIds) {
    const template = await getTaskTemplateById(templateId);
    if (!template) continue;

    switch (template.type) {
      case TaskType.WEEKLY:
        for (let i = 0; i < template.frequency; i++) {
          taskData.push({
            planId,
            templateId,
            title: template.title,
            description: template.description,
            points: template.points,
            status: TaskStatus.TODO,
            periodKey,
            instanceIndex: i,
          });
        }
        break;
      case TaskType.DAILY:
        for (let i = 0; i < template.frequency; i++) {
          taskData.push({
            planId,
            templateId,
            title: template.title,
            description: template.description,
            points: template.points,
            status: TaskStatus.TODO,
            forDate: today,
            instanceIndex: i,
          });
        }
        break;
    }
  }

  if (taskData.length > 0) {
    await createManyTasks(taskData);
  }
}
