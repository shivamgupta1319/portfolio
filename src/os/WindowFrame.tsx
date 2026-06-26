"use client";

import { useRef } from "react";
import { useOsStore } from "./store";
import { APPS } from "./apps.registry";
import { useWindowDrag } from "./useWindowDrag";
import type { WindowState } from "./types";

export default function WindowFrame({ win }: { win: WindowState }) {
  const elRef = useRef<HTMLDivElement>(null);
  const onDragStart = useWindowDrag(win.id, elRef);
  const focused = useOsStore((s) => s.focusedId === win.id);
  const focus = useOsStore((s) => s.focusWindow);
  const close = useOsStore((s) => s.closeWindow);
  const minimize = useOsStore((s) => s.minimize);
  const toggleMax = useOsStore((s) => s.toggleMaximize);

  if (win.minimized) return null;

  const App = APPS[win.appId];
  const style: React.CSSProperties = win.maximized
    ? { transform: "translate3d(0,0,0)", width: "100%", height: "100%", zIndex: win.z }
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
      className={`absolute left-0 top-0 flex flex-col overflow-hidden rounded-xl border bg-bg-2/95 backdrop-blur-md transition-shadow ${
        focused
          ? "border-accent/50 shadow-[0_24px_80px_-20px_rgba(99,102,241,0.45)]"
          : "border-border shadow-[0_18px_50px_-24px_rgba(0,0,0,0.8)]"
      }`}
    >
      {/* title bar */}
      <div
        onPointerDown={onDragStart}
        onDoubleClick={() => toggleMax(win.id)}
        className="flex h-9 shrink-0 cursor-grab touch-none items-center gap-2 border-b border-border bg-panel px-3 active:cursor-grabbing"
      >
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => close(win.id)}
            aria-label="Close"
            className="h-3 w-3 rounded-full bg-rose/80 transition hover:bg-rose"
          />
          <button
            onClick={() => minimize(win.id)}
            aria-label="Minimize"
            className="h-3 w-3 rounded-full bg-amber/80 transition hover:bg-amber"
          />
          <button
            onClick={() => toggleMax(win.id)}
            aria-label="Maximize"
            className="h-3 w-3 rounded-full bg-green/80 transition hover:bg-green"
          />
        </div>
        <span className={`ml-1.5 select-none font-mono text-xs ${focused ? "text-fg-dim" : "text-fg-mute"}`}>
          {win.title}
        </span>
      </div>

      {/* content */}
      <div className="os-scroll min-h-0 flex-1 overflow-auto">
        <App.component windowId={win.id} />
      </div>
    </div>
  );
}
