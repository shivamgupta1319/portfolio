"use client";

/** Typed, cookieless event names. The provider script is env-gated in Analytics.tsx. */
export type TrackEvent =
  | "resume_download"
  | "project_click"
  | "mode_switch"
  | "theme_toggle"
  | "filter_change";

type Props = Record<string, string | number | boolean>;

interface AnalyticsWindow extends Window {
  umami?: { track: (name: string, props?: Props) => void };
  plausible?: (name: string, opts?: { props?: Props }) => void;
}

/** No-op unless an analytics provider is loaded on the page. */
export function track(name: TrackEvent, props?: Props) {
  if (typeof window === "undefined") return;
  const w = window as AnalyticsWindow;
  try {
    if (w.umami) w.umami.track(name, props);
    else if (w.plausible) w.plausible(name, props ? { props } : undefined);
  } catch {
    /* never let analytics break the page */
  }
}
