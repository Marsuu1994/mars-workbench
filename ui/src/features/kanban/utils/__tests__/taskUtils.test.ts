import { describe, it, expect } from "vitest";
import type { TaskItem } from "@/lib/db/tasks";
import { TaskStatus, TaskType } from "../enums";
import {
  computeTemplateProgress,
  computeRiskLevel,
  sortTasks,
  groupAndSortTasks,
} from "../taskUtils";

// ─── Helpers ───────────────────────────────────────────────────────────

/** Build a minimal TaskItem for testing. Override any field via `overrides`. */
function makeTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: "task-1",
    planId: "plan-1",
    templateId: "tpl-1",
    type: TaskType.DAILY,
    title: "Test task",
    description: null,
    points: 1,
    status: TaskStatus.TODO,
    forDate: null,
    periodKey: null,
    instanceIndex: 0,
    createdAt: new Date("2026-02-20T10:00:00Z"),
    updatedAt: new Date("2026-02-20T10:00:00Z"),
    doneAt: null,
    ...overrides,
  };
}

const today = new Date(2026, 1, 25); // Feb 25, 2026 — local midnight

// ─── computeTemplateProgress ───────────────────────────────────────────

describe("computeTemplateProgress", () => {
  it("returns empty map for no tasks", () => {
    expect(computeTemplateProgress([]).size).toBe(0);
  });

  it("counts done and doing per template", () => {
    const tasks = [
      makeTask({ templateId: "t1", status: TaskStatus.DONE }),
      makeTask({ templateId: "t1", status: TaskStatus.DONE }),
      makeTask({ templateId: "t1", status: TaskStatus.DOING }),
      makeTask({ templateId: "t1", status: TaskStatus.TODO }),
      makeTask({ templateId: "t2", status: TaskStatus.DONE }),
    ];
    const map = computeTemplateProgress(tasks);
    expect(map.get("t1")).toEqual({ done: 2, doing: 1 });
    expect(map.get("t2")).toEqual({ done: 1, doing: 0 });
  });

  it("skips tasks without templateId", () => {
    const tasks = [makeTask({ templateId: null, status: TaskStatus.DONE })];
    expect(computeTemplateProgress(tasks).size).toBe(0);
  });
});

// ─── computeRiskLevel ──────────────────────────────────────────────────

