'use client';

import {useState, type ReactNode} from 'react';
import {SunIcon, MoonIcon} from '@heroicons/react/24/outline';
import {THEME_DARK, THEME_LIGHT} from './constants';

/**
 * Theme scope for every /design page: owns the previewed theme (independent
 * of the app's clock-driven ThemeProvider) and floats the toggle bottom-right
 * so it stays reachable from the gallery and every scenario page alike.
 */
export const DesignShell = ({children}: {children: ReactNode}) => {
  const [theme, setTheme] = useState<string>(THEME_DARK);
  const isDark = theme === THEME_DARK;

  return (
    <div
      data-theme={theme}
      className="fx-shell-bg flex min-h-dvh flex-col text-base-content"
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
      {children}
    </div>
  );
};
