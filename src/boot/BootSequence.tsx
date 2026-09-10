"use client";

import { useCallback, useEffect, useState } from "react";
import { useOsStore } from "@/os/store";
import { useSfx } from "@/sound/useSfx";
import { BOOT_LINES } from "./bootLog";

/**
 * Short boot flourish shown when entering desktop mode. Skippable at any
 * moment, auto-continues when the log finishes, and opens the Guide (unless a
 * deep link asked for a specific app) so first-timers land on instructions,
 * not a bare terminal.
 */
export default function BootSequence() {
  const setBooted = useOsStore((s) => s.setBooted);
  const openApp = useOsStore((s) => s.openApp);
  const sfx = useSfx();
  const [shown, setShown] = useState(0);
  const ready = shown >= BOOT_LINES.length;

  const start = useCallback(() => {
    sfx("boot");
    const deepLinked = new URLSearchParams(window.location.search).has("app");
    if (!deepLinked) openApp("guide");
    setBooted(true);
  }, [openApp, setBooted, sfx]);

  // Reduced motion: skip straight to the desktop.
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) start();
  }, [start]);

  // Type the boot log one line at a time.
  useEffect(() => {
    if (shown >= BOOT_LINES.length) return;
    const t = setTimeout(() => setShown((s) => s + 1), BOOT_LINES[shown].delay);
    return () => clearTimeout(t);
  }, [shown]);

  // Auto-continue shortly after the log completes.
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(start, 350);
    return () => clearTimeout(t);
  }, [ready, start]);

  // Enter / Space / Escape skip ahead.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
        e.preventDefault();
        start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [start]);

  const tone = (t?: string) =>
    t === "ok" ? "text-green" : t === "accent" ? "text-accent-2" : "text-fg-dim";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg px-6"
    >
      <div className="w-full max-w-lg font-mono text-sm leading-relaxed">
        {BOOT_LINES.slice(0, shown).map((line, i) => (
          <div key={i} className={tone(line.tone)}>
            {line.text}
          </div>
        ))}
        {!ready && (
          <span aria-hidden className="cursor-blink text-green">
            ▮
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={start}
        autoFocus
        className="mt-10 rounded-lg border border-border bg-panel px-5 py-2 font-mono text-xs text-fg-dim transition hover:border-border-strong hover:text-fg"
      >
        Skip <span aria-hidden>›</span>
      </button>
    </div>
  );
}
