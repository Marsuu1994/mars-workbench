import { z } from "zod";
import { PeriodType, TaskType, TaskStatus } from "@/generated/prisma/client";

// ── Plan Schemas ───────────────────────────────────────────────────────

const planTemplateInputSchema = z.object({
  templateId: z.string().uuid(),
  type: z.nativeEnum(TaskType),
  frequency: z.number().int().positive("Frequency must be a positive integer"),
});

export const createPlanSchema = z
  .object({
    periodType: z.literal(PeriodType.WEEKLY),
    description: z.string().optional(),
    templates: z.array(planTemplateInputSchema),
    adhocTaskIds: z.array(z.string().uuid()).optional(),
  })
  .refine(
    (data) =>
      data.templates.length > 0 ||
      (data.adhocTaskIds !== undefined && data.adhocTaskIds.length > 0),
    { message: "Select at least one template or ad-hoc task" }
  );
export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = z.object({
  description: z.string().optional(),
  templates: z.array(planTemplateInputSchema).optional(),
  adhocTaskIds: z.array(z.string().uuid()).optional(),
});
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

// ── Template Schemas ───────────────────────────────────────────────────

export const createTemplateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  points: z.number().int().positive("Points must be a positive integer"),
});
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

export const updateTemplateSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    points: z.number().int().positive().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "At least one field must be provided",
  });
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

// ── Task Schemas ───────────────────────────────────────────────────────

const mutableTaskStatuses = [
  TaskStatus.TODO,
  TaskStatus.DOING,
  TaskStatus.DONE,
] as const;

export const updateTaskStatusSchema = z.object({
  status: z.enum(mutableTaskStatuses),
});
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;

export const createAdhocTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  points: z.number().int().positive("Points must be a positive integer"),
  status: z.enum([TaskStatus.TODO, TaskStatus.DOING]).optional(),
});
export type CreateAdhocTaskInput = z.infer<typeof createAdhocTaskSchema>;
