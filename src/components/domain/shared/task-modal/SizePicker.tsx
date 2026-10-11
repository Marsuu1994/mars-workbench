'use client';

import {useTranslations} from 'next-intl';
import {ChoicePills} from '@/components/ui/form/ChoicePills';
import {TaskSize, sizeToPoints} from '@/utils/enums';

interface SizePickerProps {
  value: TaskSize;
  onChange: (size: TaskSize) => void;
  /** Shown under the effort hint for L / XL — the caller says what to split
      (tasks or steps) */
  splitWarning: string;
}

/**
 * The size control of a task form: XS–XL pills with their points, the
 * effort hint for the chosen size, and a nudge to split L / XL work.
 */
export const SizePicker = ({
  value,
  onChange,
  splitWarning,
}: SizePickerProps) => {
  const tSize = useTranslations('Enums.TaskSize');
  const tEnums = useTranslations('Enums');

  const renderSizeOption = (size: TaskSize, selected: boolean) => (
    <>
      <span>{tSize(size)}</span>
      <span
        className={`text-[10px] font-semibold ${selected ? 'opacity-70' : 'opacity-50'}`}
      >
        {sizeToPoints(size)}
      </span>
    </>
  );

  return (
    <>
      <ChoicePills
        layout="fill"
        value={value}
        onChange={onChange}
        options={Object.values(TaskSize).map(size => ({
          value: size,
          label: (selected: boolean) => renderSizeOption(size, selected),
        }))}
        pillClass="flex items-center justify-center gap-1 py-2 rounded-full text-xs font-bold"
        selectedClass="bg-secondary/10 border-secondary text-secondary"
        unselectedClass="bg-base-200 border-base-300 text-base-content/50 hover:border-base-content/30"
      />
      <p className="text-xs text-secondary mt-1.5">
        {tEnums('sizeEffort', {hours: sizeToPoints(value)})}
      </p>
      {(value === TaskSize.LARGE || value === TaskSize.EXTRA_LARGE) && (
        <p className="text-xs text-warning mt-0.5">{splitWarning}</p>
      )}
    </>
  );
};
