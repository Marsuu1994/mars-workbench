import type { TaskItem } from "@/lib/db/tasks";
import type { TaskType } from "./enums";
import { TaskType as TaskTypeEnum } from "./enums";

/**
 * Sort tasks: daily tasks first, then weekly, then by createdAt ascending.
 */
export function sortTasks(
  tasks: TaskItem[],
  templateTypeMap: Record<string, string>
): TaskItem[] {
  return [...tasks].sort((a, b) => {
    const aIsDaily = templateTypeMap[a.templateId] === TaskTypeEnum.DAILY;
    const bIsDaily = templateTypeMap[b.templateId] === TaskTypeEnum.DAILY;

    if (aIsDaily && !bIsDaily) return -1;
    if (!aIsDaily && bIsDaily) return 1;

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}
