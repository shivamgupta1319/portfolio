"use client";

import { create } from "zustand";
import { APP_META } from "./apps.meta";
import type { AppId, Rect, WindowState } from "./types";

let idCounter = 0;
const nextId = (appId: AppId) => `${appId}-${++idCounter}`;

/** Cascade new windows so they don't stack perfectly on top of each other. */
function spawnRect(appId: AppId, openCount: number): Rect {
  const { defaultSize } = APP_META[appId];
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const offset = (openCount % 6) * 28;
  const x = Math.max(16, Math.round((vw - defaultSize.w) / 2) + offset - 70);
  const y = Math.max(56, Math.round((vh - defaultSize.h) / 2) + offset - 40);
  return { x, y, w: defaultSize.w, h: defaultSize.h };
}

interface OsState {
  windows: WindowState[];
  focusedId: string | null;
  topZ: number;
  booted: boolean;
  soundOn: boolean;

  openApp: (appId: AppId) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimize: (id: string) => void;
  restore: (id: string) => void;
  toggleMaximize: (id: string) => void;
  moveResize: (id: string, rect: Partial<Rect>) => void;
  setBooted: (b: boolean) => void;
  toggleSound: () => void;
}

export const useOsStore = create<OsState>((set, get) => ({
  windows: [],
  focusedId: null,
  topZ: 1,
  booted: false,
  soundOn: false,

  openApp: (appId) => {
    const { windows, topZ } = get();
    const meta = APP_META[appId];

    if (meta.single) {
      const existing = windows.find((w) => w.appId === appId);
      if (existing) {
        const z = topZ + 1;
        set({
          topZ: z,
          focusedId: existing.id,
          windows: windows.map((w) =>
            w.id === existing.id ? { ...w, minimized: false, z } : w,
          ),
        });
        return;
      }
    }

    const z = topZ + 1;
    const rect = spawnRect(appId, windows.length);
    const win: WindowState = {
      id: nextId(appId),
      appId,
      title: meta.title,
      ...rect,
      z,
      minimized: false,
      maximized: false,
    };
    set({ windows: [...windows, win], focusedId: win.id, topZ: z });
  },

  closeWindow: (id) =>
    set((s) => {
      const windows = s.windows.filter((w) => w.id !== id);
      const focusedId =
        s.focusedId === id
          ? windows.reduce<WindowState | null>(
              (top, w) => (!top || w.z > top.z ? w : top),
              null,
            )?.id ?? null
          : s.focusedId;
      return { windows, focusedId };
    }),

  focusWindow: (id) =>
    set((s) => {
      if (s.focusedId === id) return s;
      const z = s.topZ + 1;
      return {
        topZ: z,
        focusedId: id,
        windows: s.windows.map((w) => (w.id === id ? { ...w, z } : w)),
      };
    }),

  minimize: (id) =>
    set((s) => ({
      focusedId: s.focusedId === id ? null : s.focusedId,
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, minimized: true } : w,
      ),
    })),

  restore: (id) => {
    const z = get().topZ + 1;
    set((s) => ({
      topZ: z,
      focusedId: id,
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, minimized: false, z } : w,
      ),
    }));
  },

  toggleMaximize: (id) =>
    set((s) => ({
      windows: s.windows.map((w) => {
        if (w.id !== id) return w;
        if (w.maximized) {
          const r = w.prevRect ?? { x: w.x, y: w.y, w: w.w, h: w.h };
          return { ...w, maximized: false, ...r, prevRect: undefined };
        }
        return {
          ...w,
          maximized: true,
          prevRect: { x: w.x, y: w.y, w: w.w, h: w.h },
        };
      }),
    })),

  moveResize: (id, rect) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, ...rect } : w)),
    })),

  setBooted: (b) => set({ booted: b }),
  toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
}));
