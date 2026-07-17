import {
  TaskType,
  TaskSize,
  TaskStatus,
  SIZE_TO_POINTS,
  PlanMode,
} from '@/utils/enums';
import type {TaskTemplateItem} from '@/lib/db/taskTemplates';
import type {AdhocTaskItem} from '@/components/domain/plan/PlanForm';
import type {
  TemplateChange,
  ModifiedTemplate,
  AdhocTaskChange,
} from '@/components/domain/plan/ReviewChangesModal';

/* Plan scenario fixtures — the real PlanForm and ReviewChangesPanel fed a
   fictional template library and a change set touching every review section. */

const NOW = new Date('2026-07-10T15:00:00');

const template = (
  id: string,
  title: string,
  description: string,
  size: TaskSize,
): TaskTemplateItem => ({
  id,
  userId: 'scn-user',
  title,
  description,
  size,
  isArchived: false,
  createdAt: NOW,
  updatedAt: NOW,
});

export const PLAN_TEMPLATES: TaskTemplateItem[] = [
  template(
    'tpl-leetcode',
    'Solve LeetCode problems',
    'Two problems per session, timed',
    TaskSize.MEDIUM,
  ),
  template(
    'tpl-gym',
    'Go to gym',
    '30 min workout focusing on compound lifts',
    TaskSize.LARGE,
  ),
  template(
    'tpl-read',
    'Read 30 pages',
    'Current book club pick',
    TaskSize.SMALL,
  ),
  template(
    'tpl-sysdesign',
    'Study system design chapter',
    'One chapter with notes',
    TaskSize.LARGE,
  ),
  template('tpl-journal', 'Evening journal', '', TaskSize.EXTRA_SMALL),
];

/** Selected templates with their per-plan config (create + edit modes). */
export const PLAN_INITIAL_TEMPLATES = [
  {templateId: 'tpl-leetcode', type: TaskType.DAILY, frequency: 1},
  {templateId: 'tpl-gym', type: TaskType.WEEKLY, frequency: 3},
];

export const PLAN_ADHOC_TASKS: AdhocTaskItem[] = [
  {
    id: 'adhoc-tax',
    planId: null,
    title: 'File tax report',
    size: TaskSize.MEDIUM,
    points: SIZE_TO_POINTS[TaskSize.MEDIUM],
    status: TaskStatus.TODO,
  },
  {
    id: 'adhoc-ct',
    planId: 'scn-plan',
    title: 'Get sinus CT scan',
    size: TaskSize.SMALL,
    points: SIZE_TO_POINTS[TaskSize.SMALL],
    status: TaskStatus.DOING,
  },
];

export const PLAN_INITIAL_ADHOC_IDS = ['adhoc-ct'];

export const PLAN_EDIT_DESCRIPTION = 'Interview prep + system design';
export const PLAN_EDIT_MODE = PlanMode.EXTREME;
export const SCENARIO_PERIOD_KEY = '2026-W28';

/** Task-modal edit fixture — XL so the split-it-up size warning shows. */
export const EDIT_TEMPLATE: TaskTemplateItem = template(
  'scn-tpl-gym',
  'Go to gym',
  '30 min workout focusing on compound lifts',
  TaskSize.EXTRA_LARGE,
);

// ── Review-changes fixture — one entry per change section ────────────────────
const change = (
  templateId: string,
  title: string,
  size: TaskSize,
  type: TaskType,
  frequency: number,
): TemplateChange => ({
  templateId,
  title,
  size,
  points: SIZE_TO_POINTS[size],
  type,
  frequency,
});

export const REVIEW_ADDED: TemplateChange[] = [
  change('tpl-read', 'Read 30 pages', TaskSize.SMALL, TaskType.DAILY, 1),
];

export const REVIEW_REMOVED: TemplateChange[] = [
  change('tpl-jog', 'Morning jog 5km', TaskSize.MEDIUM, TaskType.DAILY, 1),
];

export const REVIEW_MODIFIED: ModifiedTemplate[] = [
  {
    templateId: 'tpl-gym',
    title: 'Go to gym',
    fromType: TaskType.DAILY,
    fromFrequency: 1,
    toType: TaskType.WEEKLY,
    toFrequency: 3,
  },
];

export const REVIEW_ADDED_ADHOC: AdhocTaskChange[] = [
  {
    id: 'adhoc-ct',
    title: 'Get sinus CT scan',
    size: TaskSize.MEDIUM,
    points: SIZE_TO_POINTS[TaskSize.MEDIUM],
  },
];

export const REVIEW_REMOVED_ADHOC: AdhocTaskChange[] = [
  {
    id: 'adhoc-passport',
    title: 'Renew passport',
    size: TaskSize.SMALL,
    points: SIZE_TO_POINTS[TaskSize.SMALL],
  },
];

/** Incomplete-task counts behind the removed/modified impact notes. */
export const REVIEW_INCOMPLETE_COUNTS: Record<string, number> = {
  'tpl-jog': 3,
  'tpl-gym': 2,
};
