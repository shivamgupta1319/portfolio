"use client";

import { useState } from "react";
import { profile } from "@/data/profile";

interface Channel {
  label: string;
  value: string;
  href: string;
  glyph: string;
  accent: string;
}

const channels: Channel[] = [
  {
    label: "github",
    value: profile.githubUser,
    href: profile.github,
    glyph: "⌥",
    accent: "text-fg",
  },
  {
    label: "linkedin",
    value: "in/myselfshivam",
    href: profile.linkedin,
    glyph: "in",
    accent: "text-cyan",
  },
  {
    label: "location",
    value: profile.location,
    href: `https://maps.google.com/?q=${encodeURIComponent(profile.location)}`,
    glyph: "◉",
    accent: "text-green",
  },
];

export default function Contact() {
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
    <div className="os-scroll h-full overflow-auto bg-bg/30 p-5">
      <h2 className="mb-1 font-mono text-sm text-cyan">✉ COMMS LINK</h2>
      <p className="mb-5 font-mono text-[11px] text-fg-mute">
        open a channel — I&apos;m available for opportunities.
      </p>

      {/* primary: email */}
      <button
        onClick={copyEmail}
        className="group flex w-full items-center justify-between rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-left transition hover:bg-accent/20"
      >
        <span className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-accent/40 bg-bg-2 text-accent-2">
            @
          </span>
          <span>
            <span className="block font-mono text-[10px] uppercase tracking-wider text-fg-mute">
              email
            </span>
            <span className="font-mono text-sm text-fg">{profile.email}</span>
          </span>
        </span>
        <span
          className={`rounded-md border px-2 py-1 font-mono text-[11px] transition ${
            copied
              ? "border-green/50 text-green"
              : "border-border text-fg-dim group-hover:text-fg"
          }`}
        >
          {copied ? "✓ copied" : "copy"}
        </span>
      </button>

      {/* other channels */}
      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {channels.map((c) => (
          <a
            key={c.label}
            href={c.href}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-3 rounded-xl border border-border bg-bg-2/60 px-3 py-3 transition hover:border-border-strong"
          >
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-bg font-mono text-xs ${c.accent}`}
            >
              {c.glyph}
            </span>
            <span className="min-w-0">
              <span className="block font-mono text-[10px] uppercase tracking-wider text-fg-mute">
                {c.label}
              </span>
              <span className="block truncate font-mono text-xs text-fg-dim">
                {c.value}
              </span>
            </span>
          </a>
        ))}
      </div>

      {/* resume */}
      <a
        href={profile.resume}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-border bg-panel px-4 py-3 font-mono text-xs text-fg-dim transition hover:border-border-strong hover:text-fg"
      >
        ⬇ download résumé (PDF)
      </a>
    </div>
  );
}
