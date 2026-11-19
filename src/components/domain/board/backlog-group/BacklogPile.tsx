interface BacklogPileProps {
  /** How many tasks wait behind the group's next one */
  behindCount: number;
}

// Literal classes only — never interpolate, Tailwind can't see it. One entry
// per sheet the pile can draw, so a pile never grows past three; each sheet
// sits a little narrower and fainter than the one above it.
const SHEET_STYLE = [
  'mx-2 h-1.5 bg-(--fx-pile)',
  'mx-4 h-[5px] bg-(--fx-pile-far) opacity-85',
  'mx-6 h-[5px] bg-(--fx-pile-far) opacity-60',
] as const;

/**
 * The thin sheets under a backlog card: one for each task behind its next
 * one, at most three. Decoration only — no text, nothing to tap.
 */
export const BacklogPile = ({behindCount}: BacklogPileProps) => (
  <span aria-hidden className="pointer-events-none flex flex-col">
    {SHEET_STYLE.slice(0, behindCount).map(sheetStyle => (
      <i
        key={sheetStyle}
        className={`-mt-px block rounded-b-box border border-t-0 border-(--fx-pile-border) fx-pile-sheet ${sheetStyle}`}
      />
    ))}
  </span>
);
