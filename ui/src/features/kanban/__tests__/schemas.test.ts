import { describe, it, expect } from "vitest";
import {
  createPlanSchema,
  updatePlanSchema,
  createTemplateSchema,
  updateTemplateSchema,
  updateTaskStatusSchema,
  createAdhocTaskSchema,
} from "../schemas";

// ─── Helpers ───────────────────────────────────────────────────────────

const validUUID = "a1b2c3d4-e5f6-4a7b-8c9d-a0b1c2d3e4f5";

function expectSuccess(schema: { safeParse: (d: unknown) => { success: boolean } }, data: unknown) {
  expect(schema.safeParse(data).success).toBe(true);
}

function expectFailure(schema: { safeParse: (d: unknown) => { success: boolean } }, data: unknown) {
  expect(schema.safeParse(data).success).toBe(false);
}

// ─── createPlanSchema ──────────────────────────────────────────────────

describe("createPlanSchema", () => {
  const validTemplate = {
    templateId: validUUID,
    type: "DAILY",
    frequency: 1,
  };

  it("accepts valid plan with templates", () => {
    expectSuccess(createPlanSchema, {
      periodType: "WEEKLY",
      templates: [validTemplate],
    });
  });

  it("accepts valid plan with ad-hoc tasks only", () => {
    expectSuccess(createPlanSchema, {
      periodType: "WEEKLY",
      templates: [],
      adhocTaskIds: [validUUID],
    });
  });

  it("accepts plan with both templates and ad-hoc tasks", () => {
    expectSuccess(createPlanSchema, {
      periodType: "WEEKLY",
      templates: [validTemplate],
      adhocTaskIds: [validUUID],
    });
  });

  it("accepts optional description", () => {
    expectSuccess(createPlanSchema, {
      periodType: "WEEKLY",
      description: "My weekly plan",
      templates: [validTemplate],
    });
  });

  it("rejects empty templates with no ad-hoc tasks (refinement)", () => {
    expectFailure(createPlanSchema, {
      periodType: "WEEKLY",
      templates: [],
    });
  });

  it("rejects empty templates with empty ad-hoc array (refinement)", () => {
    expectFailure(createPlanSchema, {
      periodType: "WEEKLY",
      templates: [],
      adhocTaskIds: [],
    });
  });

  it("rejects invalid periodType", () => {
    expectFailure(createPlanSchema, {
      periodType: "MONTHLY",
      templates: [validTemplate],
    });
  });

  it("rejects non-UUID templateId", () => {
    expectFailure(createPlanSchema, {
      periodType: "WEEKLY",
      templates: [{ ...validTemplate, templateId: "not-a-uuid" }],
    });
  });

  it("rejects zero frequency", () => {
    expectFailure(createPlanSchema, {
      periodType: "WEEKLY",
      templates: [{ ...validTemplate, frequency: 0 }],
    });
  });

  it("rejects negative frequency", () => {
    expectFailure(createPlanSchema, {
      periodType: "WEEKLY",
      templates: [{ ...validTemplate, frequency: -1 }],
    });
  });

  it("rejects non-integer frequency", () => {
    expectFailure(createPlanSchema, {
      periodType: "WEEKLY",
      templates: [{ ...validTemplate, frequency: 1.5 }],
    });
  });
});

// ─── updatePlanSchema ──────────────────────────────────────────────────

describe("updatePlanSchema", () => {
  it("accepts description-only update", () => {
    expectSuccess(updatePlanSchema, { description: "Updated" });
  });

  it("accepts templates-only update", () => {
    expectSuccess(updatePlanSchema, {
      templates: [{ templateId: validUUID, type: "WEEKLY", frequency: 2 }],
    });
  });

  it("accepts empty object (all fields optional)", () => {
    expectSuccess(updatePlanSchema, {});
  });

  it("accepts adhocTaskIds update", () => {
    expectSuccess(updatePlanSchema, {
      adhocTaskIds: [validUUID],
    });
  });
});

// ─── createTemplateSchema ──────────────────────────────────────────────

describe("createTemplateSchema", () => {
  it("accepts valid template", () => {
    expectSuccess(createTemplateSchema, {
      title: "Exercise",
      description: "Morning workout",
      points: 3,
    });
  });

  it("rejects empty title", () => {
    expectFailure(createTemplateSchema, {
      title: "",
      description: "Morning workout",
      points: 3,
    });
  });

  it("rejects empty description", () => {
    expectFailure(createTemplateSchema, {
      title: "Exercise",
      description: "",
      points: 3,
    });
  });

  it("rejects zero points", () => {
    expectFailure(createTemplateSchema, {
      title: "Exercise",
      description: "Morning workout",
      points: 0,
    });
  });

  it("rejects negative points", () => {
    expectFailure(createTemplateSchema, {
      title: "Exercise",
      description: "Morning workout",
      points: -1,
    });
  });

  it("rejects missing fields", () => {
    expectFailure(createTemplateSchema, { title: "Exercise" });
  });
});

// ─── updateTemplateSchema ──────────────────────────────────────────────

describe("updateTemplateSchema", () => {
  it("accepts single field update", () => {
    expectSuccess(updateTemplateSchema, { title: "New title" });
  });

  it("accepts multiple field update", () => {
    expectSuccess(updateTemplateSchema, {
      title: "New title",
      points: 5,
    });
  });

  it("rejects empty object (refinement: at least one field)", () => {
    expectFailure(updateTemplateSchema, {});
  });

  it("rejects empty title string", () => {
    expectFailure(updateTemplateSchema, { title: "" });
  });
});

// ─── updateTaskStatusSchema ────────────────────────────────────────────

describe("updateTaskStatusSchema", () => {
  it("accepts TODO", () => {
    expectSuccess(updateTaskStatusSchema, { status: "TODO" });
  });

  it("accepts DOING", () => {
    expectSuccess(updateTaskStatusSchema, { status: "DOING" });
  });

  it("accepts DONE", () => {
    expectSuccess(updateTaskStatusSchema, { status: "DONE" });
  });

  it("rejects EXPIRED (not a mutable status)", () => {
    expectFailure(updateTaskStatusSchema, { status: "EXPIRED" });
  });

  it("rejects arbitrary string", () => {
    expectFailure(updateTaskStatusSchema, { status: "INVALID" });
  });
});

// ─── createAdhocTaskSchema ─────────────────────────────────────────────

describe("createAdhocTaskSchema", () => {
  it("accepts valid ad-hoc task", () => {
    expectSuccess(createAdhocTaskSchema, {
      title: "Buy groceries",
      points: 2,
    });
  });

  it("accepts optional description", () => {
    expectSuccess(createAdhocTaskSchema, {
      title: "Buy groceries",
      description: "Milk, eggs, bread",
      points: 2,
    });
  });

  it("accepts optional status", () => {
    expectSuccess(createAdhocTaskSchema, {
      title: "Buy groceries",
      points: 2,
      status: "DOING",
    });
  });

  it("rejects DONE as initial status", () => {
    expectFailure(createAdhocTaskSchema, {
      title: "Buy groceries",
      points: 2,
      status: "DONE",
    });
  });

  it("rejects EXPIRED as initial status", () => {
    expectFailure(createAdhocTaskSchema, {
      title: "Buy groceries",
      points: 2,
      status: "EXPIRED",
    });
  });

  it("rejects empty title", () => {
    expectFailure(createAdhocTaskSchema, {
      title: "",
      points: 2,
    });
  });

  it("rejects zero points", () => {
    expectFailure(createAdhocTaskSchema, {
      title: "Buy groceries",
      points: 0,
    });
  });
});
