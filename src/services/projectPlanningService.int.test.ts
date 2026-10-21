import {beforeEach, describe, expect, it} from 'vitest';
import {prisma} from '@/lib/prisma';
import {projectPatchSchema, projectSpecSchema} from '@/schemas';
import {TaskSize, TaskStatus, TaskType} from '@/utils/enums';
import {PLANNING_ERROR} from '@/utils/errorMessages';
import {PROJECT_STEP_LIMIT} from '@/utils/projectUtils';
import {createWeek, moveTasks, newHabit, newUserId} from '../../test/factories';
import {MOMENTS, freezeTime} from '../../test/time';
import {createProjectFromSpec, patchProject} from './projectPlanningService';

let userId: string;

beforeEach(() => {
  userId = newUserId();
  freezeTime(MOMENTS.WEDNESDAY_NOON);
});

const createCourse = async (stepCount = 3) => {
  const {project} = await createProjectFromSpec(
    userId,
    projectSpecSchema.parse({
      title: 'Course',
      steps: Array.from({length: stepCount}, (_, index) => ({
        title: `Unit ${index + 1}`,
        size: TaskSize.SMALL,
      })),
    }),
  );
  return project;
};

const patch = (input: Parameters<typeof projectPatchSchema.parse>[0]) =>
  patchProject(userId, projectPatchSchema.parse(input));

const readTitles = async (projectId: string) =>
  (
    await prisma.task.findMany({
      where: {userId, projectId},
      orderBy: {instanceIndex: 'asc'},
      select: {title: true},
    })
  ).map(({title}) => title);

describe('createProjectFromSpec', () => {
  it('creates a project whose steps are all upcoming', async () => {
    const project = await createCourse();
    expect(project).toMatchObject({
      title: 'Course',
      doneCount: 0,
      stepCount: 3,
      allStepsDone: false,
    });
    expect(
      project.steps.map(({stepNumber, state}) => [stepNumber, state]),
    ).toEqual([
      [1, 'UPCOMING'],
      [2, 'UPCOMING'],
      [3, 'UPCOMING'],
    ]);
  });
});

describe('patchProject', () => {
  it('removes, edits, moves and adds steps in one go, then renumbers', async () => {
    const project = await createCourse();
    const [unitOne, unitTwo, unitThree] = project.steps;

    const {changes, project: patched} = await patch({
      projectId: project.projectId,
      title: 'Spanish',
      removeStepIds: [unitOne.stepId],
      updateSteps: [{stepId: unitTwo.stepId, title: 'Unit 2 — Past tense'}],
      moveSteps: [{stepId: unitThree.stepId, beforeStepId: unitTwo.stepId}],
      addSteps: [{title: 'Quiz', size: TaskSize.EXTRA_SMALL}],
    });

    expect(patched.title).toBe('Spanish');
    expect(await readTitles(project.projectId)).toEqual([
      'Unit 3',
      'Unit 2 — Past tense',
      'Quiz',
    ]);
    expect(patched.steps.map(({stepNumber}) => stepNumber)).toEqual([1, 2, 3]);
    expect(changes).toMatchObject({
      removedSteps: [{id: unitOne.stepId, title: 'Unit 1'}],
      updatedSteps: [{id: unitTwo.stepId, title: 'Unit 2 — Past tense'}],
      movedSteps: [{id: unitThree.stepId, title: 'Unit 3'}],
      addedSteps: [{title: 'Quiz'}],
    });
  });

  it('rejects the whole patch when a step is done, and writes nothing', async () => {
    const project = await createCourse();
    const [unitOne, unitTwo] = project.steps;
    await moveTasks(userId, [[unitOne.stepId, TaskStatus.DONE]]);

    await expect(
      patch({
        projectId: project.projectId,
        title: 'Never written',
        removeStepIds: [unitOne.stepId, unitTwo.stepId],
      }),
    ).rejects.toThrow(PLANNING_ERROR.STEPS_DONE([unitOne.stepId]));
    expect(await readTitles(project.projectId)).toEqual([
      'Unit 1',
      'Unit 2',
      'Unit 3',
    ]);
  });

  it(`refuses a path longer than ${PROJECT_STEP_LIMIT} steps`, async () => {
    const project = await createCourse(PROJECT_STEP_LIMIT);
    await expect(
      patch({
        projectId: project.projectId,
        addSteps: [{title: 'One too many', size: TaskSize.SMALL}],
      }),
    ).rejects.toThrow(
      PLANNING_ERROR.PROJECT_STEP_LIMIT(PROJECT_STEP_LIMIT + 1),
    );
  });

  it('archives, refuses changes while archived, and unarchives', async () => {
    const project = await createCourse();
    const [unitOne] = project.steps;
    await createWeek(userId, {
      newTemplates: [newHabit('Run', TaskType.DAILY)],
      addProjectStepIds: [unitOne.stepId],
    });

    const {changes, project: archived} = await patch({
      projectId: project.projectId,
      archived: true,
    });
    expect(changes.archived).toBe(true);
    // Archiving took the step off the week
    expect(archived.steps[0].state).toBe('UPCOMING');

    await expect(
      patch({projectId: project.projectId, title: 'Renamed'}),
    ).rejects.toThrow(PLANNING_ERROR.PROJECT_ARCHIVED(project.projectId));

    const {changes: unarchiving} = await patch({
      projectId: project.projectId,
      archived: false,
      title: 'Back on',
    });
    expect(unarchiving.archived).toBe(false);
  });

  it("refuses another user's project", async () => {
    const project = await createCourse();
    await expect(
      patchProject(
        newUserId(),
        projectPatchSchema.parse({projectId: project.projectId, title: 'x'}),
      ),
    ).rejects.toThrow(PLANNING_ERROR.PROJECT_NOT_FOUND(project.projectId));
  });
});
