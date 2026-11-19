import type {BoardProject} from '@/lib/db/projects';
import type {BoardCard} from '@/utils/boardCardUtils';
import {TaskKind, type BoardPlan} from '@/utils/taskUtils';

/** The backlog's sections, in the order the panel and the sheet show them. */
export const BacklogSection = {
  HABITS: 'HABITS',
  PROJECTS: 'PROJECTS',
} as const;
export type BacklogSection =
  (typeof BacklogSection)[keyof typeof BacklogSection];

/**
 * One habit's tasks in the backlog, or one project's steps: the card shows
 * `next`, and `behind` waits under it in the order it will come up.
 */
export interface BacklogGroup {
  /** The habit's template id, or the project's id */
  key: string;
  next: BoardCard;
  behind: BoardCard[];
}

export type BacklogSections = Record<BacklogSection, BacklogGroup[]>;

/** What toBacklogSections reads besides the cards. */
export interface BacklogGroupInputs {
  /** Its habits in the order they were created (fetchBoard's plan) */
  plan: BoardPlan;
  /** In the order they were created (fetchBoard's lookup) */
  projects: BoardProject[];
}

const SECTION_BY_KIND: Record<TaskKind, BacklogSection | null> = {
  [TaskKind.HABIT]: BacklogSection.HABITS,
  [TaskKind.PROJECT]: BacklogSection.PROJECTS,
  // A one-off never waits in the backlog: tracking it puts it in Todo
  [TaskKind.ONE_OFF]: null,
};

/** A card's group: its habit's template, or its step's project. */
const getGroupKey = ({task}: BoardCard): string | null =>
  task.templateId ?? task.projectId;

/**
 * The order tasks come up within a group: a daily habit's days in order,
 * then copy 1, 2, 3… or step 1, 2, 3…; ties by when each was made, then id.
 */
const compareWithinGroup = ({task: a}: BoardCard, {task: b}: BoardCard) =>
  (a.forDate?.getTime() ?? 0) - (b.forDate?.getTime() ?? 0) ||
  a.instanceIndex - b.instanceIndex ||
  a.createdAt.getTime() - b.createdAt.getTime() ||
  a.id.localeCompare(b.id);

/**
 * The backlog's cards grouped for the panel and the sheet: one group per
 * habit and one per project, each showing its next task. The groups in a
 * section run in the order their habit or project was created, which is the
 * order the plan and the lookup list them in; a group neither lists (a habit
 * off the plan, a project the lookup lacks) comes last, by its key. Pure, so
 * BoardPage re-runs it on every optimistic move.
 */
export function toBacklogSections(
  cards: BoardCard[],
  {plan, projects}: BacklogGroupInputs,
): BacklogSections {
  const rankByKey = new Map<string, number>([
    ...plan.planTemplates.map(
      ({templateId}, index) => [templateId, index] as const,
    ),
    ...projects.map(({id}, index) => [id, index] as const),
  ]);

  const cardsByKey = new Map<string, BoardCard[]>();
  for (const card of cards) {
    const key = getGroupKey(card);
    if (!key || !SECTION_BY_KIND[card.kind]) continue;
    cardsByKey.set(key, [...(cardsByKey.get(key) ?? []), card]);
  }

  const sections: BacklogSections = {
    [BacklogSection.HABITS]: [],
    [BacklogSection.PROJECTS]: [],
  };
  for (const [key, groupCards] of cardsByKey) {
    const [next, ...behind] = [...groupCards].sort(compareWithinGroup);
    const section = SECTION_BY_KIND[next.kind];
    if (section) sections[section].push({key, next, behind});
  }

  const rankOf = ({key}: BacklogGroup) =>
    rankByKey.get(key) ?? Number.POSITIVE_INFINITY;
  const compareGroups = (a: BacklogGroup, b: BacklogGroup) =>
    rankOf(a) - rankOf(b) || a.key.localeCompare(b.key);
  for (const groups of Object.values(sections)) groups.sort(compareGroups);
  return sections;
}

/** How many tasks wait in the backlog: every task in every group. */
export const countBacklogTasks = (sections: BacklogSections): number =>
  Object.values(sections)
    .flat()
    .reduce((sum, {behind}) => sum + 1 + behind.length, 0);
