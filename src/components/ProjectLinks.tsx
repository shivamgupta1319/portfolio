"use client";

import type { Quest } from "@/data/types";
import { useXpStore, XP } from "@/hud/xpStore";
import { track } from "@/analytics/track";

function Chip({
  href,
  quest,
  target,
  children,
}: {
  href: string;
  quest: Quest;
  target: string;
  children: React.ReactNode;
}) {
  const award = useXpStore((s) => s.award);
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      onClick={() => {
        award(`project:${quest.id}`, XP.project, `Opened ${quest.title}`);
        track("project_click", { id: quest.id, target });
      }}
      className="relative z-10 inline-flex items-center gap-1 rounded-md border border-border bg-panel px-2 py-1 font-mono text-xs text-fg-dim transition hover:border-border-strong hover:text-fg"
    >
      {children}
    </a>
  );
}

/** Live / npm / source links, or the team / private notice. */
export default function ProjectLinks({ quest }: { quest: Quest }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {quest.liveUrl && (
        <Chip href={quest.liveUrl} quest={quest} target="live">
          <span aria-hidden className="text-green">▸</span> {quest.liveLabel ?? "live"}{" "}
          <span aria-hidden>↗</span>
          <span className="sr-only">(opens in a new tab)</span>
        </Chip>
      )}
      {quest.npmUrl && (
        <Chip href={quest.npmUrl} quest={quest} target="npm">
          <span className="text-rose">npm</span> <span aria-hidden>↗</span>
        </Chip>
      )}
      {quest.repoUrl && (
        <Chip href={quest.repoUrl} quest={quest} target="source">
          {"<source>"}
        </Chip>
      )}
      {!quest.repoUrl && quest.credit && (
        <span className="inline-flex items-center rounded-md border border-dashed border-accent/40 px-2 py-1 font-mono text-xs text-fg-dim">
          <span aria-hidden>◇ </span>
          {quest.credit}
        </span>
      )}
      {!quest.repoUrl && !quest.credit && quest.isPrivate && (
        <span className="inline-flex items-center rounded-md border border-dashed border-border px-2 py-1 font-mono text-xs text-fg-mute">
          source on request
        </span>
      )}
    </div>
  );
}
