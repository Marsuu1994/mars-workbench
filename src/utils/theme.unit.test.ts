import {describe, expect, it} from 'vitest';
import {DEFAULT_THEME, resolveTheme} from './theme';

describe('resolveTheme', () => {
  it('keeps a known theme and defaults anything else', () => {
    expect(resolveTheme('p5-dark')).toBe('p5-dark');
    expect(resolveTheme('neon')).toBe(DEFAULT_THEME);
    expect(resolveTheme(undefined)).toBe(DEFAULT_THEME);
  });
});
