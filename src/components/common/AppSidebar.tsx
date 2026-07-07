'use client';

import {useState} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Squares2X2Icon,
  TableCellsIcon,
  PencilSquareIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline';
import {useSidebarStore} from '@/store/sidebarStore';
import {createClient} from '@/lib/supabase/client';

interface AppSidebarProps {
  user: {name: string; email: string} | null;
  activePlanId: string | null;
}

export const AppSidebar = ({user, activePlanId}: AppSidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const {isCollapsed, toggleSidebar} = useSidebarStore();
  const [isLogoHovered, setIsLogoHovered] = useState(false);

  if (!user || pathname.startsWith('/auth')) {
    return null;
  }

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const collapsed = isCollapsed;
  const hasPlan = !!activePlanId;

  // Shared: text fades so it's invisible before overflow-hidden clips it
  const textOpacity = `transition-opacity duration-200 ${collapsed ? 'opacity-0' : 'opacity-100'}`;

  const isBoardActive = pathname === '/kanban';
  const isPrioritiesActive = pathname.startsWith('/kanban/priorities');
  const isPlanActive = pathname.startsWith('/kanban/plans');
  const planHref = activePlanId
    ? `/kanban/plans/${activePlanId}`
    : '/kanban/plans/new';

  const navItemBase =
    'flex items-center gap-2.5 rounded-lg px-3 py-2 whitespace-nowrap transition-colors';
  const navItemActive = `${navItemBase} fx-nav-rail bg-primary/10 text-primary font-semibold`;
  const navItemInactive = `${navItemBase} text-base-content/50 hover:bg-base-200 hover:text-base-content/70`;

  // No pre-plan guard here (matching the mobile dock) — without a plan the
  // board route just shows its EmptyBoard state.
  const renderBoardLink = () => (
    <Link
      href="/kanban"
      className={isBoardActive ? navItemActive : navItemInactive}
    >
      <Squares2X2Icon className="h-[18px] w-[18px] flex-shrink-0" />
      <span className={`text-[13px] ${textOpacity}`}>Board</span>
    </Link>
  );

  const renderPrioritiesLink = () => (
    <Link
      href="/kanban/priorities"
      className={isPrioritiesActive ? navItemActive : navItemInactive}
    >
      <TableCellsIcon className="h-[18px] w-[18px] flex-shrink-0" />
      <span className={`text-[13px] ${textOpacity}`}>Priorities</span>
    </Link>
  );

  const renderPlanLink = () => (
    <Link
      href={planHref}
      className={isPlanActive ? navItemActive : navItemInactive}
    >
      <PencilSquareIcon className="h-[18px] w-[18px] flex-shrink-0" />
      <span className={`text-[13px] ${textOpacity}`}>Plan</span>
      {!hasPlan && !collapsed && (
        <span className="ml-auto text-[9px] font-bold uppercase tracking-wide bg-gradient-to-r from-primary to-info text-white px-1.5 py-0.5 rounded-full">
          New
        </span>
      )}
    </Link>
  );

  return (
    <aside
      className={`fx-chrome-glass hidden md:flex flex-col flex-shrink-0 border-r border-base-content/10 transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Header — pl-[19px] centers the 28px logo with nav icons (nav icon center = 33px) */}
      <div className="flex items-center gap-2.5 border-b border-base-content/10 min-h-14 pl-[19px] pr-4 py-3.5">
        {/* Logo */}
        <div
          className={`relative flex-shrink-0 ${collapsed ? 'cursor-e-resize' : 'cursor-default'}`}
          onClick={collapsed ? toggleSidebar : undefined}
          onMouseEnter={() => setIsLogoHovered(true)}
          onMouseLeave={() => setIsLogoHovered(false)}
        >
          <div className="fx-glow flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-info">
            {collapsed && isLogoHovered ? (
              <ChevronRightIcon className="h-4 w-4 text-white" />
            ) : (
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-none stroke-white"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            )}
          </div>
          {/* Tooltip for collapsed logo */}
          {collapsed && isLogoHovered && (
            <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-100 rounded-md bg-neutral px-2.5 py-1 text-xs font-medium text-neutral-content whitespace-nowrap shadow-lg">
              Open sidebar
            </div>
          )}
        </div>

        {/* Brand text — fades out, never unmounted */}
        <span
          className={`text-sm font-bold tracking-tight text-base-content whitespace-nowrap ${textOpacity}`}
        >
          Mars Workbench
        </span>

        {/* Collapse toggle — fades out */}
        <div className={`relative ml-auto group flex-shrink-0 ${textOpacity}`}>
          <button
            onClick={toggleSidebar}
            className="flex h-6 w-6 items-center justify-center rounded-md text-base-content/40 transition-colors hover:bg-base-200 hover:text-base-content/70 cursor-w-resize"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <div className="hidden group-hover:block absolute top-[calc(100%+6px)] left-1/2 -translate-x-1/2 z-100 rounded-md bg-neutral px-2.5 py-1 text-xs font-medium text-neutral-content whitespace-nowrap shadow-lg">
            Close sidebar
          </div>
        </div>
      </div>

      {/* Nav — workspace items */}
      <div className="px-3 pt-3 pb-1 overflow-hidden">
        <div
          className={`overflow-hidden transition-all duration-200 ${collapsed ? 'h-0 mb-0' : 'h-5 mb-1.5'}`}
        >
          <span
            className={`fx-label block px-2 whitespace-nowrap ${textOpacity}`}
          >
            Workspace
          </span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {renderBoardLink()}
          {renderPrioritiesLink()}
          {renderPlanLink()}
        </nav>
      </div>

      {/* User section — consistent layout, info fades */}
      {/* User — pl-[17px] centers 32px avatar with nav icons (center = 33px) */}
      <div className="mt-auto border-t border-base-content/10 flex items-center gap-2.5 pl-[17px] pr-3 py-3 overflow-hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-warning to-error text-white text-xs font-bold flex-shrink-0">
          {initials}
        </div>

        <div className={`flex-1 min-w-0 ${textOpacity}`}>
          <div className="text-[13px] font-semibold text-base-content truncate">
            {user.name}
          </div>
          <div className="text-[11px] text-base-content/50 truncate">
            {user.email}
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className={`flex h-7 w-7 items-center justify-center rounded-md text-base-content/40 transition-colors hover:bg-error/10 hover:text-error cursor-pointer flex-shrink-0 ${textOpacity}`}
        >
          <ArrowRightStartOnRectangleIcon className="h-[18px] w-[18px]" />
        </button>
      </div>
    </aside>
  );
};