describe("computeRiskLevel", () => {
  const emptyFreqMap = new Map<string, number>();
  const emptyProgressMap = new Map<
    string,
    { done: number; doing: number }
  >();

  // ── DONE / EXPIRED always normal ──

  it("returns normal for DONE tasks", () => {
    const task = makeTask({ status: TaskStatus.DONE });
    expect(
      computeRiskLevel(task, today, 12, 3, emptyFreqMap, emptyProgressMap)
    ).toBe("normal");
  });

  it("returns normal for EXPIRED tasks", () => {
    const task = makeTask({ status: TaskStatus.EXPIRED });
    expect(
      computeRiskLevel(task, today, 12, 3, emptyFreqMap, emptyProgressMap)
    ).toBe("normal");
  });

  // ── AD_HOC risk ──

  describe("AD_HOC tasks", () => {
    it("returns danger for TODO aged 8+ days", () => {
      const task = makeTask({
        type: TaskType.AD_HOC,
        status: TaskStatus.TODO,
        createdAt: new Date(today.getTime() - 9 * 86400000),
      });
      expect(
        computeRiskLevel(task, today, 12, 3, emptyFreqMap, emptyProgressMap)
      ).toBe("danger");
    });

    it("returns warning for TODO aged 5-7 days", () => {
      const task = makeTask({
        type: TaskType.AD_HOC,
        status: TaskStatus.TODO,
        createdAt: new Date(today.getTime() - 5 * 86400000),
      });
      expect(
        computeRiskLevel(task, today, 12, 3, emptyFreqMap, emptyProgressMap)
      ).toBe("warning");
    });

    it("returns normal for TODO aged < 5 days", () => {
      const task = makeTask({
        type: TaskType.AD_HOC,
        status: TaskStatus.TODO,
        createdAt: new Date(today.getTime() - 3 * 86400000),
      });
      expect(
        computeRiskLevel(task, today, 12, 3, emptyFreqMap, emptyProgressMap)
      ).toBe("normal");
    });

    it("returns warning for DOING aged 8+ days", () => {
      const task = makeTask({
        type: TaskType.AD_HOC,
        status: TaskStatus.DOING,
        createdAt: new Date(today.getTime() - 10 * 86400000),
      });
      expect(
        computeRiskLevel(task, today, 12, 3, emptyFreqMap, emptyProgressMap)
      ).toBe("warning");
    });

    it("returns normal for DOING aged < 8 days", () => {
      const task = makeTask({
        type: TaskType.AD_HOC,
        status: TaskStatus.DOING,
        createdAt: new Date(today.getTime() - 4 * 86400000),
      });
      expect(
        computeRiskLevel(task, today, 12, 3, emptyFreqMap, emptyProgressMap)
      ).toBe("normal");
    });
  });

  // ── DAILY risk ──

  describe("DAILY tasks", () => {
    it("rollover TODO before 15:00 → warning", () => {
      const task = makeTask({
        type: TaskType.DAILY,
        status: TaskStatus.TODO,
        forDate: new Date("2026-02-24T00:00:00.000Z"), // yesterday (UTC)
      });
      expect(
        computeRiskLevel(task, today, 14, 3, emptyFreqMap, emptyProgressMap)
      ).toBe("warning");
    });

    it("rollover TODO at/after 15:00 → danger", () => {
      const task = makeTask({
        type: TaskType.DAILY,
        status: TaskStatus.TODO,
        forDate: new Date("2026-02-24T00:00:00.000Z"),
      });
      expect(
        computeRiskLevel(task, today, 15, 3, emptyFreqMap, emptyProgressMap)
      ).toBe("danger");
    });

    it("rollover DOING → always warning", () => {
      const task = makeTask({
        type: TaskType.DAILY,
        status: TaskStatus.DOING,
        forDate: new Date("2026-02-24T00:00:00.000Z"),
      });
      expect(
        computeRiskLevel(task, today, 22, 3, emptyFreqMap, emptyProgressMap)
      ).toBe("warning");
    });

    it("fresh daily before 20:00 → normal", () => {
      const task = makeTask({
        type: TaskType.DAILY,
        status: TaskStatus.TODO,
        forDate: new Date("2026-02-25T00:00:00.000Z"), // today (UTC)
      });
      expect(
        computeRiskLevel(task, today, 19, 3, emptyFreqMap, emptyProgressMap)
      ).toBe("normal");
    });

    it("fresh daily at/after 20:00 → warning", () => {
      const task = makeTask({
        type: TaskType.DAILY,
        status: TaskStatus.TODO,
        forDate: new Date("2026-02-25T00:00:00.000Z"),
      });
      expect(
        computeRiskLevel(task, today, 20, 3, emptyFreqMap, emptyProgressMap)
      ).toBe("warning");
    });
  });

  // ── WEEKLY risk ──

  describe("WEEKLY tasks", () => {
    const freqMap = new Map([["tpl-w", 3]]);
    const progressNone = new Map([["tpl-w", { done: 0, doing: 0 }]]);
    const progressPartial = new Map([["tpl-w", { done: 1, doing: 1 }]]);

    it("TODO day 5+ → danger", () => {
      const task = makeTask({
        type: TaskType.WEEKLY,
        status: TaskStatus.TODO,
        templateId: "tpl-w",
      });
      expect(
        computeRiskLevel(task, today, 12, 5, freqMap, progressNone)
      ).toBe("danger");
    });

    it("TODO day 3+ with enough remaining days → warning", () => {
      const task = makeTask({
        type: TaskType.WEEKLY,
        status: TaskStatus.TODO,
        templateId: "tpl-w",
      });
      expect(
        computeRiskLevel(task, today, 12, 3, freqMap, progressNone)
      ).toBe("warning");
    });

    it("TODO early in week with progress → normal", () => {
      const task = makeTask({
        type: TaskType.WEEKLY,
        status: TaskStatus.TODO,
        templateId: "tpl-w",
      });
      // day 2, freq=3, done=1 doing=1 → remaining=1, remainingDays=5 → normal
      expect(
        computeRiskLevel(task, today, 12, 2, freqMap, progressPartial)
      ).toBe("normal");
    });

    it("DOING day 5+ → warning (never danger)", () => {
      const task = makeTask({
        type: TaskType.WEEKLY,
        status: TaskStatus.DOING,
        templateId: "tpl-w",
      });
      expect(
        computeRiskLevel(task, today, 12, 5, freqMap, progressNone)
      ).toBe("warning");
    });

    it("DOING early in week → normal", () => {
      const task = makeTask({
        type: TaskType.WEEKLY,
        status: TaskStatus.DOING,
        templateId: "tpl-w",
      });
      expect(
        computeRiskLevel(task, today, 12, 2, freqMap, progressPartial)
      ).toBe("normal");
    });

    it("uses default frequency 1 when templateId not in map", () => {
      const task = makeTask({
        type: TaskType.WEEKLY,
        status: TaskStatus.TODO,
        templateId: "unknown",
      });
      // freq=1, no progress → remaining=1, day 1 → remainingDays=6 → normal
      expect(
        computeRiskLevel(task, today, 12, 1, freqMap, emptyProgressMap)
      ).toBe("normal");
    });
  });
});

// ─── sortTasks ─────────────────────────────────────────────────────────

