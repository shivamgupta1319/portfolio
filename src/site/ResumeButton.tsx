"use client";

import { profile } from "@/data/profile";
import { track } from "@/analytics/track";
import { buttonClass } from "./button";

export default function ResumeButton({
  variant = "primary",
  size = "md",
  className = "",
}: {
  variant?: "primary" | "ghost";
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <a
      href={profile.resume}
      download
      onClick={() => track("resume_download")}
      className={`${buttonClass(variant, size)} ${className}`}
    >
      <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 3v10M5.5 8.5 10 13l4.5-4.5M4 16.5h12" />
      </svg>
      Résumé
      <span className="sr-only">(PDF download)</span>
    </a>
  );
}
