import {BACKLOG_PILE_MAX_SHEETS} from './constants';

interface BacklogPileProps {
  /** The steps behind the project's next */
  count: number;
}

// Literal classes only — never interpolate, Tailwind can't see it. Each
// sheet sits further in and fainter than the one above it.
const SHEET_STYLE = [
  'mx-2 h-1.5 fx-pile-sheet',
  'mx-4 h-[5px] fx-pile-sheet fx-pile-sheet-back opacity-85',
  'mx-6 h-[5px] fx-pile-sheet fx-pile-sheet-back opacity-60',
];

/**
 * The thin pile under a project card in the backlog: one sheet per step
 * behind its next, at most BACKLOG_PILE_MAX_SHEETS — it only says "more
 * below". Decoration: no text, no taps.
 */
export const BacklogPile = ({count}: BacklogPileProps) => (
  <span aria-hidden="true" className="pointer-events-none flex flex-col">
    {SHEET_STYLE.slice(0, Math.min(count, BACKLOG_PILE_MAX_SHEETS)).map(
      sheetStyle => (
        <span key={sheetStyle} className={`-mt-px block ${sheetStyle}`} />
      ),
    )}
  </span>
);
