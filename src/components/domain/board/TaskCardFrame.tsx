import type {ComponentProps} from 'react';
import type {TaskKind} from '@/utils/taskUtils';
import {TASK_KIND_STYLE} from '@/components/domain/shared/taskKindStyle';
import {cn} from '@/components/ui/cn';

interface TaskCardFrameProps extends ComponentProps<'div'> {
  /** The task's kind, whose colour the left edge takes */
  kind: TaskKind;
}

/**
 * The frame every board card shares, in Todo, Done and the backlog: the card
 * surface, its border and its kind's left edge. What the card does in each
 * place (TodoCard, DoneCard, BacklogGroup) comes in as the div's own props.
 */
export const TaskCardFrame = ({
  kind,
  className,
  ...divProps
}: TaskCardFrameProps) => (
  <div
    {...divProps}
    className={cn('card fx-card border', TASK_KIND_STYLE[kind].edge, className)}
  />
);
