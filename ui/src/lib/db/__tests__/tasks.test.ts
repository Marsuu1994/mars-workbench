import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ───────────────────────────────────────────────────────

const { mockTask } = vi.hoisted(() => ({
  mockTask: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: { task: mockTask },
}));

// ─── Imports (after mock) ──────────────────────────────────────────────

import {
  getTasksByPlanId,
  getTasksByPlanIdAndStatus,
  createTask,
  createManyTasks,
  updateTaskStatus,
  expireStaleDailyTasks,
  expireAllNonDoneTasks,
  getDailyTasksForDate,
  taskExists,
  deleteIncompleteTasksByTemplateIds,
  countTasksByTemplateIds,
  countIncompleteTasksByTemplateId,
  getNonDoneAdhocTasks,
  updateTasksPlanId,
  unlinkAdhocTasksFromPlan,
  isValidTaskStatus,
} from "../tasks";

// ─── Setup ─────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getTasksByPlanId ──────────────────────────────────────────────────

describe("getTasksByPlanId", () => {
  it("queries with correct planId and ordering", async () => {
    mockTask.findMany.mockResolvedValue([]);

    await getTasksByPlanId("plan-1");

    expect(mockTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { planId: "plan-1" },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      })
    );
  });

  it("returns the tasks from prisma", async () => {
    const tasks = [{ id: "t1" }, { id: "t2" }];
    mockTask.findMany.mockResolvedValue(tasks);

    const result = await getTasksByPlanId("plan-1");

    expect(result).toEqual(tasks);
  });
});

// ─── getTasksByPlanIdAndStatus ─────────────────────────────────────────

describe("getTasksByPlanIdAndStatus", () => {
  it("filters by planId and status array", async () => {
    mockTask.findMany.mockResolvedValue([]);

    await getTasksByPlanIdAndStatus("plan-1", ["TODO", "DOING"]);

    expect(mockTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { planId: "plan-1", status: { in: ["TODO", "DOING"] } },
      })
    );
  });
});

// ─── createTask ────────────────────────────────────────────────────────

describe("createTask", () => {
  it("creates a task with provided data", async () => {
    const data = {
      planId: "plan-1",
      type: "DAILY" as const,
      title: "Test",
      points: 3,
      status: "TODO" as const,
      instanceIndex: 0,
    };
    mockTask.create.mockResolvedValue({ id: "new-task", ...data });

    await createTask(data);

    expect(mockTask.create).toHaveBeenCalledWith(
      expect.objectContaining({ data })
    );
  });
});

// ─── createManyTasks ───────────────────────────────────────────────────

describe("createManyTasks", () => {
  it("uses skipDuplicates for idempotency", async () => {
    mockTask.createMany.mockResolvedValue({ count: 2 });
    const data = [
      { planId: "p1", type: "DAILY" as const, title: "A", points: 1, status: "TODO" as const, instanceIndex: 0 },
      { planId: "p1", type: "DAILY" as const, title: "B", points: 1, status: "TODO" as const, instanceIndex: 1 },
    ];

    await createManyTasks(data);

    expect(mockTask.createMany).toHaveBeenCalledWith({
      data,
      skipDuplicates: true,
    });
  });

  it("uses transaction client when provided", async () => {
    const txTask = { createMany: vi.fn().mockResolvedValue({ count: 1 }) };
    const tx = { task: txTask } as never;

    await createManyTasks(
      [{ planId: "p1", type: "DAILY" as const, title: "A", points: 1, status: "TODO" as const, instanceIndex: 0 }],
      tx
    );

    expect(txTask.createMany).toHaveBeenCalled();
    expect(mockTask.createMany).not.toHaveBeenCalled();
  });
});

// ─── updateTaskStatus ──────────────────────────────────────────────────

