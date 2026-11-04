import {randomUUID} from 'node:crypto';
import {describe, expect, it} from 'vitest';
import {
  createPlanSchema,
  habitPatchSchema,
  planPatchSchema,
  planSpecSchema,
  projectSpecSchema,
} from './schemas';
import {PeriodType, PlanMode, TaskSize, TaskType} from './utils/enums';
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
      addOneOffTaskIds: [],
      addProjectStepIds: [],
    });
  });
});

// The MCP tools and the plan form take the same plan lines
describe.each([
  {name: 'planSpecSchema (MCP)', schema: planSpecSchema, base: {}},
  {
    name: 'createPlanSchema (plan form)',
    schema: createPlanSchema,
    base: {periodType: PeriodType.WEEKLY},
  },
])('$name: plan lines', ({schema, base}) => {
  const withLine = (type: TaskType, frequency: number) => ({
    ...base,
    templates: [{templateId, type, frequency}],
  });

  it('takes a habit line', () => {
    expect(schema.safeParse(withLine(TaskType.WEEKLY, 3)).success).toBe(true);
  });

  it.each([FREQ_MIN - 1, FREQ_MAX + 1, 1.5])(
    'rejects a frequency of %s',
    frequency => {
      expect(
        schema.safeParse(withLine(TaskType.DAILY, frequency)).success,
      ).toBe(false);
    },
  );

  it.each([TaskType.AD_HOC, TaskType.PROJECT])(
    'takes only habit types, not %s',
    type => {
      expect(schema.safeParse(withLine(type, 1)).success).toBe(false);
    },
  );
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
