export default function KanbanLoading() {
  return (
    <div className="flex flex-col h-screen animate-pulse">
      {/* BoardHeader skeleton */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-base-content/10">
        <div className="flex items-center gap-3">
          <div className="skeleton h-7 w-40" />
          <div className="skeleton h-6 w-28 rounded-full" />
        </div>
        <div className="skeleton h-8 w-24 rounded-lg" />
      </div>

      {/* ProgressDashboard skeleton */}
      <div className="flex items-center gap-6 px-4 py-3 border-b border-base-content/10 bg-base-200/50">
        <div className="flex items-center gap-3">
          <div className="skeleton w-12 h-12 rounded-full shrink-0" />
          <div className="flex flex-col gap-1">
            <div className="skeleton h-4 w-12" />
            <div className="skeleton h-3 w-20" />
          </div>
        </div>
        <div className="divider divider-horizontal mx-0" />
        <div className="flex flex-col gap-1">
          <div className="skeleton h-6 w-16" />
          <div className="skeleton h-3 w-20" />
        </div>
        <div className="flex flex-col gap-1">
          <div className="skeleton h-6 w-16" />
          <div className="skeleton h-3 w-20" />
        </div>
        <div className="flex flex-col gap-1">
          <div className="skeleton h-6 w-12" />
          <div className="skeleton h-3 w-16" />
        </div>
        <div className="divider divider-horizontal mx-0" />
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="flex justify-between items-center">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-3 w-8" />
          </div>
          <div className="skeleton h-1.5 w-full rounded-full" />
          <div className="skeleton h-3 w-24" />
        </div>
      </div>

      {/* Kanban columns skeleton */}
      <div className="flex-1 min-h-0 p-4">
        <div className="grid grid-cols-3 gap-4 h-full">
          {["Todo", "Doing", "Done"].map((col) => (
            <div key={col} className="flex flex-col gap-3 bg-base-200/50 rounded-xl p-3">
              <div className="skeleton h-5 w-16" />
              <div className="skeleton h-20 w-full rounded-lg" />
              <div className="skeleton h-20 w-full rounded-lg" />
              <div className="skeleton h-20 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
