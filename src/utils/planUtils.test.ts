import {describe, expect, it} from 'vitest';
import {TaskType} from './enums';
import {
  applyTemplatePatch,
  diffPlanTemplates,
  findRepeatedIds,
  getPlanHref,
} from './planUtils';

const run = {templateId: 'run', type: TaskType.DAILY, frequency: 1};
const review = {templateId: 'review', type: TaskType.WEEKLY, frequency: 2};
const read = {templateId: 'read', type: TaskType.WEEKLY, frequency: 3};

describe('getPlanHref', () => {
  it("opens the active plan, or a new one's form", () => {
    expect(getPlanHref('plan-1')).toBe('/kanban/plans/plan-1');
    expect(getPlanHref(null)).toBe('/kanban/plans/new');
  });
});

describe('diffPlanTemplates', () => {
  it('splits a new full list into added, removed and modified', () => {
    const next = [{...run, frequency: 2}, read];
    expect(diffPlanTemplates([run, review], next)).toEqual({
      added: [read],
      removed: ['review'],
      modified: [{...run, frequency: 2}],
    });
  });

  it('a type change is a modification too', () => {
    const toDaily = {...review, type: TaskType.DAILY};
    expect(diffPlanTemplates([review], [toDaily]).modified).toEqual([toDaily]);
  });

  it('finds nothing in an unchanged list', () => {
    expect(diffPlanTemplates([run, review], [review, run])).toEqual({
      added: [],
      removed: [],
      modified: [],
    });
  });
});

describe('findRepeatedIds', () => {
  it('lists each repeated id once', () => {
    expect(findRepeatedIds(['a', 'b', 'a', 'c', 'a', 'b'])).toEqual(['a', 'b']);
    expect(findRepeatedIds(['a', 'b'])).toEqual([]);
  });
});

describe('applyTemplatePatch', () => {
  it('removes, updates and appends in one full list', () => {
    const {templates, conflicts} = applyTemplatePatch([run, review], {
      addTemplates: [read],
      updateTemplates: [{templateId: 'run', frequency: 3}],
      removeTemplateIds: ['review'],
    });
    expect(templates).toEqual([{...run, frequency: 3}, read]);
    expect(conflicts).toEqual({alreadyInPlan: [], notInPlan: [], repeated: []});
  });

  it('keeps the old type when an update only changes frequency', () => {
    const {templates} = applyTemplatePatch([review], {
      addTemplates: [],
      updateTemplates: [{templateId: 'review', type: TaskType.DAILY}],
      removeTemplateIds: [],
    });
    expect(templates).toEqual([{...review, type: TaskType.DAILY}]);
  });

  it('reports every id it cannot apply', () => {
    const {conflicts} = applyTemplatePatch([run, review], {
      addTemplates: [run],
      updateTemplates: [{templateId: 'ghost', frequency: 1}],
      removeTemplateIds: ['review', 'review', 'missing'],
    });
    expect(conflicts).toEqual({
      alreadyInPlan: ['run'],
      notInPlan: ['ghost', 'missing'],
      repeated: ['review'],
    });
  });
});
