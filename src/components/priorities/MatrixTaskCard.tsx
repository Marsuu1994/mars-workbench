'use client';

import {Draggable} from '@hello-pangea/dnd';
import {useTranslations} from 'next-intl';
import {
  ArrowRightIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import {useBreakpoint} from '@/components/common/BreakpointProvider';
import type {TaskItem} from '@/lib/db/tasks';
import type {TrackTargetStatus} from '@/schemas';
import {SizeChip} from '@/components/ui/SizeChip';
import {Pill} from '@/components/ui/Pill';
import {Popover} from '@/components/ui/overlay/Popover';
import TrackPopover from './TrackPopover';

interface MatrixTaskCardProps {
  task: TaskItem;
  /** Position index within the quadrant — required by Draggable */
  index: number;
  /** planId === active plan id: dimmed "This Week" treatment, send hidden */
  isTracked: boolean;
  /** No active plan → send button disabled, tooltip instead of popover */
  hasActivePlan: boolean;
  /** Whether this card's popover (or no-plan tooltip) is open */
  isPopoverOpen: boolean;
  /** Toggle the popover for this card (null closes) */
  onSendToggle: (taskId: string | null) => void;
  onTrack: (taskId: string, status: TrackTargetStatus) => void;
  /** Mobile tap → open the track bottom sheet */
  onTap: (task: TaskItem) => void;
}

/**
 * Single-row matrix card: title + one-line description, size chip, a
 * hover-revealed send "→" button (desktop track flow) and a decorative grip.
 * Tracked cards render dimmed with a "This Week" tag (mobile: ★) and stay
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
  onTap,
}: MatrixTaskCardProps) {
  const t = useTranslations('Priorities');
  const {isMobile} = useBreakpoint();

  const handleCardClick = () => {
    if (isMobile && !isTracked) onTap(task);
  };

  const renderTrackedTag = () => (
    <Pill color="primary" className="flex-shrink-0">
      <span className="hidden md:inline">{t('thisWeek')}</span>
      <span className="md:hidden">★</span>
    </Pill>
  );

  const renderSendButton = () => (
    <button
      type="button"
      aria-label={t('sendLabel')}
      onClick={e => {
        e.stopPropagation();
        onSendToggle(isPopoverOpen ? null : task.id);
      }}
      className={`hidden flex-shrink-0 size-[22px] rounded-[5px] items-center justify-center transition-colors ${
        isPopoverOpen ? 'md:flex' : 'md:group-hover:flex'
      } ${
        hasActivePlan
          ? 'text-base-content/50 hover:bg-primary/10 hover:text-primary cursor-pointer'
          : 'text-base-content/30 cursor-not-allowed'
      } ${isPopoverOpen && hasActivePlan ? 'bg-primary/10 text-primary' : ''}`}
    >
      <ArrowRightIcon className="size-3.5" />
    </button>
  );

  // Two overlapped 3-dot glyphs approximate the mockup's 6-dot grip
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
          className={`group relative flex items-center gap-2 rounded-[10px] border bg-base-100 px-3 py-2 md:py-2.5 cursor-grab transition-[border-color,box-shadow,opacity] duration-150 ${
            isTracked ? 'opacity-55' : ''
          } ${
            snapshot.isDragging
              ? 'border-primary shadow-xl cursor-grabbing z-50'
              : isPopoverOpen
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-base-content/10 hover:border-base-content/25'
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

          {isTracked ? (
            renderTrackedTag()
          ) : (
            <>
              {/* Visibility lives on wrappers — SizeChip's own classes set
                  display, so passing hidden/md:* into it is a CSS-order coin
                  flip (this exact conflict shipped a double-chip bug). */}
              <span className="hidden md:inline-flex">
                <SizeChip size={task.size} points={task.points} />
              </span>
              <span className="inline-flex md:hidden">
                <SizeChip size={task.size} points={task.points} labelOnly />
              </span>
              {renderSendButton()}
            </>
          )}

          {renderGrip()}

          {/* Click-away layer lives at the page level (outside any Draggable) */}
          {isPopoverOpen &&
            (hasActivePlan ? (
              <TrackPopover onTrack={status => onTrack(task.id, status)} />
            ) : (
              <Popover className="px-2.5 py-2 text-[11px] text-base-content/60 whitespace-nowrap">
                {t('noPlanTooltip')}
              </Popover>
            ))}
        </div>
      )}
    </Draggable>
  );
}
