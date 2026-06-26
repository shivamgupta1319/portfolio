import type { Quest, Rank } from "@/data/types";

const RANK_STYLE: Record<Rank, { ring: string; badge: string; glow: string }> = {
  S: {
    ring: "border-amber/40",
    badge: "border-amber/50 bg-amber/10 text-amber",
    glow: "hover:shadow-[0_18px_50px_-20px_rgba(251,191,36,0.35)]",
  },
  A: {
    ring: "border-cyan/40",
    badge: "border-cyan/50 bg-cyan/10 text-cyan",
    glow: "hover:shadow-[0_18px_50px_-20px_rgba(34,211,238,0.30)]",
  },
  B: {
    ring: "border-border",
    badge: "border-border bg-panel text-fg-dim",
    glow: "hover:shadow-[0_18px_50px_-24px_rgba(0,0,0,0.8)]",
  },
};

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 rounded-md border border-border bg-panel px-2 py-1 font-mono text-[11px] text-fg-dim transition hover:border-border-strong hover:text-fg"
    >
      {children}
    </a>
  );
}

export default function QuestCard({
  quest,
  variant,
}: {
  quest: Quest;
  variant: "main" | "side";
}) {
  const rs = RANK_STYLE[quest.rank];
  const compact = variant === "side";

  return (
    <article
      className={`group flex flex-col gap-3 rounded-xl border bg-bg-2/70 p-4 transition ${rs.ring} ${rs.glow}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border font-mono text-sm font-bold ${rs.badge}`}
          title={`Rank ${quest.rank}`}
        >
          {quest.rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-fg">{quest.title}</h3>
            {quest.isPrivate && (
              <span className="shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-fg-mute">
                🔒 private
              </span>
            )}
          </div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-mute">
            {variant === "main" ? "main quest" : "side quest"}
            {quest.language ? ` · ${quest.language}` : ""}
          </div>
        </div>
        <span className="shrink-0 font-mono text-[11px] text-green">
          +{quest.xpReward} XP
        </span>
      </div>

      <p
        className={`text-sm leading-relaxed text-fg-dim ${compact ? "line-clamp-3" : ""}`}
      >
        {quest.description}
      </p>

      {quest.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {quest.tags.map((t) => (
            <span
              key={t}
              className="rounded border border-border bg-panel px-1.5 py-0.5 font-mono text-[10px] text-fg-dim"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
        {quest.liveUrl && (
          <ExternalLink href={quest.liveUrl}>
            <span className="text-green">▸</span>{" "}
            {quest.liveLabel ?? "live"} ↗
          </ExternalLink>
        )}
        {quest.npmUrl && (
          <ExternalLink href={quest.npmUrl}>
            <span className="text-rose">npm</span> ↗
          </ExternalLink>
        )}
        {quest.repoUrl && (
          <ExternalLink href={quest.repoUrl}>{"<source>"}</ExternalLink>
        )}
        {!quest.repoUrl && quest.isPrivate && (
          <span className="inline-flex items-center rounded-md border border-dashed border-border px-2 py-1 font-mono text-[11px] text-fg-mute">
            source on request
          </span>
        )}
      </div>
    </article>
  );
}
