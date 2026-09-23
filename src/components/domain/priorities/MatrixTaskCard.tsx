'use client';

import {Draggable} from '@hello-pangea/dnd';
import {useTranslations} from 'next-intl';
import {
  ArrowRightIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import {useBreakpoint} from '@/components/application/BreakpointProvider';
import type {TaskItem} from '@/lib/db/tasks';
import type {TrackTargetStatus} from '@/schemas';
import {SizeChip} from '@/components/domain/shared/SizeChip';
import {Pill} from '@/components/ui/Pill';
import {MoveToPopover} from './MoveToPopover';

interface MatrixTaskCardProps {
  task: TaskItem;
  /** Position index within the quadrant — required by Draggable */
  index: number;
  /** planId === active plan id: dimmed "This Week" treatment, chooser offers Done only */
  isTracked: boolean;
  /** No active plan → the chooser's column rows disable (Done stays live) */
  hasActivePlan: boolean;
  /** Whether this card's Move-to popover is open */
  isPopoverOpen: boolean;
  /** Toggle the popover for this card (null closes) */
  onSendToggle: (taskId: string | null) => void;
  onTrack: (taskId: string, status: TrackTargetStatus) => void;
  onComplete: (taskId: string) => void;
  /** Mobile tap → open the Move-to bottom sheet */
  onTap: (task: TaskItem) => void;
}

/**
 * Single-row matrix card: title + one-line description, size chip, a
 * hover-revealed send "→" button opening the desktop Move-to popover, and a
 * decorative grip. Tracked cards render dimmed with a "This Week" tag
 * (mobile: ★), keep the send button (Done is still a valid move) and stay
 * draggable — dragging only reprioritizes, never touches status/plan.
 */
export default function MatrixTaskCard({
  task,
  index,
  isTracked,
  hasActivePlan,
  isPopoverOpen,
  onSendToggle,
  onTrack,
  onComplete,
  onTap,
}: MatrixTaskCardProps) {
  const t = useTranslations('Priorities');
  const {isMobile} = useBreakpoint();

  const handleCardClick = () => {
    if (isMobile) onTap(task);
  };

  const renderTrackedTag = () => (
    <Pill color="primary" className="flex-shrink-0">
      <span className="hidden md:inline">{t('thisWeek')}</span>
      <span className="md:hidden">★</span>
    </Pill>
  );

  // Always enabled — Done never needs a plan; the popover explains the
  // no-plan state itself (column rows disabled under a note).
  const renderSendButton = () => (
    <button
      type="button"
      aria-label={t('sendLabel')}
      onClick={e => {
        e.stopPropagation();
        onSendToggle(isPopoverOpen ? null : task.id);
      }}
      className={`hidden flex-shrink-0 size-[22px] rounded-[5px] items-center justify-center cursor-pointer transition-colors ${
        isPopoverOpen
          ? 'md:flex bg-primary/10 text-primary'
          : 'md:group-hover:flex text-base-content/50 hover:bg-primary/10 hover:text-primary'
      }`}
    >
      <ArrowRightIcon className="size-3.5" />
    </button>
  );

  const renderSizeChips = () => (
    <>
      {/* Visibility lives on wrappers — SizeChip's own classes set display,
          so passing hidden/md:* into it is a CSS-order coin flip (this exact
          conflict shipped a double-chip bug). */}
      <span className="hidden md:inline-flex">
        <SizeChip size={task.size} points={task.points} />
      </span>
      <span className="inline-flex md:hidden">
        <SizeChip size={task.size} points={task.points} labelOnly />
      </span>
    </>
  );

  // Two overlapped 3-dot glyphs form the design's 6-dot drag grip
  // (no exact Heroicon exists). Decorative only — the whole card drags.
  const renderGrip = () => (
    <span
      aria-hidden
      className="hidden md:flex flex-shrink-0 text-base-content/20 group-hover:text-base-content/40 transition-colors"
    >
      <EllipsisVerticalIcon className="size-3.5" />
      <EllipsisVerticalIcon className="size-3.5 -ml-[11px]" />
    </span>
  );

  return (
    // Dragging is disabled while this card's popover/tooltip is open — the
    // whole card is the drag handle, so anything rendered inside it (the
    // popover buttons included) would otherwise start a drag on press+move.
    <Draggable
      draggableId={task.id}
      index={index}
      isDragDisabled={isPopoverOpen}
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={handleCardClick}
          className={`group relative rounded-[10px] border bg-base-100 px-3 py-2 md:py-2.5 cursor-grab transition-[border-color,box-shadow] duration-150 ${
            snapshot.isDragging
              ? 'border-primary shadow-xl cursor-grabbing z-50'
              : isPopoverOpen
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-base-content/10 hover:border-base-content/25'
          }`}
        >
          {/* The tracked dim sits on the content row, not the card root: an
              opacity < 1 root would dim the popover and trap its z-index in
              a new stacking context — buried under the next card. */}
          <div
            className={`flex items-center gap-2 transition-opacity duration-150 ${
              isTracked ? 'opacity-55' : ''
            }`}
          >
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span
                className={`text-[11px] md:text-[13px] font-medium truncate ${
                  isTracked ? 'text-base-content/60' : ''
                }`}
              >
                {task.title}
              </span>
              {task.description && (
                <span className="hidden md:block text-xs text-base-content/60 truncate">
                  {task.description}
                </span>
              )}
            </div>

            {isTracked ? renderTrackedTag() : renderSizeChips()}
            {renderSendButton()}
            {renderGrip()}
          </div>

          {/* Click-away layer lives at the page level (outside any Draggable) */}
          {isPopoverOpen && (
            <MoveToPopover
              isTracked={isTracked}
              hasActivePlan={hasActivePlan}
              onTrack={status => onTrack(task.id, status)}
              onComplete={() => onComplete(task.id)}
            />
          )}
        </div>
      )}
    </Draggable>
  );
}
