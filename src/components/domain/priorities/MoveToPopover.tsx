'use client';

import type {TaskItem} from '@/lib/db/tasks';
import {Popover} from '@/components/ui/overlay/Popover';
import {MoveToRows} from './MoveToRows';

interface MoveToPopoverProps {
  /** The card's one-off, which the rows move */
  task: TaskItem;
}

/**
 * Desktop Move-to popover, anchored below a matrix card's send button. The
 * row rules (tracked → Done only, no plan → column rows disabled) live in
 * MoveToRows, shared with the mobile sheet.
 */
export const MoveToPopover = ({task}: MoveToPopoverProps) => (
  <Popover className="min-w-[180px]">
    <MoveToRows task={task} variant="popover" />
  </Popover>
);
