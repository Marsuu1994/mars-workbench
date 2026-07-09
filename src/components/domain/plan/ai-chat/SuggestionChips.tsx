'use client';

interface SuggestionChipsProps {
  chips: string[];
  onSelect: (chip: string) => void;
}

/** Quick-start chips under the welcome message. Clicking sends the chip text. */
export const SuggestionChips = ({chips, onSelect}: SuggestionChipsProps) => (
  <div className="mt-2.5 flex flex-wrap gap-1.5">
    {chips.map(chip => (
      <button
        key={chip}
        type="button"
        onClick={() => onSelect(chip)}
        className="rounded-full border border-base-content/15 bg-base-100 px-3 py-1.5 text-xs font-medium text-base-content/70 transition-colors hover:border-info hover:text-info"
      >
        {chip}
      </button>
    ))}
  </div>
);
