'use client';

import type {TrackTargetStatus} from '@/schemas';
import {Popover} from '@/components/ui/overlay/Popover';
import {MoveToRows} from './MoveToRows';

interface MoveToPopoverProps {
  isTracked: boolean;
  hasActivePlan: boolean;
  onTrack: (status: TrackTargetStatus) => void;
  onComplete: () => void;
}

/**
 * Desktop Move-to popover, anchored below a matrix card's send button. The
 * row rules (tracked → Done only, no plan → column rows disabled) live in
 * MoveToRows, shared with the mobile sheet.
 */
export const MoveToPopover = (props: MoveToPopoverProps) => (
  <Popover className="min-w-[180px]">
    <MoveToRows variant="popover" {...props} />
  </Popover>
);
