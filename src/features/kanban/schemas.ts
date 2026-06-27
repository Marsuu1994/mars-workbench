import { z } from "zod";
import { PeriodType, PlanMode, TaskSize, TaskType, TaskStatus } from "@/generated/prisma/client";

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
    mode: z.nativeEnum(PlanMode).default(PlanMode.NORMAL),
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
  mode: z.nativeEnum(PlanMode).optional(),
  templates: z.array(planTemplateInputSchema).optional(),
  adhocTaskIds: z.array(z.string().uuid()).optional(),
});
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

// ── Template Schemas ───────────────────────────────────────────────────

export const createTemplateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  size: z.nativeEnum(TaskSize),
});
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

export const updateTemplateSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    size: z.nativeEnum(TaskSize).optional(),
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
  size: z.nativeEnum(TaskSize),
  status: z.enum([TaskStatus.TODO, TaskStatus.DOING]).optional(),
});
export type CreateAdhocTaskInput = z.infer<typeof createAdhocTaskSchema>;

// ── AI Chat Schemas ────────────────────────────────────────────────────

export const getTemplateStatsSchema = z.object({
  planId: z.string().uuid(),
});
export type GetTemplateStatsInput = z.infer<typeof getTemplateStatsSchema>;

export const createAiChatSchema = z.object({
  planId: z.string().uuid().optional(),
});
export type CreateAiChatInput = z.infer<typeof createAiChatSchema>;

// ── AI Draft Plan (LLM structured output) ──────────────────────────────

// Shape the LLM must return. Passed to zodResponseFormat for strict json_schema
// output, so every field is required and templateId is nullable (not optional).
// type is constrained to DAILY | WEEKLY — AD_HOC is never a plan-line.
export const draftTemplateOutputSchema = z.object({
  templateId: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  type: z.enum([TaskType.DAILY, TaskType.WEEKLY]),
  frequency: z.number().int().min(1),
  size: z.enum([
    TaskSize.EXTRA_SMALL,
    TaskSize.SMALL,
    TaskSize.MEDIUM,
    TaskSize.LARGE,
    TaskSize.EXTRA_LARGE,
  ]),
});

export const draftPlanResponseSchema = z.object({
  message: z.string(),
  draftTemplates: z.array(draftTemplateOutputSchema),
  followUp: z.string(),
});
export type DraftPlanResponse = z.infer<typeof draftPlanResponseSchema>;

export const generateDraftPlanSchema = z.object({
  chatId: z.string().uuid(),
  message: z.string().min(1),
});
export type GenerateDraftPlanInput = z.infer<typeof generateDraftPlanSchema>;
