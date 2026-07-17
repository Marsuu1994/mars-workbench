'use client';

import type {TaskTemplateItem} from '@/lib/db/taskTemplates';
import type {PriorityQuadrant} from '@/utils/enums';
import {TaskModalPanel} from '@/components/domain/shared/task-modal/TaskModal';

const NOOP = () => undefined;

interface TaskModalScenarioProps {
  mode: 'create' | 'edit' | 'adhoc';
  template?: TaskTemplateItem | null;
  quadrant?: PriorityQuadrant;
}

/**
 * The real TaskModalPanel rendered inline (the live modal's OverlayShell is
 * a top-layer <dialog> that would escape the scenario frame), inside a
 * hand-rolled stand-in for the modal box. The dimmed backdrop and centering
 * come from the frame's overlay mode.
 */
export const TaskModalScenario = ({
  mode,
  template,
  quadrant,
}: TaskModalScenarioProps) => (
  <div className="fx-panel-solid rounded-box md:fx-corners w-full max-w-lg p-6 pt-4 md:pt-6">
    <TaskModalPanel
      mode={mode}
      template={template}
      quadrant={quadrant}
      onClose={NOOP}
      onSaved={NOOP}
    />
  </div>
);
