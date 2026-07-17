'use client';

import {cn} from './cn';

interface TabBarProps {
  /** Tab labels, in order */
  labels: string[];
  activeIndex: number;
  onChange: (index: number) => void;
  /** Accessible name for the tablist */
  ariaLabel: string;
  className?: string;
}

/**
 * The one chip-row tab strip: a rounded rail of tab buttons where the active
 * tab gets the primary tint. Owns only the bar — the caller renders the
 * active panel (and decides whether switching remounts it).
 */
export const TabBar = ({
  labels,
  activeIndex,
  onChange,
  ariaLabel,
  className,
}: TabBarProps) => (
  <div
    role="tablist"
    aria-label={ariaLabel}
    className={cn(
      'flex flex-wrap gap-1 self-start rounded-xl border border-base-content/10 bg-base-100/60 p-1',
      className,
    )}
  >
    {labels.map((label, index) => {
      const isActive = index === activeIndex;
      return (
        <button
          key={label}
          type="button"
          role="tab"
          aria-selected={isActive}
          onClick={() => onChange(index)}
          className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-base-content/50 hover:text-base-content'
          }`}
        >
          {label}
        </button>
      );
    })}
  </div>
);
