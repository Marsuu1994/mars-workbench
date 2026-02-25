import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PlanItem } from "@/lib/db/plans";
import type { PlanTemplateItem } from "@/lib/db/planTemplates";

// ─── Mocks ─────────────────────────────────────────────────────────────

// vi.hoisted runs before vi.mock factories (which are hoisted above all imports)
const { mockFindUnique, mockDeleteMany, mockTx } = vi.hoisted(() => {
  const mockFindUnique = vi.fn();
  const mockDeleteMany = vi.fn().mockResolvedValue({ count: 0 });
  const mockTx = {
    taskTemplate: { findUnique: mockFindUnique },
    planTemplate: { deleteMany: mockDeleteMany },
  } as never;
  return { mockFindUnique, mockDeleteMany, mockTx };
});

vi.mock("@/lib/prisma", () => ({
  default: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(mockTx)),
    taskTemplate: { findUnique: mockFindUnique },
  },
}));

vi.mock("@/lib/db/plans");
vi.mock("@/lib/db/tasks");
vi.mock("@/lib/db/planTemplates");

// ─── Imports (after mocks) ─────────────────────────────────────────────

import { createPlan, updatePlan } from "../planService";

import {
  getActivePlan,
  getPlanByStatus,
  createPlan as dalCreatePlan,
  updatePlan as dalUpdatePlan,
  updateLastSyncDate,
  updatePlanStatus,
} from "@/lib/db/plans";

import {
  createManyPlanTemplates,
  getPlanTemplatesByPlanId,
  updatePlanTemplate,
} from "@/lib/db/planTemplates";

import {
  createManyTasks,
  deleteIncompleteTasksByTemplateIds,
  updateTasksPlanId,
  unlinkAdhocTasksFromPlan,
} from "@/lib/db/tasks";

// ─── Typed mock references ─────────────────────────────────────────────

const mockGetActivePlan = vi.mocked(getActivePlan);
const mockGetPlanByStatus = vi.mocked(getPlanByStatus);
const mockDalCreatePlan = vi.mocked(dalCreatePlan);
const mockDalUpdatePlan = vi.mocked(dalUpdatePlan);
const mockUpdateLastSyncDate = vi.mocked(updateLastSyncDate);
const mockUpdatePlanStatus = vi.mocked(updatePlanStatus);
const mockCreateManyPlanTemplates = vi.mocked(createManyPlanTemplates);
const mockGetPlanTemplatesByPlanId = vi.mocked(getPlanTemplatesByPlanId);
const mockUpdatePlanTemplate = vi.mocked(updatePlanTemplate);
const mockCreateManyTasks = vi.mocked(createManyTasks);
const mockDeleteIncompleteTasksByTemplateIds = vi.mocked(deleteIncompleteTasksByTemplateIds);
const mockUpdateTasksPlanId = vi.mocked(updateTasksPlanId);
const mockUnlinkAdhocTasksFromPlan = vi.mocked(unlinkAdhocTasksFromPlan);

// Pin "today" to Wed Feb 25, 2026
vi.mock("../utils/dateUtils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/dateUtils")>();
  return {
    ...actual,
    getTodayDate: () => new Date(2026, 1, 25),
  };
});

// ─── Test Data Helpers ─────────────────────────────────────────────────

function makePlan(overrides: Partial<PlanItem> = {}): PlanItem {
  return {
    id: "plan-1",
    userId: null,
    periodType: "WEEKLY",
    periodKey: "2026-W09",
    description: null,
    status: "ACTIVE",
    lastSyncDate: null,
    createdAt: new Date("2026-02-23T00:00:00Z"),
    updatedAt: new Date("2026-02-23T00:00:00Z"),
    ...overrides,
  };
}

function makePlanTemplateItem(overrides: Partial<PlanTemplateItem> = {}): PlanTemplateItem {
  return {
    id: "pt-1",
    planId: "plan-1",
    templateId: "tpl-1",
    type: "DAILY",
    frequency: 1,
    createdAt: new Date("2026-02-23T00:00:00Z"),
    ...overrides,
  };
}

