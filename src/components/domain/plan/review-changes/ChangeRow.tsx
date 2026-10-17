import type {ReactNode} from 'react';
import {ACCENT, type Accent} from './constants';

interface ChangeRowProps {
  accent: Accent;
  title: ReactNode;
  meta?: ReactNode;
  note: ReactNode;
}

/** One change entry: accent dot + title + meta line + italic note. */
export const ChangeRow = ({accent, title, meta, note}: ChangeRowProps) => (
  <div
    className={`flex items-start gap-2.5 px-3 py-2.5 bg-base-300 border ${ACCENT[accent].border} rounded-lg`}
  >
    <div
      className={`size-[7px] rounded-full ${ACCENT[accent].dot} shrink-0 mt-[5px]`}
    />
    <div>
      <div className="text-sm font-medium text-base-content">{title}</div>
      {meta}
      <div className={`text-[11px] italic ${ACCENT[accent].text} mt-1`}>
        {note}
      </div>
    </div>
  </div>
);
