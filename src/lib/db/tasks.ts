import {prisma} from '@/lib/prisma';
import {updateOrNull} from '@/lib/db/updateOrNull';
import {
  Prisma,
  PriorityQuadrant,
  TaskSize,
  TaskStatus,
  TaskType,
} from '@/generated/prisma/client';

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
  quadrant: PriorityQuadrant | null;
  instanceIndex: number;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
  doneAt: Date | null;
};

/**
 * The task types that never expire and carry over between plans: one-offs
 * (returned to the priority matrix when not carried) and project steps
 * (returned to their project at the same place).
 */
export type CarryOverTaskType =
  typeof TaskType.AD_HOC | typeof TaskType.PROJECT;

export const taskSelect = {
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
  quadrant: true,
  instanceIndex: true,
  projectId: true,
  createdAt: true,
  updatedAt: true,
  doneAt: true,
} as const;

/**
 * Get all board-visible tasks for a user's plan (excludes EXPIRED)
 */
export async function getBoardTasksByPlanId(
  userId: string,
  planId: string,
): Promise<TaskItem[]> {
  return prisma.task.findMany({
    where: {
      userId,
      planId,
      status: {not: TaskStatus.EXPIRED},
    },
    orderBy: [{createdAt: 'asc'}, {id: 'asc'}],
    select: taskSelect,
  });
}

/**
 * How many daily habit tasks expired undone on each day of a plan, by the
 * day as "YYYY-MM-DD". The daily sync expires a day's tasks once it has
 * passed, so only past days have any.
 */
export async function getExpiredDailyCountsByPlanId(
  userId: string,
  planId: string,
): Promise<Record<string, number>> {
  const grouped = await prisma.task.groupBy({
    by: ['forDate'],
    where: {
      userId,
      planId,
      type: TaskType.DAILY,
      status: TaskStatus.EXPIRED,
      forDate: {not: null},
    },
    _count: {_all: true},
  });
  // A DATE column comes back at UTC midnight
  return Object.fromEntries(
    grouped.flatMap(({forDate, _count}) =>
      forDate ? [[forDate.toISOString().slice(0, 10), _count._all]] : [],
    ),
  );
}

/** A new matrix task's own fields; the rest of its row is the same for all. */
export type MatrixTaskRow = {
  title: string;
  description?: string;
  size: TaskSize;
  points: number;
  quadrant: PriorityQuadrant;
};

/**
 * Add one-offs to the priority matrix in one INSERT: AD_HOC, on no plan
 * (planId = null), BACKLOG. Each row's createdAt is a millisecond after the
 * last, so the matrix (ordered by createdAt) lists them in the order given.
 */
export async function createMatrixTasks(
  userId: string,
  rows: MatrixTaskRow[],
): Promise<TaskItem[]> {
  if (rows.length === 0) return [];
  const createdAtMs = Date.now();
  const createdTasks = await prisma.task.createManyAndReturn({
    data: rows.map((row, index) => ({
      ...row,
      userId,
      planId: null,
      type: TaskType.AD_HOC,
      status: TaskStatus.BACKLOG,
      instanceIndex: 1,
      createdAt: new Date(createdAtMs + index),
    })),
    select: taskSelect,
  });
  return createdTasks.sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
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
  tx?: Prisma.TransactionClient,
): Promise<{count: number}> {
  const db = tx ?? prisma;
  return db.task.createMany({
    data,
    skipDuplicates: true,
  });
}

export type BoardMoveStatus = typeof TaskStatus.TODO | typeof TaskStatus.DONE;

// Board moves are forward-only: a backlog card is pulled into Todo, or
// finished from the backlog or Todo; nothing leaves Done, so done points
// are append-only. Only a card on a plan moves: a one-off still on the
// matrix (planId = null) reaches the board through Track This Week.
const BOARD_MOVE_SOURCES: Record<BoardMoveStatus, TaskStatus[]> = {
  [TaskStatus.TODO]: [TaskStatus.BACKLOG],
  [TaskStatus.DONE]: [TaskStatus.BACKLOG, TaskStatus.TODO],
};

