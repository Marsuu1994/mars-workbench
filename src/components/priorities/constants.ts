import { PriorityQuadrant, TaskStatus } from "@/utils/enums";
import type { TrackTargetStatus } from "@/schemas";

export const CREATE_PLAN_HREF = "/kanban/plans/new";

/** Render order: Do First / Schedule (top row), Squeeze In / Maybe Later (bottom). */
export const QUADRANT_ORDER: PriorityQuadrant[] = [
  PriorityQuadrant.DO_FIRST,
  PriorityQuadrant.SCHEDULE,
  PriorityQuadrant.SQUEEZE_IN,
  PriorityQuadrant.MAYBE_LATER,
];

interface QuadrantConfig {
  /** Header top-accent border color */
  accentBorder: string;
  /** Header ● dot color */
  dotClass: string;
  /** Static i18n key for the header sublabel (Maybe Later has none) */
  sublabelKey: "sublabelDoFirst" | "sublabelSchedule" | "sublabelSqueezeIn" | null;
}

export const QUADRANT_CONFIG: Record<PriorityQuadrant, QuadrantConfig> = {
  [PriorityQuadrant.DO_FIRST]: {
    accentBorder: "border-t-error",
    dotClass: "bg-error",
    sublabelKey: "sublabelDoFirst",
  },
  [PriorityQuadrant.SCHEDULE]: {
    accentBorder: "border-t-primary",
    dotClass: "bg-primary",
    sublabelKey: "sublabelSchedule",
  },
  [PriorityQuadrant.SQUEEZE_IN]: {
    accentBorder: "border-t-warning",
    dotClass: "bg-warning",
    sublabelKey: "sublabelSqueezeIn",
  },
  [PriorityQuadrant.MAYBE_LATER]: {
    accentBorder: "border-t-base-content/40",
    dotClass: "bg-base-content/40",
    sublabelKey: null,
  },
};

/**
 * Board columns a matrix task can be tracked into, shared by the desktop
 * popover and the mobile sheet. Dot colors match the board columns'
 * STATUS_STYLE dots so the option mirrors where the card will land.
 */
export const TRACK_TARGETS: { status: TrackTargetStatus; dotClass: string }[] = [
  { status: TaskStatus.TODO, dotClass: "bg-info" },
  { status: TaskStatus.DOING, dotClass: "bg-warning" },
];

/**
 * Tasks created before the matrix (or during a deploy window) may carry a null
 * quadrant — group them into the backfill default so no card silently drops
 * out of the 2×2 grid.
 */
export const FALLBACK_QUADRANT = PriorityQuadrant.SCHEDULE;
