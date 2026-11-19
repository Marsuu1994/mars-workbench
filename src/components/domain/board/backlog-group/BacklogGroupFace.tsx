'use client';

import type {ReactNode} from 'react';
import {TaskKind} from '@/utils/taskUtils';
import type {BacklogGroup} from '@/utils/backlogGroupUtils';
import {TaskCardHead} from '../TaskCardHead';
import {TaskCardSignal} from '../TaskCardSignal';
import {BacklogMoreCount} from './BacklogMoreCount';

interface BacklogGroupFaceProps {
  group: BacklogGroup;
  /** A project's queue under the card; absent for a habit */
  queue?: {isOpen: boolean; onToggle: () => void};
  /** Bottom right: the sheet's ↑ Todo */
  action?: ReactNode;
}

/**
 * A backlog card's face, showing its group's next task: the kind (a step's
 * project name) with +N more on the right, the title, the description, then
 * the progress — a habit's week dots or the project's path, the next task's
 * mark ringed. No details, no size and no count of what's done.
 */
export const BacklogGroupFace = ({
  group,
  queue,
  action,
}: BacklogGroupFaceProps) => {
  const {next, behind} = group;
  const {task} = next;

  const renderMoreCount = () =>
    behind.length > 0 ? (
      <BacklogMoreCount
        kind={next.kind}
        behindCount={behind.length}
        queue={queue}
      />
    ) : null;

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2.5">
      <TaskCardHead
        kind={next.kind}
        variant="card"
        name={
          next.kind === TaskKind.PROJECT ? next.step?.projectTitle : undefined
        }
        context={renderMoreCount()}
      />
      <h3 className="text-sm font-medium leading-snug">{task.title}</h3>
      {task.description && (
        <p className="-mt-0.5 text-xs leading-snug text-base-content/60 break-words">
          {task.description}
        </p>
      )}
      <div className="flex min-h-[18px] items-center gap-2">
        <TaskCardSignal card={next} variant="card" />
        {action && <span className="ml-auto">{action}</span>}
      </div>
    </div>
  );
};
