'use client';

import {usePathname} from 'next/navigation';
import {AppSidebar} from './AppSidebar';
import {BottomTabBar} from './BottomTabBar';

interface AppShellProps {
  user: {name: string; email: string} | null;
  activePlanId: string | null;
  children: React.ReactNode;
}

/** Route prefixes that render without the app sidebar / bottom tab bar. */
const CHROMELESS_PREFIXES = ['/design'];

/**
 * Routes whose page owns all scrolling, so <main> must not be a scroll
 * container there — otherwise the page header scrolls away with <main> and
 * mobile shows two scrollbars. Board/priorities also need it because
 * @hello-pangea/dnd Droppables support only one scroll parent. The plans
 * layout keeps its header fixed and scrolls the form body itself.
 */
const SELF_SCROLLING_ROUTES = ['/kanban', '/kanban/priorities'];
const SELF_SCROLLING_PREFIXES = ['/kanban/plans'];

/**
 * Wraps page content in the app shell (sidebar + bottom tab bar), except on
 * routes listed in CHROMELESS_PREFIXES, which render standalone.
 */
export const AppShell = ({user, activePlanId, children}: AppShellProps) => {
  const pathname = usePathname();
  const isChromeless = CHROMELESS_PREFIXES.some(prefix =>
    pathname.startsWith(prefix),
  );
  const isSelfScrolling =
    SELF_SCROLLING_ROUTES.includes(pathname) ||
    SELF_SCROLLING_PREFIXES.some(prefix => pathname.startsWith(prefix));

  if (isChromeless) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-dvh pt-[env(safe-area-inset-top)]">
      <AppSidebar user={user} activePlanId={activePlanId} />
      {/* Mobile bottom padding matches the fixed daisyUI dock exactly:
          4rem + env(safe-area-inset-bottom) — see .dock in daisyUI. */}
      <main
        className={`flex-1 min-w-0 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 ${
          isSelfScrolling ? 'overflow-hidden' : 'overflow-auto'
        }`}
      >
        {children}
      </main>
      <BottomTabBar user={user} activePlanId={activePlanId} />
    </div>
  );
};
