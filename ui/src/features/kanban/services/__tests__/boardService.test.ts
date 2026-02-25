import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PlanItem, PlanWithTemplates } from "@/lib/db/plans";
import type { TaskItem } from "@/lib/db/tasks";

// ─── Mocks ─────────────────────────────────────────────────────────────

// Mock prisma singleton — $transaction just executes the callback
const mockTx = {} as never; // placeholder tx object passed to DAL calls
vi.mock("@/lib/prisma", () => ({
  default: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(mockTx)),
  },
}));

vi.mock("@/lib/db/plans");
vi.mock("@/lib/db/tasks");

// ─── Imports (after mocks) ─────────────────────────────────────────────

import {
  fetchBoard,
  runDailySync,
  runEndOfPeriodSync,
} from "../boardService";

import {
  getActivePlan,
  getPlanWithTemplates,
  updateLastSyncDate,
  updatePlanStatus,
} from "@/lib/db/plans";

import {
  expireStaleDailyTasks,
  expireAllNonDoneTasks,
  createManyTasks,
  getTasksByPlanId,
} from "@/lib/db/tasks";

// ─── Typed mock references ─────────────────────────────────────────────

const mockGetActivePlan = vi.mocked(getActivePlan);
const mockGetPlanWithTemplates = vi.mocked(getPlanWithTemplates);
const mockUpdateLastSyncDate = vi.mocked(updateLastSyncDate);
const mockUpdatePlanStatus = vi.mocked(updatePlanStatus);
const mockExpireStaleDailyTasks = vi.mocked(expireStaleDailyTasks);
const mockExpireAllNonDoneTasks = vi.mocked(expireAllNonDoneTasks);
const mockCreateManyTasks = vi.mocked(createManyTasks);
const mockGetTasksByPlanId = vi.mocked(getTasksByPlanId);

// ─── Test Data Helpers ─────────────────────────────────────────────────

// Pin "today" to Wednesday Feb 25, 2026 for all tests
const today = new Date(2026, 1, 25);

vi.mock("../utils/dateUtils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/dateUtils")>();
  return {
    ...actual,
    getTodayDate: () => new Date(2026, 1, 25),
    getYesterdayDate: () => new Date(2026, 1, 24),
  };
});

function makePlan(overrides: Partial<PlanItem> = {}): PlanItem {
  return {
    id: "plan-1",
    userId: null,
    periodType: "WEEKLY",
    periodKey: "2026-W09", // Week of Feb 23–Mar 1, 2026
    description: null,
    status: "ACTIVE",
    lastSyncDate: null,
    createdAt: new Date("2026-02-23T00:00:00Z"),
    updatedAt: new Date("2026-02-23T00:00:00Z"),
    ...overrides,
  };
}

function makePlanWithTemplates(
  overrides: Partial<PlanWithTemplates> = {}
): PlanWithTemplates {
  return {
    ...makePlan(),
    planTemplates: [
      {
        id: "pt-1",
        templateId: "tpl-1",
        type: "DAILY",
        frequency: 1,
        template: {
          id: "tpl-1",
          title: "Exercise",
          description: "Morning workout",
          points: 3,
          isArchived: false,
        },
      },
      {
        id: "pt-2",
        templateId: "tpl-2",
        type: "WEEKLY",
        frequency: 2,
        template: {
          id: "tpl-2",
          title: "Review",
          description: "Weekly review",
          points: 5,
          isArchived: false,
        },
      },
    ],
    ...overrides,
  };
}

function makeTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: "task-1",
    planId: "plan-1",
    templateId: "tpl-1",
    type: "DAILY",
    title: "Exercise",
    description: null,
    points: 3,
    status: "TODO",
    forDate: today,
    periodKey: null,
    instanceIndex: 0,
    createdAt: new Date("2026-02-25T08:00:00Z"),
    updatedAt: new Date("2026-02-25T08:00:00Z"),
    doneAt: null,
    ...overrides,
  };
}

