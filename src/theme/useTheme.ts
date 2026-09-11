"use client";

import { useEffect } from "react";
import { usePrefs, useResolvedTheme, type Theme } from "@/lib/prefsStore";

const THEME_COLOR: Record<Theme, string> = {
  dark: "#0a0a0b",
  light: "#f7f7f9",
};

/**
 * Mirrors the resolved theme onto <html data-theme> and the theme-color meta
 * tags after hydration. The inline THEME_SCRIPT handles the first paint.
 */
export function useTheme() {
  const theme = useResolvedTheme();
  const hydrated = usePrefs((s) => s.hydrated);
  const toggle = usePrefs((s) => s.toggleTheme);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.setAttribute("data-theme", theme);
    document
      .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
      .forEach((m) => (m.content = THEME_COLOR[theme]));
  }, [theme, hydrated]);

  return { theme, hydrated, toggle };
}
