'use client';

import {MinusIcon, PlusIcon} from '@heroicons/react/24/outline';
import {cn} from '../cn';

interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** Aria labels — copy comes from the caller's namespace */
  decreaseLabel: string;
  increaseLabel: string;
  className?: string;
}

/** Thumb-friendly −/+ number stepper with clamped range. */
export const Stepper = ({
  value,
  min,
  max,
  onChange,
  decreaseLabel,
  increaseLabel,
  className,
}: StepperProps) => {
  const renderButton = (
    direction: -1 | 1,
    label: string,
    disabled: boolean,
  ) => (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(value + direction)}
      className="flex h-full w-8 items-center justify-center text-base-content/60 transition-colors enabled:cursor-pointer enabled:hover:text-base-content enabled:active:bg-base-300 disabled:opacity-40"
    >
      {direction === -1 ? (
        <MinusIcon className="size-3.5" />
      ) : (
        <PlusIcon className="size-3.5" />
      )}
    </button>
  );

  return (
    <div
      className={cn(
        'flex h-[30px] items-center overflow-hidden rounded-lg border border-base-content/15 bg-base-100',
        className,
      )}
    >
      {renderButton(-1, decreaseLabel, value <= min)}
      <span className="fx-num min-w-[26px] text-center text-[13px] font-bold">
        {value}
      </span>
      {renderButton(1, increaseLabel, value >= max)}
    </div>
  );
};
