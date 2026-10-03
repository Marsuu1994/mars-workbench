'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
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

interface DesignShellProps {
  /** The app's cookie theme — <html> already carries it on first paint */
  appTheme: ThemeName;
  children: ReactNode;
}

/**
 * Frame for every /design page: owns the previewed theme and floats the
 * cycle button bottom-right so it stays reachable from the gallery and every
 * scenario page alike. One click advances to the next theme (mars-dark →
 * mars-light → p5-dark → …); the button shows the active one.
 *
 * One theme per page: the preview re-stamps `<html data-theme>` instead of
 * nesting a scope of its own. Theme rule forks such as
 * `[data-theme='p5-dark'] .x` match through any ancestor, so a nested
 * scope could never switch them off (P5 geometry leaked into the Sora
 * previews that way). The console starts on the app's theme and gives it
 * back on the way out — it never writes the cookie.
 *
 * Two layers, like AppShell: the outer div is a definite-height (h-dvh)
 * non-scrolling box — fx-shell-bg paints on a ::before with inset:0, which
 * would scroll away with the content if this element were the scroller — and
 * the inner div scrolls. The definite height is what lets fill-mode scenario
 * frames resolve their flex-1/h-full chains exactly like a real app page.
 */
export const DesignShell = ({appTheme, children}: DesignShellProps) => {
  const [theme, setTheme] = useState<ThemeName>(appTheme);
  const ThemeIcon = THEME_ICONS[theme];
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Layout effects so a switch never paints a frame in the old theme.
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useLayoutEffect(
    () => () => {
      document.documentElement.setAttribute('data-theme', appTheme);
    },
    [appTheme],
  );

  // Next only resets *window* scroll on navigation; this layout persists
  // across /design routes and owns the scroller, so reset it ourselves.
  useEffect(() => {
    scrollerRef.current?.scrollTo(0, 0);
  }, [pathname]);

  const cycleTheme = () =>
    setTheme(
      current =>
        THEME_CYCLE[(THEME_CYCLE.indexOf(current) + 1) % THEME_CYCLE.length],
    );

  return (
    <div className="fx-shell-bg flex h-dvh flex-col overflow-hidden text-base-content">
      <button
        type="button"
        onClick={cycleTheme}
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
