import type {TaskItem} from '@/lib/db/tasks';
import {PlanMode, TaskStatus, TaskType as TaskTypeEnum} from '@/utils/enums';
import {normalizeForDate} from '@/utils/dateUtils';

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

/** A habit card's context and signal: its plan line plus this week's dots. */
export interface HabitWeek {
  type: TaskTypeEnum;
  frequency: number;
  /** Instances done this week */
  done: number;
  /** Instances the plan line generates this week */
  target: number;
}

/**
 * Per-template habit progress for the week, computed from the tasks the board
 * already loaded (no extra query). Weekly lines generate `frequency` instances;
 * daily lines repeat on every generating day — weekdays in NORMAL mode, every
 * day in EXTREME — so the target counts the whole week even when the plan
 * started mid-week. DONE instances stay on the plan, so `done` is exact.
 */
export function computeHabitWeeks(
  tasks: TaskItem[],
  planLines: PlanLine[],
  mode: PlanMode,
): Map<string, HabitWeek> {
  const doneByTemplate = new Map<string, number>();
  for (const task of tasks) {
    if (!task.templateId || task.status !== TaskStatus.DONE) continue;
    doneByTemplate.set(
      task.templateId,
      (doneByTemplate.get(task.templateId) ?? 0) + 1,
    );
  }

  const generatingDays = mode === PlanMode.EXTREME ? 7 : 5;
  const habitWeeks = new Map<string, HabitWeek>();
  for (const {templateId, type, frequency} of planLines) {
    const done = doneByTemplate.get(templateId) ?? 0;
    const lineTarget =
      type === TaskTypeEnum.DAILY ? frequency * generatingDays : frequency;
    // A frequency cut mid-week keeps its DONE instances — never show 4/3.
    habitWeeks.set(templateId, {
      type,
      frequency,
      done,
      target: Math.max(lineTarget, done),
    });
  }
  return habitWeeks;
}

/**
 * A daily task is "rollover" when it was scheduled for a past day and is not yet
 * done. Shared by the board card and the mobile backlog card so the ↩ date
 * renders identically in both.
 */
export function isRolloverTask(task: TaskItem, today: Date): boolean {
  return (
    task.status !== TaskStatus.DONE &&
    task.type === TaskTypeEnum.DAILY &&
    task.forDate !== null &&
    normalizeForDate(task.forDate) < today
  );
}

// ─── Sorting ───────────────────────────────────────────────────────────────

/**
 * Sort tasks within a column:
 * 1. Today's daily tasks (forDate >= today)
 * 2. Rollover daily tasks (forDate < today)
 * 3. Weekly / AD_HOC
 * Within each priority group, a group — the instances of one template, or the
 * steps of one project — stays contiguous (ranked by the group's earliest
 * createdAt) and is ordered by instanceIndex (copy number / step number), so
 * e.g. leetcode #1, leetcode #2, workout #1, workout #2 — not interleaved.
 * Final tiebreakers: createdAt ascending, then id.
 */
export function sortTasks(tasks: TaskItem[], today: Date): TaskItem[] {
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

  const priority = (t: TaskItem): number => {
    if (t.type !== TaskTypeEnum.DAILY) return 2;
    if (t.forDate !== null && normalizeForDate(t.forDate) < today) return 1; // rollover
    return 0; // fresh daily
  };

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
  today: Date,
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
    [TaskStatus.BACKLOG]: sortTasks(grouped[TaskStatus.BACKLOG], today),
    [TaskStatus.TODO]: sortTasks(grouped[TaskStatus.TODO], today),
    [TaskStatus.DONE]: sortTasks(grouped[TaskStatus.DONE], today),
  } as Record<BoardStatus, TaskItem[]>;
}
