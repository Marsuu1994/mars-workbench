/**
 * The Mars Workbench mark in its glowing gradient tile (login, OAuth consent).
 *
 * Workaround (WebKit): the tile paints a plain linear-gradient, not
 * Tailwind's `bg-linear-to-br from-* to-*`: those build the gradient from
 * @property-registered variables whose initial value is transparent, and
 * WebKit (iOS Safari and Chrome) falls back to it while the fx-glow-pulse halo
 * restyles the tile — the tile flashed dark several times on load and once on
 * every return to the tab.
 */
export const BrandIcon = () => (
  <div className="fx-glow-pulse flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(to_bottom_right,var(--color-primary),var(--color-secondary))]">
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7 fill-none stroke-on-gradient"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  </div>
);
