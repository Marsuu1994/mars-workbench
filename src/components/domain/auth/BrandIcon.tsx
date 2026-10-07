/** The Mars Workbench mark in its glowing gradient tile (login, OAuth consent). */
export const BrandIcon = () => (
  <div className="fx-glow-pulse flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-secondary">
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7 fill-none stroke-white"
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
