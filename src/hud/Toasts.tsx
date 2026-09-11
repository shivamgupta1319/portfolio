"use client";

import { useEffect, useRef, useState } from "react";
import { useXpStore } from "./xpStore";

interface Toast {
  id: number;
  title: string;
  detail?: string;
  tone: "xp" | "level";
}

const MAX = 3;
const TTL = 3200;

/**
 * Non-blocking notifications for XP gains and level-ups. Mounted once in the
 * root layout; announces politely to screen readers; never covers content.
 */
export default function Toasts() {
  const lastGain = useXpStore((s) => s.lastGain);
  const leveledAt = useXpStore((s) => s.leveledAt);
  const level = useXpStore((s) => s.level);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seenLevel = useRef(leveledAt);
  const nextId = useRef(0);

  const push = (t: Omit<Toast, "id">) => {
    const id = ++nextId.current;
    setToasts((list) => [...list, { ...t, id }].slice(-MAX));
    setTimeout(
      () => setToasts((list) => list.filter((x) => x.id !== id)),
      TTL,
    );
  };

  useEffect(() => {
    if (!lastGain) return;
    push({
      title: `+${lastGain.amount} XP`,
      detail: lastGain.label,
      tone: "xp",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastGain?.id]);

  useEffect(() => {
    if (leveledAt === seenLevel.current) return;
    seenLevel.current = leveledAt;
    push({ title: `Level ${level} reached`, detail: "keep exploring", tone: "level" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leveledAt]);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+3.5rem)] z-[70] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-in flex items-center gap-3 rounded-lg border bg-bg-2/95 px-3 py-2 font-mono text-xs shadow-lg backdrop-blur-md ${
            t.tone === "level"
              ? "border-amber/50 text-amber"
              : "border-green/40 text-green"
          }`}
        >
          <span className="font-semibold">{t.title}</span>
          {t.detail && <span className="text-fg-dim">{t.detail}</span>}
        </div>
      ))}
    </div>
  );
}
