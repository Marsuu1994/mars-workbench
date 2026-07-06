'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {
  Squares2X2Icon,
  TableCellsIcon,
  PencilSquareIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

interface BottomTabBarProps {
  user: {name: string; email: string} | null;
  activePlanId: string | null;
}

export const BottomTabBar = ({user, activePlanId}: BottomTabBarProps) => {
  const pathname = usePathname();

  if (!user || !pathname.startsWith('/kanban')) {
    return null;
  }

  const isBoard = pathname === '/kanban';
  const isPriorities = pathname.startsWith('/kanban/priorities');
  const isPlan = pathname.startsWith('/kanban/plans');
  const isSettings = pathname.startsWith('/kanban/settings');

  return (
    <div className="dock md:hidden">
      <Link href="/kanban" className={isBoard ? 'dock-active' : ''}>
        <Squares2X2Icon className="size-5" />
        <span className="dock-label">Board</span>
      </Link>
      <Link
        href="/kanban/priorities"
        className={isPriorities ? 'dock-active' : ''}
      >
        <TableCellsIcon className="size-5" />
        <span className="dock-label">Priorities</span>
      </Link>
      <Link
        href={
          activePlanId ? `/kanban/plans/${activePlanId}` : '/kanban/plans/new'
        }
        className={isPlan ? 'dock-active' : ''}
      >
        <PencilSquareIcon className="size-5" />
        <span className="dock-label">Plan</span>
      </Link>
      <Link href="/kanban/settings" className={isSettings ? 'dock-active' : ''}>
        <Cog6ToothIcon className="size-5" />
        <span className="dock-label">Settings</span>
      </Link>
    </div>
  );
};
