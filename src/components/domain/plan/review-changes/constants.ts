import type {PillColor} from '@/components/ui/Pill';

/* One accent drives a whole change section — dot, border, heading and
   note all read from here (literal classes so Tailwind can see them). */
export type Accent = Extract<
  PillColor,
  'success' | 'error' | 'warning' | 'info' | 'secondary'
>;
export const ACCENT: Record<
  Accent,
  {dot: string; border: string; text: string}
> = {
  success: {
    dot: 'bg-success',
    border: 'border-success/30',
    text: 'text-success',
  },
  error: {dot: 'bg-error', border: 'border-error/30', text: 'text-error'},
  warning: {
    dot: 'bg-warning',
    border: 'border-warning/30',
    text: 'text-warning',
  },
  info: {dot: 'bg-info', border: 'border-info/30', text: 'text-info'},
  secondary: {
    dot: 'bg-secondary',
    border: 'border-secondary/30',
    text: 'text-secondary',
  },
};
