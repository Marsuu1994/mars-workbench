import {beforeEach, describe, expect, it} from 'vitest';
import {prisma} from '@/lib/prisma';
import {TaskSize, TaskStatus, TaskType} from '@/utils/enums';
import {PROJECT_STEP_LIMIT} from '@/utils/projectUtils';
import {
  createProjectWithSteps,
  createWeek,
  moveTasks,
  newHabit,
  newUserId,
} from '../../test/factories';
import {MOMENTS, freezeTime} from '../../test/time';
import {
  addProjectStep,
  archiveProject,
  deleteProjectStep,
  fetchProjectsPage,
  moveProjectStep,
  scheduleProjectStep,
  unarchiveProject,
  unscheduleProjectStep,
  updateProject,
  updateProjectStep,
} from './projectService';

let userId: string;

beforeEach(() => {
  userId = newUserId();
  freezeTime(MOMENTS.WEDNESDAY_NOON);
});

/** The project's path as `number title`, in step order. */
const readPath = async (projectId: string) =>
  (
    await prisma.task.findMany({
      where: {userId, projectId},
      orderBy: {instanceIndex: 'asc'},
      select: {instanceIndex: true, title: true},
    })
  ).map(({instanceIndex, title}) => `${instanceIndex} ${title}`);

const createCourse = () =>
  createProjectWithSteps(userId, 'Course', ['Unit 1', 'Unit 2', 'Unit 3']);

const createActiveWeek = () =>
  createWeek(userId, {newTemplates: [newHabit('Run', TaskType.DAILY)]});

describe('projects', () => {
  it('creates a project with its steps numbered from 1', async () => {
    const course = await createCourse();
    expect(
      course.steps.map(({type, status, planId}) => [type, status, planId]),
    ).toEqual(Array(3).fill([TaskType.PROJECT, TaskStatus.BACKLOG, null]));
    expect(await readPath(course.id)).toEqual([
      '1 Unit 1',
      '2 Unit 2',
      '3 Unit 3',
    ]);
  });

  it('lists every project and their steps flat for the page', async () => {
    const course = await createCourse();
    const {plan} = await createActiveWeek();
    const page = await fetchProjectsPage(userId);
    expect(page.projects.map(({id}) => id)).toEqual([course.id]);
    expect(page.steps).toHaveLength(3);
    expect(page.activePlanId).toBe(plan.planId);
  });

  it('renames a project; an empty goal clears it', async () => {
    const course = await createProjectWithSteps(
      userId,
      'Course',
      [],
      'Pass A2',
    );
    const result = await updateProject(userId, course.id, {
      title: 'Spanish',
      goal: '',
    });
    expect(result).toMatchObject({project: {title: 'Spanish', goal: null}});
  });

  it("refuses another user's project and invented ids", async () => {
    const course = await createCourse();
    const otherUserId = newUserId();
    expect(await updateProject(otherUserId, course.id, {title: 'x'})).toEqual({
      error: 'projectNotFound',
    });
    expect(await archiveProject(userId, 'course-1')).toEqual({
      error: 'projectNotFound',
    });
  });

  it('archiving takes unfinished steps off the week; done steps stay', async () => {
    const course = await createCourse();
    const [unitOne, unitTwo] = course.steps;
    const {plan} = await createWeek(userId, {
      newTemplates: [newHabit('Run', TaskType.DAILY)],
      addProjectStepIds: [unitOne.id, unitTwo.id],
    });
    await moveTasks(userId, [[unitOne.id, TaskStatus.DONE]]);

    await archiveProject(userId, course.id);
    const planIds = await prisma.task.findMany({
      where: {projectId: course.id},
      orderBy: {instanceIndex: 'asc'},
      select: {planId: true},
    });
    expect(planIds.map(({planId}) => planId)).toEqual([
      plan.planId,
      null,
      null,
    ]);

    expect(await unarchiveProject(userId, course.id)).toMatchObject({
      project: {isArchived: false},
    });
  });
});

describe('steps', () => {
  it('adds a step at the end of the path', async () => {
    const course = await createCourse();
    const result = await addProjectStep(userId, course.id, {
      title: 'Quiz',
      size: TaskSize.EXTRA_SMALL,
    });
    expect(result).toMatchObject({step: {instanceIndex: 4, points: 1}});
  });

  it(`stops at ${PROJECT_STEP_LIMIT} steps`, async () => {
    const titles = Array.from(
      {length: PROJECT_STEP_LIMIT},
      (_, index) => `Step ${index + 1}`,
    );
    const course = await createProjectWithSteps(userId, 'Long course', titles);
    expect(
      await addProjectStep(userId, course.id, {
        title: 'One too many',
        size: TaskSize.SMALL,
      }),
    ).toEqual({error: 'stepLimitReached'});
  });

  it('edits a step; a new size re-derives its points', async () => {
    const course = await createCourse();
    const result = await updateProjectStep(userId, course.steps[0].id, {
      size: TaskSize.LARGE,
      description: 'Chapters 1–3',
    });
    expect(result).toMatchObject({
      step: {size: TaskSize.LARGE, points: 5, description: 'Chapters 1–3'},
    });
  });

  it('deleting a step moves the ones after it up', async () => {
    const course = await createCourse();
    await deleteProjectStep(userId, course.steps[0].id);
    expect(await readPath(course.id)).toEqual(['1 Unit 2', '2 Unit 3']);
  });

  it('keeps a done step', async () => {
    const course = await createCourse();
    await moveTasks(userId, [[course.steps[0].id, TaskStatus.DONE]]);
    expect(await deleteProjectStep(userId, course.steps[0].id)).toEqual({
      error: 'stepNotFound',
    });
  });

  it('moves a step and renumbers the path', async () => {
    const course = await createCourse();
    const [unitOne, , unitThree] = course.steps;
    const result = await moveProjectStep(userId, course.id, {
      stepId: unitThree.id,
      beforeStepId: unitOne.id,
    });
    expect(
      'project' in result && result.project.steps.map(({title}) => title),
    ).toEqual(['Unit 3', 'Unit 1', 'Unit 2']);
    expect(await readPath(course.id)).toEqual([
      '1 Unit 3',
      '2 Unit 1',
      '3 Unit 2',
    ]);
  });

  it('refuses to move a step before itself', async () => {
    const course = await createCourse();
    const [unitOne] = course.steps;
    expect(
      await moveProjectStep(userId, course.id, {
        stepId: unitOne.id,
        beforeStepId: unitOne.id,
      }),
    ).toEqual({error: 'stepNotFound'});
  });
});

describe('scheduling', () => {
  it('needs an active plan', async () => {
    const course = await createCourse();
    expect(await scheduleProjectStep(userId, course.steps[0].id)).toEqual({
      error: 'noActivePlan',
    });
  });

  it("puts a step on this week's backlog and takes it back", async () => {
    const course = await createCourse();
    const {plan} = await createActiveWeek();
    const [, unitTwo] = course.steps;

    expect(await scheduleProjectStep(userId, unitTwo.id)).toMatchObject({
      step: {planId: plan.planId, status: TaskStatus.BACKLOG},
    });
    expect(await unscheduleProjectStep(userId, unitTwo.id)).toMatchObject({
      step: {planId: null},
    });
  });

  it("won't schedule a step of an archived project", async () => {
    const course = await createCourse();
    await createActiveWeek();
    await archiveProject(userId, course.id);
    expect(await scheduleProjectStep(userId, course.steps[0].id)).toEqual({
      error: 'stepNotFound',
    });
  });
});
