"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { BottomTabBar } from "./BottomTabBar";

interface AppShellProps {
  user: { name: string; email: string } | null;
  activePlanId: string | null;
  children: React.ReactNode;
}

/** Route prefixes that render without the app sidebar / bottom tab bar. */
const CHROMELESS_PREFIXES = ["/design"];

/**
 * Routes (exact match) whose page owns all scrolling, so <main> must not be a
 * scroll container there: @hello-pangea/dnd Droppables support only one
 * scroll parent, and the board page fills main exactly. Other routes
 * (/kanban/plans/*, etc.) still rely on main scrolling.
 */
const SELF_SCROLLING_ROUTES = ["/kanban"];

/**
 * Wraps page content in the app shell (sidebar + bottom tab bar), except on
 * routes listed in CHROMELESS_PREFIXES, which render standalone.
 */
export const AppShell = ({ user, activePlanId, children }: AppShellProps) => {
  const pathname = usePathname();
  const isChromeless = CHROMELESS_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isSelfScrolling = SELF_SCROLLING_ROUTES.includes(pathname);

  if (isChromeless) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen pt-[env(safe-area-inset-top)]">
      <AppSidebar user={user} activePlanId={activePlanId} />
      <main
        className={`flex-1 min-w-0 pb-20 md:pb-0 ${
          isSelfScrolling ? "overflow-hidden" : "overflow-auto"
        }`}
      >
        {children}
      </main>
      <BottomTabBar user={user} activePlanId={activePlanId} />
    </div>
  );
};
