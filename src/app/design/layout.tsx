import type {ReactNode} from 'react';
import {cookies} from 'next/headers';
import {resolveTheme, THEME_COOKIE} from '@/utils/theme';
import {DesignShell} from './DesignShell';

export default async function DesignLayout({children}: {children: ReactNode}) {
  // The console previews by re-stamping <html>, starting from the theme the
  // server already rendered there — so the first paint matches (no flash).
  const cookieStore = await cookies();
  const appTheme = resolveTheme(cookieStore.get(THEME_COOKIE)?.value);

  return <DesignShell appTheme={appTheme}>{children}</DesignShell>;
}
