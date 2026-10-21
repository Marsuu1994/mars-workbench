import {afterAll, afterEach, vi} from 'vitest';
import {prisma} from '@/lib/prisma';

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await prisma.$disconnect();
});
