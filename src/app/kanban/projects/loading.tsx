export default function ProjectsLoading() {
  return (
    <div className="flex h-full animate-pulse flex-col">
      {/* Header skeleton: the title and, from md up, New project */}
      <div className="flex items-center gap-4 border-b border-base-content/10 px-4 py-3 md:px-5 md:py-4">
        <div className="skeleton h-6 w-28" />
        <div className="skeleton ml-auto hidden h-8 w-32 md:block" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[320px_minmax(0,1fr)]">
        {/* List pane: project cards */}
        <div className="flex flex-col gap-2 p-3.5 md:border-r md:border-base-content/10">
          {[0, 1, 2].map(index => (
            <div key={index} className="skeleton h-16 w-full md:h-24" />
          ))}
        </div>

        {/* Detail pane: header, progress, step rows (desktop) */}
        <div className="hidden flex-col gap-3.5 px-[22px] pt-[18px] md:flex">
          <div className="skeleton h-6 w-56" />
          <div className="skeleton h-4 w-80" />
          <div className="skeleton h-1.5 w-[360px]" />
          {[0, 1, 2, 3, 4].map(index => (
            <div key={index} className="skeleton h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
