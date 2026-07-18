import type {ThemeName} from '@/utils/theme';

/** Mockup card order: light · dark (default) · p5. */
export const THEME_ORDER: ThemeName[] = ['mars-light', 'mars-dark', 'p5-dark'];

interface ThemePreview {
  swatchClass: string;
  dotClasses: [string, string, string, string];
}

/**
 * Literal hexes on purpose: each card previews ANOTHER theme, so semantic
 * tokens (which resolve in the ACTIVE theme) can't paint it. Literal
 * Tailwind arbitrary-value classes keep them visible to the compiler.
 */
export const THEME_PREVIEWS: Record<ThemeName, ThemePreview> = {
  'mars-light': {
    swatchClass: 'bg-[#f7efe3]',
    dotClasses: [
      'bg-[#0e6f81]',
      'bg-[#6e43bf]',
      'bg-[#ac5107]',
      'bg-[#815709]',
    ],
  },
  'mars-dark': {
    swatchClass: 'bg-[#0d1321]',
    dotClasses: [
      'bg-[#2ce0f1]',
      'bg-[#b296ff]',
      'bg-[#fb9344]',
      'bg-[#f9c13b]',
    ],
  },
  'p5-dark': {
    swatchClass: 'bg-[#0e0a0a]',
    dotClasses: [
      'bg-[#ff0c0b]',
      'bg-[#b296ff]',
      'bg-[#f6c835]',
      'bg-[#f5f0f0]',
    ],
  },
};
