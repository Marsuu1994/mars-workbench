export default function ProjectsLoading() {
  return (
    <div className="flex h-full animate-pulse flex-col">
      {/* ProjectsHeader skeleton: title + week, the hub tabs, the action */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 border-b border-base-content/10 px-4 py-3 md:px-5 md:py-4">
        <div className="flex flex-1 items-center justify-between md:flex-initial md:flex-col md:items-start md:gap-1.5">
          <div className="skeleton h-6 w-16" />
          <div className="skeleton h-3 w-14 md:w-40" />
        </div>
        <div className="flex w-full items-center gap-2.5 md:ml-auto md:w-auto">
          <div className="skeleton h-9 w-full md:w-44" />
          <div className="skeleton hidden h-8 w-32 md:block" />
        </div>
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
