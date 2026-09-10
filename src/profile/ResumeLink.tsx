"use client";

import { profile } from "@/data/profile";
import { useXpStore, XP } from "@/hud/xpStore";
import { track } from "@/analytics/track";

export default function ResumeLink({
  variant = "primary",
  className = "",
}: {
  variant?: "primary" | "ghost";
  className?: string;
}) {
  const award = useXpStore((s) => s.award);
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition";
  const look =
    variant === "primary"
      ? "border border-accent bg-accent text-white hover:bg-accent-2 [data-theme=light]_&:text-white"
      : "border border-border bg-panel text-fg hover:border-border-strong";
  return (
    <a
      href={profile.resume}
      download
      onClick={() => {
        award("resume", XP.resume, "Downloaded résumé");
        track("resume_download");
      }}
      className={`${base} ${look} ${className}`}
    >
      <span aria-hidden>⬇</span> Download resume
      <span className="sr-only">(PDF)</span>
    </a>
  );
}
