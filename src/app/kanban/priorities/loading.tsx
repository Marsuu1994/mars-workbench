export default function PrioritiesLoading() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      {/* BoardHeader skeleton (desktop) */}
      <div className="hidden md:flex items-center px-4 py-3 border-b border-base-content/10">
        <div className="flex items-center gap-3">
          <div className="skeleton h-7 w-40" />
          <div className="skeleton h-6 w-28 rounded-full" />
        </div>
      </div>

      {/* Title bar skeleton */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-base-content/10">
        <div className="skeleton size-9 rounded-[10px] shrink-0" />
        <div className="flex flex-col gap-1.5">
          <div className="skeleton h-4 w-28" />
          <div className="skeleton h-3 w-64 max-md:w-36" />
        </div>
        <div className="skeleton h-4 w-40 ml-auto max-md:w-20" />
      </div>

      {/* Hint bar skeleton (desktop) */}
      <div className="hidden md:flex items-center px-4 py-2.5 border-b border-base-content/10 bg-base-200/50">
        <div className="skeleton h-3.5 w-80" />
      </div>

      {/* 2×2 matrix skeleton */}
      <div className="flex-1 min-h-0 grid grid-cols-2 grid-rows-2 gap-px p-px">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2 border border-base-content/10 p-4">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-12 w-full rounded-lg" />
            <div className="skeleton h-12 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
