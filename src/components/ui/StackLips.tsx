interface StackLipsProps {
  /** Items in the stack, the visible card included: 2 → one lip, 3+ → two */
  count: number;
}

/**
 * Paper edges peeking out below a stacked card — one lip at two items, two
 * from three up (the exact count belongs in a chip, the lips only say "more
 * underneath"). Render inside the card; it must be `relative` and leave
 * ~10px of room below.
 */
export const StackLips = ({count}: StackLipsProps) => {
  if (count < 2) {
    return null;
  }

  return (
    <>
      <span aria-hidden className="fx-stack-lip inset-x-1.5" />
      {count > 2 && (
        <span aria-hidden className="fx-stack-lip fx-stack-lip-2 inset-x-3" />
      )}
    </>
  );
};
