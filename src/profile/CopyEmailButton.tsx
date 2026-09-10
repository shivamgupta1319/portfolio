"use client";

import { useState } from "react";
import { profile } from "@/data/profile";

export default function CopyEmailButton() {
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${profile.email}`;
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <a
        href={`mailto:${profile.email}`}
        className="inline-flex items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 font-mono text-sm text-fg transition hover:bg-accent/20"
      >
        <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg border border-accent/40 bg-bg-2 text-accent-2">
          @
        </span>
        {profile.email}
      </a>
      <button
        type="button"
        onClick={copyEmail}
        className={`rounded-lg border px-3 py-2 font-mono text-xs transition ${
          copied ? "border-green/50 text-green" : "border-border text-fg-dim hover:text-fg"
        }`}
      >
        {copied ? "✓ copied" : "copy address"}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Email address copied" : ""}
      </span>
    </div>
  );
}
