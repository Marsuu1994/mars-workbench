'use client';

import {useTranslations} from 'next-intl';
import type {PriorityQuadrant} from '@/utils/enums';
import {FieldRow} from '@/components/ui/form/FieldRow';
import {ChoicePills} from '@/components/ui/form/ChoicePills';
import {
  QUADRANT_ORDER,
  QUADRANT_CONFIG,
} from '@/components/domain/priorities/constants';

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
    <FieldRow label={t('quadrantLabel')} required>
      <ChoicePills
        layout="grid"
        value={value}
        onChange={onChange}
        options={QUADRANT_ORDER.map(quadrant => ({
          value: quadrant,
          label: (
            <>
              <span
                className={`fx-led ${QUADRANT_CONFIG[quadrant].ledClass}`}
              />
              {tQuadrant(quadrant)}
            </>
          ),
        }))}
        pillClass="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs"
        selectedClass="border-info/50 bg-info/5 font-semibold"
        unselectedClass="border-base-content/10 bg-base-200 font-medium hover:border-base-content/30"
      />
    </FieldRow>
  );
}
