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
  /** Filled signal marks (habit dots, path segments), checked checkboxes */
  fill: string;
  /** Text on a fill (a checkbox's ✓) */
  fillText: string;
  /** A selected row's border and wash (the plan form's rows) */
  tint: string;
  /** Signal mark outlines */
  outline: string;
  /** The card's own signal mark: full-strength outline plus a halo */
  current: string;
  /** An open segment of a path (a step not done yet) */
  track: string;
  /** Outline around the card's own path segment */
  ring: string;
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
    fillText: 'text-success-content',
    tint: 'border-success/50 bg-success/5',
    outline: 'border-success/65',
    current: 'border-success ring-success/30',
    track: 'bg-success/20',
    ring: 'ring-success',
    Icon: ArrowPathIcon,
  },
  [TaskKind.PROJECT]: {
    text: 'text-secondary',
    edge: 'fx-kind-edge fx-k-secondary',
    fill: 'bg-secondary border-secondary',
    fillText: 'text-secondary-content',
    tint: 'border-secondary/50 bg-secondary/5',
    outline: 'border-secondary/65',
    current: 'border-secondary ring-secondary/30',
    track: 'bg-secondary/20',
    ring: 'ring-secondary',
    Icon: MapIcon,
  },
  [TaskKind.ONE_OFF]: {
    text: 'text-info',
    edge: 'fx-kind-edge fx-k-info',
    fill: 'bg-info border-info',
    fillText: 'text-info-content',
    tint: 'border-info/50 bg-info/5',
    outline: 'border-info/65',
    current: 'border-info ring-info/30',
    track: 'bg-info/20',
    ring: 'ring-info',
    Icon: Squares2X2Icon,
  },
};
