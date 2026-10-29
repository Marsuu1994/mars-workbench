'use client';

import type {TaskTemplateItem} from '@/lib/db/taskTemplates';
import type {PriorityQuadrant} from '@/utils/enums';
import {
  TaskModalPanel,
  type TaskModalMode,
} from '@/components/domain/shared/task-modal/TaskModalPanel';
import {ModalPanelFrame} from './ModalPanelFrame';

const NOOP = () => undefined;

interface TaskModalScenarioProps {
  mode: TaskModalMode;
  template?: TaskTemplateItem | null;
  quadrant?: PriorityQuadrant;
}

/** The real TaskModalPanel rendered inline in a modal-box stand-in. */
export const TaskModalScenario = ({
  mode,
  template,
  quadrant,
}: TaskModalScenarioProps) => (
  <ModalPanelFrame>
    <TaskModalPanel
      mode={mode}
      template={template}
      quadrant={quadrant}
      freshData={null}
      onClose={NOOP}
      onSaved={NOOP}
    />
  </ModalPanelFrame>
);
