'use client';

import type {TaskItem} from '@/lib/db/tasks';
import {MobileMoveToPanel} from '@/components/domain/priorities/MobileMoveToPanel';
import {PrioritiesPageContext} from '@/components/domain/priorities/PrioritiesPageContext';
import {inertPrioritiesPageContext} from '../../constants';

interface MobileMoveToPanelScenarioProps {
  task: TaskItem;
  /** The plan the sheet tracks onto; the task is tracked when it is on it */
  activePlanId: string | null;
}

/**
 * The mobile Move-to sheet's body, rendered inline as a phone-width card
 * inside a scenario frame: the real MobileMoveToPanel in a context of inert
 * handlers, minus the top-layer <dialog> so it stays inside the frame and
 * inherits its inertness.
 */
export const MobileMoveToPanelScenario = ({
  task,
  activePlanId,
}: MobileMoveToPanelScenarioProps) => (
  <div className="flex h-full flex-col justify-end bg-base-200/20 p-3">
    <div className="mx-auto w-full max-w-[430px] rounded-2xl border border-base-content/10 bg-base-100 shadow-lg">
      <PrioritiesPageContext value={inertPrioritiesPageContext(activePlanId)}>
        <MobileMoveToPanel task={task} />
      </PrioritiesPageContext>
    </div>
  </div>
);
