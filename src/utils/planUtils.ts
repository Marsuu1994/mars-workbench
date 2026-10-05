import type {PlanTemplateDiff, PlanTemplateInput} from '../types/plan';

/**
 * Diff a plan's current template links against the next full list, keyed by
 * templateId. Pure — the server's plan update applies it; callers can also use
 * it to describe a change before applying it.
 */
export function diffPlanTemplates(
  current: readonly PlanTemplateInput[],
  next: readonly PlanTemplateInput[],
): PlanTemplateDiff {
  const currentById = new Map(current.map(t => [t.templateId, t]));
  const nextIds = new Set(next.map(t => t.templateId));

  return {
    added: next.filter(t => !currentById.has(t.templateId)),
    removed: current
      .filter(t => !nextIds.has(t.templateId))
      .map(t => t.templateId),
    modified: next.filter(t => {
      const before = currentById.get(t.templateId);
      return (
        before !== undefined &&
        (before.type !== t.type || before.frequency !== t.frequency)
      );
    }),
  };
}
