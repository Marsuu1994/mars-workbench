'use client';

import Link from 'next/link';
import {useTranslations} from 'next-intl';
import {ClockIcon, PlusIcon, Squares2X2Icon} from '@heroicons/react/24/outline';
import type {OverallStats} from '@/types/aiChat';
import {EmptyState} from '@/components/ui/EmptyState';
import {StatBlock} from '@/components/ui/StatBlock';
import {CREATE_PLAN_HREF} from './emptyBoardConstants';

interface EmptyBoardProps {
  /** Present for returning users (a finished plan's recap); absent for new users. */
  stats?: OverallStats;
}

export default function EmptyBoard({stats}: EmptyBoardProps) {
  const t = useTranslations('Board.Empty');

  const renderCta = (label: string) => (
    <Link href={CREATE_PLAN_HREF} className="btn btn-primary fx-glow mt-2">
      <PlusIcon className="size-5" />
      {label}
    </Link>
  );

  const renderNewUser = () => (
    <EmptyState
      icon={<Squares2X2Icon className="size-20 text-base-content/15" />}
      title={t('newTitle')}
      description={t('newDesc')}
      action={renderCta(t('newCta'))}
    />
  );

  const renderReturningUser = (recap: OverallStats) => (
    <EmptyState
      icon={<ClockIcon className="size-20 text-base-content/15" />}
      title={t('returningTitle')}
      description={t('returningDesc')}
      action={
        <>
          <p className="text-base-content/60 text-center">
            {t('returningPrompt')}
          </p>
          {renderCta(t('returningCta'))}
        </>
      }
    >
      <div className="flex justify-center gap-6">
        <StatBlock
          align="center"
          value={`${Math.round(recap.completionRate * 100)}%`}
          valueClassName="text-2xl text-primary"
          label={t('statCompleted')}
        />
        <StatBlock
          align="center"
          value={`${recap.completedCount}/${recap.totalCount}`}
          valueClassName="text-2xl text-primary"
          label={t('statTasksDone')}
        />
        <StatBlock
          align="center"
          value={`${recap.totalPoints}`}
          valueClassName="text-2xl text-warning"
          label={t('statPointsEarned')}
        />
      </div>
    </EmptyState>
  );

  return (
    // <main> is overflow-hidden on /kanban, so this screen scrolls itself;
    // the min-h-full inner wrapper keeps content centered yet reachable on
    // short viewports (no Droppables here, so an extra scroller is fine).
    <div className="h-full overflow-y-auto">
      <div className="flex min-h-full flex-col items-center justify-center p-10">
        {stats ? renderReturningUser(stats) : renderNewUser()}
      </div>
    </div>
  );
}
