'use client';

import type {ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {ChevronDownIcon, ChevronUpIcon} from '@heroicons/react/24/outline';
import type {ProjectBacklogGroup} from '@/utils/boardCardUtils';
import {TaskKind} from '@/utils/taskUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {StepPath} from '../StepPath';
import {BacklogDescription} from './BacklogDescription';
import {BacklogMoreCount} from './BacklogMoreCount';

interface BacklogProjectFaceProps {
  group: ProjectBacklogGroup;
  /** Whether the queue behind the next step is open */
  isQueueOpen: boolean;
  onToggleQueue: () => void;
  /** The mobile sheet's ↑ Todo, at the bottom right */
  action?: ReactNode;
}

const {text, Icon} = TASK_KIND_STYLE[TaskKind.PROJECT];

/**
 * A project in the backlog shows only its next step: the project's name with
 * "+N more ⌄" opening the steps behind it, the step's title and description,
 * then the path with this step outlined. No step n/N, no size.
 */
export const BacklogProjectFace = ({
  group,
  isQueueOpen,
  onToggleQueue,
  action,
}: BacklogProjectFaceProps) => {
  const t = useTranslations('Board.Backlog');
  const tKind = useTranslations('Enums.TaskKind');
  const {next, behind} = group;
  const {task, step} = next;
  const ChevronIcon = isQueueOpen ? ChevronUpIcon : ChevronDownIcon;
  const projectName = step?.projectTitle ?? tKind(TaskKind.PROJECT);

  // The visible control stays a text line; ::before widens its tap area 8px
  const renderQueueToggle = () => (
    <button
      type="button"
      onClick={onToggleQueue}
      aria-expanded={isQueueOpen}
      title={t(isQueueOpen ? 'hideStepsLabel' : 'showStepsLabel', {
        project: projectName,
      })}
      className="group/toggle relative inline-flex flex-shrink-0 cursor-pointer items-center gap-1 before:absolute before:-inset-x-1.5 before:-inset-y-2 before:content-['']"
    >
      <BacklogMoreCount
        kind={TaskKind.PROJECT}
        count={behind.length}
        className="group-hover/toggle:text-base-content"
      />
      <ChevronIcon className={`size-3 stroke-2 ${text}`} />
    </button>
  );

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className={`size-3 flex-shrink-0 stroke-2 ${text}`} />
        <span
          className={`min-w-0 flex-1 truncate fx-num text-[11px] font-semibold tracking-[0.02em] ${text}`}
        >
          {projectName}
        </span>
        {behind.length > 0 && renderQueueToggle()}
      </div>
      <h3 className="text-sm font-medium leading-[1.3]">{task.title}</h3>
      <BacklogDescription description={task.description} />
      <div className="flex min-h-[18px] items-center gap-2">
        {step && <StepPath step={step} variant="card" />}
        <span className="flex-1" />
        {action}
      </div>
    </div>
  );
};
