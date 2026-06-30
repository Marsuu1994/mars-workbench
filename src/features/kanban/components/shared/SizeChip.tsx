import { sizeToLabel } from "@/features/kanban/utils/enums";
import type { TaskSize } from "@/features/kanban/utils/enums";

interface SizeChipProps {
  size: TaskSize;
  points: number;
  className?: string;
}

export const SizeChip = ({ size, points, className }: SizeChipProps) => (
  <span
    className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-success/10 text-success ${className ?? ""}`}
  >
    <span>{sizeToLabel(size)}</span>
    <span className="opacity-40">&middot;</span>
    <span className="font-semibold opacity-70">{points}</span>
  </span>
);
