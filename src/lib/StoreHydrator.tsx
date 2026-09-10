"use client";

import { useEffect } from "react";
import { usePrefs } from "./prefsStore";
import { useXpStore } from "@/hud/xpStore";

/**
 * Rehydrates the persisted stores after mount. Doing it in an effect (rather
 * than at store creation) keeps the prerendered HTML and the first client
 * render identical, so the static export never trips a hydration mismatch.
 */
export default function StoreHydrator() {
  useEffect(() => {
    void usePrefs.persist.rehydrate();
    void useXpStore.persist.rehydrate();
  }, []);
  return null;
}
