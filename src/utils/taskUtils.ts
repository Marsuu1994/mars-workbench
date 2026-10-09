import type {TaskItem} from '@/lib/db/tasks';
import {PlanMode, TaskStatus, TaskType as TaskTypeEnum} from '@/utils/enums';
import {getMondayFromPeriodKey, normalizeForDate} from '@/utils/dateUtils';

// ─── Kind ──────────────────────────────────────────────────────────────────

/**
 * The three kinds of work a card can be. Derived from TaskType — there is no
 * kind column: habit = DAILY / WEEKLY, project step = PROJECT, one-off =
 * AD_HOC.
 */
export const TaskKind = {
  HABIT: 'HABIT',
  PROJECT: 'PROJECT',
  ONE_OFF: 'ONE_OFF',
} as const;
export type TaskKind = (typeof TaskKind)[keyof typeof TaskKind];

// Record over every TaskType, so a new type fails the build until it's mapped.
const KIND_BY_TYPE: Record<TaskTypeEnum, TaskKind> = {
  [TaskTypeEnum.DAILY]: TaskKind.HABIT,
  [TaskTypeEnum.WEEKLY]: TaskKind.HABIT,
  [TaskTypeEnum.AD_HOC]: TaskKind.ONE_OFF,
  [TaskTypeEnum.PROJECT]: TaskKind.PROJECT,
};

export function getTaskKind(type: TaskTypeEnum): TaskKind {
  return KIND_BY_TYPE[type];
}

// ─── Habit week ────────────────────────────────────────────────────────────

/** A plan line: how a template runs this week (type × frequency). */
export interface PlanLine {
  templateId: string;
  type: TaskTypeEnum;
  frequency: number;
}

/**
 * The plan as the board reads it: its week, its lines (habit card context)
 * and its mode (the generating days of daily lines).
 */
export interface BoardPlan {
  periodKey: string;
  mode: PlanMode;
  planTemplates: PlanLine[];
}

/** A habit card's context and signal: its plan line plus this week's dots. */
export interface HabitWeek {
  type: TaskTypeEnum;
  frequency: number;
  /**
   * One mark per instance the line generates this week, in order — weekly:
   * by instance; daily: by day, then instance. True when that instance is done.
   */
  slots: boolean[];
  /** Each loaded instance's slot, by task id — a card's own mark */
  slotByTaskId: Map<string, number>;
  /** Done slots */
  done: number;
  /** All slots */
  target: number;
}

const DAY_MS = 86_400_000;

/**
 * Per-template habit slots for the week, computed from the tasks the board
 * already loaded (no extra query). A weekly line has one slot per instance;
 * a daily line has `frequency` slots on every generating day — weekdays in
 * NORMAL mode, every day in EXTREME — so its slots cover the whole week even
 * when the plan started mid-week. A slot fills when its instance is DONE
 * (DONE instances stay on the plan); missed days expired, so theirs stay empty.
 */
export function computeHabitWeeks(
  tasks: TaskItem[],
  {periodKey, planTemplates, mode}: BoardPlan,
): Map<string, HabitWeek> {
  const tasksByTemplate = new Map<string, TaskItem[]>();
  for (const task of tasks) {
    if (!task.templateId) continue;
    const templateTasks = tasksByTemplate.get(task.templateId) ?? [];
    templateTasks.push(task);
    tasksByTemplate.set(task.templateId, templateTasks);
  }

  const weekStart = getMondayFromPeriodKey(periodKey).getTime();
  const generatingDays = mode === PlanMode.EXTREME ? 7 : 5;

  // A daily instance's slot: its day in the week, then its instance that day.
  // Instances outside the line's days (a mode switch, a frequency cut) get none.
  const getDailySlot = (task: TaskItem, frequency: number): number | null => {
    if (task.forDate === null || task.instanceIndex >= frequency) return null;
    const dayOffset = Math.round(
      (normalizeForDate(task.forDate).getTime() - weekStart) / DAY_MS,
    );
    if (dayOffset < 0 || dayOffset >= generatingDays) return null;
    return dayOffset * frequency + task.instanceIndex;
  };

  const habitWeeks = new Map<string, HabitWeek>();
  for (const {templateId, type, frequency} of planTemplates) {
    const templateTasks = tasksByTemplate.get(templateId) ?? [];
    const slotByTaskId = new Map<string, number>();
    let slotCount: number;

    if (type === TaskTypeEnum.DAILY) {
      slotCount = frequency * generatingDays;
      for (const task of templateTasks) {
        const slot = getDailySlot(task, frequency);
        if (slot !== null) slotByTaskId.set(task.id, slot);
      }
    } else {
      // A frequency cut mid-week keeps its DONE instances (and their numbers),
      // so the slots stretch to the highest instance still on the plan.
      slotCount = Math.max(
        frequency,
        ...templateTasks.map(task => task.instanceIndex + 1),
      );
      for (const task of templateTasks) {
        slotByTaskId.set(task.id, task.instanceIndex);
      }
    }

    const slots: boolean[] = Array.from({length: slotCount}, () => false);
    for (const task of templateTasks) {
      const slot = slotByTaskId.get(task.id);
      if (slot !== undefined && task.status === TaskStatus.DONE) {
        slots[slot] = true;
      }
    }

    habitWeeks.set(templateId, {
      type,
      frequency,
      slots,
      slotByTaskId,
      done: slots.filter(Boolean).length,
      target: slotCount,
    });
  }
  return habitWeeks;
}

