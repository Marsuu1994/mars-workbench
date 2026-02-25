import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ───────────────────────────────────────────────────────

const { mockPlanTemplate } = vi.hoisted(() => ({
  mockPlanTemplate: {
    findMany: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: { planTemplate: mockPlanTemplate },
}));

// ─── Imports (after mock) ──────────────────────────────────────────────

import {
  getPlanTemplatesByPlanId,
  createManyPlanTemplates,
  updatePlanTemplate,
  deletePlanTemplatesByPlanId,
} from "../planTemplates";

// ─── Setup ─────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getPlanTemplatesByPlanId ──────────────────────────────────────────

describe("getPlanTemplatesByPlanId", () => {
  it("queries by planId", async () => {
    mockPlanTemplate.findMany.mockResolvedValue([]);

    await getPlanTemplatesByPlanId("plan-1");

    expect(mockPlanTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { planId: "plan-1" },
      })
    );
  });
});

// ─── createManyPlanTemplates ───────────────────────────────────────────

describe("createManyPlanTemplates", () => {
  it("creates template links with skipDuplicates", async () => {
    mockPlanTemplate.createMany.mockResolvedValue({ count: 2 });
    const templates = [
      { templateId: "tpl-1", type: "DAILY" as const, frequency: 1 },
      { templateId: "tpl-2", type: "WEEKLY" as const, frequency: 3 },
    ];

    await createManyPlanTemplates("plan-1", templates);

    const call = mockPlanTemplate.createMany.mock.calls[0][0];
    expect(call.skipDuplicates).toBe(true);
    expect(call.data).toEqual([
      { planId: "plan-1", templateId: "tpl-1", type: "DAILY", frequency: 1 },
      { planId: "plan-1", templateId: "tpl-2", type: "WEEKLY", frequency: 3 },
    ]);
  });

  it("uses transaction client when provided", async () => {
    const txPlanTemplate = { createMany: vi.fn().mockResolvedValue({ count: 1 }) };
    const tx = { planTemplate: txPlanTemplate } as never;

    await createManyPlanTemplates(
      "plan-1",
      [{ templateId: "tpl-1", type: "DAILY" as const, frequency: 1 }],
      tx
    );

    expect(txPlanTemplate.createMany).toHaveBeenCalled();
    expect(mockPlanTemplate.createMany).not.toHaveBeenCalled();
  });
});

// ─── updatePlanTemplate ────────────────────────────────────────────────

describe("updatePlanTemplate", () => {
  it("updates type and frequency for the given link", async () => {
    mockPlanTemplate.update.mockResolvedValue({ id: "pt-1" });

    await updatePlanTemplate("pt-1", { type: "WEEKLY", frequency: 5 });

    expect(mockPlanTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pt-1" },
        data: { type: "WEEKLY", frequency: 5 },
      })
    );
  });
});

// ─── deletePlanTemplatesByPlanId ───────────────────────────────────────

describe("deletePlanTemplatesByPlanId", () => {
  it("deletes all links for the given plan", async () => {
    mockPlanTemplate.deleteMany.mockResolvedValue({ count: 3 });

    await deletePlanTemplatesByPlanId("plan-1");

    expect(mockPlanTemplate.deleteMany).toHaveBeenCalledWith({
      where: { planId: "plan-1" },
    });
  });

  it("uses transaction client when provided", async () => {
    const txPlanTemplate = { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) };
    const tx = { planTemplate: txPlanTemplate } as never;

    await deletePlanTemplatesByPlanId("plan-1", tx);

    expect(txPlanTemplate.deleteMany).toHaveBeenCalled();
    expect(mockPlanTemplate.deleteMany).not.toHaveBeenCalled();
  });
});
