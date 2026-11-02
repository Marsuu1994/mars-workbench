/**
 * design/flows/priorities.md, one describe per flow. Every test seeds the
 * data it reads (e2e/fixtures.ts) and runs at both widths.
 */
import {newHabit} from '../test/factories';
import {PriorityQuadrant, TaskType} from '@/utils/enums';
import {findBoardCard} from './actions/board';
import {findMatrixCard, trackThisWeek} from './actions/priorities';
import {expect, expectToSee, openPage, test} from './fixtures';

const ONE_OFF_TITLES = {
  doFirst: 'Renew passport',
  schedule: 'Set up a retirement account',
};

test.describe('Priorities Landing Flow', () => {
  test('the priority matrix lists the open one-offs', async ({page, seed}) => {
    await seed.createOneOff({
      title: ONE_OFF_TITLES.doFirst,
      quadrant: PriorityQuadrant.DO_FIRST,
    });
    await seed.createOneOff({
      title: ONE_OFF_TITLES.schedule,
      quadrant: PriorityQuadrant.SCHEDULE,
    });

    await page.goto('/kanban/priorities');
    for (const title of Object.values(ONE_OFF_TITLES)) {
      await expectToSee(page, title);
    }
  });
});

test.describe('Track This Week Flow', () => {
  test('a one-off tracked from the matrix lands on the board', async ({
    page,
    seed,
    isMobile,
  }) => {
    const title = ONE_OFF_TITLES.schedule;
    await seed.createWeek({
      newTemplates: [newHabit('Flashcards', TaskType.DAILY)],
    });
    await seed.createOneOff({title, quadrant: PriorityQuadrant.SCHEDULE});
    await openPage(page, '/kanban/priorities');

    await trackThisWeek(page, isMobile, title);
    // "This Week" on desktop, ★ on mobile: the tag carries both
    await expect(findMatrixCard(page, title)).toContainText('This Week');

    await page.goto('/kanban');
    await expect(findBoardCard(page, 'TODO', title)).toBeVisible();
  });
});