// ─── Setup ─────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Default: DAL functions resolve to safe defaults
  mockGetActivePlan.mockResolvedValue(null);
  mockGetPlanWithTemplates.mockResolvedValue(null);
  mockUpdateLastSyncDate.mockResolvedValue(undefined);
  mockUpdatePlanStatus.mockResolvedValue(makePlan());
  mockExpireStaleDailyTasks.mockResolvedValue({ count: 0 });
  mockExpireAllNonDoneTasks.mockResolvedValue({ count: 0 });
  mockCreateManyTasks.mockResolvedValue({ count: 0 });
  mockGetTasksByPlanId.mockResolvedValue([]);
});

// ─── runDailySync ──────────────────────────────────────────────────────

describe("runDailySync", () => {
  it("skips if plan has no templates", async () => {
    mockGetPlanWithTemplates.mockResolvedValue(
      makePlanWithTemplates({ planTemplates: [] })
    );

    await runDailySync("plan-1", today);

    expect(mockExpireStaleDailyTasks).toHaveBeenCalledOnce();
    expect(mockCreateManyTasks).not.toHaveBeenCalled();
  });

  it("returns early if plan not found", async () => {
    mockGetPlanWithTemplates.mockResolvedValue(null);

    await runDailySync("plan-1", today);

    expect(mockExpireStaleDailyTasks).not.toHaveBeenCalled();
    expect(mockCreateManyTasks).not.toHaveBeenCalled();
  });

  it("generates daily task instances from templates", async () => {
    mockGetPlanWithTemplates.mockResolvedValue(makePlanWithTemplates());

    await runDailySync("plan-1", today);

    // Should create 1 daily task (tpl-1 has freq=1, tpl-2 is WEEKLY so skipped)
    expect(mockCreateManyTasks).toHaveBeenCalledOnce();
    const tasks = mockCreateManyTasks.mock.calls[0][0];
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      planId: "plan-1",
      templateId: "tpl-1",
      type: "DAILY",
      title: "Exercise",
      points: 3,
      status: "TODO",
      forDate: today,
      instanceIndex: 0,
    });
  });

  it("generates multiple instances for frequency > 1", async () => {
    mockGetPlanWithTemplates.mockResolvedValue(
      makePlanWithTemplates({
        planTemplates: [
          {
            id: "pt-1",
            templateId: "tpl-1",
            type: "DAILY",
            frequency: 3,
            template: {
              id: "tpl-1",
              title: "Pushups",
              description: "Do pushups",
              points: 2,
              isArchived: false,
            },
          },
        ],
      })
    );

    await runDailySync("plan-1", today);

    const tasks = mockCreateManyTasks.mock.calls[0][0];
    expect(tasks).toHaveLength(3);
    expect(tasks[0].instanceIndex).toBe(0);
    expect(tasks[1].instanceIndex).toBe(1);
    expect(tasks[2].instanceIndex).toBe(2);
  });

  it("expires stale tasks with yesterday as cutoff", async () => {
    mockGetPlanWithTemplates.mockResolvedValue(makePlanWithTemplates());

    await runDailySync("plan-1", today);

    expect(mockExpireStaleDailyTasks).toHaveBeenCalledWith(
      "plan-1",
      new Date(2026, 1, 24), // yesterday
      mockTx
    );
  });

  it("updates lastSyncDate to today", async () => {
    mockGetPlanWithTemplates.mockResolvedValue(makePlanWithTemplates());

    await runDailySync("plan-1", today);

    expect(mockUpdateLastSyncDate).toHaveBeenCalledWith(
      "plan-1",
      today,
      mockTx
    );
  });
});

// ─── runEndOfPeriodSync ────────────────────────────────────────────────

describe("runEndOfPeriodSync", () => {
  it("expires all non-done tasks", async () => {
    await runEndOfPeriodSync("plan-1");

    expect(mockExpireAllNonDoneTasks).toHaveBeenCalledWith("plan-1", mockTx);
  });

  it("transitions plan to PENDING_UPDATE", async () => {
    await runEndOfPeriodSync("plan-1");

    expect(mockUpdatePlanStatus).toHaveBeenCalledWith(
      "plan-1",
      "PENDING_UPDATE",
      mockTx
    );
  });
});

