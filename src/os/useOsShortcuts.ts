"use client";

import { useEffect, useRef } from "react";
import { useOsStore } from "./store";
import { APP_ORDER } from "./apps.meta";
import type { AppId } from "./types";

/** Deep links (?app=…), URL reflection, and Escape-to-close. Desktop only. */
export function useOsShortcuts() {
  const openApp = useOsStore((s) => s.openApp);
  const closeWindow = useOsStore((s) => s.closeWindow);
  const booted = useOsStore((s) => s.booted);
  const focusedId = useOsStore((s) => s.focusedId);
  const windows = useOsStore((s) => s.windows);
  const opened = useRef(false);

  // Capture the deep-link param on first render — before the URL-reflection
  // effect below can rewrite location.search.
  const deepLink = useRef<string | null | undefined>(undefined);
  if (deepLink.current === undefined) {
    deepLink.current =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("app")
        : null;
  }

  // open a deep-linked app once after boot
  useEffect(() => {
    if (!booted || opened.current) return;
    opened.current = true;
    const app = deepLink.current;
    if (app && (APP_ORDER as string[]).includes(app)) openApp(app as AppId);
  }, [booted, openApp]);

  // reflect the focused app in the URL (shareable)
  useEffect(() => {
    const win = windows.find((w) => w.id === focusedId);
    const url = new URL(window.location.href);
    if (win) url.searchParams.set("app", win.appId);
    else url.searchParams.delete("app");
    window.history.replaceState(null, "", url);
  }, [focusedId, windows]);

  // Escape closes the focused window
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const id = useOsStore.getState().focusedId;
      if (id) closeWindow(id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeWindow]);
}
