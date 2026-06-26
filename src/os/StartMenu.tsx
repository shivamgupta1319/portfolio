"use client";

import { useEffect, useRef } from "react";
import { useOsStore } from "./store";
import { APPS } from "./apps.registry";
import { APP_ORDER, APP_META } from "./apps.meta";
import { profile } from "@/data/profile";
import { useSfx } from "@/sound/useSfx";

export default function StartMenu({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const openApp = useOsStore((s) => s.openApp);
  const minimize = useOsStore((s) => s.minimize);
  const windows = useOsStore((s) => s.windows);
  const sfx = useSfx();

  // close on outside click / Escape
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // defer so the opening click doesn't immediately close it
    const t = setTimeout(() => window.addEventListener("pointerdown", onDown), 0);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const launch = (id: (typeof APP_ORDER)[number]) => {
    sfx("open");
    openApp(id);
    onClose();
  };

  const showDesktop = () => {
    sfx("click");
    windows.forEach((w) => minimize(w.id));
    onClose();
  };

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Start menu"
      className="window-in absolute bottom-full left-0 mb-2 w-64 overflow-hidden rounded-xl border border-border bg-bg-2/95 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)] backdrop-blur-md"
    >
      {/* header */}
      <div className="flex items-center gap-3 border-b border-border bg-panel px-3 py-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg border border-accent/40 bg-accent/10 font-mono text-sm font-bold text-accent-2">
          SG
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-fg">{profile.name}</div>
          <div className="truncate font-mono text-[10px] text-fg-mute">
            {profile.role}
          </div>
        </div>
      </div>

      {/* apps */}
      <div className="p-1.5">
        {APP_ORDER.map((id) => {
          const def = APPS[id];
          return (
            <button
              key={id}
              role="menuitem"
              onClick={() => launch(id)}
              className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-panel-2"
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-bg font-mono text-xs ${def.accent}`}
              >
                {def.glyph}
              </span>
              <span className="font-mono text-xs text-fg-dim">
                {APP_META[id].short}
              </span>
            </button>
          );
        })}
      </div>

      {/* footer actions */}
      <div className="flex items-center justify-between border-t border-border px-2 py-2">
        <button
          onClick={showDesktop}
          className="rounded-md px-2 py-1 font-mono text-[11px] text-fg-mute transition hover:text-fg"
        >
          ▢ show desktop
        </button>
        <a
          href={profile.resume}
          target="_blank"
          rel="noreferrer noopener"
          onClick={onClose}
          className="rounded-md px-2 py-1 font-mono text-[11px] text-fg-mute transition hover:text-fg"
        >
          ⬇ résumé
        </a>
      </div>
    </div>
  );
}