describe("updateTaskStatus", () => {
  it("sets doneAt to a Date when status is DONE", async () => {
    mockTask.update.mockResolvedValue({ id: "t1", status: "DONE" });

    await updateTaskStatus("t1", "DONE");

    const call = mockTask.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "t1" });
    expect(call.data.status).toBe("DONE");
    expect(call.data.doneAt).toBeInstanceOf(Date);
  });

  it("sets doneAt to null when status is not DONE", async () => {
    mockTask.update.mockResolvedValue({ id: "t1", status: "TODO" });

    await updateTaskStatus("t1", "TODO");

    const call = mockTask.update.mock.calls[0][0];
    expect(call.data.doneAt).toBeNull();
  });

  it("clears doneAt when moving from DONE to DOING", async () => {
    mockTask.update.mockResolvedValue({ id: "t1", status: "DOING" });

    await updateTaskStatus("t1", "DOING");

    const call = mockTask.update.mock.calls[0][0];
    expect(call.data.status).toBe("DOING");
    expect(call.data.doneAt).toBeNull();
  });
});

// ─── expireStaleDailyTasks ─────────────────────────────────────────────

describe("expireStaleDailyTasks", () => {
  it("expires tasks with forDate before cutoff that are not DONE", async () => {
    mockTask.updateMany.mockResolvedValue({ count: 3 });
    const cutoff = new Date(2026, 1, 24);

    await expireStaleDailyTasks("plan-1", cutoff);

    expect(mockTask.updateMany).toHaveBeenCalledWith({
      where: {
        planId: "plan-1",
        forDate: { lt: cutoff },
        status: { not: "DONE" },
      },
      data: { status: "EXPIRED" },
    });
  });

  it("uses transaction client when provided", async () => {
    const txTask = { updateMany: vi.fn().mockResolvedValue({ count: 0 }) };
    const tx = { task: txTask } as never;

    await expireStaleDailyTasks("plan-1", new Date(), tx);

    expect(txTask.updateMany).toHaveBeenCalled();
    expect(mockTask.updateMany).not.toHaveBeenCalled();
  });
});

// ─── expireAllNonDoneTasks ─────────────────────────────────────────────

describe("expireAllNonDoneTasks", () => {
  it("expires non-done non-adhoc tasks", async () => {
    mockTask.updateMany.mockResolvedValue({ count: 5 });

    await expireAllNonDoneTasks("plan-1");

    expect(mockTask.updateMany).toHaveBeenCalledWith({
      where: {
        planId: "plan-1",
        status: { not: "DONE" },
        type: { not: "AD_HOC" },
      },
      data: { status: "EXPIRED" },
    });
  });
});

// ─── getDailyTasksForDate ──────────────────────────────────────────────

describe("getDailyTasksForDate", () => {
  it("queries by planId, templateId, and forDate", async () => {
    mockTask.findMany.mockResolvedValue([]);
    const date = new Date(2026, 1, 25);

    await getDailyTasksForDate("plan-1", "tpl-1", date);

    expect(mockTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { planId: "plan-1", templateId: "tpl-1", forDate: date },
      })
    );
  });
});

// ─── taskExists ────────────────────────────────────────────────────────

describe("taskExists", () => {
  it("returns true when task is found", async () => {
    mockTask.findUnique.mockResolvedValue({ id: "t1" });

    expect(await taskExists("t1")).toBe(true);
  });

  it("returns false when task is not found", async () => {
    mockTask.findUnique.mockResolvedValue(null);

    expect(await taskExists("t-nonexistent")).toBe(false);
  });
});

// ─── deleteIncompleteTasksByTemplateIds ─────────────────────────────────

describe("deleteIncompleteTasksByTemplateIds", () => {
  it("deletes TODO and DOING tasks for given template IDs", async () => {
    mockTask.deleteMany.mockResolvedValue({ count: 4 });

    await deleteIncompleteTasksByTemplateIds("plan-1", ["tpl-1", "tpl-2"]);

    expect(mockTask.deleteMany).toHaveBeenCalledWith({
      where: {
        planId: "plan-1",
        templateId: { in: ["tpl-1", "tpl-2"] },
        status: { in: ["TODO", "DOING"] },
      },
    });
  });
});

