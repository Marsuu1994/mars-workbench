'use client';

import {useEffect, useRef, useState, type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {SunIcon, MoonIcon} from '@heroicons/react/24/outline';
import {THEME_DARK, THEME_LIGHT} from './constants';

/**
 * Theme scope for every /design page: owns the previewed theme (independent
 * of the app's clock-driven ThemeProvider) and floats the toggle bottom-right
 * so it stays reachable from the gallery and every scenario page alike.
 *
 * Two layers, like AppShell: the outer div is a definite-height (h-dvh)
 * non-scrolling box — fx-shell-bg paints on a ::before with inset:0, which
 * would scroll away with the content if this element were the scroller — and
 * the inner div scrolls. The definite height is what lets fill-mode scenario
 * frames resolve their flex-1/h-full chains exactly like a real app page.
 */
export const DesignShell = ({children}: {children: ReactNode}) => {
  const [theme, setTheme] = useState<string>(THEME_DARK);
  const isDark = theme === THEME_DARK;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Next only resets *window* scroll on navigation; this layout persists
  // across /design routes and owns the scroller, so reset it ourselves.
  useEffect(() => {
    scrollerRef.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div
      data-theme={theme}
      className="fx-shell-bg flex h-dvh flex-col overflow-hidden text-base-content"
    >
      <button
        type="button"
        onClick={() => setTheme(isDark ? THEME_LIGHT : THEME_DARK)}
        className="btn btn-sm btn-outline fixed right-4 bottom-4 z-50 bg-base-100/80 backdrop-blur"
      >
        {isDark ? (
          <SunIcon className="size-4" />
        ) : (
          <MoonIcon className="size-4" />
        )}
        {isDark ? 'Light' : 'Dark'}
      </button>
      <div
        ref={scrollerRef}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]"
      >
        {children}
      </div>
    </div>
  );
};
