'use client';

import type {ReactNode} from 'react';
import {cn} from '../cn';

export interface ChoicePillOption<T extends string> {
  value: T;
  /** Static content, or a render function when inner styling tracks selection */
  label: ReactNode | ((selected: boolean) => ReactNode);
  /** Per-option selected classes (e.g. per-type accent); falls back to the group default */
  selectedClass?: string;
}

interface ChoicePillsProps<T extends string> {
  options: ChoicePillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** row = compact inline · fill = equal-width row · grid = 2-column grid */
  layout?: 'row' | 'fill' | 'grid';
  /** Shared shape/size classes for every pill */
  pillClass?: string;
  /** Default selected-state classes (overridden per option) */
  selectedClass?: string;
  unselectedClass?: string;
  /** Extra classes on the group container (e.g. gap overrides) */
  className?: string;
}

const LAYOUT_CLASS = {
  row: 'flex gap-1',
  fill: 'flex gap-1.5 w-full',
  grid: 'grid grid-cols-2 gap-1.5',
} as const;

/**
 * The one mutually-exclusive button group: selected state swaps classes.
 * Covers size pickers, type pills, mode toggles and the quadrant grid —
 * never hand-roll a selected/unselected button pair.
 */
export const ChoicePills = <T extends string>({
  options,
  value,
  onChange,
  layout = 'row',
  pillClass,
  selectedClass,
  unselectedClass,
  className,
}: ChoicePillsProps<T>) => (
  <div className={cn(LAYOUT_CLASS[layout], className)}>
    {options.map(option => {
      const selected = value === option.value;
      return (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'cursor-pointer border transition-colors',
            layout === 'fill' && 'flex-1',
            pillClass,
            selected
              ? (option.selectedClass ?? selectedClass)
              : unselectedClass,
          )}
        >
          {typeof option.label === 'function'
            ? option.label(selected)
            : option.label}
        </button>
      );
    })}
  </div>
);
