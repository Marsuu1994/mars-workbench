import type {ComponentType, SVGProps} from 'react';
import {
  ArrowPathIcon,
  MapIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import {TaskKind} from '@/utils/taskUtils';

interface TaskKindStyle {
  /** Kind label + icon colour */
  text: string;
  /** Card left edge in the kind colour (fx-kind-edge reads the fx-k-* hue) */
  edge: string;
  /** Filled signal marks (habit dots) */
  fill: string;
  /** Signal mark outlines */
  outline: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

/* One colour per kind, fixed on the card: habit success, project secondary,
   one-off info. Warning / error stay free for per-kind risk, accent stays the
   drag-target colour, primary stays the CTA colour. Literal classes only —
   Tailwind can't see interpolated names. */
export const TASK_KIND_STYLE: Record<TaskKind, TaskKindStyle> = {
  [TaskKind.HABIT]: {
    text: 'text-success',
    edge: 'fx-kind-edge fx-k-success',
    fill: 'bg-success border-success',
    outline: 'border-success/65',
    Icon: ArrowPathIcon,
  },
  [TaskKind.PROJECT]: {
    text: 'text-secondary',
    edge: 'fx-kind-edge fx-k-secondary',
    fill: 'bg-secondary border-secondary',
    outline: 'border-secondary/65',
    Icon: MapIcon,
  },
  [TaskKind.ONE_OFF]: {
    text: 'text-info',
    edge: 'fx-kind-edge fx-k-info',
    fill: 'bg-info border-info',
    outline: 'border-info/65',
    Icon: Squares2X2Icon,
  },
};
