import {
  TaskType,
  TaskStatus,
  TaskSize,
  PriorityQuadrant,
  SIZE_TO_POINTS,
} from "@/lib/kanban/enums";
import type { TaskItem } from "@/lib/db/tasks";
import type { RiskLevel } from "@/features/board/utils/taskUtils";

// ── Page copy ──────────────────────────────────────────────────────────────
export const GALLERY_TITLE = "Component Gallery";
export const GALLERY_SUBTITLE =
  "Mars Workbench design-system primitives, rendered with sample data. Toggle the theme to preview both palettes.";

export const THEME_DARK = "mars-dark";
export const THEME_LIGHT = "mars-light";

// ── Shared fixtures ──────────────────────────────────────────────────────────
export const TODAY = new Date();
const YESTERDAY = new Date(TODAY.getTime() - 24 * 60 * 60 * 1000);

/** Every TaskSize in display order, paired with its Fibonacci points. */
export const SIZE_FIXTURES: { size: TaskSize; points: number }[] = [
  TaskSize.EXTRA_SMALL,
  TaskSize.SMALL,
  TaskSize.MEDIUM,
  TaskSize.LARGE,
  TaskSize.EXTRA_LARGE,
].map((size) => ({ size, points: SIZE_TO_POINTS[size] }));

/** Each task type rendered through the badge. */
export const TYPE_FIXTURES: string[] = [TaskType.DAILY, TaskType.WEEKLY, TaskType.AD_HOC];

/** Quick-start chips shown under the assistant welcome message. */
export const SUGGESTION_CHIPS: string[] = [
  "Plan my week",
  "Add a daily habit",
  "Break down a big task",
];

export const LOADING_LABEL = "Drafting your plan…";

// ── Task card fixtures ───────────────────────────────────────────────────────
const baseTask = (overrides: Partial<TaskItem>): TaskItem => ({
  id: "sample",
  planId: "plan-1",
  templateId: null,
  type: TaskType.DAILY,
  title: "Sample task",
  description: null,
  size: TaskSize.MEDIUM,
  points: 3,
  status: TaskStatus.TODO,
  forDate: null,
  periodKey: null,
  quadrant: null,
  instanceIndex: 0,
  createdAt: TODAY,
  updatedAt: TODAY,
  doneAt: null,
  ...overrides,
});

export interface TaskCardFixture {
  label: string;
  task: TaskItem;
  taskType: string;
  riskLevel: RiskLevel;
  frequency: number;
}

export const TASK_CARD_FIXTURES: TaskCardFixture[] = [
  {
    label: "Default",
    task: baseTask({
      id: "t-default",
      title: "Review pull requests",
      description: "Go through the open PRs and leave feedback.",
    }),
    taskType: TaskType.DAILY,
    riskLevel: "normal",
    frequency: 1,
  },
  {
    label: "At risk (warning)",
    task: baseTask({
      id: "t-warning",
      title: "Write weekly summary",
      size: TaskSize.LARGE,
      points: SIZE_TO_POINTS[TaskSize.LARGE],
      type: TaskType.WEEKLY,
    }),
    taskType: TaskType.WEEKLY,
    riskLevel: "warning",
    frequency: 1,
  },
  {
    label: "Urgent (danger)",
    task: baseTask({
      id: "t-danger",
      title: "Ship the release build",
      size: TaskSize.EXTRA_LARGE,
      points: SIZE_TO_POINTS[TaskSize.EXTRA_LARGE],
      type: TaskType.WEEKLY,
    }),
    taskType: TaskType.WEEKLY,
    riskLevel: "danger",
    frequency: 1,
  },
  {
    label: "Rollover (overdue daily)",
    task: baseTask({
      id: "t-rollover",
      title: "Stretch for 10 minutes",
      forDate: YESTERDAY,
      size: TaskSize.EXTRA_SMALL,
      points: SIZE_TO_POINTS[TaskSize.EXTRA_SMALL],
    }),
    taskType: TaskType.DAILY,
    riskLevel: "normal",
    frequency: 1,
  },
  {
    label: "Multi-instance (#2)",
    task: baseTask({
      id: "t-instance",
      title: "Stand-up notes",
      instanceIndex: 1,
      size: TaskSize.SMALL,
      points: SIZE_TO_POINTS[TaskSize.SMALL],
    }),
    taskType: TaskType.DAILY,
    riskLevel: "normal",
    frequency: 5,
  },
  {
    label: "Done",
    task: baseTask({
      id: "t-done",
      title: "Clear inbox",
      status: TaskStatus.DONE,
      doneAt: TODAY,
    }),
    taskType: TaskType.DAILY,
    riskLevel: "normal",
    frequency: 1,
  },
];

// ── Matrix card fixtures ─────────────────────────────────────────────────────
export interface MatrixCardFixture {
  label: string;
  task: TaskItem;
  isTracked: boolean;
}

export const MATRIX_CARD_FIXTURES: MatrixCardFixture[] = [
  {
    label: "Default (hover for send)",
    task: baseTask({
      id: "m-default",
      type: TaskType.AD_HOC,
      title: "Call dentist",
      description: "Annual checkup is overdue",
      size: TaskSize.SMALL,
      points: SIZE_TO_POINTS[TaskSize.SMALL],
      status: TaskStatus.BACKLOG,
      planId: null,
      quadrant: PriorityQuadrant.DO_FIRST,
    }),
    isTracked: false,
  },
  {
    label: "Tracked (This Week)",
    task: baseTask({
      id: "m-tracked",
      type: TaskType.AD_HOC,
      title: "Shop birthday gift",
      description: "For mom — this Saturday",
      status: TaskStatus.TODO,
      quadrant: PriorityQuadrant.DO_FIRST,
    }),
    isTracked: true,
  },
];

// ── Progress dashboard fixture ───────────────────────────────────────────────
export const PROGRESS_FIXTURE = {
  todayDoneCount: 4,
  todayTotalCount: 6,
  todayDonePoints: 11,
  todayTotalPoints: 17,
  weekDoneCount: 18,
  weekProjectedCount: 30,
  weekDonePoints: 47,
  weekProjectedPoints: 82,
  daysElapsed: 3,
};
