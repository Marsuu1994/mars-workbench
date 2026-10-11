'use client';

import {
  ProjectFormPanel,
  type ProjectFormPanelProps,
} from '@/components/domain/projects/ProjectFormPanel';
import {ModalPanelFrame} from '../ModalPanelFrame';

const NOOP = () => undefined;

type ProjectFormScenarioProps = Pick<ProjectFormPanelProps, 'mode' | 'project'>;

/** The real ProjectFormPanel rendered inline in a modal-box stand-in. */
export const ProjectFormScenario = ({
  mode,
  project,
}: ProjectFormScenarioProps) => (
  <ModalPanelFrame>
    <ProjectFormPanel
      mode={mode}
      project={project}
      onClose={NOOP}
      onSaved={NOOP}
      onArchived={NOOP}
    />
  </ModalPanelFrame>
);