// ─── Setup ─────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockGetActivePlan.mockResolvedValue(null);
  mockGetPlanByStatus.mockResolvedValue(null);
  mockDalCreatePlan.mockResolvedValue(makePlan());
  mockDalUpdatePlan.mockResolvedValue(makePlan());
  mockUpdateLastSyncDate.mockResolvedValue(undefined);
  mockUpdatePlanStatus.mockResolvedValue(makePlan());
  mockCreateManyPlanTemplates.mockResolvedValue({ count: 0 });
  mockGetPlanTemplatesByPlanId.mockResolvedValue([]);
  mockUpdatePlanTemplate.mockResolvedValue(makePlanTemplateItem());
  mockCreateManyTasks.mockResolvedValue({ count: 0 });
  mockDeleteIncompleteTasksByTemplateIds.mockResolvedValue({ count: 0 });
  mockUpdateTasksPlanId.mockResolvedValue({ count: 0 });
  mockUnlinkAdhocTasksFromPlan.mockResolvedValue({ count: 0 });
  mockFindUnique.mockResolvedValue({
    title: "Template Task",
    description: "Template description",
    points: 3,
  });
});

// ─── createPlan ────────────────────────────────────────────────────────

describe("createPlan", () => {
  it("returns error when an active plan already exists", async () => {
    mockGetActivePlan.mockResolvedValue(makePlan());

    const result = await createPlan({
      periodType: "WEEKLY",
      templates: [],
      adhocTaskIds: ["task-1"],
    });

    expect(result).toHaveProperty("error");
    expect((result as { error: { formErrors: string[] } }).error.formErrors).toContain(
      "An active plan already exists"
    );
  });

  it("creates plan and links templates", async () => {
    const result = await createPlan({
      periodType: "WEEKLY",
      templates: [{ templateId: "tpl-1", type: "DAILY", frequency: 1 }],
    });

    expect(mockDalCreatePlan).toHaveBeenCalledWith(
      expect.objectContaining({ periodType: "WEEKLY", periodKey: "2026-W09" }),
      mockTx
    );
    expect(mockCreateManyPlanTemplates).toHaveBeenCalledWith(
      "plan-1",
      [{ templateId: "tpl-1", type: "DAILY", frequency: 1 }],
      mockTx
    );
    expect(result).toHaveProperty("id", "plan-1");
  });

  it("generates DAILY tasks for today", async () => {
    await createPlan({
      periodType: "WEEKLY",
      templates: [{ templateId: "tpl-1", type: "DAILY", frequency: 2 }],
    });

    expect(mockCreateManyTasks).toHaveBeenCalledOnce();
    const tasks = mockCreateManyTasks.mock.calls[0][0];
    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toMatchObject({
      type: "DAILY",
      forDate: new Date(2026, 1, 25),
      instanceIndex: 0,
    });
    expect(tasks[1]).toMatchObject({ instanceIndex: 1 });
  });

  it("generates WEEKLY tasks with periodKey", async () => {
    await createPlan({
      periodType: "WEEKLY",
      templates: [{ templateId: "tpl-1", type: "WEEKLY", frequency: 3 }],
    });

    const tasks = mockCreateManyTasks.mock.calls[0][0];
    expect(tasks).toHaveLength(3);
    expect(tasks[0]).toMatchObject({
      type: "WEEKLY",
      periodKey: "2026-W09",
      instanceIndex: 0,
    });
  });

  it("skips task generation for AD_HOC templates", async () => {
    await createPlan({
      periodType: "WEEKLY",
      templates: [{ templateId: "tpl-1", type: "AD_HOC", frequency: 1 }],
    });

    expect(mockCreateManyTasks).not.toHaveBeenCalled();
  });

  it("skips task generation for unknown template (findUnique returns null)", async () => {
    mockFindUnique.mockResolvedValue(null);

    await createPlan({
      periodType: "WEEKLY",
      templates: [{ templateId: "tpl-nonexistent", type: "WEEKLY", frequency: 1 }],
    });

    expect(mockCreateManyTasks).not.toHaveBeenCalled();
  });

  it("links selected ad-hoc tasks to new plan", async () => {
    await createPlan({
      periodType: "WEEKLY",
      templates: [],
      adhocTaskIds: ["adhoc-1", "adhoc-2"],
    });

    expect(mockUpdateTasksPlanId).toHaveBeenCalledWith(
      ["adhoc-1", "adhoc-2"],
      "plan-1",
      mockTx
    );
  });

  it("unlinks deselected ad-hoc tasks from pending plan", async () => {
    const pendingPlan = makePlan({ id: "pending-1", status: "PENDING_UPDATE" });
    mockGetPlanByStatus.mockResolvedValue(pendingPlan);

    await createPlan({
      periodType: "WEEKLY",
      templates: [],
      adhocTaskIds: ["adhoc-1"],
    });

    expect(mockUnlinkAdhocTasksFromPlan).toHaveBeenCalledWith(
      "pending-1",
      ["adhoc-1"],
      mockTx
    );
    expect(mockUpdatePlanStatus).toHaveBeenCalledWith(
      "pending-1",
      "COMPLETED",
      mockTx
    );
  });

  it("updates lastSyncDate to today", async () => {
    await createPlan({
      periodType: "WEEKLY",
      templates: [{ templateId: "tpl-1", type: "DAILY", frequency: 1 }],
    });

    expect(mockUpdateLastSyncDate).toHaveBeenCalledWith(
      "plan-1",
      new Date(2026, 1, 25),
      mockTx
    );
  });

  it("passes description through to DAL", async () => {
    await createPlan({
      periodType: "WEEKLY",
      description: "My plan",
      templates: [],
      adhocTaskIds: ["adhoc-1"],
    });

    expect(mockDalCreatePlan).toHaveBeenCalledWith(
      expect.objectContaining({ description: "My plan" }),
      mockTx
    );
  });

  it("does not call createManyPlanTemplates when templates is empty", async () => {
    await createPlan({
      periodType: "WEEKLY",
      templates: [],
      adhocTaskIds: ["adhoc-1"],
    });

    expect(mockCreateManyPlanTemplates).not.toHaveBeenCalled();
  });
});

