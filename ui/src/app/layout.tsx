import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="cmyk">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-base-300 text-base-content antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