// ─── countTasksByTemplateIds ───────────────────────────────────────────

describe("countTasksByTemplateIds", () => {
  it("counts incomplete tasks for given template IDs", async () => {
    mockTask.count.mockResolvedValue(7);

    const result = await countTasksByTemplateIds("plan-1", ["tpl-1"]);

    expect(result).toEqual({ removeCount: 7 });
    expect(mockTask.count).toHaveBeenCalledWith({
      where: {
        planId: "plan-1",
        templateId: { in: ["tpl-1"] },
        status: { in: ["TODO", "DOING"] },
      },
    });
  });
});

// ─── countIncompleteTasksByTemplateId ───────────────────────────────────

describe("countIncompleteTasksByTemplateId", () => {
  it("returns empty map for empty templateIds", async () => {
    const result = await countIncompleteTasksByTemplateId("plan-1", []);

    expect(result.size).toBe(0);
    expect(mockTask.groupBy).not.toHaveBeenCalled();
  });

  it("returns map of templateId → count", async () => {
    mockTask.groupBy.mockResolvedValue([
      { templateId: "tpl-1", _count: 3 },
      { templateId: "tpl-2", _count: 1 },
    ]);

    const result = await countIncompleteTasksByTemplateId("plan-1", ["tpl-1", "tpl-2"]);

    expect(result.get("tpl-1")).toBe(3);
    expect(result.get("tpl-2")).toBe(1);
  });
});

// ─── getNonDoneAdhocTasks ──────────────────────────────────────────────

describe("getNonDoneAdhocTasks", () => {
  it("queries AD_HOC tasks with status not DONE", async () => {
    mockTask.findMany.mockResolvedValue([]);

    await getNonDoneAdhocTasks();

    expect(mockTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type: "AD_HOC", status: { not: "DONE" } },
      })
    );
  });
});

// ─── updateTasksPlanId ─────────────────────────────────────────────────

describe("updateTasksPlanId", () => {
  it("returns count 0 for empty taskIds without calling DB", async () => {
    const result = await updateTasksPlanId([], "plan-1");

    expect(result).toEqual({ count: 0 });
    expect(mockTask.updateMany).not.toHaveBeenCalled();
  });

  it("updates planId for given task IDs", async () => {
    mockTask.updateMany.mockResolvedValue({ count: 2 });

    await updateTasksPlanId(["t1", "t2"], "plan-1");

    expect(mockTask.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["t1", "t2"] } },
      data: { planId: "plan-1" },
    });
  });
});

// ─── unlinkAdhocTasksFromPlan ──────────────────────────────────────────

describe("unlinkAdhocTasksFromPlan", () => {
  it("sets planId null for AD_HOC tasks not in keepIds", async () => {
    mockTask.updateMany.mockResolvedValue({ count: 1 });

    await unlinkAdhocTasksFromPlan("plan-1", ["keep-1"]);

    expect(mockTask.updateMany).toHaveBeenCalledWith({
      where: {
        planId: "plan-1",
        type: "AD_HOC",
        id: { notIn: ["keep-1"] },
      },
      data: { planId: null },
    });
  });
});

// ─── isValidTaskStatus ─────────────────────────────────────────────────

describe("isValidTaskStatus", () => {
  it("returns true for valid statuses", () => {
    expect(isValidTaskStatus("TODO")).toBe(true);
    expect(isValidTaskStatus("DOING")).toBe(true);
    expect(isValidTaskStatus("DONE")).toBe(true);
    expect(isValidTaskStatus("EXPIRED")).toBe(true);
  });

  it("returns false for invalid statuses", () => {
    expect(isValidTaskStatus("INVALID")).toBe(false);
    expect(isValidTaskStatus("")).toBe(false);
  });
});
