'use client';

import {useTranslations} from 'next-intl';
import {CheckIcon, PencilSquareIcon} from '@heroicons/react/24/outline';
import {TaskType} from '@/utils/enums';
import type {TaskTemplateItem} from '@/lib/db/taskTemplates';
import {sizeToPoints} from '@/utils/enums';
import {SizeChip} from '@/components/domain/shared/SizeChip';
import {ChoicePills} from '@/components/ui/form/ChoicePills';
import {Stepper} from '@/components/ui/form/Stepper';
import {FREQ_MIN, FREQ_MAX} from './constants';

interface TemplateItemConfig {
  type: TaskType;
  frequency: number;
}

interface TemplateItemProps {
  template: TaskTemplateItem;
  isSelected: boolean;
  config?: TemplateItemConfig;
  onToggle: () => void;
  onConfigChange: (config: TemplateItemConfig) => void;
  onEdit: () => void;
}

export default function TemplateItem({
  template,
  isSelected,
  config,
  onToggle,
  onConfigChange,
  onEdit,
}: TemplateItemProps) {
  const t = useTranslations('Plan');
  const tType = useTranslations('Enums.TaskType');
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      className={`group rounded-lg border p-3 cursor-pointer transition-colors ${
        isSelected
          ? 'border-info/50 bg-info/5'
          : 'border-base-content/10 bg-base-200'
      }`}
    >
      {/* Top row: checkbox + content + edit button */}
      <div className="flex items-center gap-3">
        {/* Checkbox */}
        <div
          className={`flex size-[18px] shrink-0 items-center justify-center rounded border-2 transition-colors mt-0.5 ${
            isSelected
              ? 'border-success bg-success'
              : 'border-base-content/30 bg-transparent'
          }`}
        >
          {isSelected && (
            <CheckIcon className="size-3 stroke-[3] text-success-content" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm">{template.title}</span>
            <SizeChip
              size={template.size}
              points={sizeToPoints(template.size)}
              className="shrink-0"
            />
          </div>
        </div>

        {/* Edit icon */}
        <button
          type="button"
          title={t('editTemplateTitle')}
          className="btn btn-ghost btn-xs btn-square shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
          onClick={e => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <PencilSquareIcon className="size-4" />
        </button>
      </div>

      {/* Config section: direct child of card so border-t spans full width */}
      {isSelected && config && (
        <div
          className="flex items-center gap-2 border-t border-base-content/10 mt-2.5 pt-2.5"
          onClick={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
        >
          {/* Type label */}
          <span className="text-[11px] text-base-content/50 shrink-0">
            {t('typeLabel')}
          </span>

          {/* Type pills */}
          <ChoicePills
            value={config.type}
            onChange={type => onConfigChange({...config, type})}
            options={[
              {
                value: TaskType.DAILY,
                label: tType('DAILY'),
                selectedClass: 'bg-info/15 border-info text-info',
              },
              {
                value: TaskType.WEEKLY,
                label: tType('WEEKLY'),
                selectedClass:
                  'bg-secondary/15 border-secondary text-secondary',
              },
            ]}
            pillClass="px-2.5 py-0.5 rounded-full text-xs font-semibold"
            unselectedClass="bg-transparent border-base-content/20 text-base-content/40 hover:border-base-content/30 hover:text-base-content/60"
          />

          {/* Divider */}
          <div className="w-px h-4 bg-base-content/15 mx-0.5" />

          {/* Freq label (desktop only — the stepper is self-explanatory) */}
          <span className="hidden md:inline text-[11px] text-base-content/50 shrink-0">
            {t('freqLabel')}
          </span>

          {/* Frequency stepper — thumb-friendly −/+ instead of a number input */}
          <div className="flex items-center gap-1.5">
            <Stepper
              value={config.frequency}
              min={FREQ_MIN}
              max={FREQ_MAX}
              onChange={frequency => onConfigChange({...config, frequency})}
              decreaseLabel={t('freqDecrease')}
              increaseLabel={t('freqIncrease')}
            />
            <span className="text-xs text-base-content/50">
              {config.type === TaskType.DAILY
                ? t('perDayUnit')
                : t('perWeekUnit')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
