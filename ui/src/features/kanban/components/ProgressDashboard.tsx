interface ProgressDashboardProps {
  todayDoneCount: number;
  todayTotalCount: number;
  todayDonePoints: number;
  todayTotalPoints: number;
  weekDoneCount: number;
  weekTotalCount: number;
  weekDonePoints: number;
  weekTotalPoints: number;
  daysElapsed: number;
}

const RADIUS = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 138.23

export default function ProgressDashboard({
  todayDoneCount,
  todayTotalCount,
  todayDonePoints,
  todayTotalPoints,
  weekDoneCount,
  weekTotalCount,
  weekDonePoints,
  weekTotalPoints,
  daysElapsed,
}: ProgressDashboardProps) {
  const todayPct = todayTotalCount > 0 ? Math.round((todayDoneCount / todayTotalCount) * 100) : 0;
  const todayOffset = CIRCUMFERENCE * (1 - todayPct / 100);

  const weekPct = weekTotalCount > 0 ? Math.round((weekDoneCount / weekTotalCount) * 100) : 0;

  const dailyAvg = daysElapsed > 0 ? (weekDonePoints / daysElapsed).toFixed(1) : "0.0";

  return (
    <div className="flex items-center gap-6 px-4 py-3 border-b border-base-content/10 bg-base-200/50">
      {/* Today Ring */}
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12 shrink-0">
          <svg viewBox="0 0 52 52" width={48} height={48} className="-rotate-90">
            <circle
              cx={26}
              cy={26}
              r={RADIUS}
              fill="none"
              strokeWidth={4}
              className="stroke-base-content/20"
            />
            <circle
              cx={26}
              cy={26}
              r={RADIUS}
              fill="none"
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={todayOffset}
              className="stroke-success transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold">
            {todayPct}%
          </div>
        </div>
        <div className="flex flex-col gap-px">
          <span className="text-sm font-semibold">Today</span>
          <span className="text-xs text-base-content/50">
            {todayDoneCount} of {todayTotalCount} tasks
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="divider divider-horizontal mx-0" />

      {/* Today Points */}
      <div className="flex flex-col gap-px">
        <div className="text-lg font-bold text-success">
          {todayDonePoints} / {todayTotalPoints}
        </div>
        <div className="text-xs text-base-content/50">Today Points</div>
      </div>

      {/* Week Points */}
      <div className="flex flex-col gap-px">
        <div className="text-lg font-bold text-info">
          {weekDonePoints} / {weekTotalPoints}
        </div>
        <div className="text-xs text-base-content/50">Week Points</div>
      </div>

      {/* Daily Avg */}
      <div className="flex flex-col gap-px">
        <div className="text-lg font-bold text-warning">{dailyAvg}</div>
        <div className="text-xs text-base-content/50">Daily Avg</div>
      </div>

      {/* Divider */}
      <div className="divider divider-horizontal mx-0" />

      {/* Week Progress Bar */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold">Week Progress</span>
          <span className="text-xs font-semibold text-info">{weekPct}%</span>
        </div>
        <div className="h-1.5 bg-base-300 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-info to-success transition-all duration-500"
            style={{ width: `${weekPct}%` }}
          />
        </div>
        <span className="text-xs text-base-content/50">
          {weekDoneCount} of {weekTotalCount} tasks
        </span>
      </div>
    </div>
  );
}
