'use client';

import type {TaskItem} from '@/lib/db/tasks';
import {MobileMoveToPanel} from '@/components/domain/priorities/MobileMoveToPanel';

interface MobileMoveToPanelScenarioProps {
  task: TaskItem;
  isTracked?: boolean;
  hasActivePlan: boolean;
}

/**
 * The mobile Move-to sheet's body, rendered inline as a phone-width card
 * inside a scenario frame: the real MobileMoveToPanel with inert handlers,
 * minus the top-layer <dialog> so it stays inside the frame and inherits
 * its inertness.
 */
export const MobileMoveToPanelScenario = ({
  task,
  isTracked = false,
  hasActivePlan,
}: MobileMoveToPanelScenarioProps) => (
  <div className="flex h-full flex-col justify-end bg-base-200/20 p-3">
    <div className="mx-auto w-full max-w-[430px] rounded-2xl border border-base-content/10 bg-base-100 shadow-lg">
      <MobileMoveToPanel
        task={task}
        isTracked={isTracked}
        hasActivePlan={hasActivePlan}
        onTrack={() => undefined}
        onComplete={() => undefined}
      />
    </div>
  </div>
);
