// Spec: design/specs/board.md
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {revalidatePath} from 'next/cache';
import {getCurrentUserId} from '@/lib/auth/getCurrentUserId';
import {getBoardTasksByPlanId} from '@/lib/db/tasks';
import {trackTaskThisWeek} from '@/services/matrixService';
import {PlanMode, TaskStatus, TaskType} from '@/utils/enums';
import {
  createOneOff,
  createWeek,
  newHabit,
  newUserId,
} from '../../test/factories';
import {MOMENTS, freezeTime} from '../../test/time';
import {updateTaskStatusAction} from './taskActions';

// An action's two edges outside the database: who is signed in, and which
// pages Next reloads once the action returns
vi.mock('next/cache', () => ({revalidatePath: vi.fn()}));
vi.mock('@/lib/auth/getCurrentUserId', () => ({getCurrentUserId: vi.fn()}));

let userId: string;

beforeEach(() => {
  userId = newUserId();
  vi.mocked(getCurrentUserId).mockResolvedValue(userId);
  vi.mocked(revalidatePath).mockClear();
  freezeTime(MOMENTS.MONDAY_NOON);
});

describe('updateTaskStatusAction', () => {
  it('MV-7 a move reloads the board', async () => {
    const {plan} = await createWeek(userId, {
      mode: PlanMode.NORMAL,
      newTemplates: [newHabit('Review', TaskType.WEEKLY)],
    });
    const [review] = await getBoardTasksByPlanId(userId, plan.planId);

    expect(
      await updateTaskStatusAction(review.id, {status: TaskStatus.TODO}),
    ).toMatchObject({data: {status: TaskStatus.TODO}});
    expect(vi.mocked(revalidatePath).mock.calls).toEqual([['/kanban']]);
  });

  it('MV-7 a one-off moved to Done reloads the priority matrix too', async () => {
    await createWeek(userId, {
      mode: PlanMode.NORMAL,
      newTemplates: [newHabit('Review', TaskType.WEEKLY)],
    });
    const passport = await createOneOff(userId, {title: 'Renew passport'});
    await trackTaskThisWeek(userId, passport.id, TaskStatus.TODO);

    expect(
      await updateTaskStatusAction(passport.id, {status: TaskStatus.DONE}),
    ).toMatchObject({data: {status: TaskStatus.DONE}});
    expect(vi.mocked(revalidatePath).mock.calls).toEqual([
      ['/kanban'],
      ['/kanban/priorities'],
    ]);
  });
});
