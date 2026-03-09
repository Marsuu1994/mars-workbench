import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/common/ThemeProvider";
import { AppSidebar } from "@/components/common/AppSidebar";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Chat Learning Lab",
  description: "Hands-on AI chat experiments built with Next.js.",
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

  return (
    <html lang="en" data-theme="mars-dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-base-300 text-base-content antialiased`}
      >
        <ThemeProvider>
          <div className="flex h-screen">
            <AppSidebar user={userInfo} />
            <main className="flex-1 min-w-0 overflow-auto">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
