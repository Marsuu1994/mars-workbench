import prisma from "@/lib/prisma";
import { Prisma, TaskSize, TaskStatus, TaskType } from "@/generated/prisma/client";

export type TaskItem = {
  id: string;
  planId: string | null;
  templateId: string | null;
  type: TaskType;
  title: string;
  description: string | null;
  size: TaskSize;
  points: number;
  status: TaskStatus;
  forDate: Date | null;
  periodKey: string | null;
  instanceIndex: number;
  createdAt: Date;
  updatedAt: Date;
  doneAt: Date | null;
};

export type BoardMetrics = {
  todayDoneCount: number;
  todayDonePoints: number;
  weekDoneCount: number;
  weekDonePoints: number;
  dailyPastCount: number;
  dailyPastPoints: number;
  weeklyCount: number;
  weeklyPoints: number;
  adhocCount: number;
  adhocPoints: number;
};

const taskSelect = {
  id: true,
  planId: true,
  templateId: true,
  type: true,
  title: true,
  description: true,
  size: true,
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
 * Get all of a user's tasks for a plan ordered by creation time
 */
export async function getTasksByPlanId(userId: string, planId: string): Promise<TaskItem[]> {
  return prisma.task.findMany({
    where: { userId, planId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: taskSelect,
  });
}

/**
 * Get all board-visible tasks for a user's plan (excludes EXPIRED)
 */
export async function getBoardTasksByPlanId(userId: string, planId: string): Promise<TaskItem[]> {
  return prisma.task.findMany({
    where: {
      userId,
      planId,
      status: { not: TaskStatus.EXPIRED },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: taskSelect,
  });
}

const EMPTY_BOARD_METRICS: BoardMetrics = {
  todayDoneCount: 0,
  todayDonePoints: 0,
  weekDoneCount: 0,
  weekDonePoints: 0,
  dailyPastCount: 0,
  dailyPastPoints: 0,
  weeklyCount: 0,
  weeklyPoints: 0,
  adhocCount: 0,
  adhocPoints: 0,
};

type BoardMetricsRow = {
  todayDoneCount: unknown;
  todayDonePoints: unknown;
  weekDoneCount: unknown;
  weekDonePoints: unknown;
  dailyPastCount: unknown;
  dailyPastPoints: unknown;
  weeklyCount: unknown;
  weeklyPoints: unknown;
  adhocCount: unknown;
  adhocPoints: unknown;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);
  return 0;
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Fetch all board-level metrics in one aggregate query for a plan.
 */
export async function getBoardMetricsByPlanId(
  userId: string,
  planId: string,
  todayStart: Date,
  tomorrowStart: Date
): Promise<BoardMetrics> {
  const todayDateKey = toLocalDateKey(todayStart);

  const rows = await prisma.$queryRaw<BoardMetricsRow[]>`
    SELECT
      COUNT(*) FILTER (
        WHERE status = 'DONE'
          AND done_at >= ${todayStart}
          AND done_at < ${tomorrowStart}
      ) AS "todayDoneCount",
      COALESCE(SUM(points) FILTER (
        WHERE status = 'DONE'
          AND done_at >= ${todayStart}
          AND done_at < ${tomorrowStart}
      ), 0) AS "todayDonePoints",
      COUNT(*) FILTER (WHERE status = 'DONE') AS "weekDoneCount",
      COALESCE(SUM(points) FILTER (WHERE status = 'DONE'), 0) AS "weekDonePoints",
      COUNT(*) FILTER (WHERE for_date < ${todayDateKey}::date) AS "dailyPastCount",
      COALESCE(SUM(points) FILTER (WHERE for_date < ${todayDateKey}::date), 0) AS "dailyPastPoints",
      COUNT(*) FILTER (WHERE type = 'WEEKLY') AS "weeklyCount",
      COALESCE(SUM(points) FILTER (WHERE type = 'WEEKLY'), 0) AS "weeklyPoints",
      COUNT(*) FILTER (WHERE type = 'AD_HOC') AS "adhocCount",
      COALESCE(SUM(points) FILTER (WHERE type = 'AD_HOC'), 0) AS "adhocPoints"
    FROM tasks
    WHERE plan_id = ${planId}::uuid
      AND user_id = ${userId}::uuid
  `;

  const row = rows[0];
  if (!row) return EMPTY_BOARD_METRICS;

  return {
    todayDoneCount: toNumber(row.todayDoneCount),
    todayDonePoints: toNumber(row.todayDonePoints),
    weekDoneCount: toNumber(row.weekDoneCount),
    weekDonePoints: toNumber(row.weekDonePoints),
    dailyPastCount: toNumber(row.dailyPastCount),
    dailyPastPoints: toNumber(row.dailyPastPoints),
    weeklyCount: toNumber(row.weeklyCount),
    weeklyPoints: toNumber(row.weeklyPoints),
    adhocCount: toNumber(row.adhocCount),
    adhocPoints: toNumber(row.adhocPoints),
  };
}

/**
 * Get tasks for a plan filtered by statuses
 */
export async function getTasksByPlanIdAndStatus(
  userId: string,
  planId: string,
  statuses: TaskStatus[]
): Promise<TaskItem[]> {
  return prisma.task.findMany({
    where: { userId, planId, status: { in: statuses } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: taskSelect,
  });
}

/**
 * Create a single task instance
 */
export async function createTask(
  userId: string,
  data: {
    planId: string;
    templateId?: string;
    type: TaskType;
    title: string;
    description?: string;
    size: TaskSize;
    points: number;
    status: TaskStatus;
    forDate?: Date;
    periodKey?: string;
    instanceIndex: number;
  }
): Promise<TaskItem> {
  return prisma.task.create({
    data: { ...data, userId },
    select: taskSelect,
  });
}

/**
 * Bulk create task instances with skipDuplicates for idempotency
 */
export async function createManyTasks(
  data: {
    userId: string;
    planId: string;
    templateId?: string;
    type: TaskType;
    title: string;
    description?: string;
    size: TaskSize;
    points: number;
    status: TaskStatus;
    forDate?: Date;
    periodKey?: string;
    instanceIndex: number;
  }[],
  tx?: Prisma.TransactionClient
): Promise<{ count: number }> {
  const db = tx ?? prisma;
  return db.task.createMany({
    data,
    skipDuplicates: true,
  });
}

/**
 * Update a task's status, scoped to the owner; automatically sets doneAt when
 * moving to DONE. Uses updateManyAndReturn (UPDATE ... WHERE ... RETURNING) so
 * ownership is enforced and the updated row is returned in a single round trip.
 * Returns null when the task does not exist or is not owned by the user.
 */
export async function updateTaskStatus(
  userId: string,
  taskId: string,
  status: TaskStatus
): Promise<TaskItem | null> {
  const [task] = await prisma.task.updateManyAndReturn({
    where: { id: taskId, userId },
    data: {
      status,
      doneAt: status === "DONE" ? new Date() : null,
    },
    select: taskSelect,
  });
  return task ?? null;
}

/**
 * Expire stale daily tasks: set status to EXPIRED for tasks
 * whose forDate is before the cutoff date and are not DONE.
 * Caller passes yesterday to implement the 1-day rollover buffer.
 */
export async function expireStaleDailyTasks(
  userId: string,
  planId: string,
  cutoffDate: Date,
  tx?: Prisma.TransactionClient
): Promise<{ count: number }> {
  const db = tx ?? prisma;
  return db.task.updateMany({
    where: {
      userId,
      planId,
      forDate: { lt: cutoffDate },
      status: { not: "DONE" },
    },
    data: { status: "EXPIRED" },
  });
}

/**
 * Expire all non-done, non-ad-hoc tasks for a plan (end-of-period cleanup)
 */
export async function expireAllNonDoneTasks(
  userId: string,
  planId: string,
  tx?: Prisma.TransactionClient
): Promise<{ count: number }> {
  const db = tx ?? prisma;
  return db.task.updateMany({
    where: {
      userId,
      planId,
      status: { not: "DONE" },
      type: { not: TaskType.AD_HOC },
    },
    data: { status: "EXPIRED" },
  });
}

/**
 * Get daily tasks for a specific date (idempotency check)
 */
export async function getDailyTasksForDate(
  userId: string,
  planId: string,
  templateId: string,
  forDate: Date
): Promise<TaskItem[]> {
  return prisma.task.findMany({
    where: { userId, planId, templateId, forDate },
    select: taskSelect,
  });
}

/**
 * Check if a task exists and is owned by the user
 */
export async function taskExists(userId: string, taskId: string): Promise<boolean> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { id: true },
  });
  return task !== null;
}

/**
 * Delete incomplete tasks (TODO, DOING) for specific templates in a plan
 */
export async function deleteIncompleteTasksByTemplateIds(
  userId: string,
  planId: string,
  templateIds: string[],
  tx?: Prisma.TransactionClient
): Promise<{ count: number }> {
  const db = tx ?? prisma;
  return db.task.deleteMany({
    where: {
      userId,
      planId,
      templateId: { in: templateIds },
      status: { in: ["TODO", "DOING"] },
    },
  });
}

/**
 * Count incomplete (removable) tasks for specific templates (total)
 */
export async function countTasksByTemplateIds(
  userId: string,
  planId: string,
  templateIds: string[]
): Promise<{ removeCount: number }> {
  const removeCount = await prisma.task.count({
    where: {
      userId,
      planId,
      templateId: { in: templateIds },
      status: { in: ["TODO", "DOING"] },
    },
  });
  return { removeCount };
}

/**
 * Count incomplete tasks grouped by templateId.
 * Returns a Map from templateId → count of TODO/DOING tasks.
 */
export async function countIncompleteTasksByTemplateId(
  userId: string,
  planId: string,
  templateIds: string[]
): Promise<Map<string, number>> {
  if (templateIds.length === 0) return new Map();
  const counts = await prisma.task.groupBy({
    by: ["templateId"],
    where: {
      userId,
      planId,
      templateId: { in: templateIds },
      status: { in: ["TODO", "DOING"] },
    },
    _count: true,
  });
  return new Map(
    counts.map((c) => [c.templateId!, c._count])
  );
}

/**
 * Get all of a user's non-DONE AD_HOC tasks (any planId, including unlinked
 * ones with planId = null). Filter in-memory for plan-specific needs.
 */
export async function getNonDoneAdhocTasks(userId: string): Promise<TaskItem[]> {
  return prisma.task.findMany({
    where: { userId, type: TaskType.AD_HOC, status: { not: TaskStatus.DONE } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: taskSelect,
  });
}

/**
 * Batch update planId for specified tasks (link ad-hoc tasks to a plan).
 * Scoped to the owner so foreign task ids are silently ignored.
 */
export async function updateTasksPlanId(
  userId: string,
  taskIds: string[],
  planId: string,
  tx?: Prisma.TransactionClient
): Promise<{ count: number }> {
  if (taskIds.length === 0) return { count: 0 };
  const db = tx ?? prisma;
  return db.task.updateMany({
    where: { userId, id: { in: taskIds } },
    data: { planId },
  });
}

/**
 * Unlink ad-hoc tasks from a plan: set planId = null for AD_HOC tasks
 * on the given plan whose id is NOT in keepIds.
 */
export async function unlinkAdhocTasksFromPlan(
  userId: string,
  planId: string,
  keepIds: string[],
  tx?: Prisma.TransactionClient
): Promise<{ count: number }> {
  const db = tx ?? prisma;
  return db.task.updateMany({
    where: {
      userId,
      planId,
      type: TaskType.AD_HOC,
      id: { notIn: keepIds },
    },
    data: { planId: null },
  });
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
