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
import {AUTHORIZATION_ID_PATTERN, ConsentDecision} from './utils/oauthConsent';
import {DUMP_ENTRY_MAX_LENGTH} from './utils/dump';
import {FREQ_MAX, FREQ_MIN} from './utils/planUtils';
import {PROJECT_STEP_LIMIT} from './utils/projectUtils';
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
    // Project steps to put on the new week: the pending plan's carried-over
    // steps plus any upcoming ones. Unlisted pending steps return to their
    // projects.
    projectStepIds: z.array(z.string().uuid()).optional(),
  })
  .refine(
    data =>
      data.templates.length > 0 ||
      (data.adhocTaskIds !== undefined && data.adhocTaskIds.length > 0) ||
      (data.projectStepIds !== undefined && data.projectStepIds.length > 0),
    {message: V.selectAtLeastOne},
  );
export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = z.object({
  description: z.string().optional(),
  mode: z.nativeEnum(PlanMode).optional(),
  templates: z.array(planTemplateInputSchema).optional(),
  // What the user let go: these one-offs return to the matrix, these steps to
  // their projects. Everything else on the plan stays — including what was put
  // on the week after the form loaded.
  removeAdhocTaskIds: z.array(z.string().uuid()).optional(),
  removeProjectStepIds: z.array(z.string().uuid()).optional(),
});
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

// ── Template Schemas ───────────────────────────────────────────────────

export const createTemplateSchema = z.object({
  title: z.string().min(1, V.titleRequired),
  description: z.string().min(1, V.descriptionRequired),
  size: z.nativeEnum(TaskSize),
});

export const updateTemplateSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    size: z.nativeEnum(TaskSize).optional(),
  })
  .refine(data => Object.values(data).some(v => v !== undefined), {
    message: V.atLeastOneField,
  });

// ── Task Schemas ───────────────────────────────────────────────────────

// Board moves: Todo · Done (the Doing column is gone; DOING is no longer written)
const mutableTaskStatuses = [TaskStatus.TODO, TaskStatus.DONE] as const;

export const updateTaskStatusSchema = z.object({
  status: z.enum(mutableTaskStatuses),
});

// Matrix creation only ("Add Priority Task" flow): tasks are born unassigned
// (planId = null, status = BACKLOG) in the source quadrant and reach the board
// via the Track This Week flow. Board-side ad-hoc creation is removed.
export const createAdhocTaskSchema = z.object({
  title: z.string().min(1, V.titleRequired),
  description: z.string().optional(),
  size: z.nativeEnum(TaskSize),
  quadrant: z.nativeEnum(PriorityQuadrant),
});

export const updateTaskQuadrantSchema = z.object({
  quadrant: z.nativeEnum(PriorityQuadrant),
});

// Track This Week target: Todo only
export const trackTaskSchema = z.object({
  status: z.enum([TaskStatus.TODO]),
});
export type TrackTaskInput = z.infer<typeof trackTaskSchema>;
// Client-side union derived from the validated contract, so the UI options
// can never drift from what the server accepts.
export type TrackTargetStatus = TrackTaskInput['status'];

// Undo a matrix completion: the client sends the pre-complete snapshot —
// status back to BACKLOG (unassigned) or TODO (tracked) — and may only
// ever *detach* the plan link the complete added, never attach one.
export const undoCompleteTaskSchema = z
  .object({
    status: z.enum([TaskStatus.BACKLOG, TaskStatus.TODO]),
    detach: z.boolean(),
  })
  .refine(({status, detach}) => detach === (status === TaskStatus.BACKLOG), {
    message: 'detach must match an unassigned (BACKLOG) restore',
  });
export type UndoCompleteTaskInput = z.infer<typeof undoCompleteTaskSchema>;

// ── Project Schemas ────────────────────────────────────────────────────

// One step's fields (Add Step modal, a new project's first steps). Points are
// derived from size server-side; the step number is the end of the path.
const projectStepInputSchema = z.object({
  title: z.string().trim().min(1, V.titleRequired),
  description: z.string().trim().optional(),
  size: z.nativeEnum(TaskSize),
});

