"use client";

import type { AppListItem } from "@/data/appMeta";
import { useProbe } from "./useProbe";

/**
 * Live status for an app with a URL: a probed dot with the measured response
 * time, or a plain "Live" mark when the host has no probe asset.
 * Renders nothing for apps without a URL.
 */
export default function Status({ app, compact = false }: { app: Pick<AppListItem, "probe" | "liveUrl" | "title">; compact?: boolean }) {
  const { ref, state } = useProbe<HTMLSpanElement>(app.probe);
  if (!app.liveUrl) return null;

  let dot = "bg-green";
  let text = "Live";
  let title = "Live; this host is not checked from the browser";
  if (app.probe) {
    switch (state.kind) {
      case "idle":
      case "checking":
        dot = "bg-fg-mute animate-pulse";
        text = "Checking";
        title = `Checking whether ${app.title} answers`;
        break;
      case "up":
        dot = "bg-green";
        text = compact ? `${state.ms} ms` : `Up, ${state.ms} ms`;
        title = `${app.title} answered your browser in ${state.ms} ms`;
        break;
      case "down":
        dot = "bg-amber";
        text = "Not answering";
        title = `${app.title} did not answer within 6 seconds`;
        break;
    }
  }

  return (
    <span ref={ref} title={title} className="inline-flex items-center gap-2 whitespace-nowrap font-mono text-[0.8125rem] text-fg-dim tnum">
      <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <span aria-hidden>{text}</span>
      <span className="sr-only">{title}</span>
    </span>
  );
}
