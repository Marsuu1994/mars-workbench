'use client';

import {useEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import type {DumpEntryItem} from '@/lib/db/dumpEntries';
import {formatDumpTime} from '@/utils/dump';

interface DumpEntryCardProps {
  entry: DumpEntryItem;
}

/** One dumped entry: mono timestamp + content, 6-line clamp with a toggle. */
export const DumpEntryCard = ({entry}: DumpEntryCardProps) => {
  const t = useTranslations('Dump');
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  // Show the toggle only when the clamped content actually overflows.
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [entry.content]);

  return (
    <div className="rounded-[10px] border border-base-content/10 bg-base-100 p-3 md:p-3.5">
      <span className="fx-num text-[11px] text-base-content/40">
        {formatDumpTime(entry.createdAt)}
      </span>
      <p
        ref={textRef}
        className={`mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-base-content ${
          expanded ? '' : 'line-clamp-6'
        }`}
      >
        {entry.content}
      </p>
      {(overflows || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-1 text-xs font-semibold text-primary hover:underline"
        >
          {expanded ? t('showLess') : t('showMore')}
        </button>
      )}
    </div>
  );
};