/**
 * Move a task on the board, scoped to the owner, to a task on a plan and to
 * the forward-only moves; sets doneAt when moving to DONE. Returns null when
 * the task does not exist, is not owned by the user, or can't make that move.
 */
export async function updateTaskStatus(
  userId: string,
  taskId: string,
  status: BoardMoveStatus,
): Promise<TaskItem | null> {
  return updateOrNull(
    prisma.task.update({
      where: {
        id: taskId,
        userId,
        planId: {not: null},
        status: {in: BOARD_MOVE_SOURCES[status]},
      },
      data: {
        status,
        doneAt: status === TaskStatus.DONE ? new Date() : null,
      },
      select: taskSelect,
    }),
  );
}

/**
 * Reprioritize: move owned AD_HOC tasks to an Eisenhower quadrant. Returns the
 * tasks moved; ids that aren't the user's unfinished one-offs are skipped.
 */
export async function updateAdhocTaskQuadrants(
  userId: string,
  taskIds: string[],
  quadrant: PriorityQuadrant,
  tx?: Prisma.TransactionClient,
): Promise<TaskItem[]> {
  if (taskIds.length === 0) return [];
  const db = tx ?? prisma;
  return db.task.updateManyAndReturn({
    where: {
      id: {in: taskIds},
      userId,
      type: TaskType.AD_HOC,
      status: {not: TaskStatus.DONE},
    },
    data: {quadrant},
    select: taskSelect,
  });
}

/**
 * Track This Week: attach unassigned matrix tasks to a plan, crossing the
 * BACKLOG → board boundary in a single write (planId + status together).
 * The WHERE requires planId = null and status = BACKLOG, so already-tracked
 * tasks (and anything not on the matrix) are skipped instead of moving.
 * Returns the tasks tracked.
 */
export async function trackAdhocTasks(
  userId: string,
  taskIds: string[],
  planId: string,
  status: TaskStatus,
  tx?: Prisma.TransactionClient,
): Promise<TaskItem[]> {
  if (taskIds.length === 0) return [];
  const db = tx ?? prisma;
  return db.task.updateManyAndReturn({
    where: {
      id: {in: taskIds},
      userId,
      type: TaskType.AD_HOC,
      planId: null,
      status: TaskStatus.BACKLOG,
    },
    data: {planId, status},
    select: taskSelect,
  });
}

/**
 * Complete one-offs in place: DONE + doneAt, and — when an active plan is
 * given — attach the unassigned ones to it, so each completion lands in the
 * board's Done column and its points count for the week. An existing planId
 * is never re-attributed: the linking write is scoped to planId = null, and
 * the rest (tracked tasks) get a status-only write. Returns the tasks
 * completed; ids that aren't the user's unfinished one-offs are skipped.
 */
export async function completeAdhocTasks(
  userId: string,
  taskIds: string[],
  activePlanId: string | null,
  tx?: Prisma.TransactionClient,
): Promise<TaskItem[]> {
  if (taskIds.length === 0) return [];
  const db = tx ?? prisma;
  const where: Prisma.TaskWhereInput = {
    id: {in: taskIds},
    userId,
    type: TaskType.AD_HOC,
    status: {not: TaskStatus.DONE},
  };
  const data = {status: TaskStatus.DONE, doneAt: new Date()};

  const linkedTasks = activePlanId
    ? await db.task.updateManyAndReturn({
        where: {...where, planId: null},
        data: {...data, planId: activePlanId},
        select: taskSelect,
      })
    : [];
  const otherTasks = await db.task.updateManyAndReturn({
    where,
    data,
    select: taskSelect,
  });
  return [...linkedTasks, ...otherTasks];
}

/**
 * Undo a matrix completion: put a DONE AD_HOC task back to its pre-complete
 * status, clear doneAt, and drop the plan link only when the complete added
 * it (detach). Guarded on status = DONE so a stale undo can't touch a task
 * that already moved on. Returns null when nothing matched.
 */
