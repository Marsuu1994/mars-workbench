import type {ReactNode} from 'react';
import {cn} from '@/components/ui/cn';

/** Which pane mobile shows: the list (/kanban/projects) or one project's
    detail (/kanban/projects/[id]). */
export type ProjectsMobilePane = 'list' | 'detail';

interface ProjectsPanesProps {
  list: ReactNode;
  detail: ReactNode;
  mobilePane: ProjectsMobilePane;
}

/**
 * The page's two panes: from md up the list (320px) beside the detail, each
 * scrolling on its own — the detail must be the step list's only scroll
 * parent (a Droppable supports one). On mobile only `mobilePane` shows.
 */
export const ProjectsPanes = ({
  list,
  detail,
  mobilePane,
}: ProjectsPanesProps) => (
  <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[320px_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)]">
    <div
      className={cn(
        'min-h-0 flex-1 overflow-y-auto md:border-r md:border-base-content/10',
        mobilePane === 'detail' && 'max-md:hidden',
      )}
    >
      {list}
    </div>
    <div
      className={cn(
        'min-h-0 flex-1 overflow-y-auto',
        mobilePane === 'list' && 'max-md:hidden',
      )}
    >
      {detail}
    </div>
  </div>
);
