"use client";

import { useCallback, useEffect, useState } from "react";
import { useOsStore } from "@/os/store";
import { BOOT_LINES } from "./bootLog";

const SESSION_KEY = "shivamos-booted";

export default function BootSequence() {
  const setBooted = useOsStore((s) => s.setBooted);
  const openApp = useOsStore((s) => s.openApp);
  const [shown, setShown] = useState(0);
  const ready = shown >= BOOT_LINES.length;

  const start = useCallback(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* private mode — ignore */
    }
    openApp("terminal");
    setBooted(true);
  }, [openApp, setBooted]);

  // On soft reloads or with reduced-motion, skip straight to the desktop.
  // (start() only touches the zustand store, never local React state.)
  useEffect(() => {
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let already = false;
    try {
      already = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      /* ignore */
    }
    if (already || reduced) start();
  }, [start]);

  // Type the boot log one line at a time (setState lives in an async callback).
  useEffect(() => {
    if (shown >= BOOT_LINES.length) return;
    const t = setTimeout(() => setShown((s) => s + 1), BOOT_LINES[shown].delay);
    return () => clearTimeout(t);
  }, [shown]);

  // Enter / Space boots once the log finishes.
  useEffect(() => {
    if (!ready) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, start]);

  const tone = (t?: string) =>
    t === "ok"
      ? "text-green"
      : t === "accent"
        ? "text-accent-2"
        : "text-fg-dim";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg px-6">
      <div className="w-full max-w-lg font-mono text-[13px] leading-relaxed">
        {BOOT_LINES.slice(0, shown).map((line, i) => (
          <div key={i} className={tone(line.tone)}>
            {line.text}
          </div>
        ))}
        {!ready && <span className="cursor-blink text-green">▮</span>}
      </div>

      {ready && (
        <>
          <button
            onClick={start}
            className="mt-10 rounded-lg border border-accent/60 bg-accent/10 px-8 py-3 font-mono text-sm tracking-[0.3em] text-accent-2 transition hover:bg-accent/20 focus:outline-none focus:ring-2 focus:ring-accent/60"
          >
            PRESS START
          </button>
          <p className="mt-4 font-mono text-[11px] text-fg-mute">
            press ENTER or click to boot
          </p>
        </>
      )}
    </div>
  );
}
