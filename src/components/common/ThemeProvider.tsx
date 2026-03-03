"use client";

import { useEffect } from "react";

const getThemeForTime = (): "mars-dark" | "mars-light" => {
  const hour = new Date().getHours();
  // 6pm (18) to 6am (6) → dark, otherwise → light
  return hour >= 18 || hour < 6 ? "mars-dark" : "mars-light";
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const applyTheme = () => {
      document.documentElement.setAttribute("data-theme", getThemeForTime());
    };

    applyTheme();

    // Re-check every minute so the theme switches at 6am/6pm
    const interval = setInterval(applyTheme, 60_000);
    return () => clearInterval(interval);
  }, []);

  return <>{children}</>;
};
