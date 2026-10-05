import type {TaskSize, TaskType} from '@/generated/prisma/client';

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
 * One template slot when creating a plan: reuse an existing template by id, or
 * create a new one alongside the plan (`templateId: null`).
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