// ─── Sorting ───────────────────────────────────────────────────────────────

/**
 * Sort tasks within a column: daily tasks first, then everything else.
 * Within each priority group, a group — the instances of one template, or the
 * steps of one project — stays contiguous (ranked by the group's earliest
 * createdAt) and is ordered by instanceIndex (copy number / step number), so
 * e.g. leetcode #1, leetcode #2, workout #1, workout #2 — not interleaved.
 * Final tiebreakers: createdAt ascending, then id.
 */
export function sortTasks(tasks: TaskItem[]): TaskItem[] {
  // A task's group: its template, or its project for a project step.
  const groupKey = (t: TaskItem): string | null => t.templateId ?? t.projectId;

  // Earliest createdAt per group — the group's sort rank, so all of a group's
  // tasks sort together regardless of per-task createdAt.
  const groupCreatedRank = new Map<string, number>();
  for (const t of tasks) {
    const key = groupKey(t);
    if (!key) continue;
    const created = new Date(t.createdAt).getTime();
    const existing = groupCreatedRank.get(key);
    if (existing === undefined || created < existing) {
      groupCreatedRank.set(key, created);
    }
  }

  const priority = (t: TaskItem): number =>
    t.type === TaskTypeEnum.DAILY ? 0 : 1;

  // Grouped tasks rank by their group's earliest createdAt; ad-hoc tasks
  // (no group) rank by their own createdAt.
  const groupRank = (t: TaskItem): number => {
    const key = groupKey(t);
    return key
      ? (groupCreatedRank.get(key) ?? 0)
      : new Date(t.createdAt).getTime();
  };

  return [...tasks].sort((a, b) => {
    const pa = priority(a);
    const pb = priority(b);
    if (pa !== pb) return pa - pb;

    const ga = groupRank(a);
    const gb = groupRank(b);
    if (ga !== gb) return ga - gb;

    // Keep groups contiguous even when ranks tie (batch-generated instances
    // can share a createdAt), then order by instance index within.
    const ka = groupKey(a) ?? '';
    const kb = groupKey(b) ?? '';
    if (ka !== kb) return ka.localeCompare(kb);
    if (a.instanceIndex !== b.instanceIndex) {
      return a.instanceIndex - b.instanceIndex;
    }

    const byCreatedAt =
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (byCreatedAt !== 0) return byCreatedAt;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Statuses rendered in the UI (excludes EXPIRED). BACKLOG is shown in the
 * backlog; TODO/DONE are the board columns.
 */
type BoardStatus =
  typeof TaskStatus.BACKLOG | typeof TaskStatus.TODO | typeof TaskStatus.DONE;

/**
 * Group tasks by status and sort each group.
 * Used by KanbanBoard for both initial render and optimistic state updates.
 */
export function groupAndSortTasks(
  tasks: TaskItem[],
): Record<BoardStatus, TaskItem[]> {
  const grouped: Record<BoardStatus, TaskItem[]> = {
    [TaskStatus.BACKLOG]: [],
    [TaskStatus.TODO]: [],
    [TaskStatus.DONE]: [],
  };

  for (const task of tasks) {
    const bucket = grouped[task.status as BoardStatus];
    if (bucket) {
      bucket.push(task);
    }
  }

  return {
    [TaskStatus.BACKLOG]: sortTasks(grouped[TaskStatus.BACKLOG]),
    [TaskStatus.TODO]: sortTasks(grouped[TaskStatus.TODO]),
    [TaskStatus.DONE]: sortTasks(grouped[TaskStatus.DONE]),
  } as Record<BoardStatus, TaskItem[]>;
}
