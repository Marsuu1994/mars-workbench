'use client';

import {toBoardCards} from '@/utils/boardCardUtils';
import {DayState, toDayListCards, toDayRings} from '@/utils/dayRingUtils';
import {TaskStatus} from '@/utils/enums';
import {DayList} from '@/components/domain/board/day-rings/DayList';
import {
  MID_WEEK_EXPIRED_DAILY_COUNTS,
  MID_WEEK_TASKS,
  SCENARIO_PLAN,
  SCENARIO_PROJECTS,
} from './fixtures';

const NOOP = () => {};

/**
 * Today's list from the mid-week fixtures, rendered inline in a phone-width
 * sheet frame: the live mobile sheet is a top-layer <dialog>, which would
 * escape the scenario frame. The rings are the board's own, against the
 * viewer's clock.
 */
export const DayListSheetFrame = () => {
  const rings = toDayRings(MID_WEEK_TASKS, {
    periodKey: SCENARIO_PLAN.periodKey,
    expiredDailyCountByDate: MID_WEEK_EXPIRED_DAILY_COUNTS,
    now: new Date(),
  });
  const today = rings.find(({state}) => state === DayState.TODAY) ?? rings[0];
  const doneCards = toBoardCards(MID_WEEK_TASKS, {
    plan: SCENARIO_PLAN,
    projects: SCENARIO_PROJECTS,
  })[TaskStatus.DONE];

  return (
    <div className="flex h-full flex-col justify-end bg-base-200/20 p-3">
      <div className="mx-auto flex max-h-[70vh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-2xl border border-base-content/10 bg-base-100 shadow-lg">
        <DayList
          ring={today}
          cards={toDayListCards(doneCards, today.date)}
          onClose={NOOP}
        />
      </div>
    </div>
  );
};
