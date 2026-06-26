"use client";

import { useState } from "react";
import { APPS } from "@/os/apps.registry";
import { APP_ORDER, APP_META } from "@/os/apps.meta";
import { useXpStore } from "@/hud/xpStore";
import { useSfx } from "@/sound/useSfx";
import { useOsStore } from "@/os/store";
import type { AppId } from "@/os/types";

function MobileHud() {
  const level = useXpStore((s) => s.level);
  const xp = useXpStore((s) => s.xp);
  const max = useXpStore((s) => s.max);
  const soundOn = useOsStore((s) => s.soundOn);
  const toggleSound = useOsStore((s) => s.toggleSound);
  const pct = Math.min(100, Math.round((xp / max) * 100));
  return (
    <div className="flex items-center gap-2 border-b border-border bg-bg/70 px-4 py-2 backdrop-blur-md">
      <span className="font-mono text-xs font-semibold">
        <span className="text-accent-2">▣</span> shivamOS
      </span>
      <span className="rounded border border-amber/40 bg-amber/10 px-1.5 py-0.5 font-mono text-[10px] text-amber">
        LVL {level} ⚡
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-green to-cyan transition-[width] duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <button
        onClick={toggleSound}
        aria-label={soundOn ? "Mute sound" : "Enable sound"}
        className="font-mono text-xs text-fg-dim"
      >
        {soundOn ? "♪" : "✕"}
      </button>
    </div>
  );
}

function HomeScreen({ onOpen }: { onOpen: (id: AppId) => void }) {
  return (
    <div className="os-scroll flex-1 overflow-auto p-6">
      <p className="mb-6 text-center font-mono text-[11px] text-fg-mute">
        tap an app to open
      </p>
      <div className="mx-auto grid max-w-sm grid-cols-3 gap-4">
        {APP_ORDER.map((id) => {
          const def = APPS[id];
          return (
            <button
              key={id}
              onClick={() => onOpen(id)}
              className="flex flex-col items-center gap-2"
            >
              <span
                className={`grid h-16 w-16 place-items-center rounded-2xl border border-border bg-bg-2 font-mono text-xl ${def.accent} active:scale-95`}
              >
                {def.glyph}
              </span>
              <span className="font-mono text-[10px] text-fg-dim">
                {APP_META[id].short}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function MobileShell() {
  const [open, setOpen] = useState<AppId | null>(null);
  const award = useXpStore((s) => s.award);
  const sfx = useSfx();

  const openApp = (id: AppId) => {
    sfx("open");
    award(`app:${id}`, 300, `Discovered ${id}`);
    setOpen(id);
  };
  const back = () => {
    sfx("close");
    setOpen(null);
  };

  const Active = open ? APPS[open].component : null;

  return (
    <div className="crt-vignette relative flex h-full w-full flex-col overflow-hidden">
      {/* CSS-orb backdrop (no WebGL on mobile) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-accent/20 blur-[100px]" />
        <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-cyan/15 blur-[110px]" />
      </div>

      <div className="relative z-10 flex h-full flex-col">
        <MobileHud />
        {open && Active ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-2 border-b border-border bg-panel px-3 py-2">
              <button
                onClick={back}
                className="rounded-md border border-border px-2 py-1 font-mono text-xs text-fg-dim active:bg-panel-2"
              >
                ‹ back
              </button>
              <span className="font-mono text-xs text-fg-dim">
                {APP_META[open].title}
              </span>
            </div>
            <div className="window-in min-h-0 flex-1">
              <Active windowId={`mobile-${open}`} />
            </div>
          </div>
        ) : (
          <HomeScreen onOpen={openApp} />
        )}
      </div>
    </div>
  );
}
