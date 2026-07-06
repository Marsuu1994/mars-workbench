'use client';

import {useTranslations} from 'next-intl';
import type {PriorityQuadrant} from '@/utils/enums';
import {
  QUADRANT_ORDER,
  QUADRANT_CONFIG,
} from '@/components/priorities/constants';

interface QuadrantPickerProps {
  value: PriorityQuadrant;
  onChange: (quadrant: PriorityQuadrant) => void;
}

/**
 * 2×2 quadrant selector mirroring the matrix layout. Shown in the ad-hoc
 * task modal when no source quadrant is preset (the mobile top-bar "+"
 * entry — desktop per-quadrant Add buttons preset it instead).
 */
export default function QuadrantPicker({value, onChange}: QuadrantPickerProps) {
  const t = useTranslations('TaskModal');
  const tQuadrant = useTranslations('Enums.PriorityQuadrant');

  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text text-xs font-medium">
          {t('quadrantLabel')} <span className="text-error">*</span>
        </span>
      </label>
      <div className="grid grid-cols-2 gap-1.5">
        {QUADRANT_ORDER.map(quadrant => (
          <button
            key={quadrant}
            type="button"
            onClick={() => onChange(quadrant)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs cursor-pointer transition-colors ${
              value === quadrant
                ? 'border-info/50 bg-info/5 font-semibold'
                : 'border-base-content/10 bg-base-200 font-medium hover:border-base-content/30'
            }`}
          >
            <span
              className={`size-2 rounded-full flex-shrink-0 ${QUADRANT_CONFIG[quadrant].dotClass}`}
            />
            {tQuadrant(quadrant)}
          </button>
        ))}
      </div>
    </div>
  );
}