export async function revertAdhocCompletion(
  userId: string,
  taskId: string,
  {status, detach}: {status: TaskStatus; detach: boolean},
): Promise<TaskItem | null> {
  return updateOrNull(
    prisma.task.update({
      where: {
        id: taskId,
        userId,
        type: TaskType.AD_HOC,
        status: TaskStatus.DONE,
      },
      data: {status, doneAt: null, ...(detach ? {planId: null} : {})},
      select: taskSelect,
    }),
  );
}

/**
 * Expire stale daily tasks: set status to EXPIRED for tasks
 * whose forDate is before the cutoff date and are not DONE.
 * The daily sync passes today: a missed day's tasks expire with the day.
 */
export async function expireStaleDailyTasks(
  userId: string,
  planId: string,
  cutoffDate: Date,
  tx?: Prisma.TransactionClient,
): Promise<{count: number}> {
  const db = tx ?? prisma;
  return db.task.updateMany({
    where: {
      userId,
      planId,
      forDate: {lt: cutoffDate},
      status: {not: 'DONE'},
    },
    data: {status: 'EXPIRED'},
  });
}

/**
 * Expire all non-done template instances for a plan (end-of-period cleanup).
 * One-offs and project steps never expire: they stay on the plan until the
 * next plan carries them over or returns them.
 */
export async function expireAllNonDoneTasks(
  userId: string,
  planId: string,
  tx?: Prisma.TransactionClient,
): Promise<{count: number}> {
  const db = tx ?? prisma;
  return db.task.updateMany({
    where: {
      userId,
      planId,
      status: {not: 'DONE'},
      type: {notIn: [TaskType.AD_HOC, TaskType.PROJECT]},
    },
    data: {status: 'EXPIRED'},
  });
}

/**
 * Delete incomplete tasks (TODO, DOING) for specific templates in a plan
 */
export async function deleteIncompleteTasksByTemplateIds(
  userId: string,
  planId: string,
  templateIds: string[],
  tx?: Prisma.TransactionClient,
): Promise<{count: number}> {
  const db = tx ?? prisma;
  return db.task.deleteMany({
    where: {
      userId,
      planId,
      templateId: {in: templateIds},
      status: {in: ['BACKLOG', 'TODO', 'DOING']},
    },
  });
}

/**
 * Count incomplete tasks grouped by templateId.
 * Returns a Map from templateId → count of TODO/DOING tasks.
 */
export async function countIncompleteTasksByTemplateId(
  userId: string,
  planId: string,
  templateIds: string[],
): Promise<Map<string, number>> {
  if (templateIds.length === 0) return new Map();
  const counts = await prisma.task.groupBy({
    by: ['templateId'],
    where: {
      userId,
      planId,
      templateId: {in: templateIds},
      status: {in: ['BACKLOG', 'TODO', 'DOING']},
    },
    _count: true,
  });
  return new Map(counts.map(group => [group.templateId!, group._count]));
}

/**
 * Get all of a user's non-DONE AD_HOC tasks (any planId, including unlinked
 * ones with planId = null). Filter in-memory for plan-specific needs.
 */
export async function getNonDoneAdhocTasks(
  userId: string,
): Promise<TaskItem[]> {
  return prisma.task.findMany({
    where: {userId, type: TaskType.AD_HOC, status: {not: TaskStatus.DONE}},
    orderBy: [{createdAt: 'asc'}, {id: 'asc'}],
    select: taskSelect,
  });
}

/** A plan's AD_HOC tasks, done ones included, oldest first. */
export async function getAdhocTasksByPlanId(
  userId: string,
  planId: string,
): Promise<TaskItem[]> {
  return prisma.task.findMany({
    where: {userId, planId, type: TaskType.AD_HOC},
    orderBy: [{createdAt: 'asc'}, {id: 'asc'}],
    select: taskSelect,
  });
}

/**
 * Carry one-offs from one plan to the next, status kept. Only the user's
 * unfinished one-offs still on `fromPlanId` move; any other id is left where
 * it is — a one-off completed after the form loaded stays on its week.
 */
