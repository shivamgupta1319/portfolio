"use client";

import { profile } from "@/data/profile";
import { track } from "@/analytics/track";

export default function ResumeLink({
  variant = "primary",
  size = "md",
  className = "",
}: {
  variant?: "primary" | "ghost";
  size?: "sm" | "md";
  className?: string;
}) {
  const base = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full font-medium transition-colors ${
    size === "sm" ? "px-4 text-sm" : "px-6 text-base"
  }`;
  const look =
    variant === "primary"
      ? "bg-accent-fill text-on-accent hover:brightness-110"
      : "border border-border-strong text-fg hover:bg-panel-2";
  return (
    <a
      href={profile.resume}
      download
      onClick={() => track("resume_download")}
      className={`${base} ${look} ${className}`}
    >
      <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 3v10M5.5 8.5 10 13l4.5-4.5M4 16.5h12" />
      </svg>
      Download résumé
      <span className="sr-only">(PDF)</span>
    </a>
  );
}
