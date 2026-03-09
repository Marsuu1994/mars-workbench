"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  Squares2X2Icon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useSidebarStore } from "@/features/auth/store/sidebarStore";
import { createClient } from "@/lib/supabase/client";

interface AppSidebarProps {
  user: { name: string; email: string } | null;
}

const navItems = [
  { label: "Simple Chat Bot", href: "/chat", icon: ChatBubbleOvalLeftEllipsisIcon },
  { label: "Kanban Planner", href: "/kanban", icon: Squares2X2Icon },
];

export const AppSidebar = ({ user }: AppSidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, toggleSidebar } = useSidebarStore();
  const [isLogoHovered, setIsLogoHovered] = useState(false);

  if (!user || pathname.startsWith("/auth")) {
    return null;
  }

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const collapsed = isCollapsed;

  // Shared: text fades so it's invisible before overflow-hidden clips it
  const textOpacity = `transition-opacity duration-200 ${collapsed ? "opacity-0" : "opacity-100"}`;

  return (
    <aside
      className={`flex flex-col flex-shrink-0 border-r border-base-200 bg-base-100 transition-all duration-200 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Header — pl-[19px] centers the 28px logo with nav icons (nav icon center = 33px) */}
      <div className="flex items-center gap-2.5 border-b border-base-200 min-h-14 pl-[19px] pr-4 py-3.5">
        {/* Logo */}
        <div
          className={`relative flex-shrink-0 ${collapsed ? "cursor-e-resize" : "cursor-default"}`}
          onClick={collapsed ? toggleSidebar : undefined}
          onMouseEnter={() => setIsLogoHovered(true)}
          onMouseLeave={() => setIsLogoHovered(false)}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-info shadow-sm">
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
        <span className={`text-sm font-bold tracking-tight text-base-content whitespace-nowrap ${textOpacity}`}>
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

      {/* Nav — consistent padding, labels fade */}
      <div className="px-3 pt-3 pb-1 overflow-hidden">
        <div className={`mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-base-content/40 whitespace-nowrap ${textOpacity}`}>
          Features
        </div>
        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-base-content/50 hover:bg-base-200 hover:text-base-content/70"
                }`}
              >
                <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                <span className={`text-[13px] ${textOpacity}`}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User section — consistent layout, info fades */}
      {/* User — pl-[17px] centers 32px avatar with nav icons (center = 33px) */}
      <div className="mt-auto border-t border-base-200 flex items-center gap-2.5 pl-[17px] pr-3 py-3 overflow-hidden">
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
