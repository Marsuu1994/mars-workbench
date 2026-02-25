import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ───────────────────────────────────────────────────────

const { mockPlan } = vi.hoisted(() => ({
  mockPlan: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: { plan: mockPlan },
}));

// ─── Imports (after mock) ──────────────────────────────────────────────

import {
  getActivePlan,
  getPlanByStatus,
  getPlanWithTemplates,
  createPlan,
  updatePlan,
  updatePlanStatus,
  updateLastSyncDate,
} from "../plans";

// ─── Setup ─────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getActivePlan ─────────────────────────────────────────────────────

describe("getActivePlan", () => {
  it("queries for ACTIVE status", async () => {
    mockPlan.findFirst.mockResolvedValue(null);

    await getActivePlan();

    expect(mockPlan.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "ACTIVE" },
      })
    );
  });

  it("returns the plan when found", async () => {
    const plan = { id: "plan-1", status: "ACTIVE" };
    mockPlan.findFirst.mockResolvedValue(plan);

    const result = await getActivePlan();

    expect(result).toEqual(plan);
  });

  it("returns null when no active plan exists", async () => {
    mockPlan.findFirst.mockResolvedValue(null);

    const result = await getActivePlan();

    expect(result).toBeNull();
  });
});

// ─── getPlanByStatus ───────────────────────────────────────────────────

describe("getPlanByStatus", () => {
  it("queries with the given status", async () => {
    mockPlan.findFirst.mockResolvedValue(null);

    await getPlanByStatus("PENDING_UPDATE");

    expect(mockPlan.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "PENDING_UPDATE" },
      })
    );
  });
});

// ─── getPlanWithTemplates ──────────────────────────────────────────────

describe("getPlanWithTemplates", () => {
  it("queries by id with nested planTemplates select", async () => {
    mockPlan.findUnique.mockResolvedValue(null);

    await getPlanWithTemplates("plan-1");

    const call = mockPlan.findUnique.mock.calls[0][0];
    expect(call.where).toEqual({ id: "plan-1" });
    expect(call.select).toHaveProperty("planTemplates");
  });

  it("includes template details in the select", async () => {
    mockPlan.findUnique.mockResolvedValue(null);

    await getPlanWithTemplates("plan-1");

    const call = mockPlan.findUnique.mock.calls[0][0];
    const ptSelect = call.select.planTemplates.select;
    expect(ptSelect).toHaveProperty("template");
    expect(ptSelect.template.select).toHaveProperty("title", true);
    expect(ptSelect.template.select).toHaveProperty("points", true);
  });
});

// ─── createPlan ────────────────────────────────────────────────────────

describe("createPlan", () => {
  it("creates plan with ACTIVE status", async () => {
    mockPlan.create.mockResolvedValue({ id: "plan-new" });

    await createPlan({ periodType: "WEEKLY", periodKey: "2026-W09" });

    const call = mockPlan.create.mock.calls[0][0];
    expect(call.data).toMatchObject({
      periodType: "WEEKLY",
      periodKey: "2026-W09",
      status: "ACTIVE",
    });
  });

  it("passes description when provided", async () => {
    mockPlan.create.mockResolvedValue({ id: "plan-new" });

    await createPlan({
      periodType: "WEEKLY",
      periodKey: "2026-W09",
      description: "Test plan",
    });

    const call = mockPlan.create.mock.calls[0][0];
    expect(call.data.description).toBe("Test plan");
  });

  it("uses transaction client when provided", async () => {
    const txPlan = { create: vi.fn().mockResolvedValue({ id: "plan-new" }) };
    const tx = { plan: txPlan } as never;

    await createPlan({ periodType: "WEEKLY", periodKey: "2026-W09" }, tx);

    expect(txPlan.create).toHaveBeenCalled();
    expect(mockPlan.create).not.toHaveBeenCalled();
  });
});

// ─── updatePlan ────────────────────────────────────────────────────────

describe("updatePlan", () => {
  it("updates description for the given plan", async () => {
    mockPlan.update.mockResolvedValue({ id: "plan-1" });

    await updatePlan("plan-1", { description: "New desc" });

    expect(mockPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "plan-1" },
        data: { description: "New desc" },
      })
    );
  });
});

// ─── updatePlanStatus ──────────────────────────────────────────────────

describe("updatePlanStatus", () => {
  it("transitions plan to the given status", async () => {
    mockPlan.update.mockResolvedValue({ id: "plan-1", status: "COMPLETED" });

    await updatePlanStatus("plan-1", "COMPLETED");

    expect(mockPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "plan-1" },
        data: { status: "COMPLETED" },
      })
    );
  });

  it("uses transaction client when provided", async () => {
    const txPlan = { update: vi.fn().mockResolvedValue({ id: "plan-1" }) };
    const tx = { plan: txPlan } as never;

    await updatePlanStatus("plan-1", "PENDING_UPDATE", tx);

    expect(txPlan.update).toHaveBeenCalled();
    expect(mockPlan.update).not.toHaveBeenCalled();
  });
});

// ─── updateLastSyncDate ────────────────────────────────────────────────

describe("updateLastSyncDate", () => {
  it("sets lastSyncDate for the given plan", async () => {
    mockPlan.update.mockResolvedValue({});
    const date = new Date(2026, 1, 25);

    await updateLastSyncDate("plan-1", date);

    expect(mockPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "plan-1" },
        data: { lastSyncDate: date },
      })
    );
  });
});
