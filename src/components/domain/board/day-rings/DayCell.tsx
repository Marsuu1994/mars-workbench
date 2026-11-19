'use client';

import {useEffect, useRef, type ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {DayState, RING_KIND_ORDER, type DayRing} from '@/utils/dayRingUtils';
import {useBoardPageContext} from '../BoardPageContext';
import {restartAnimationClass} from '../motion/completionMotion';
import {DayRingGraphic} from './DayRingGraphic';
import {DAY_NAME_KEYS, RING_SIZE} from './constants';

interface DayCellProps {
  ring: DayRing;
  /** Under the cell: its day's list, when it is open on desktop */
  children?: ReactNode;
}

/**
 * One day of the row of rings. Today's cell is wider and framed, with its
 * ring, Today and its count; every other day holds its short name over its
 * ring. Today and the days before it are buttons that open the day's list
 * (DAY-1); a day after today is neither (RING-7). Today's cell jumps once
 * when a card is finished (fx-ring-tick) and celebrates when its ring closes
 * (fx-ring-close).
 */
export const DayCell = ({ring, children}: DayCellProps) => {
  const t = useTranslations('Board.Rings');
  const {openDayDate, toggleDay, tickKey, celebrationKey} =
    useBoardPageContext();
  const motionRef = useRef<HTMLSpanElement>(null);
  const {date, dayIndex, state, done, planned, doneCount, plannedCount} = ring;
  const isToday = state === DayState.TODAY;
  const isFuture = state === DayState.FUTURE;
  const isOpen = openDayDate === date;
  const isClosed = ring.isClosed;
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

  const renderToday = () => (
    <>
      {renderRing(RING_SIZE.today)}
      <span className="flex flex-col items-start gap-[3px]">
        <span
          className={`fx-num text-[10px] uppercase leading-none tracking-[0.1em] ${
            isClosed ? 'text-success' : 'text-primary'
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
        className={`fx-num text-[10px] uppercase leading-none tracking-[0.1em] ${
          isFuture ? 'text-base-content/30' : 'text-base-content/45'
        }`}
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
    isOpen && 'border-primary bg-primary/10',
    !isOpen &&
      isToday &&
      isClosed &&
      'border-success/60 shadow-[0_0_16px] shadow-success/15',
    !isOpen &&
      isToday &&
      !isClosed &&
      'border-primary/50 shadow-[0_0_14px] shadow-primary/10',
    !isOpen && !isToday && 'border-transparent',
    isFuture && 'opacity-80',
    !isFuture &&
      'fx-press cursor-pointer [--fx-press-scale:0.96] hover:bg-base-content/5',
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
        aria-expanded={isOpen}
        onClick={() => toggleDay(date)}
        className={cellClass}
      >
        {isToday ? renderToday() : renderDay()}
      </button>
    );

  return (
    <div
      className={`relative flex min-w-0 ${
        isToday
          ? 'flex-[2.4] max-md:min-w-[132px] max-md:flex-[2]'
          : 'flex-1 max-md:min-w-[54px]'
      }`}
    >
      {renderCell()}
      {children}
    </div>
  );
};
