"use client";

import Link from "next/link";
import { useSfx } from "@/sound/useSfx";
import { track } from "@/analytics/track";

/** "‹ Profile" — leaves desktop mode for the plain profile page. */
export default function ExitToProfile({ className = "" }: { className?: string }) {
  const sfx = useSfx();
  return (
    <Link
      href="/"
      onClick={() => {
        sfx("click");
        track("mode_switch", { to: "profile" });
      }}
      className={`inline-flex items-center gap-1 rounded-md border border-border bg-bg-2 px-2 py-1 font-mono text-xs text-fg-dim transition hover:border-border-strong hover:text-fg ${className}`}
    >
      <span aria-hidden>‹</span> Profile
    </Link>
  );
}
