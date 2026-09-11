"use client";

import Link from "next/link";
import { useXpStore, XP } from "@/hud/xpStore";
import { track } from "@/analytics/track";

/**
 * "Desktop ▸" — enters the game-OS. prefetch={false} keeps the three.js chunk
 * off the landing page until someone actually asks for it.
 */
export default function ModeSwitch({ className = "" }: { className?: string }) {
  const award = useXpStore((s) => s.award);
  return (
    <Link
      href="/desktop"
      prefetch={false}
      onClick={() => {
        award("mode:desktop", XP.desktop, "Entered desktop mode");
        track("mode_switch", { to: "desktop" });
      }}
      title="Open the interactive game-OS version"
      className={`inline-flex items-center gap-1.5 rounded-md border border-accent/50 bg-accent/10 px-3 py-1.5 font-mono text-xs text-accent-2 transition hover:bg-accent/20 ${className}`}
    >
      <span aria-hidden>▣</span> Desktop <span aria-hidden>▸</span>
    </Link>
  );
}
