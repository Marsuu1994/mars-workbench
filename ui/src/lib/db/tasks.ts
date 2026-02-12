import prisma from "@/lib/prisma";
import { TaskStatus } from "@/generated/prisma/client";

export type TaskItem = {
  id: string;
  planId: string;
  templateId: string;
  title: string;
  description: string | null;
  points: number;
  status: TaskStatus;
  forDate: Date | null;
  periodKey: string | null;
  instanceIndex: number;
  createdAt: Date;
  updatedAt: Date;
  doneAt: Date | null;
};

const taskSelect = {
  id: true,
  planId: true,
  templateId: true,
  title: true,
  description: true,
  points: true,
  status: true,
  forDate: true,
  periodKey: true,
  instanceIndex: true,
  createdAt: true,
  updatedAt: true,
  doneAt: true,
} as const;

/**
 * Get all tasks for a plan ordered by creation time
 */
export async function getTasksByPlanId(planId: string): Promise<TaskItem[]> {
  return prisma.task.findMany({
    where: { planId },
    orderBy: { createdAt: "asc" },
    select: taskSelect,
  });
}

/**
 * Get tasks for a plan filtered by statuses
 */
export async function getTasksByPlanIdAndStatus(
  planId: string,
  statuses: TaskStatus[]
): Promise<TaskItem[]> {
  return prisma.task.findMany({
    where: { planId, status: { in: statuses } },
    orderBy: { createdAt: "asc" },
    select: taskSelect,
  });
}

/**
 * Create a single task instance
 */
export async function createTask(data: {
  planId: string;
  templateId: string;
  title: string;
  description?: string;
  points: number;
  status: TaskStatus;
  forDate?: Date;
  periodKey?: string;
  instanceIndex: number;
}): Promise<TaskItem> {
  return prisma.task.create({
    data,
    select: taskSelect,
  });
}

/**
 * Bulk create task instances with skipDuplicates for idempotency
 */
export async function createManyTasks(
  data: {
    planId: string;
    templateId: string;
    title: string;
    description?: string;
    points: number;
    status: TaskStatus;
    forDate?: Date;
    periodKey?: string;
    instanceIndex: number;
  }[]
): Promise<{ count: number }> {
  return prisma.task.createMany({
    data,
    skipDuplicates: true,
  });
}

/**
 * Update a task's status; automatically sets doneAt when moving to DONE
 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<TaskItem> {
  return prisma.task.update({
    where: { id: taskId },
    data: {
      status,
      doneAt: status === "DONE" ? new Date() : null,
    },
    select: taskSelect,
  });
}

/**
 * Expire stale daily tasks: set status to EXPIRED for tasks
 * whose forDate is before today and are not DONE
 */
export async function expireStaleDailyTasks(
  planId: string,
  today: Date
): Promise<{ count: number }> {
  return prisma.task.updateMany({
    where: {
      planId,
      forDate: { lt: today },
      status: { not: "DONE" },
    },
    data: { status: "EXPIRED" },
  });
}

/**
 * Expire all non-done tasks for a plan (end-of-period cleanup)
 */
export async function expireAllNonDoneTasks(
  planId: string
): Promise<{ count: number }> {
  return prisma.task.updateMany({
    where: {
      planId,
      status: { not: "DONE" },
    },
    data: { status: "EXPIRED" },
  });
}

/**
 * Get daily tasks for a specific date (idempotency check)
 */
export async function getDailyTasksForDate(
  planId: string,
  templateId: string,
  forDate: Date
): Promise<TaskItem[]> {
  return prisma.task.findMany({
    where: { planId, templateId, forDate },
    select: taskSelect,
  });
}

/**
 * Check if a task exists
 */
export async function taskExists(taskId: string): Promise<boolean> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true },
  });
  return task !== null;
}

/**
 * Valid task statuses for validation
 */
export const VALID_TASK_STATUSES: TaskStatus[] = ["TODO", "DOING", "DONE", "EXPIRED"];

/**
 * Check if a status string is a valid TaskStatus
 */
export function isValidTaskStatus(status: string): status is TaskStatus {
  return VALID_TASK_STATUSES.includes(status as TaskStatus);
}