export const createProjectSchema = z.object({
  title: z.string().trim().min(1, V.titleRequired),
  goal: z.string().trim().optional(),
  steps: z.array(projectStepInputSchema).max(PROJECT_STEP_LIMIT).optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

// An empty goal clears it.
export const updateProjectSchema = z
  .object({
    title: z.string().trim().min(1, V.titleRequired).optional(),
    goal: z.string().trim().optional(),
  })
  .refine(data => Object.values(data).some(v => v !== undefined), {
    message: V.atLeastOneField,
  });
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const createProjectStepSchema = projectStepInputSchema;
export type CreateProjectStepInput = z.infer<typeof createProjectStepSchema>;

// An empty description clears it.
export const updateProjectStepSchema = z
  .object({
    title: z.string().trim().min(1, V.titleRequired).optional(),
    description: z.string().trim().optional(),
    size: z.nativeEnum(TaskSize).optional(),
  })
  .refine(data => Object.values(data).some(v => v !== undefined), {
    message: V.atLeastOneField,
  });
export type UpdateProjectStepInput = z.infer<typeof updateProjectStepSchema>;

// Drag reorder: the step goes right before beforeStepId, or to the end of the
// path without one.
export const moveProjectStepSchema = z.object({
  stepId: z.string().uuid(),
  beforeStepId: z.string().uuid().optional(),
});
export type MoveProjectStepInput = z.infer<typeof moveProjectStepSchema>;

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

// The feed cursor is an opaque token on the wire: the client stores and echoes
// nextCursor verbatim and never constructs or inspects its contents. The
// decoded payload schema is private to dumpActions.ts, not a wire contract.
export const fetchDumpEntriesSchema = z.object({
  cursor: z.string().min(1).optional(),
});

// ── AI Chat Schemas ────────────────────────────────────────────────────

export const createAiChatSchema = z.object({
  planId: z.string().uuid().optional(),
});

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

export const approveDraftPlanSchema = z.object({
  chatId: z.string().uuid(),
});

export const resumeDraftPlanSchema = z.object({
  chatId: z.string().uuid(),
});

export const updateThemeSchema = z.object({theme: z.enum(THEMES)});

// ── OAuth Consent Schemas ──────────────────────────────────────────────

export const authorizationIdSchema = z.string().regex(AUTHORIZATION_ID_PATTERN);

export const submitConsentDecisionSchema = z.object({
  authorizationId: authorizationIdSchema,
  decision: z.nativeEnum(ConsentDecision),
});

// ── MCP Tool Schemas ───────────────────────────────────────────────────

// Inputs of the planning tools (src/mcp/tools). The descriptions are read by
// the model, so they say what a field means, not how it is validated.

const planLineFields = {
  type: z
    .enum([TaskType.DAILY, TaskType.WEEKLY])
    .describe(
      'DAILY: `frequency` instances every day. WEEKLY: `frequency` instances for the whole week',
    ),
  frequency: z
    .number()
    .int()
    .min(FREQ_MIN)
    .max(FREQ_MAX)
    .describe('Instances per day (DAILY) or per week (WEEKLY)'),
};

const existingPlanLineSchema = z.object({
  templateId: z
    .string()
    .uuid()
    .describe('A templateId from get_planning_context'),
  ...planLineFields,
});

// A brand-new template, created together with the plan change.
const newPlanLineSchema = createTemplateSchema.extend({
  size: createTemplateSchema.shape.size.describe(
    'Effort: EXTRA_SMALL ~1h, SMALL ~2h, MEDIUM ~3h, LARGE ~5h, EXTRA_LARGE ~8h',
  ),
  ...planLineFields,
});

const planModeSchema = z
  .nativeEnum(PlanMode)
  .describe(
    'NORMAL: daily tasks on weekdays only. EXTREME: every day, weekends included',
  );

const uuidListSchema = z.array(z.string().uuid());

export const planSpecSchema = z.object({
  description: z
    .string()
    .optional()
    .describe("A short label for the week's focus, shown on the board"),
  mode: planModeSchema.default(PlanMode.NORMAL),
  templates: z
    .array(existingPlanLineSchema)
    .default([])
    .describe('Existing templates to run this week'),
  newTemplates: z
    .array(newPlanLineSchema)
    .default([])
    .describe('Brand-new templates to create and run this week'),
  carryOverAdhocTaskIds: uuidListSchema
    .optional()
    .describe(
      "Which of lastPlan's one-off tasks move into this plan. Omit to carry all of them over; [] carries none (the rest return to the priority matrix)",
    ),
  carryOverProjectStepIds: uuidListSchema
    .optional()
    .describe(
      "Which of lastPlan's unfinished project steps (state LAST_WEEK) move into this plan. Omit to carry all of them over; [] carries none (the rest return to their projects)",
    ),
  addProjectStepIds: uuidListSchema
    .default([])
    .describe(
      'UPCOMING project steps to put on this week, by stepId from get_planning_context or create_project',
    ),
});
export type PlanSpecInput = z.infer<typeof planSpecSchema>;

export const planPatchSchema = z
  .object({
    planId: z
      .string()
      .uuid()
      .describe('activePlan.planId from get_planning_context'),
    description: z
      .string()
      .optional()
      .describe("A new label for the week's focus"),
    mode: planModeSchema.optional(),
    addTemplates: z
      .array(existingPlanLineSchema)
      .default([])
      .describe('Existing templates to add to the plan'),
    newTemplates: z
      .array(newPlanLineSchema)
      .default([])
      .describe('Brand-new templates to create and add to the plan'),
    updateTemplates: z
      .array(
        z
          .object({
            templateId: existingPlanLineSchema.shape.templateId,
            type: planLineFields.type.optional(),
            frequency: planLineFields.frequency.optional(),
          })
          .refine(u => u.type !== undefined || u.frequency !== undefined, {
            message: 'Give a new type and/or frequency',
          }),
      )
      .default([])
      .describe(
        'A new type and/or frequency for templates already in the plan',
      ),
    removeTemplateIds: uuidListSchema
      .default([])
      .describe('templateIds to take out of the plan'),
    removeAdhocTaskIds: uuidListSchema
      .default([])
      .describe('One-off tasks to send back to the priority matrix'),
    addProjectStepIds: uuidListSchema
      .default([])
      .describe(
        'UPCOMING project steps to put on this week; they land in the backlog',
      ),
    removeProjectStepIds: uuidListSchema
      .default([])
      .describe('Project steps on this week to send back to their project'),
  })
  .refine(
    p =>
      p.description !== undefined ||
      p.mode !== undefined ||
      [
        p.addTemplates,
        p.newTemplates,
        p.updateTemplates,
        p.removeTemplateIds,
        p.removeAdhocTaskIds,
        p.addProjectStepIds,
        p.removeProjectStepIds,
      ].some(list => list.length > 0),
    {message: 'The patch changes nothing'},
  );
export type PlanPatchInput = z.infer<typeof planPatchSchema>;

const sizeSchema = newPlanLineSchema.shape.size;

// update_habit: a template's own fields (how often it runs is the plan's).
export const habitPatchSchema = z
  .object({
    templateId: existingPlanLineSchema.shape.templateId,
    title: z.string().trim().min(1).optional().describe('A new name'),
    description: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe('A new description'),
    size: sizeSchema.optional(),
  })
  .refine(
    ({title, description, size}) =>
      [title, description, size].some(field => field !== undefined),
    {message: 'Give a new title, description and/or size'},
  );
export type HabitPatchInput = z.infer<typeof habitPatchSchema>;

const projectIdSchema = z
  .string()
  .uuid()
  .describe('A projectId from get_planning_context');
const stepIdSchema = z
  .string()
  .uuid()
  .describe('A stepId from get_planning_context');

const newProjectStepSchema = z.object({
  title: projectStepInputSchema.shape.title.describe(
    "What this step covers, readable on its own, e.g. 'Lesson 3 — Ordering food'",
  ),
  description: projectStepInputSchema.shape.description.describe(
    'A link, notes, or what done looks like',
  ),
  size: sizeSchema,
});

export const projectSpecSchema = z.object({
  title: createProjectSchema.shape.title.describe(
    "The project's name, e.g. 'Spanish A1'",
  ),
  goal: createProjectSchema.shape.goal.describe(
    'What finishing the project means, in one sentence',
  ),
  steps: z
    .array(newProjectStepSchema)
    .max(PROJECT_STEP_LIMIT)
    .default([])
    .describe('The path in order, step 1 first'),
});
export type ProjectSpecInput = z.infer<typeof projectSpecSchema>;

const beforeStepIdSchema = stepIdSchema.optional();

export const projectPatchSchema = z
  .object({
    projectId: projectIdSchema,
    title: z.string().trim().min(1).optional().describe('A new name'),
    goal: z
      .string()
      .trim()
      .optional()
      .describe('A new goal; an empty string clears it'),
    archived: z
      .boolean()
      .optional()
      .describe(
        'true archives the project — only when the user asks; false unarchives it',
      ),
    addSteps: z
      .array(
        newProjectStepSchema.extend({
          beforeStepId: beforeStepIdSchema.describe(
            'Insert the new step right before this step; omit to add it at the end of the path',
          ),
        }),
      )
      .default([])
      .describe('New steps, in order'),
    updateSteps: z
      .array(
        z
          .object({
            stepId: stepIdSchema,
            title: newProjectStepSchema.shape.title.optional(),
            description: projectStepInputSchema.shape.description.describe(
              'A new description; an empty string clears it',
            ),
            size: sizeSchema.optional(),
          })
          .refine(
            ({title, description, size}) =>
              [title, description, size].some(field => field !== undefined),
            {message: 'Give a new title, description and/or size'},
          ),
      )
      .default([])
      .describe('A new title, description or size for steps that are not done'),
    moveSteps: z
      .array(
        z.object({
          stepId: stepIdSchema,
          beforeStepId: beforeStepIdSchema.describe(
            'Move the step right before this one; omit to move it to the end',
          ),
        }),
      )
      .default([])
      .describe(
        'Steps that are not done, moved to a new place in the path — only when the user asks',
      ),
    removeStepIds: uuidListSchema
      .default([])
      .describe('Steps that are not done, to delete'),
  })
  .refine(
    p =>
      p.title !== undefined ||
      p.goal !== undefined ||
      p.archived !== undefined ||
      [p.addSteps, p.updateSteps, p.moveSteps, p.removeStepIds].some(
        list => list.length > 0,
      ),
    {message: 'The patch changes nothing'},
  );
export type ProjectPatchInput = z.infer<typeof projectPatchSchema>;
