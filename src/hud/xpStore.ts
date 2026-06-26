"use client";

import { create } from "zustand";
import { profile } from "@/data/profile";

const maxForLevel = (level: number) => 9000 + (level - 24) * 1500;

interface Gain {
  id: number;
  amount: number;
  label: string;
}

interface XpState {
  level: number;
  xp: number;
  max: number;
  leveledAt: number; // increments on each level-up (HUD watches this)
  lastGain: Gain | null;
  awarded: Set<string>;
  award: (key: string, amount: number, label: string) => void;
}

let gainId = 0;

export const useXpStore = create<XpState>((set, get) => ({
  level: profile.level,
  xp: profile.xp,
  max: profile.xpForNext,
  leveledAt: 0,
  lastGain: null,
  awarded: new Set(),

  award: (key, amount, label) => {
    const s = get();
    if (s.awarded.has(key)) return;
    const awarded = new Set(s.awarded).add(key);

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
      lastGain: { id: ++gainId, amount, label },
    });
  },
}));
