import prisma from "@/lib/prisma";
import type { TaskSize } from "@/generated/prisma/client";

export type TaskTemplateItem = {
  id: string;
  userId: string;
  title: string;
  description: string;
  size: TaskSize;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const taskTemplateSelect = {
  id: true,
  userId: true,
  title: true,
  description: true,
  size: true,
  isArchived: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Get all of a user's non-archived task templates ordered by most recently created
 */
export async function getTaskTemplates(userId: string): Promise<TaskTemplateItem[]> {
  return prisma.taskTemplate.findMany({
    where: { userId, isArchived: false },
    orderBy: { createdAt: "desc" },
    select: taskTemplateSelect,
  });
}

/**
 * Map a set of template IDs to their titles, scoped to the owner. Used to join
 * titles onto per-template stats. Includes archived templates so historical
 * stats stay labelled.
 */
export async function getTaskTemplateTitlesByIds(
  userId: string,
  ids: string[]
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await prisma.taskTemplate.findMany({
    where: { id: { in: ids }, userId },
    select: { id: true, title: true },
  });
  return new Map(rows.map((r) => [r.id, r.title]));
}

/**
 * Get a single task template by ID, scoped to the owner
 */
export async function getTaskTemplateById(
  userId: string,
  id: string
): Promise<TaskTemplateItem | null> {
  return prisma.taskTemplate.findFirst({
    where: { id, userId },
    select: taskTemplateSelect,
  });
}

/**
 * Create a new task template for a user
 */
export async function createTaskTemplate(
  userId: string,
  data: {
    title: string;
    description: string;
    size: TaskSize;
  }
): Promise<TaskTemplateItem> {
  return prisma.taskTemplate.create({
    data: { ...data, userId },
    select: taskTemplateSelect,
  });
}

/**
 * Update an existing task template, scoped to the owner.
 * Uses updateMany so userId can be part of the filter; returns the count so
 * callers can treat 0 as not-found/forbidden.
 */
export async function updateTaskTemplate(
  userId: string,
  id: string,
  data: {
    title?: string;
    description?: string;
    size?: TaskSize;
  }
): Promise<{ count: number }> {
  return prisma.taskTemplate.updateMany({
    where: { id, userId },
    data,
  });
}
