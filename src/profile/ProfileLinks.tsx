"use client";

import type { Quest } from "@/data/types";
import { track } from "@/analytics/track";

function ArrowUpRight() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 11 11 5M6 5h5v5" />
    </svg>
  );
}

const PILL =
  "inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors";

/** Live / npm / source links for the profile page, or the team / private note. */
export default function ProfileLinks({ quest }: { quest: Quest }) {
  const out = (target: string) => () => track("project_click", { id: quest.id, target });
  return (
    <div className="flex flex-wrap items-center gap-2">
      {quest.liveUrl && (
        <a
          href={quest.liveUrl}
          target="_blank"
          rel="noreferrer noopener"
          onClick={out("live")}
          className={`${PILL} bg-accent-fill text-on-accent hover:brightness-110`}
        >
          Open {quest.liveLabel ?? "live site"} <ArrowUpRight />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      )}
      {quest.npmUrl && (
        <a
          href={quest.npmUrl}
          target="_blank"
          rel="noreferrer noopener"
          onClick={out("npm")}
          className={`${PILL} border border-border-strong text-fg hover:bg-panel-2`}
        >
          View on npm <ArrowUpRight />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      )}
      {quest.repoUrl && (
        <a
          href={quest.repoUrl}
          target="_blank"
          rel="noreferrer noopener"
          onClick={out("source")}
          className={`${PILL} border border-border-strong text-fg hover:bg-panel-2`}
        >
          Source code <ArrowUpRight />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      )}
      {!quest.repoUrl && quest.credit && (
        <span className="text-sm text-fg-mute">{quest.credit.replace(/^Team\s*·\s*/, "Team project at ")}</span>
      )}
      {!quest.repoUrl && !quest.credit && quest.isPrivate && (
        <span className="text-sm text-fg-mute">Private repository, walkthrough on request</span>
      )}
    </div>
  );
}
