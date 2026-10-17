import type {ReactNode} from 'react';
import {Pill} from '@/components/ui/Pill';
import {ACCENT, type Accent} from './constants';

interface ChangeSectionProps {
  icon: ReactNode;
  heading: string;
  accent: Accent;
  count?: number;
  children: ReactNode;
}

/** Section header: icon + uppercase heading + optional count pill. */
export const ChangeSection = ({
  icon,
  heading,
  accent,
  count,
  children,
}: ChangeSectionProps) => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span
        className={`text-[11px] font-bold uppercase tracking-widest ${ACCENT[accent].text}`}
      >
        {heading}
      </span>
      {count !== undefined && (
        <Pill color={accent} className="rounded-full font-bold">
          {count}
        </Pill>
      )}
    </div>
    {children}
  </div>
);
