export default function DumpLoading() {
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
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-3 w-64 max-md:w-40" />
        </div>
        <div className="skeleton h-4 w-16 ml-auto" />
      </div>

      {/* Composer skeleton */}
      <div className="border-b border-base-content/10 px-4 py-3">
        <div className="mx-auto w-full max-w-[720px]">
          <div className="skeleton h-28 w-full rounded-2xl" />
        </div>
      </div>

      {/* Feed skeleton */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="mx-auto w-full max-w-[720px] px-4 py-4 flex flex-col gap-2.5">
          <div className="skeleton h-3 w-32" />
          <div className="skeleton h-16 w-full rounded-[10px]" />
          <div className="skeleton h-16 w-full rounded-[10px]" />
          <div className="skeleton h-16 w-full rounded-[10px]" />
        </div>
      </div>
    </div>
  );
}
