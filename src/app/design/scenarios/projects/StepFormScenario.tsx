'use client';

import {
  StepFormPanel,
  type StepFormPanelProps,
} from '@/components/domain/projects/step-modal/StepFormPanel';
import {ModalPanelFrame} from '../ModalPanelFrame';

const NOOP = () => undefined;

type StepFormScenarioProps = Pick<
  StepFormPanelProps,
  'mode' | 'project' | 'stepNumber' | 'step'
>;

/** The real StepFormPanel rendered inline in a modal-box stand-in. */
export const StepFormScenario = (props: StepFormScenarioProps) => (
  <ModalPanelFrame>
    <StepFormPanel {...props} onClose={NOOP} onSaved={NOOP} />
  </ModalPanelFrame>
);
