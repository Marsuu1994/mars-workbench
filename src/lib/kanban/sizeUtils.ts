import { TaskSize } from "@/generated/prisma/client";

export const SIZE_TO_POINTS: Record<TaskSize, number> = {
  EXTRA_SMALL: 1,
  SMALL: 2,
  MEDIUM: 3,
  LARGE: 5,
  EXTRA_LARGE: 8,
};

export const sizeToPoints = (size: TaskSize): number => SIZE_TO_POINTS[size];