export async function carryOverOneOffs(
  userId: string,
  taskIds: string[],
  fromPlanId: string,
  toPlanId: string,
  tx?: Prisma.TransactionClient,
): Promise<{count: number}> {
  if (taskIds.length === 0) return {count: 0};
  const db = tx ?? prisma;
  return db.task.updateMany({
    where: {
      userId,
      id: {in: taskIds},
      type: TaskType.AD_HOC,
      status: {not: TaskStatus.DONE},
      planId: fromPlanId,
    },
    data: {planId: toPlanId},
  });
}

/**
 * Unlink one-offs or project steps from a plan: tasks of the given type on the
 * plan whose id is NOT in keepIds leave the week (planId = null, status =
 * BACKLOG — "not yet on the board"). A one-off goes back to the priority
 * matrix; a step goes back to its project with its instanceIndex (step number)
 * unchanged. DONE tasks are excluded: they stay on their plan so completed
 * points keep their historical attribution.
 */
export async function unlinkTasksFromPlan(
  userId: string,
  planId: string,
  type: CarryOverTaskType,
  keepIds: string[],
  tx?: Prisma.TransactionClient,
): Promise<{count: number}> {
  const db = tx ?? prisma;
  return db.task.updateMany({
    where: {
      userId,
      planId,
      type,
      status: {not: TaskStatus.DONE},
      id: {notIn: keepIds},
    },
    data: {planId: null, status: TaskStatus.BACKLOG},
  });
}

/**
 * Per-template performance aggregates for a plan: the MCP planning context's
 * per-template progress and the empty board's recap. Scoped to the owner +
 * plan, templateId NOT NULL (ad-hoc tasks excluded).
 */
/** A plan's tasks of every kind — done, and all of them — with the done ones' points. */
export type PlanTaskTotals = {
  doneCount: number;
  totalCount: number;
  donePoints: number;
};

export async function getPlanTaskTotals(
  userId: string,
  planId: string,
): Promise<PlanTaskTotals> {
  const grouped = await prisma.task.groupBy({
    by: ['status'],
    where: {userId, planId},
    _count: true,
    _sum: {points: true},
  });
  const done = grouped.find(row => row.status === TaskStatus.DONE);
  return {
    doneCount: done?._count ?? 0,
    totalCount: grouped.reduce((sum, row) => sum + row._count, 0),
    donePoints: done?._sum.points ?? 0,
  };
}

export type PlanTemplateStatRow = {
  templateId: string;
  type: TaskType;
  completed: number; // DONE count
  expired: number; // EXPIRED count
  total: number; // all statuses
  completionRate: number; // completed / total (0 when total is 0)
  pointsEarned: number; // SUM(points) where DONE
};

export async function getPlanTemplateStats(
  userId: string,
  planId: string,
): Promise<PlanTemplateStatRow[]> {
  const grouped = await prisma.task.groupBy({
    by: ['templateId', 'type', 'status'],
    where: {userId, planId, templateId: {not: null}},
    _count: true,
    _sum: {points: true},
  });

  const byTemplate = new Map<
    string,
    {
      type: TaskType;
      completed: number;
      expired: number;
      total: number;
      pointsEarned: number;
    }
  >();

  for (const row of grouped) {
    const templateId = row.templateId!;
    const entry = byTemplate.get(templateId) ?? {
      type: row.type,
      completed: 0,
      expired: 0,
      total: 0,
      pointsEarned: 0,
    };

    entry.total += row._count;
    switch (row.status) {
      case TaskStatus.DONE:
        entry.completed += row._count;
        entry.pointsEarned += row._sum.points ?? 0;
        break;
      case TaskStatus.EXPIRED:
        entry.expired += row._count;
        break;
      default:
        break;
    }

    byTemplate.set(templateId, entry);
  }

  return Array.from(byTemplate, ([templateId, stats]) => ({
    templateId,
    type: stats.type,
    completed: stats.completed,
    expired: stats.expired,
    total: stats.total,
    completionRate: stats.total > 0 ? stats.completed / stats.total : 0,
    pointsEarned: stats.pointsEarned,
  }));
}
