"use client";

import { useRef } from "react";
import { useOsStore } from "./store";
import { APPS } from "./apps.registry";
import { useWindowDrag } from "./useWindowDrag";
import { useWindowResize } from "./useWindowResize";
import ResizeHandles from "./ResizeHandles";
import { TOP_BAR_H, TASKBAR_H } from "./layout";
import type { WindowState } from "./types";

export default function WindowFrame({ win }: { win: WindowState }) {
  const elRef = useRef<HTMLDivElement>(null);
  const onDragStart = useWindowDrag(win.id, elRef);
  const onResize = useWindowResize(win.id, elRef);
  const focused = useOsStore((s) => s.focusedId === win.id);
  const focus = useOsStore((s) => s.focusWindow);
  const close = useOsStore((s) => s.closeWindow);
  const minimize = useOsStore((s) => s.minimize);
  const toggleMax = useOsStore((s) => s.toggleMaximize);

  if (win.minimized) return null;

  const App = APPS[win.appId];
  const style: React.CSSProperties = win.maximized
    ? {
        transform: `translate3d(0, ${TOP_BAR_H}px, 0)`,
        width: "100%",
        height: `calc(100% - ${TOP_BAR_H + TASKBAR_H}px)`,
        zIndex: win.z,
      }
    : {
        transform: `translate3d(${win.x}px, ${win.y}px, 0)`,
        width: win.w,
        height: win.h,
        zIndex: win.z,
      };

  return (
    <div
      ref={elRef}
      role="dialog"
      aria-label={win.title}
      onPointerDown={() => focus(win.id)}
      style={style}
      className={`pointer-events-auto absolute left-0 top-0 flex flex-col overflow-hidden border bg-bg-2/95 backdrop-blur-md transition-shadow ${
        win.maximized ? "rounded-none" : "rounded-xl"
      } ${
        focused
          ? "border-accent/50 shadow-[0_24px_80px_-20px_rgba(99,102,241,0.45)]"
          : "border-border shadow-[0_18px_50px_-24px_rgba(0,0,0,0.8)]"
      }`}
    >
      {/* title bar */}
      <div
        onPointerDown={onDragStart}
        onDoubleClick={() => toggleMax(win.id)}
        className={`flex h-9 shrink-0 touch-none items-center gap-2 border-b border-border bg-panel px-3 ${
          win.maximized ? "cursor-default" : "cursor-grab active:cursor-grabbing"
        }`}
      >
        <div className="group/lights flex items-center gap-1.5">
          <button
            onClick={() => close(win.id)}
            aria-label="Close window"
            className="grid h-3 w-3 place-items-center rounded-full bg-rose/80 text-[8px] text-bg/0 transition hover:bg-rose group-hover/lights:text-bg/70"
          >
            ×
          </button>
          <button
            onClick={() => minimize(win.id)}
            aria-label="Minimize window"
            className="grid h-3 w-3 place-items-center rounded-full bg-amber/80 text-[8px] text-bg/0 transition hover:bg-amber group-hover/lights:text-bg/70"
          >
            –
          </button>
          <button
            onClick={() => toggleMax(win.id)}
            aria-label="Maximize window"
            className="grid h-3 w-3 place-items-center rounded-full bg-green/80 text-[8px] text-bg/0 transition hover:bg-green group-hover/lights:text-bg/70"
          >
            +
          </button>
        </div>
        <span
          className={`ml-1.5 select-none truncate font-mono text-xs ${
            focused ? "text-fg-dim" : "text-fg-mute"
          }`}
        >
          {win.title}
        </span>
      </div>

      {/* content */}
      <div className="os-scroll min-h-0 flex-1 overflow-auto">
        <App.component windowId={win.id} />
      </div>

      {!win.maximized && <ResizeHandles onResize={onResize} />}
    </div>
  );
}
