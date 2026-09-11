"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Theme = "light" | "dark";

/** Must match the key read by src/theme/themeScript.ts. */
export const PREFS_KEY = "shivam.prefs.v1";

interface PrefsState {
  /** undefined = follow prefers-color-scheme */
  theme?: Theme;
  soundOn: boolean;
  /** game-style reticle cursor — desktop mode only, opt-in */
  cursorFx: boolean;
  /** true once the persisted values have been read on the client */
  hydrated: boolean;

  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  toggleSound: () => void;
  setCursorFx: (on: boolean) => void;
}

export function systemTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set, get) => ({
      theme: undefined,
      soundOn: false,
      cursorFx: false,
      hydrated: false,

      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set({
          theme: (get().theme ?? systemTheme()) === "dark" ? "light" : "dark",
        }),
      toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
      setCursorFx: (cursorFx) => set({ cursorFx }),
    }),
    {
      name: PREFS_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ theme, soundOn, cursorFx }) => ({
        theme,
        soundOn,
        cursorFx,
      }),
      // Static export: the HTML is prerendered, so never read storage during
      // SSR or the first client render. StoreHydrator rehydrates in an effect.
      skipHydration: true,
      onRehydrateStorage: () => () => usePrefs.setState({ hydrated: true }),
    },
  ),
);

/** Resolved theme: persisted choice, else the system default. */
export function useResolvedTheme(): Theme {
  const theme = usePrefs((s) => s.theme);
  const hydrated = usePrefs((s) => s.hydrated);
  if (!hydrated) return "dark";
  return theme ?? systemTheme();
}
