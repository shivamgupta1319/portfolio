"use client";

import { useOsStore } from "./store";
import WindowFrame from "./WindowFrame";
import Taskbar from "./Taskbar";
import { APPS } from "./apps.registry";
import { APP_ORDER, APP_META } from "./apps.meta";

function Background() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-accent/20 blur-[120px]" />
      <div className="absolute -bottom-52 -right-40 h-[40rem] w-[40rem] rounded-full bg-cyan/15 blur-[140px]" />
      <div className="absolute left-1/2 top-1/3 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-rose/10 blur-[120px]" />
    </div>
  );
}

function TopBar() {
  return (
    <div className="absolute inset-x-0 top-0 z-40 flex h-10 items-center justify-between border-b border-border bg-bg/60 px-4 backdrop-blur-md">
      <div className="flex items-center gap-2 font-mono text-xs">
        <span className="text-accent-2">▣</span>
        <span className="font-semibold tracking-wide">shivamOS</span>
        <span className="text-fg-mute">·</span>
        <span className="text-fg-dim">v2.0</span>
      </div>
      <div className="font-mono text-[11px] text-fg-mute">
        guest@shivamos — double-click an app to launch
      </div>
    </div>
  );
}

function DesktopIcons() {
  const openApp = useOsStore((s) => s.openApp);
  return (
    <div className="absolute left-3 top-14 z-10 flex flex-col gap-1.5">
      {APP_ORDER.map((id) => {
        const def = APPS[id];
        return (
          <button
            key={id}
            onClick={() => openApp(id)}
            onDoubleClick={() => openApp(id)}
            className="group flex w-20 flex-col items-center gap-1 rounded-lg border border-transparent px-2 py-2 text-center transition hover:border-border hover:bg-panel"
          >
            <span
              className={`grid h-11 w-11 place-items-center rounded-xl border border-border bg-bg-2 font-mono text-lg ${def.accent} transition group-hover:border-border-strong`}
            >
              {def.glyph}
            </span>
            <span className="font-mono text-[10px] leading-tight text-fg-dim">
              {APP_META[id].short}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function Desktop() {
  const windows = useOsStore((s) => s.windows);
  return (
    <div className="crt-vignette relative h-full w-full overflow-hidden">
      <Background />
      <TopBar />
      <DesktopIcons />
      {windows.map((w) => (
        <WindowFrame key={w.id} win={w} />
      ))}
      <Taskbar />
    </div>
  );
}
