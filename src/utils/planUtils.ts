import type {
  PlanTemplateDiff,
  PlanTemplateInput,
  PlanTemplatePatch,
  PlanTemplatePatchConflicts,
} from '../types/plan';

/** Per-plan template frequency bounds (× per day / week). */
export const FREQ_MIN = 1;
export const FREQ_MAX = 10;

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

/** Ids that occur more than once, each listed once. */
export function findRepeated(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) repeated.add(id);
    else seen.add(id);
  }
  return [...repeated];
}

/**
 * Apply a patch to a plan's current template links: the next full list (the
 * shape the plan update takes) plus the ids the patch cannot apply. Pure — the
 * caller rejects the patch when any conflict list is non-empty.
 */
export function applyTemplatePatch(
  current: readonly PlanTemplateInput[],
  {addTemplates, updateTemplates, removeTemplateIds}: PlanTemplatePatch,
): {templates: PlanTemplateInput[]; conflicts: PlanTemplatePatchConflicts} {
  const linked = new Set(current.map(t => t.templateId));
  const updates = new Map(updateTemplates.map(u => [u.templateId, u]));
  const removed = new Set(removeTemplateIds);

  const kept = current
    .filter(t => !removed.has(t.templateId))
    .map(({templateId, type, frequency}) => {
      const update = updates.get(templateId);
      return {
        templateId,
        type: update?.type ?? type,
        frequency: update?.frequency ?? frequency,
      };
    });

  return {
    templates: [...kept, ...addTemplates],
    conflicts: {
      alreadyInPlan: [...new Set(addTemplates.map(t => t.templateId))].filter(
        id => linked.has(id),
      ),
      notInPlan: [...new Set([...updates.keys(), ...removed])].filter(
        id => !linked.has(id),
      ),
      repeated: findRepeated([
        ...addTemplates.map(t => t.templateId),
        ...updateTemplates.map(u => u.templateId),
        ...removeTemplateIds,
      ]),
    },
  };
}
