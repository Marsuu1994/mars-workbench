import type { TaskItem } from "@/lib/db/tasks";
import { TaskStatus, TaskType as TaskTypeEnum } from "./enums";
import { normalizeForDate } from "./dateUtils";

// ─── Risk Level ────────────────────────────────────────────────────────────

export type RiskLevel = "normal" | "warning" | "danger";

/**
 * Build a per-template progress map from all board tasks.
 * Used by computeRiskLevel to determine how many instances are done/doing
 * for weekly risk calculations.
 */
export function computeTemplateProgress(
  tasks: TaskItem[]
): Map<string, { done: number; doing: number }> {
  const map = new Map<string, { done: number; doing: number }>();
  for (const task of tasks) {
    if (!task.templateId) continue;
    const entry = map.get(task.templateId) ?? { done: 0, doing: 0 };
    if (task.status === TaskStatus.DONE) entry.done += 1;
    else if (task.status === TaskStatus.DOING) entry.doing += 1;
    map.set(task.templateId, entry);
  }
  return map;
}

/**
 * Compute the risk level for a single task. Call client-side so that
 * time-of-day thresholds (20:00 / 15:00) reflect the live clock.
 *
 * @param today       - today at midnight (local time)
 * @param currentHour - 0–23, from new Date().getHours()
 * @param daysElapsed - 1–7, from BoardData
 */
export function computeRiskLevel(
  task: TaskItem,
  today: Date,
  currentHour: number,
  daysElapsed: number,
  templateFreqMap: Map<string, number>,
  templateProgressMap: Map<string, { done: number; doing: number }>
): RiskLevel {
  // DONE, EXPIRED, and AD_HOC tasks never carry risk
  if (
    task.status === TaskStatus.DONE ||
    task.status === TaskStatus.EXPIRED ||
    task.type === TaskTypeEnum.AD_HOC
  ) {
    return "normal";
  }

  switch (task.type) {
    case TaskTypeEnum.DAILY: {
      const isRollover =
        task.forDate !== null && normalizeForDate(task.forDate) < today;

      if (isRollover) {
        if (task.status === TaskStatus.TODO) {
          return currentHour < 15 ? "warning" : "danger";
        }
        // DOING rollover → warning regardless of time; never danger
        return "warning";
      } else {
        // Fresh daily task (forDate = today)
        return currentHour >= 20 ? "warning" : "normal";
      }
    }

    case TaskTypeEnum.WEEKLY: {
      const progress = task.templateId
        ? (templateProgressMap.get(task.templateId) ?? { done: 0, doing: 0 })
        : { done: 0, doing: 0 };
      const frequency = task.templateId
        ? (templateFreqMap.get(task.templateId) ?? 1)
        : 1;
      const remainingTasks = frequency - progress.done - progress.doing;
      const remainingDays = 7 - daysElapsed;

      if (task.status === TaskStatus.TODO) {
        if (daysElapsed >= 5 || remainingDays < remainingTasks * 1) return "danger";
        if (daysElapsed >= 3 || remainingDays < remainingTasks * 2) return "warning";
        return "normal";
      }

      // DOING — never danger
      if (daysElapsed >= 5 || remainingDays < remainingTasks * 1) return "warning";
      return "normal";
    }

    default:
      return "normal";
  }
}

// ─── Sorting ───────────────────────────────────────────────────────────────

/**
 * Sort tasks within a column:
 * 1. Today's daily tasks (forDate >= today)
 * 2. Rollover daily tasks (forDate < today)
 * 3. Weekly / AD_HOC
 * Within each group: by createdAt ascending, then id as tiebreaker.
 */
export function sortTasks(tasks: TaskItem[], today: Date): TaskItem[] {
  return [...tasks].sort((a, b) => {
    const priority = (t: TaskItem): number => {
      if (t.type !== TaskTypeEnum.DAILY) return 2;
      if (t.forDate !== null && normalizeForDate(t.forDate) < today) return 1; // rollover
      return 0; // fresh daily
    };

    const pa = priority(a);
    const pb = priority(b);
    if (pa !== pb) return pa - pb;

    const byCreatedAt =
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (byCreatedAt !== 0) return byCreatedAt;
    return a.id.localeCompare(b.id);
  });
}

/** The three statuses shown as board columns (excludes EXPIRED). */
type BoardStatus =
  | typeof TaskStatus.TODO
  | typeof TaskStatus.DOING
  | typeof TaskStatus.DONE;

/**
 * Group tasks by status and sort each group.
 * Used by KanbanBoard for both initial render and optimistic state updates.
 */
export function groupAndSortTasks(
  tasks: TaskItem[],
  today: Date
): Record<BoardStatus, TaskItem[]> {
  const grouped: Record<BoardStatus, TaskItem[]> = {
    [TaskStatus.TODO]: [],
    [TaskStatus.DOING]: [],
    [TaskStatus.DONE]: [],
  };

  for (const task of tasks) {
    const bucket = grouped[task.status as BoardStatus];
    if (bucket) {
      bucket.push(task);
    }
  }

  return {
    [TaskStatus.TODO]: sortTasks(grouped[TaskStatus.TODO], today),
    [TaskStatus.DOING]: sortTasks(grouped[TaskStatus.DOING], today),
    [TaskStatus.DONE]: sortTasks(grouped[TaskStatus.DONE], today),
  } as Record<BoardStatus, TaskItem[]>;
}
