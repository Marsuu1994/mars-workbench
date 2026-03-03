export function WelcomeMessage() {
  return (
    <section className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-pulse">
          Hello friend!
        </h1>
        <p className="text-2xl text-base-content/50 mt-2">
          Let&apos;s talk
        </p>
      </div>
    </section>
  );
}
