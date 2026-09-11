"use client";

import { useEffect, useRef } from "react";
import { useOsStore } from "@/os/store";
import { useXpStore, XP } from "./xpStore";
import { useSfx } from "@/sound/useSfx";
import XpBadge from "./XpBadge";

/** Desktop-mode HUD: XP badge + "discover an app" awards. Level-up feedback is a toast. */
export default function Hud() {
  const windows = useOsStore((s) => s.windows);
  const award = useXpStore((s) => s.award);
  const leveledAt = useXpStore((s) => s.leveledAt);
  const sfx = useSfx();
  const seen = useRef(new Set<string>());
  const lastLevel = useRef(leveledAt);

  // Award XP the first time each app is discovered (opened).
  useEffect(() => {
    for (const w of windows) {
      if (!seen.current.has(w.appId)) {
        seen.current.add(w.appId);
        award(`app:${w.appId}`, XP.app, `Discovered ${w.appId}`);
      }
    }
  }, [windows, award]);

  // Level-up sound (the visual is handled by <Toasts/> in the root layout).
  useEffect(() => {
    if (leveledAt === lastLevel.current) return;
    lastLevel.current = leveledAt;
    sfx("levelup");
  }, [leveledAt, sfx]);

  return <XpBadge />;
}
