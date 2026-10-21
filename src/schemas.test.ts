import {randomUUID} from 'node:crypto';
import {describe, expect, it} from 'vitest';
import {
  habitPatchSchema,
  planPatchSchema,
  planSpecSchema,
  projectSpecSchema,
} from './schemas';
import {PlanMode, TaskSize, TaskType} from './utils/enums';
import {FREQ_MAX, FREQ_MIN} from './utils/planUtils';
import {PROJECT_STEP_LIMIT} from './utils/projectUtils';

const planId = randomUUID();
const templateId = randomUUID();

describe('planSpecSchema', () => {
  it('fills the defaults an empty spec leaves out', () => {
    expect(planSpecSchema.parse({})).toEqual({
      mode: PlanMode.NORMAL,
      templates: [],
      newTemplates: [],
      addProjectStepIds: [],
    });
  });

  it.each([FREQ_MIN - 1, FREQ_MAX + 1, 1.5])(
    'rejects a frequency of %s',
    frequency => {
      const spec = {templates: [{templateId, type: TaskType.DAILY, frequency}]};
      expect(planSpecSchema.safeParse(spec).success).toBe(false);
    },
  );

  it('takes only habit types for a plan line', () => {
    const spec = {
      templates: [{templateId, type: TaskType.PROJECT, frequency: 1}],
    };
    expect(planSpecSchema.safeParse(spec).success).toBe(false);
  });
});

describe('planPatchSchema', () => {
  it('rejects a patch that changes nothing', () => {
    expect(planPatchSchema.safeParse({planId}).success).toBe(false);
    expect(
      planPatchSchema.safeParse({planId, description: 'Focus week'}).success,
    ).toBe(true);
  });

  it('needs a new type or frequency in a template update', () => {
    expect(
      planPatchSchema.safeParse({planId, updateTemplates: [{templateId}]})
        .success,
    ).toBe(false);
    expect(
      planPatchSchema.safeParse({
        planId,
        updateTemplates: [{templateId, frequency: 2}],
      }).success,
    ).toBe(true);
  });

  it('rejects an invented, non-uuid id', () => {
    expect(
      planPatchSchema.safeParse({planId: 'plan-1', description: 'x'}).success,
    ).toBe(false);
  });
});

describe('habitPatchSchema', () => {
  it('needs at least one field to change', () => {
    expect(habitPatchSchema.safeParse({templateId}).success).toBe(false);
    expect(
      habitPatchSchema.safeParse({templateId, size: TaskSize.LARGE}).success,
    ).toBe(true);
  });
});

describe('projectSpecSchema', () => {
  const steps = (count: number) =>
    Array.from({length: count}, (_, index) => ({
      title: `Step ${index + 1}`,
      size: TaskSize.SMALL,
    }));

  it(`holds at most ${PROJECT_STEP_LIMIT} steps`, () => {
    expect(
      projectSpecSchema.safeParse({
        title: 'Course',
        steps: steps(PROJECT_STEP_LIMIT),
      }).success,
    ).toBe(true);
    expect(
      projectSpecSchema.safeParse({
        title: 'Course',
        steps: steps(PROJECT_STEP_LIMIT + 1),
      }).success,
    ).toBe(false);
  });

  it('trims a title and rejects a blank one', () => {
    expect(projectSpecSchema.parse({title: '  Course  '}).title).toBe('Course');
    expect(projectSpecSchema.safeParse({title: '   '}).success).toBe(false);
  });
});
