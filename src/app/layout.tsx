import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "@/components/common/ThemeProvider";
import { BreakpointProvider } from "@/components/common/BreakpointProvider";
import { AppShell } from "@/components/common/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getActivePlan } from "@/lib/db/plans";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#141428",
};

export const metadata: Metadata = {
  title: "Mars Workbench",
  description: "Agile-like personal kanban planner",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mars Workbench",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userInfo = user
    ? {
        name: (user.user_metadata?.full_name as string) ?? user.email ?? "",
        email: user.email ?? "",
      }
    : null;

  const activePlan = user ? await getActivePlan(user.id) : null;

  return (
    <html lang="en" data-theme="mars-dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-base-300 text-base-content antialiased`}
      >
        <NextIntlClientProvider>
          <ThemeProvider>
            <BreakpointProvider>
              <AppShell user={userInfo} activePlanId={activePlan?.id ?? null}>
                {children}
              </AppShell>
            </BreakpointProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
