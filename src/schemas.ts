import {z} from 'zod';
// Client-safe enum mirrors (same string values as the Prisma enums) so this
// module can be imported from "use client" code without pulling in the
// Node-only generated Prisma client.
import {
  PeriodType,
  PlanMode,
  PriorityQuadrant,
  TaskSize,
  TaskType,
  TaskStatus,
} from './utils/enums';
import {THEMES} from './utils/theme';
import {DUMP_ENTRY_MAX_LENGTH} from './utils/dump';
// Validation copy is centralized in the i18n catalog. zod messages are set at
// module load (no React context), so we read the English strings directly from
// en.json here rather than via useTranslations/getTranslations. Single-locale
// today; per-locale validation messages would translate at the form boundary.
import messages from '@/i18n/en.json';

const V = messages.Validation;

// ── Plan Schemas ───────────────────────────────────────────────────────

const planTemplateInputSchema = z.object({
  templateId: z.string().uuid(),
  type: z.nativeEnum(TaskType),
  frequency: z.number().int().positive(V.frequencyPositive),
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
    data =>
      data.templates.length > 0 ||
      (data.adhocTaskIds !== undefined && data.adhocTaskIds.length > 0),
    {message: V.selectAtLeastOne},
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
  title: z.string().min(1, V.titleRequired),
  description: z.string().min(1, V.descriptionRequired),
  size: z.nativeEnum(TaskSize),
});
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

export const updateTemplateSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    size: z.nativeEnum(TaskSize).optional(),
  })
  .refine(data => Object.values(data).some(v => v !== undefined), {
    message: V.atLeastOneField,
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

// Matrix creation only ("Add Priority Task" flow): tasks are born unassigned
// (planId = null, status = BACKLOG) in the source quadrant and reach the board
// via the Track This Week flow. Board-side ad-hoc creation is removed.
export const createAdhocTaskSchema = z.object({
  title: z.string().min(1, V.titleRequired),
  description: z.string().optional(),
  size: z.nativeEnum(TaskSize),
  quadrant: z.nativeEnum(PriorityQuadrant),
});
export type CreateAdhocTaskInput = z.infer<typeof createAdhocTaskSchema>;

export const updateTaskQuadrantSchema = z.object({
  quadrant: z.nativeEnum(PriorityQuadrant),
});
export type UpdateTaskQuadrantInput = z.infer<typeof updateTaskQuadrantSchema>;

// Track This Week targets: Todo or In Progress only
export const trackTaskSchema = z.object({
  status: z.enum([TaskStatus.TODO, TaskStatus.DOING]),
});
export type TrackTaskInput = z.infer<typeof trackTaskSchema>;
// Client-side union derived from the validated contract, so the UI options
// can never drift from what the server accepts.
export type TrackTargetStatus = TrackTaskInput['status'];

// ── Dump Schemas ───────────────────────────────────────────────────────

// .trim() transforms before the checks, so whitespace-only input fails min(1)
// and the stored content is the trimmed string (interior newlines preserved).
// .max() counts UTF-16 code units — the same unit as the textarea maxLength,
// so client and server agree on what "10,000 characters" means.
export const createDumpEntrySchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, V.contentRequired)
    .max(DUMP_ENTRY_MAX_LENGTH, V.contentTooLong),
});
export type CreateDumpEntryInput = z.infer<typeof createDumpEntrySchema>;

// The feed cursor is an opaque token on the wire: the client stores and echoes
// nextCursor verbatim and never constructs or inspects its contents. The
// decoded payload schema is private to dumpActions.ts, not a wire contract.
export const fetchDumpEntriesSchema = z.object({
  cursor: z.string().min(1).optional(),
});
export type FetchDumpEntriesInput = z.infer<typeof fetchDumpEntriesSchema>;

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
  description: z.string(), // short summary of the week's focus, used as Plan.description
  draftTemplates: z.array(draftTemplateOutputSchema),
  followUp: z.string(),
});
export type DraftPlanResponse = z.infer<typeof draftPlanResponseSchema>;

export const generateDraftPlanSchema = z.object({
  chatId: z.string().uuid(),
  message: z.string().min(1),
});
export type GenerateDraftPlanInput = z.infer<typeof generateDraftPlanSchema>;

export const approveDraftPlanSchema = z.object({
  chatId: z.string().uuid(),
});
export type ApproveDraftPlanInput = z.infer<typeof approveDraftPlanSchema>;

export const resumeDraftPlanSchema = z.object({
  chatId: z.string().uuid(),
});
export type ResumeDraftPlanInput = z.infer<typeof resumeDraftPlanSchema>;

export const updateThemeSchema = z.object({theme: z.enum(THEMES)});
export type UpdateThemeInput = z.infer<typeof updateThemeSchema>;