// ─── updatePlan ────────────────────────────────────────────────────────

describe("updatePlan", () => {
  it("does nothing for empty update", async () => {
    await updatePlan("plan-1", {});

    expect(mockDalUpdatePlan).not.toHaveBeenCalled();
    expect(mockCreateManyPlanTemplates).not.toHaveBeenCalled();
  });

  it("handles description-only update without transaction", async () => {
    await updatePlan("plan-1", { description: "Updated description" });

    expect(mockDalUpdatePlan).toHaveBeenCalledWith(
      "plan-1",
      { description: "Updated description" }
    );
    // No transaction-related DAL calls
    expect(mockCreateManyPlanTemplates).not.toHaveBeenCalled();
    expect(mockGetPlanTemplatesByPlanId).not.toHaveBeenCalled();
  });

  it("detects and handles added templates", async () => {
    mockGetPlanTemplatesByPlanId.mockResolvedValue([]);

    await updatePlan("plan-1", {
      templates: [{ templateId: "tpl-new", type: "WEEKLY", frequency: 2 }],
    });

    expect(mockCreateManyPlanTemplates).toHaveBeenCalledWith(
      "plan-1",
      [{ templateId: "tpl-new", type: "WEEKLY", frequency: 2 }],
      mockTx
    );
    // Generates WEEKLY tasks for the added template
    expect(mockCreateManyTasks).toHaveBeenCalledOnce();
    const tasks = mockCreateManyTasks.mock.calls[0][0];
    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toMatchObject({ type: "WEEKLY", periodKey: "2026-W09" });
  });

  it("detects and handles removed templates", async () => {
    mockGetPlanTemplatesByPlanId.mockResolvedValue([
      makePlanTemplateItem({ id: "pt-1", templateId: "tpl-old" }),
    ]);

    // New templates list is empty → tpl-old was removed
    await updatePlan("plan-1", { templates: [] });

    expect(mockDeleteIncompleteTasksByTemplateIds).toHaveBeenCalledWith(
      "plan-1",
      ["tpl-old"],
      mockTx
    );
    // planTemplate.deleteMany called for removed template
    expect(mockTx.planTemplate.deleteMany).toHaveBeenCalled();
  });

  it("detects and handles modified templates (type or frequency changed)", async () => {
    mockGetPlanTemplatesByPlanId.mockResolvedValue([
      makePlanTemplateItem({ id: "pt-1", templateId: "tpl-1", type: "DAILY", frequency: 1 }),
    ]);

    // Same templateId, but frequency changed 1→3
    await updatePlan("plan-1", {
      templates: [{ templateId: "tpl-1", type: "DAILY", frequency: 3 }],
    });

    // Deletes old incomplete tasks for the modified template
    expect(mockDeleteIncompleteTasksByTemplateIds).toHaveBeenCalledWith(
      "plan-1",
      ["tpl-1"],
      mockTx
    );
    // Updates the plan-template link
    expect(mockUpdatePlanTemplate).toHaveBeenCalledWith(
      "pt-1",
      { type: "DAILY", frequency: 3 },
      mockTx
    );
    // Regenerates tasks with new frequency
    expect(mockCreateManyTasks).toHaveBeenCalledOnce();
    const tasks = mockCreateManyTasks.mock.calls[0][0];
    expect(tasks).toHaveLength(3);
  });

  it("handles unchanged templates (no-op for same type+frequency)", async () => {
    mockGetPlanTemplatesByPlanId.mockResolvedValue([
      makePlanTemplateItem({ id: "pt-1", templateId: "tpl-1", type: "DAILY", frequency: 1 }),
    ]);

    await updatePlan("plan-1", {
      templates: [{ templateId: "tpl-1", type: "DAILY", frequency: 1 }],
    });

    // No changes — nothing deleted, nothing updated, nothing added
    expect(mockDeleteIncompleteTasksByTemplateIds).not.toHaveBeenCalled();
    expect(mockUpdatePlanTemplate).not.toHaveBeenCalled();
    expect(mockCreateManyPlanTemplates).not.toHaveBeenCalled();
    expect(mockCreateManyTasks).not.toHaveBeenCalled();
  });

  it("handles mixed add + remove + modify", async () => {
    mockGetPlanTemplatesByPlanId.mockResolvedValue([
      makePlanTemplateItem({ id: "pt-1", templateId: "tpl-keep", type: "DAILY", frequency: 1 }),
      makePlanTemplateItem({ id: "pt-2", templateId: "tpl-remove", type: "WEEKLY", frequency: 2 }),
      makePlanTemplateItem({ id: "pt-3", templateId: "tpl-modify", type: "WEEKLY", frequency: 1 }),
    ]);

    await updatePlan("plan-1", {
      templates: [
        { templateId: "tpl-keep", type: "DAILY", frequency: 1 }, // unchanged
        { templateId: "tpl-modify", type: "WEEKLY", frequency: 3 }, // modified
        { templateId: "tpl-add", type: "DAILY", frequency: 2 }, // added
      ],
    });

    // Removed: tpl-remove
    expect(mockDeleteIncompleteTasksByTemplateIds).toHaveBeenCalledWith(
      "plan-1",
      ["tpl-remove"],
      mockTx
    );

    // Modified: tpl-modify (freq 1→3)
    expect(mockUpdatePlanTemplate).toHaveBeenCalledWith(
      "pt-3",
      { type: "WEEKLY", frequency: 3 },
      mockTx
    );

    // Added: tpl-add
    expect(mockCreateManyPlanTemplates).toHaveBeenCalledWith(
      "plan-1",
      [{ templateId: "tpl-add", type: "DAILY", frequency: 2 }],
      mockTx
    );
  });

  it("links new ad-hoc tasks and unlinks removed ones", async () => {
    await updatePlan("plan-1", {
      adhocTaskIds: ["adhoc-1", "adhoc-2"],
    });

    expect(mockUpdateTasksPlanId).toHaveBeenCalledWith(
      ["adhoc-1", "adhoc-2"],
      "plan-1",
      mockTx
    );
    expect(mockUnlinkAdhocTasksFromPlan).toHaveBeenCalledWith(
      "plan-1",
      ["adhoc-1", "adhoc-2"],
      mockTx
    );
  });

  it("handles combined template changes + description in one transaction", async () => {
    mockGetPlanTemplatesByPlanId.mockResolvedValue([]);

    await updatePlan("plan-1", {
      description: "New desc",
      templates: [{ templateId: "tpl-1", type: "WEEKLY", frequency: 1 }],
    });

    // Description update happens inside the transaction
    expect(mockDalUpdatePlan).toHaveBeenCalledWith(
      "plan-1",
      { description: "New desc" },
      mockTx
    );
    // Template changes also happen
    expect(mockCreateManyPlanTemplates).toHaveBeenCalled();
  });

  it("updates lastSyncDate when template changes occur", async () => {
    mockGetPlanTemplatesByPlanId.mockResolvedValue([]);

    await updatePlan("plan-1", {
      templates: [{ templateId: "tpl-1", type: "DAILY", frequency: 1 }],
    });

    expect(mockUpdateLastSyncDate).toHaveBeenCalledWith(
      "plan-1",
      new Date(2026, 1, 25),
      mockTx
    );
  });
});
