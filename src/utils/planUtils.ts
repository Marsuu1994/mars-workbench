import type {
  PlanTemplateDiff,
  PlanTemplateInput,
  PlanTemplatePatch,
  PlanTemplatePatchConflicts,
} from '../types/plan';

// ── Routes ───────────────────────────────────────────────────────────────────

const PLANS_PATH = '/kanban/plans';

/** The Plan nav item: the active plan's form, or a new plan's when there is
    none. */
export const getPlanHref = (activePlanId: string | null) =>
  activePlanId ? `${PLANS_PATH}/${activePlanId}` : `${PLANS_PATH}/new`;

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
  const currentById = new Map(
    current.map(template => [template.templateId, template]),
  );
  const nextIds = new Set(next.map(template => template.templateId));

  return {
    added: next.filter(template => !currentById.has(template.templateId)),
    removed: current
      .filter(template => !nextIds.has(template.templateId))
      .map(template => template.templateId),
    modified: next.filter(template => {
      const before = currentById.get(template.templateId);
      return (
        before !== undefined &&
        (before.type !== template.type ||
          before.frequency !== template.frequency)
      );
    }),
  };
}

/** Ids that occur more than once, each listed once. */
export function findRepeatedIds(ids: readonly string[]): string[] {
  const seenIds = new Set<string>();
  const repeatedIds = new Set<string>();
  for (const id of ids) {
    if (seenIds.has(id)) repeatedIds.add(id);
    else seenIds.add(id);
  }
  return [...repeatedIds];
}

/**
 * Apply a patch to a plan's current template links: the next full list (the
 * shape the plan update takes) plus the ids the patch cannot apply. Pure — the
 * caller rejects the patch when any conflict list is non-empty.
 */
export function applyTemplatePatch(
  currentTemplates: readonly PlanTemplateInput[],
  {addTemplates, updateTemplates, removeTemplateIds}: PlanTemplatePatch,
): {templates: PlanTemplateInput[]; conflicts: PlanTemplatePatchConflicts} {
  const linkedTemplateIds = new Set(
    currentTemplates.map(template => template.templateId),
  );
  const updateByTemplateId = new Map(
    updateTemplates.map(update => [update.templateId, update]),
  );
  const removedTemplateIds = new Set(removeTemplateIds);

  const keptTemplates = currentTemplates
    .filter(template => !removedTemplateIds.has(template.templateId))
    .map(({templateId, type, frequency}) => {
      const {type: nextType = type, frequency: nextFrequency = frequency} =
        updateByTemplateId.get(templateId) ?? {templateId};
      return {templateId, type: nextType, frequency: nextFrequency};
    });

  const addedTemplateIds = addTemplates.map(template => template.templateId);
  return {
    templates: [...keptTemplates, ...addTemplates],
    conflicts: {
      alreadyInPlan: [...new Set(addedTemplateIds)].filter(templateId =>
        linkedTemplateIds.has(templateId),
      ),
      notInPlan: [
        ...new Set([...updateByTemplateId.keys(), ...removedTemplateIds]),
      ].filter(templateId => !linkedTemplateIds.has(templateId)),
      repeated: findRepeatedIds([
        ...addedTemplateIds,
        ...updateTemplates.map(update => update.templateId),
        ...removeTemplateIds,
      ]),
    },
  };
}
