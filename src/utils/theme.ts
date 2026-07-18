/**
 * Theme registry — internal names are stable and never renamed; display
 * labels live in i18n (Settings.themeNames). See design/design-language/
 * and the Theme Change Flow in design/flows/auth.md.
 */
export const THEMES = ['mars-light', 'mars-dark', 'p5-dark'] as const;

export type ThemeName = (typeof THEMES)[number];

export const DEFAULT_THEME: ThemeName = 'mars-dark';

export const THEME_COOKIE = 'mw-theme';

/** Missing/unknown cookie values (first visit, tampering) → default. */
export const resolveTheme = (value: string | undefined): ThemeName =>
  THEMES.includes(value as ThemeName) ? (value as ThemeName) : DEFAULT_THEME;