describe("sortTasks", () => {
  it("puts fresh daily tasks before rollover daily tasks", () => {
    const rollover = makeTask({
      id: "rollover",
      type: TaskType.DAILY,
      forDate: new Date("2026-02-24T00:00:00.000Z"), // yesterday
    });
    const fresh = makeTask({
      id: "fresh",
      type: TaskType.DAILY,
      forDate: new Date("2026-02-25T00:00:00.000Z"), // today
    });
    const sorted = sortTasks([rollover, fresh], today);
    expect(sorted[0].id).toBe("fresh");
    expect(sorted[1].id).toBe("rollover");
  });

  it("puts rollover daily tasks before weekly/ad-hoc tasks", () => {
    const weekly = makeTask({
      id: "weekly",
      type: TaskType.WEEKLY,
    });
    const rollover = makeTask({
      id: "rollover",
      type: TaskType.DAILY,
      forDate: new Date("2026-02-24T00:00:00.000Z"),
    });
    const sorted = sortTasks([weekly, rollover], today);
    expect(sorted[0].id).toBe("rollover");
    expect(sorted[1].id).toBe("weekly");
  });

  it("sorts by createdAt within the same priority group", () => {
    const older = makeTask({
      id: "older",
      type: TaskType.WEEKLY,
      createdAt: new Date("2026-02-20T10:00:00Z"),
    });
    const newer = makeTask({
      id: "newer",
      type: TaskType.WEEKLY,
      createdAt: new Date("2026-02-22T10:00:00Z"),
    });
    const sorted = sortTasks([newer, older], today);
    expect(sorted[0].id).toBe("older");
    expect(sorted[1].id).toBe("newer");
  });

  it("uses id as tiebreaker when createdAt is equal", () => {
    const a = makeTask({
      id: "aaa",
      type: TaskType.WEEKLY,
      createdAt: new Date("2026-02-20T10:00:00Z"),
    });
    const b = makeTask({
      id: "bbb",
      type: TaskType.WEEKLY,
      createdAt: new Date("2026-02-20T10:00:00Z"),
    });
    const sorted = sortTasks([b, a], today);
    expect(sorted[0].id).toBe("aaa");
    expect(sorted[1].id).toBe("bbb");
  });

  it("does not mutate the original array", () => {
    const tasks = [
      makeTask({ id: "b", type: TaskType.WEEKLY }),
      makeTask({ id: "a", type: TaskType.WEEKLY }),
    ];
    const original = [...tasks];
    sortTasks(tasks, today);
    expect(tasks).toEqual(original);
  });
});

// ─── groupAndSortTasks ─────────────────────────────────────────────────

describe("groupAndSortTasks", () => {
  it("groups tasks by status", () => {
    const tasks = [
      makeTask({ id: "t1", status: TaskStatus.TODO }),
      makeTask({ id: "t2", status: TaskStatus.DOING }),
      makeTask({ id: "t3", status: TaskStatus.DONE }),
      makeTask({ id: "t4", status: TaskStatus.TODO }),
    ];
    const grouped = groupAndSortTasks(tasks, today);
    expect(grouped[TaskStatus.TODO]).toHaveLength(2);
    expect(grouped[TaskStatus.DOING]).toHaveLength(1);
    expect(grouped[TaskStatus.DONE]).toHaveLength(1);
  });

  it("excludes EXPIRED tasks from all groups", () => {
    const tasks = [
      makeTask({ id: "t1", status: TaskStatus.EXPIRED }),
      makeTask({ id: "t2", status: TaskStatus.TODO }),
    ];
    const grouped = groupAndSortTasks(tasks, today);
    expect(grouped[TaskStatus.TODO]).toHaveLength(1);
    expect(grouped[TaskStatus.DOING]).toHaveLength(0);
    expect(grouped[TaskStatus.DONE]).toHaveLength(0);
  });

  it("sorts each group internally", () => {
    const tasks = [
      makeTask({
        id: "newer",
        status: TaskStatus.TODO,
        type: TaskType.WEEKLY,
        createdAt: new Date("2026-02-22T10:00:00Z"),
      }),
      makeTask({
        id: "older",
        status: TaskStatus.TODO,
        type: TaskType.WEEKLY,
        createdAt: new Date("2026-02-20T10:00:00Z"),
      }),
    ];
    const grouped = groupAndSortTasks(tasks, today);
    expect(grouped[TaskStatus.TODO][0].id).toBe("older");
    expect(grouped[TaskStatus.TODO][1].id).toBe("newer");
  });

  it("returns empty arrays when no tasks exist", () => {
    const grouped = groupAndSortTasks([], today);
    expect(grouped[TaskStatus.TODO]).toEqual([]);
    expect(grouped[TaskStatus.DOING]).toEqual([]);
    expect(grouped[TaskStatus.DONE]).toEqual([]);
  });
});
