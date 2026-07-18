'use client';

import {PlanMode} from '@/utils/enums';
import {
  ReviewChangesPanel,
  type TemplateChange,
  type ModifiedTemplate,
  type AdhocTaskChange,
} from '@/components/domain/plan/ReviewChangesModal';

const NOOP = () => undefined;

interface ReviewChangesScenarioProps {
  added: TemplateChange[];
  removed: TemplateChange[];
  modified: ModifiedTemplate[];
  addedAdhoc: AdhocTaskChange[];
  removedAdhoc: AdhocTaskChange[];
  incompleteCounts: Record<string, number>;
}

/**
 * The real ReviewChangesPanel rendered inline (the live modal's OverlayShell
 * is a top-layer <dialog> that would escape the scenario frame), inside a
 * hand-rolled stand-in for the modal box mirroring the live box's max-height
 * caps. The dimmed backdrop and centering come from the frame's overlay mode.
 */
export const ReviewChangesScenario = (props: ReviewChangesScenarioProps) => (
  <div className="fx-panel-solid rounded-box flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden p-0 md:max-h-[calc(100vh-5em)]">
    <ReviewChangesPanel
      {...props}
      onClose={NOOP}
      onConfirm={NOOP}
      isSubmitting={false}
      modeChanged
      fromMode={PlanMode.NORMAL}
      toMode={PlanMode.EXTREME}
    />
  </div>
);
