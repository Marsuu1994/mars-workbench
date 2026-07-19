'use server';

import {cookies} from 'next/headers';
import {THEME_COOKIE} from '@/utils/theme';
import {updateThemeSchema} from '@/schemas';

const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Persist the user's theme choice in an SSR-readable cookie so the next
 * server render ships the right `data-theme` (no flash). Device preference,
 * not user data — no auth guard, no DB. See Theme Change Flow.
 */
export async function updateThemeAction(theme: string): Promise<void> {
  const parsed = updateThemeSchema.parse({theme});
  const cookieStore = await cookies();
  cookieStore.set(THEME_COOKIE, parsed.theme, {
    path: '/',
    maxAge: THEME_COOKIE_MAX_AGE,
    sameSite: 'lax',
  });
}
