'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {
  Squares2X2Icon,
  TableCellsIcon,
  PencilSquareIcon,
  InboxArrowDownIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import {cn} from '@/components/ui/cn';
import {useSettingsStore} from '@/store/settingsStore';

interface BottomTabBarProps {
  user: {name: string; email: string} | null;
  activePlanId: string | null;
  /** Design gallery/scenario override — defaults to the live route. */
  pathname?: string;
  /** Design gallery/scenario override — defaults to the settings store. */
  settingsOpen?: boolean;
  /** Extra classes on the dock (AppShell passes md:hidden). */
  className?: string;
}

export const BottomTabBar = ({
  user,
  activePlanId,
  pathname: pathnameProp,
  settingsOpen: settingsOpenProp,
  className,
}: BottomTabBarProps) => {
  const livePathname = usePathname();
  const pathname = pathnameProp ?? livePathname;
  const openSettings = useSettingsStore(s => s.open);
  const storeSettingsOpen = useSettingsStore(s => s.isOpen);
  const settingsOpen = settingsOpenProp ?? storeSettingsOpen;

  if (!user || !pathname.startsWith('/kanban')) {
    return null;
  }

  const isBoard = pathname === '/kanban';
  const isPriorities = pathname.startsWith('/kanban/priorities');
  const isPlan = pathname.startsWith('/kanban/plans');
  const isDump = pathname.startsWith('/kanban/dump');

  return (
    <div className={cn('dock fx-chrome fx-hairline-top', className)}>
      <Link href="/kanban" className={isBoard ? 'dock-active' : ''}>
        <Squares2X2Icon className="size-5" />
        <span className="dock-label fx-display">Board</span>
      </Link>
      <Link
        href="/kanban/priorities"
        className={isPriorities ? 'dock-active' : ''}
      >
        <TableCellsIcon className="size-5" />
        <span className="dock-label fx-display">Priorities</span>
      </Link>
      <Link
        href={
          activePlanId ? `/kanban/plans/${activePlanId}` : '/kanban/plans/new'
        }
        className={isPlan ? 'dock-active' : ''}
      >
        <PencilSquareIcon className="size-5" />
        <span className="dock-label fx-display">Plan</span>
      </Link>
      <Link href="/kanban/dump" className={isDump ? 'dock-active' : ''}>
        <InboxArrowDownIcon className="size-5" />
        <span className="dock-label fx-display">Dump</span>
      </Link>
      {/* Trigger, not a route: pressed tint only while the sheet is open
          (an action, not a location — never dock-active). */}
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={openSettings}
        className={cn(settingsOpen && 'text-base-content')}
      >
        <Cog6ToothIcon className="size-5" />
        <span className="dock-label fx-display">Settings</span>
      </button>
    </div>
  );
};
