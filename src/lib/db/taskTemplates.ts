import prisma from "@/lib/prisma";

export type TaskTemplateItem = {
  id: string;
  userId: string | null;
  title: string;
  description: string;
  points: number;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const taskTemplateSelect = {
  id: true,
  userId: true,
  title: true,
  description: true,
  points: true,
  isArchived: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Get all non-archived task templates ordered by most recently created
 */
export async function getTaskTemplates(): Promise<TaskTemplateItem[]> {
  return prisma.taskTemplate.findMany({
    where: { isArchived: false },
    orderBy: { createdAt: "desc" },
    select: taskTemplateSelect,
  });
}

/**
 * Get a single task template by ID
 */
export async function getTaskTemplateById(id: string): Promise<TaskTemplateItem | null> {
  return prisma.taskTemplate.findUnique({
    where: { id },
    select: taskTemplateSelect,
  });
}

/**
 * Create a new task template
 */
export async function createTaskTemplate(data: {
  title: string;
  description: string;
  points: number;
}): Promise<TaskTemplateItem> {
  return prisma.taskTemplate.create({
    data,
    select: taskTemplateSelect,
  });
}

/**
 * Update an existing task template
 */
export async function updateTaskTemplate(
  id: string,
  data: {
    title?: string;
    description?: string;
    points?: number;
  }
): Promise<TaskTemplateItem> {
  return prisma.taskTemplate.update({
    where: { id },
    data,
    select: taskTemplateSelect,
  });
}
