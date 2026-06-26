"use client";

import { useEffect, useState } from "react";
import { useOsStore } from "./store";
import { APPS } from "./apps.registry";
import { APP_META } from "./apps.meta";
import { TASKBAR_H } from "./layout";

function Clock() {
  const [time, setTime] = useState<string>("");
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    tick();
    const t = setInterval(tick, 1000 * 15);
    return () => clearInterval(t);
  }, []);
  return <span className="font-mono text-xs text-fg-dim tabular-nums">{time}</span>;
}

export default function Taskbar() {
  const windows = useOsStore((s) => s.windows);
  const focusedId = useOsStore((s) => s.focusedId);
  const focus = useOsStore((s) => s.focusWindow);
  const minimize = useOsStore((s) => s.minimize);
  const restore = useOsStore((s) => s.restore);
  const soundOn = useOsStore((s) => s.soundOn);
  const toggleSound = useOsStore((s) => s.toggleSound);

  const onTile = (id: string, minimized: boolean) => {
    if (minimized) restore(id);
    else if (focusedId === id) minimize(id);
    else focus(id);
  };

  return (
    <div
      style={{ height: TASKBAR_H }}
      className="absolute inset-x-0 bottom-0 z-50 flex items-center gap-2 border-t border-border bg-bg/70 px-3 backdrop-blur-md"
    >
      <span className="grid h-7 w-7 place-items-center rounded-md border border-border bg-bg-2 font-mono text-xs text-accent-2">
        ▣
      </span>

      <div className="mx-1 h-6 w-px bg-border" />

      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
        {windows.length === 0 && (
          <span className="font-mono text-[11px] text-fg-mute">
            no apps running — launch one from the desktop
          </span>
        )}
        {windows.map((w) => {
          const def = APPS[w.appId];
          const active = focusedId === w.id && !w.minimized;
          return (
            <button
              key={w.id}
              onClick={() => onTile(w.id, w.minimized)}
              title={w.title}
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2 font-mono text-[11px] transition ${
                active
                  ? "border-accent/50 bg-accent/15 text-fg"
                  : w.minimized
                    ? "border-border bg-transparent text-fg-mute hover:text-fg-dim"
                    : "border-border bg-panel text-fg-dim hover:bg-panel-2"
              }`}
            >
              <span className={def.accent}>{def.glyph}</span>
              <span className="max-w-28 truncate">{APP_META[w.appId].short}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={toggleSound}
        aria-label={soundOn ? "Mute sound" : "Enable sound"}
        className="grid h-7 w-7 place-items-center rounded-md border border-border bg-bg-2 text-xs text-fg-dim transition hover:text-fg"
      >
        {soundOn ? "♪" : "✕"}
      </button>
      <Clock />
    </div>
  );
}
