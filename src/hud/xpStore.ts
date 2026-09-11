"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { profile } from "@/data/profile";

export const XP_KEY = "shivam.xp.v1";

/** XP amounts per action — one place to tune the game economy. */
export const XP = {
  section: 100,
  project: 150,
  resume: 500,
  desktop: 300,
  app: 300,
} as const;

const maxForLevel = (level: number) => 9000 + (level - 24) * 1500;

export interface Gain {
  id: number;
  amount: number;
  label: string;
  kind: "xp" | "achievement";
}

interface XpState {
  level: number;
  xp: number;
  max: number;
  /** increments on each level-up (toasts watch this) */
  leveledAt: number;
  lastGain: Gain | null;
  awarded: Record<string, 1>;
  /** profile.level at the time the state was saved — used to reset on rebase */
  baseLevel: number;
  award: (key: string, amount: number, label: string) => void;
}

let gainId = 0;

const initial = {
  level: profile.level,
  xp: profile.xp,
  max: profile.xpForNext,
  leveledAt: 0,
  lastGain: null,
  awarded: {} as Record<string, 1>,
  baseLevel: profile.level,
};

export const useXpStore = create<XpState>()(
  persist(
    (set, get) => ({
      ...initial,

      award: (key, amount, label) => {
        const s = get();
        if (s.awarded[key]) return;
        const awarded = { ...s.awarded, [key]: 1 as const };

        let { level, max, leveledAt } = s;
        let xp = s.xp + amount;
        while (xp >= max) {
          xp -= max;
          level += 1;
          max = maxForLevel(level);
          leveledAt += 1;
        }
        set({
          awarded,
          xp,
          level,
          max,
          leveledAt,
          lastGain: { id: ++gainId, amount, label, kind: "xp" },
        });
      },
    }),
    {
      name: XP_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ level, xp, max, awarded, baseLevel }) => ({
        level,
        xp,
        max,
        awarded,
        baseLevel,
      }),
      skipHydration: true,
      // If the seed level in profile.ts changes, start fresh rather than
      // carrying a stale progression.
      merge: (persisted, current) => {
        const p = persisted as Partial<XpState> | undefined;
        if (!p || p.baseLevel !== profile.level) return current;
        return { ...current, ...p, leveledAt: 0, lastGain: null };
      },
    },
  ),
);
