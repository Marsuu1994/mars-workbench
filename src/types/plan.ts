import type {
  PlanMode,
  TaskSize,
  TaskStatus,
  TaskType,
} from '@/generated/prisma/client';
import type {PlanItem} from '@/lib/db/plans';

/** An existing template linked to a plan, with its per-plan type and frequency. */
export type PlanTemplateInput = {
  templateId: string;
  type: TaskType;
  frequency: number;
};

/** A brand-new template, created in the same transaction as the plan it joins. */
export type NewPlanEntry = {
  templateId: null;
  title: string;
  description: string;
  size: TaskSize;
  type: TaskType;
  frequency: number;
};

/**
 * One template slot when creating or patching a plan: reuse an existing
 * template by id, or create a new one alongside the plan (`templateId: null`).
 */
export type PlanEntry = PlanTemplateInput | NewPlanEntry;

/** How a plan's template links change between two full template lists. */
export type PlanTemplateDiff = {
  added: PlanTemplateInput[];
  /** templateIds no longer in the plan */
  removed: string[];
  /** in both lists with a different type or frequency (carries the new values) */
  modified: PlanTemplateInput[];
};

/** Guard reads every plan-creation path runs first (see getPlanCreationContext). */
export type PlanCreationContext = {
  /** The current-week ACTIVE plan after sync; creation must refuse while set. */
  activePlan: PlanItem | null;
  /** Last period's plan, completed by the new plan's creation. */
  pendingPlan: PlanItem | null;
  today: Date;
  periodKey: string;
};

/** A new type and/or frequency for a template already linked to the plan. */
export type PlanTemplateUpdate = Pick<PlanTemplateInput, 'templateId'> &
  Partial<Pick<PlanTemplateInput, 'type' | 'frequency'>>;

/** Changes to a plan's existing template links (new templates are resolved separately). */
export type PlanTemplatePatch = {
  addTemplates: PlanTemplateInput[];
  updateTemplates: PlanTemplateUpdate[];
  removeTemplateIds: string[];
};

/** Template ids a patch cannot apply, by reason (see applyTemplatePatch). */
export type PlanTemplatePatchConflicts = {
  /** added, but already linked */
  alreadyInPlan: string[];
  /** updated or removed, but not linked */
  notInPlan: string[];
  /** named more than once across add/update/remove */
  repeated: string[];
};

// ── Planning context (MCP) ─────────────────────────────────────────────

/** A reusable template as the planning tools list it. */
export type PlanningTemplate = {
  templateId: string;
  title: string;
  description: string;
  size: TaskSize;
  points: number;
};

/** Task-instance counts: so far for the active plan, final for a finished one. */
export type PlanningProgress = {
  completed: number;
  expired: number;
  total: number;
  completionRate: number;
};

/** One template slot of a plan: the template, its per-plan config, and its progress. */
export type PlanningPlanLine = PlanTemplateInput &
  Pick<PlanningTemplate, 'title' | 'size' | 'points'> &
  PlanningProgress;

/** An unfinished one-off task attached to a plan. */
export type PlanningAdhocTask = {
  taskId: string;
  title: string;
  size: TaskSize;
  points: number;
  status: TaskStatus;
};

/** A plan as the planning tools describe it. */
export type PlanningPlan = {
  planId: string;
  periodKey: string;
  description: string | null;
  mode: PlanMode;
  templates: PlanningPlanLine[];
  /** Non-done one-off tasks attached to the plan */
  adhocTasks: PlanningAdhocTask[];
  /** Totals over every template instance of the plan */
  overall: PlanningProgress & {
    /** completionRate over DAILY instances only (habit signal) */
    dailyCompletionRate: number;
    pointsEarned: number;
  };
};

/**
 * Everything an assistant needs to plan the user's week: the date, this week's
 * ACTIVE plan or last period's PENDING_UPDATE plan (at most one of them exists),
 * and the reusable templates.
 */
export type PlanningContext = {
  /** YYYY-MM-DD in `timeZone` */
  today: string;
  weekday: string;
  timeZone: string;
  week: {periodKey: string; start: string; end: string};
  activePlan: PlanningPlan | null;
  lastPlan: PlanningPlan | null;
  /** Non-archived templates, newest first */
  templates: PlanningTemplate[];
};

/** A template or one-off task named in a change summary. */
export type PlanChangeRef = {id: string; title: string};

/** What a patch changed, plus the plan as it stands afterwards. */
export type PlanPatchOutcome = {
  changes: {
    addedTemplates: PlanChangeRef[];
    modifiedTemplates: PlanChangeRef[];
    removedTemplates: PlanChangeRef[];
    removedAdhocTasks: PlanChangeRef[];
  };
  plan: PlanningPlan;
};
