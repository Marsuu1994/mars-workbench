/**
 * The atmosphere behind the signed-out-style auth screens (login, OAuth
 * consent): three soft theme glows and a slowly crawling grid. Fixed layers,
 * so the screen's own content sits above them at z-10.
 */
export const AuthBackdrop = () => (
  <>
    {/* Atmospheric background */}
    <div
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        background: [
          'radial-gradient(ellipse 60% 50% at 50% 100%, var(--login-glow-cyan) 0%, transparent 70%)',
          'radial-gradient(ellipse 40% 40% at 20% 20%, var(--login-glow-purple) 0%, transparent 60%)',
          'radial-gradient(ellipse 50% 50% at 80% 30%, var(--login-glow-rose) 0%, transparent 60%)',
        ].join(', '),
      }}
    />

    {/* Subtle grid — extends one 64px cell above the viewport so the
        fx-grid-flow crawl wraps seamlessly */}
    <div
      className="fx-grid-flow pointer-events-none fixed inset-x-0 -top-16 bottom-0 z-0 bg-[size:64px_64px]"
      style={{
        backgroundImage: [
          'linear-gradient(var(--login-grid-color) 1px, transparent 1px)',
          'linear-gradient(90deg, var(--login-grid-color) 1px, transparent 1px)',
        ].join(', '),
      }}
    />
  </>
);
