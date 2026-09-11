"use client";

import { useState } from "react";
import { APPS } from "@/os/apps.registry";
import { APP_ORDER, APP_META } from "@/os/apps.meta";
import { useXpStore, XP } from "@/hud/xpStore";
import XpBadge from "@/hud/XpBadge";
import { useSfx } from "@/sound/useSfx";
import { usePrefs } from "@/lib/prefsStore";
import SoundIcon from "@/os/SoundIcon";
import ThemeToggle from "@/theme/ThemeToggle";
import ExitToProfile from "@/os/ExitToProfile";
import type { AppId } from "@/os/types";

function MobileHud() {
  const soundOn = usePrefs((s) => s.soundOn);
  const toggleSound = usePrefs((s) => s.toggleSound);
  return (
    <div className="flex items-center gap-2 border-b border-border bg-bg/70 px-4 py-2 backdrop-blur-md">
      <ExitToProfile />
      <div className="flex-1">
        <XpBadge compact />
      </div>
      <button
        onClick={toggleSound}
        aria-label={soundOn ? "Mute sound" : "Enable sound"}
        className={`grid h-8 w-8 place-items-center rounded-md border border-border bg-bg-2 ${soundOn ? "text-green" : "text-fg-dim"}`}
      >
        <SoundIcon on={soundOn} className="h-4 w-4" />
      </button>
      <ThemeToggle />
    </div>
  );
}

function HomeScreen({ onOpen }: { onOpen: (id: AppId) => void }) {
  return (
    <div className="os-scroll flex-1 overflow-auto p-6">
      <p className="mb-6 text-center font-mono text-xs text-fg-mute">
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
              <span className="font-mono text-xs text-fg-dim">
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
    award(`app:${id}`, XP.app, `Discovered ${id}`);
    setOpen(id);
  };
  const back = () => {
    sfx("close");
    setOpen(null);
  };

  const Active = open ? APPS[open].component : null;

  return (
    <div className="os-viewport crt-vignette flex flex-col">
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