// ─── fetchBoard ────────────────────────────────────────────────────────

describe("fetchBoard", () => {
  it("returns null when no active plan exists", async () => {
    mockGetActivePlan.mockResolvedValue(null);

    const result = await fetchBoard();

    expect(result).toBeNull();
  });

  it("triggers end-of-period sync and returns null when week has changed", async () => {
    // Plan's period is W08 but today is in W09 → period ended
    mockGetActivePlan.mockResolvedValue(makePlan({ periodKey: "2026-W08" }));

    const result = await fetchBoard();

    expect(result).toBeNull();
    expect(mockExpireAllNonDoneTasks).toHaveBeenCalledOnce();
    expect(mockUpdatePlanStatus).toHaveBeenCalledWith(
      "plan-1",
      "PENDING_UPDATE",
      mockTx
    );
  });

  it("runs daily sync when lastSyncDate is null", async () => {
    const plan = makePlan({ lastSyncDate: null });
    mockGetActivePlan.mockResolvedValue(plan);
    mockGetPlanWithTemplates.mockResolvedValue(makePlanWithTemplates());
    mockGetTasksByPlanId.mockResolvedValue([]);

    await fetchBoard();

    // Daily sync calls: updateLastSyncDate + expireStaleDailyTasks
    expect(mockUpdateLastSyncDate).toHaveBeenCalled();
    expect(mockExpireStaleDailyTasks).toHaveBeenCalled();
  });

  it("runs daily sync when lastSyncDate differs from today", async () => {
    const plan = makePlan({ lastSyncDate: new Date(2026, 1, 24) }); // yesterday
    mockGetActivePlan.mockResolvedValue(plan);
    mockGetPlanWithTemplates.mockResolvedValue(makePlanWithTemplates());
    mockGetTasksByPlanId.mockResolvedValue([]);

    await fetchBoard();

    expect(mockUpdateLastSyncDate).toHaveBeenCalled();
  });

  it("skips daily sync when already synced today", async () => {
    const plan = makePlan({ lastSyncDate: today });
    mockGetActivePlan.mockResolvedValue(plan);
    mockGetPlanWithTemplates.mockResolvedValue(makePlanWithTemplates());
    mockGetTasksByPlanId.mockResolvedValue([]);

    await fetchBoard();

    // getPlanWithTemplates called once for board display, not for sync
    // updateLastSyncDate should NOT be called (sync skipped)
    expect(mockUpdateLastSyncDate).not.toHaveBeenCalled();
  });

  it("calculates today metrics correctly", async () => {
    mockGetActivePlan.mockResolvedValue(makePlan({ lastSyncDate: today }));
    mockGetPlanWithTemplates.mockResolvedValue(makePlanWithTemplates());
    mockGetTasksByPlanId.mockResolvedValue([
      makeTask({ id: "t1", status: "DONE", doneAt: today, points: 3 }),
      makeTask({ id: "t2", status: "DONE", doneAt: today, points: 5 }),
      makeTask({ id: "t3", status: "TODO", points: 2 }),
    ]);

    const result = await fetchBoard();

    expect(result).not.toBeNull();
    expect(result!.todayDoneCount).toBe(2);
    expect(result!.todayTotalCount).toBe(3);
    expect(result!.todayDonePoints).toBe(8);
    expect(result!.todayTotalPoints).toBe(10);
  });

  it("excludes EXPIRED tasks from board tasks", async () => {
    mockGetActivePlan.mockResolvedValue(makePlan({ lastSyncDate: today }));
    mockGetPlanWithTemplates.mockResolvedValue(makePlanWithTemplates());
    mockGetTasksByPlanId.mockResolvedValue([
      makeTask({ id: "t1", status: "TODO" }),
      makeTask({ id: "t2", status: "EXPIRED" }),
    ]);

    const result = await fetchBoard();

    expect(result!.tasks).toHaveLength(1);
    expect(result!.tasks[0].id).toBe("t1");
  });

  it("calculates week projected metrics with daily+weekly+adhoc", async () => {
    mockGetActivePlan.mockResolvedValue(makePlan({ lastSyncDate: today }));
    mockGetPlanWithTemplates.mockResolvedValue(makePlanWithTemplates());
    // Today is Wed Feb 25 (day 3 of the week: Mon Feb 23–Sun Mar 1)
    // Past daily: forDate < today (Feb 23 and Feb 24)
    // Weekly tasks: 2 instances (tpl-2, freq=2)
    // Ad-hoc: 1 task
    mockGetTasksByPlanId.mockResolvedValue([
      // Past daily (Feb 23)
      makeTask({ id: "d-past-1", type: "DAILY", forDate: new Date(2026, 1, 23), points: 3 }),
      // Past daily (Feb 24)
      makeTask({ id: "d-past-2", type: "DAILY", forDate: new Date(2026, 1, 24), points: 3 }),
      // Today's daily (not past)
      makeTask({ id: "d-today", type: "DAILY", forDate: today, points: 3 }),
      // Weekly tasks
      makeTask({ id: "w-1", type: "WEEKLY", forDate: null, periodKey: "2026-W09", points: 5 }),
      makeTask({ id: "w-2", type: "WEEKLY", forDate: null, periodKey: "2026-W09", points: 5 }),
      // Ad-hoc
      makeTask({ id: "a-1", type: "AD_HOC", forDate: null, templateId: null, points: 4 }),
    ]);

    const result = await fetchBoard();

    // Daily past: 2 tasks × 3 pts = 6 pts, count=2
    // Daily future: remaining days = Mar 1 - Feb 25 = 5 days (including today)
    //   1 daily template × freq 1 × 3 pts × 5 days = 15 pts, count = 1×5 = 5
    // Weekly: 2 tasks × 5 pts = 10 pts, count=2
    // Ad-hoc: 1 task × 4 pts = 4 pts, count=1
    // Total projected: 6+15+10+4 = 35 pts, count = 2+5+2+1 = 10
    expect(result!.weekProjectedPoints).toBe(35);
    expect(result!.weekProjectedCount).toBe(10);
  });

  it("calculates daysElapsed correctly (Wed = day 3)", async () => {
    mockGetActivePlan.mockResolvedValue(makePlan({ lastSyncDate: today }));
    mockGetPlanWithTemplates.mockResolvedValue(makePlanWithTemplates());
    mockGetTasksByPlanId.mockResolvedValue([]);

    const result = await fetchBoard();

    // Today is Feb 25 (Wed), week starts Feb 23 (Mon)
    // Diff = 2 days, daysElapsed = floor(2) + 1 = 3
    expect(result!.daysElapsed).toBe(3);
  });

  it("calculates week done metrics from all tasks including expired", async () => {
    mockGetActivePlan.mockResolvedValue(makePlan({ lastSyncDate: today }));
    mockGetPlanWithTemplates.mockResolvedValue(makePlanWithTemplates());
    mockGetTasksByPlanId.mockResolvedValue([
      makeTask({ id: "t1", status: "DONE", doneAt: new Date(2026, 1, 23), points: 3 }),
      makeTask({ id: "t2", status: "DONE", doneAt: today, points: 5 }),
      makeTask({ id: "t3", status: "EXPIRED", points: 2 }),
    ]);

    const result = await fetchBoard();

    expect(result!.weekDoneCount).toBe(2);
    expect(result!.weekDonePoints).toBe(8);
  });

  it("returns null when getPlanWithTemplates returns null after sync", async () => {
    mockGetActivePlan.mockResolvedValue(makePlan({ lastSyncDate: today }));
    mockGetPlanWithTemplates.mockResolvedValue(null);

    const result = await fetchBoard();

    expect(result).toBeNull();
  });
});
