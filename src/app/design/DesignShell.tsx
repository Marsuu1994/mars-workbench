'use client';

import {useEffect, useRef, useState, type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {SunIcon, MoonIcon, EyeIcon} from '@heroicons/react/24/outline';
import type {ThemeName} from '@/utils/theme';
import {THEME_CYCLE, THEME_CYCLE_LABELS} from './constants';

/** Per-theme toggle icon (matches the currently active theme). */
const THEME_ICONS: Record<ThemeName, typeof SunIcon> = {
  'mars-dark': MoonIcon,
  'mars-light': SunIcon,
  'p5-dark': EyeIcon,
};

/**
 * Theme scope for every /design page: owns the previewed theme (independent
 * of the app's cookie-driven theme) and floats the cycle button bottom-right
 * so it stays reachable from the gallery and every scenario page alike. One
 * click advances to the next theme (mars-dark → mars-light → p5-dark → …);
 * the button shows the currently active theme.
 *
 * Two layers, like AppShell: the outer div is a definite-height (h-dvh)
 * non-scrolling box — fx-shell-bg paints on a ::before with inset:0, which
 * would scroll away with the content if this element were the scroller — and
 * the inner div scrolls. The definite height is what lets fill-mode scenario
 * frames resolve their flex-1/h-full chains exactly like a real app page.
 */
export const DesignShell = ({children}: {children: ReactNode}) => {
  const [themeIndex, setThemeIndex] = useState(0);
  const theme = THEME_CYCLE[themeIndex];
  const ThemeIcon = THEME_ICONS[theme];
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
        onClick={() => setThemeIndex(i => (i + 1) % THEME_CYCLE.length)}
        className="btn btn-sm btn-outline fixed right-4 bottom-4 z-50 bg-base-100/80 backdrop-blur"
      >
        <ThemeIcon className="size-4" />
        {THEME_CYCLE_LABELS[theme]}
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
