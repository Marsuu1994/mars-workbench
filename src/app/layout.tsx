import type {Metadata, Viewport} from 'next';
import {cookies} from 'next/headers';
import {Anton, Geist, Geist_Mono} from 'next/font/google';
import {NextIntlClientProvider} from 'next-intl';
import {getTranslations} from 'next-intl/server';
import {ServiceWorkerRegistrar} from '@/components/application/ServiceWorkerRegistrar';
import {BreakpointProvider} from '@/components/application/BreakpointProvider';
import {AppShell} from '@/components/application/AppShell';
import {createClient} from '@/lib/supabase/server';
import {getActivePlan} from '@/lib/db/plans';
import {resolveTheme, THEME_COOKIE} from '@/utils/theme';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// p5-dark's display voice (fx-display) — loaded app-wide, used only
// under [data-theme='p5-dark'] chrome labels.
const anton = Anton({
  variable: '--font-anton',
  weight: '400',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0d1321',
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');

  return {
    title: t('title'),
    description: t('description'),
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      // Opaque on purpose: with "black-translucent", iOS lays out the
      // standalone viewport short by the status-bar height at launch (until
      // the first scroll gesture), which floats the fixed dock above the
      // screen bottom. We never draw content under the status bar anyway.
      statusBarStyle: 'black',
      title: t('title'),
    },
    icons: {
      icon: [
        {url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png'},
        {url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png'},
      ],
      apple: '/icons/apple-touch-icon.png',
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  const userInfo = user
    ? {
        name: (user.user_metadata?.full_name as string) ?? user.email ?? '',
        email: user.email ?? '',
      }
    : null;

  const activePlan = user ? await getActivePlan(user.id) : null;

  const cookieStore = await cookies();
  const theme = resolveTheme(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <html lang="en" data-theme={theme} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${anton.variable} min-h-dvh bg-base-300 text-base-content antialiased`}
      >
        <NextIntlClientProvider>
          <ServiceWorkerRegistrar />
          <BreakpointProvider>
            <AppShell
              user={userInfo}
              activePlanId={activePlan?.id ?? null}
              theme={theme}
            >
              {children}
            </AppShell>
          </BreakpointProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
