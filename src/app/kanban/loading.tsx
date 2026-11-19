/** The skeleton's day cells, today in Wednesday's place; a phone's row
    shows today and the three days around it */
const DAY_SKELETONS = ['mon', 'tue', 'today', 'thu', 'fri', 'sat', 'sun'];
const DESKTOP_ONLY_DAYS = new Set(['mon', 'sat', 'sun']);

export default function KanbanLoading() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      {/* BoardHeader skeleton */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-base-content/10">
        <div className="flex items-center gap-3">
          <div className="skeleton h-7 w-40" />
          <div className="skeleton h-6 w-28 rounded-full" />
        </div>
        <div className="skeleton h-8 w-24 rounded-lg" />
      </div>

      {/* Day rings skeleton: today's wider cell, then the other days */}
      <div className="flex items-end gap-1.5 px-4 py-2.5 border-b border-base-content/10 bg-base-200/50">
        {DAY_SKELETONS.map(day =>
          day === 'today' ? (
            <div
              key={day}
              className="flex flex-[2.4] items-center justify-center gap-2.5 py-1.5"
            >
              <div className="skeleton size-11 rounded-full shrink-0" />
              <div className="flex flex-col gap-1">
                <div className="skeleton h-2.5 w-10" />
                <div className="skeleton h-3 w-20" />
              </div>
            </div>
          ) : (
            <div
              key={day}
              className={`flex-1 flex-col items-center gap-1.5 pt-1.5 pb-[7px] ${
                DESKTOP_ONLY_DAYS.has(day) ? 'hidden md:flex' : 'flex'
              }`}
            >
              <div className="skeleton h-2.5 w-6" />
              <div className="skeleton size-[30px] rounded-full" />
            </div>
          ),
        )}
      </div>

      {/* Kanban columns skeleton: Todo only on phones */}
      <div className="flex-1 min-h-0 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
          {['Todo', 'Done'].map(col => (
            <div
              key={col}
              className={`flex-col gap-3 bg-base-200/50 rounded-xl p-3 ${
                col === 'Done' ? 'hidden md:flex' : 'flex'
              }`}
            >
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
