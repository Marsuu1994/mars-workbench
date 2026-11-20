'use client';

import {useEffect, useRef} from 'react';
import {useTranslations} from 'next-intl';
import {DayState, RING_KIND_ORDER, type DayRing} from '@/utils/dayRingUtils';
import {useBoardPageContext} from '../BoardPageContext';
import {restartAnimationClass} from '../motion/completionMotion';
import {DayRingGraphic} from './DayRingGraphic';
import {DAY_NAME_KEYS, RING_SIZE} from './constants';

/** A cell that is a button: it shrinks and darkens inside while pressed, and
    a hover draws a line under it, nothing more. */
const BUTTON_CELL_CLASS =
  "fx-press relative cursor-pointer [--fx-press-scale:0.96] transition-[transform,box-shadow,border-color] duration-150 motion-reduce:transition-none active:shadow-[inset_0_2px_7px_oklch(0_0_0/0.4)] after:absolute after:inset-x-[22%] after:bottom-0.5 after:h-0.5 after:rounded-sm after:bg-primary after:opacity-0 after:shadow-[0_2px_8px_var(--color-primary)] after:transition-opacity after:duration-150 after:content-[''] hover:after:opacity-100 motion-reduce:after:transition-none";
/** The cell whose list is open: a full frame and a glow rising inside it */
const OPEN_CELL_CLASS =
  'border-primary bg-[radial-gradient(ellipse_90%_80%_at_50%_100%,color-mix(in_oklab,var(--color-primary)_22%,transparent),transparent_75%)] shadow-[inset_0_0_14px_color-mix(in_oklab,var(--color-primary)_16%,transparent),0_0_12px_color-mix(in_oklab,var(--color-primary)_14%,transparent)]';

interface DayCellProps {
  ring: DayRing;
}

/**
 * One day of the row of rings. Today's cell is wider and framed, with its
 * ring, Today and its count; every other day holds its short name over its
 * ring. Today and the days before it are buttons that open the day's list
 * (DAY-1); a day after today is neither (RING-7). Today's cell jumps once
 * when a card is finished (fx-ring-tick) and celebrates when its ring closes
 * (fx-ring-close).
 */
export const DayCell = ({ring}: DayCellProps) => {
  const t = useTranslations('Board.Rings');
  const {openDayDate, toggleDay, tickKey, celebrationKey} =
    useBoardPageContext();
  const motionRef = useRef<HTMLSpanElement>(null);
  const {
    date,
    dayIndex,
    state,
    done,
    planned,
    doneCount,
    plannedCount,
    isClosed,
  } = ring;
  const isToday = state === DayState.TODAY;
  const isFuture = state === DayState.FUTURE;
  const isOpen = openDayDate === date;
  const dayName = t(`Days.${DAY_NAME_KEYS[dayIndex]}`);

  // The classes go on an element whose own className never changes, so a
  // render can't take them off mid-animation
  useEffect(() => {
    if (!isToday || tickKey === 0 || !motionRef.current) return;
    restartAnimationClass(motionRef.current, 'fx-ring-tick');
  }, [isToday, tickKey]);

  useEffect(() => {
    const element = motionRef.current;
    if (!isToday || celebrationKey === 0 || !element) return;
    restartAnimationClass(element, 'fx-ring-close');
    const end = (event: AnimationEvent) => {
      if (event.animationName === 'fx-ring-spin') {
        element.classList.remove('fx-ring-close');
      }
    };
    element.addEventListener('animationend', end);
    return () => element.removeEventListener('animationend', end);
  }, [isToday, celebrationKey]);

  const label = (): string => {
    const kinds = RING_KIND_ORDER.filter(kind => planned[kind] > 0).map(kind =>
      t(`Kinds.${kind}`, {done: done[kind], planned: planned[kind]}),
    );
    const counts = {day: dayName, done: doneCount, planned: plannedCount};
    return kinds.length > 0
      ? t('cellLabelWithKinds', {...counts, kinds: kinds.join(', ')})
      : t('cellLabel', counts);
  };

  const renderRing = (size: number) => (
    <span
      ref={motionRef}
      data-today-ring={isToday ? '' : undefined}
      className="inline-grid"
    >
      <DayRingGraphic ring={ring} size={size} />
    </span>
  );

  const renderTodayCount = () =>
    isClosed ? (
      <b className="font-semibold text-success">
        {t('allDone', {count: plannedCount})}
      </b>
    ) : (
      t.rich('count', {
        done: doneCount,
        planned: plannedCount,
        count: chunks => (
          <b className="fx-num font-semibold text-base-content">{chunks}</b>
        ),
      })
    );

  const dayNameColor = (): string => {
    if (isOpen) return 'text-primary';
    return isFuture ? 'text-base-content/30' : 'text-base-content/45';
  };

  const renderToday = () => (
    <>
      {renderRing(RING_SIZE.today)}
      <span className="flex flex-col items-start gap-[3px]">
        <span
          className={`fx-num text-[10px] uppercase leading-none tracking-[0.1em] ${
            isClosed && !isOpen ? 'text-success' : 'text-primary'
          }`}
        >
          {t('today')}
        </span>
        <span className="whitespace-nowrap text-xs text-base-content/80 md:text-[13px]">
          {renderTodayCount()}
        </span>
      </span>
    </>
  );

  const renderDay = () => (
    <>
      <span
        className={`fx-num text-[10px] uppercase leading-none tracking-[0.1em] ${dayNameColor()}`}
      >
        {dayName}
      </span>
      {renderRing(RING_SIZE.day)}
    </>
  );

  const cellClass = [
    'flex min-w-0 w-full items-center rounded-[10px] border',
    isToday
      ? 'flex-row justify-center gap-2.5 px-3 py-1.5'
      : 'flex-col gap-[5px] px-0.5 pt-1.5 pb-[7px]',
    isOpen && OPEN_CELL_CLASS,
    !isOpen && isToday && isClosed && 'border-success/45',
    !isOpen && isToday && !isClosed && 'border-primary/35',
    !isOpen && !isToday && 'border-transparent',
    isFuture && 'opacity-80',
    !isFuture && BUTTON_CELL_CLASS,
  ]
    .filter(Boolean)
    .join(' ');

  const renderCell = () =>
    isFuture ? (
      <div className={cellClass} aria-label={dayName} role="img">
        {renderDay()}
      </div>
    ) : (
      <button
        type="button"
        data-day-cell={date}
        aria-label={label()}
        title={label()}
        aria-expanded={isOpen}
        onClick={() => toggleDay(date)}
        className={cellClass}
      >
        {isToday ? renderToday() : renderDay()}
      </button>
    );

  return (
    <div
      className={`flex min-w-0 ${
        isToday
          ? 'flex-[2.4] max-md:min-w-[132px] max-md:flex-[2]'
          : 'flex-1 max-md:min-w-[54px]'
      }`}
    >
      {renderCell()}
    </div>
  );
};
