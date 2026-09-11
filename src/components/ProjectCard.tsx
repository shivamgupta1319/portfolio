import type { Quest, ProjectStatus, Rank } from "@/data/types";
import { PROJECT_CATEGORY_LABELS } from "@/data/types";
import ProjectCover from "./ProjectCover";
import ProjectLinks from "./ProjectLinks";

export type ProjectCardVariant = "featured" | "grid" | "compact";

interface Props {
  quest: Quest;
  variant?: ProjectCardVariant;
  /** show rank badge + XP (desktop-mode quest log) */
  showGameMeta?: boolean;
  headingLevel?: 3 | 4;
}

const STATUS: Record<ProjectStatus, { label: string; dot: string }> = {
  live: { label: "Live", dot: "bg-green" },
  active: { label: "Active", dot: "bg-cyan" },
  wip: { label: "In progress", dot: "bg-amber" },
  archived: { label: "Archived", dot: "bg-fg-mute" },
};

const RANK_BADGE: Record<Rank, string> = {
  S: "border-amber/50 bg-amber/10 text-amber",
  A: "border-cyan/50 bg-cyan/10 text-cyan",
  B: "border-border bg-panel text-fg-dim",
};

function primaryHref(q: Quest): string | undefined {
  return q.liveUrl ?? q.npmUrl ?? q.repoUrl;
}

export default function ProjectCard({
  quest,
  variant = "grid",
  showGameMeta = false,
  headingLevel = 3,
}: Props) {
  const H = headingLevel === 3 ? "h3" : "h4";
  const href = primaryHref(quest);
  const featured = variant === "featured";
  const compact = variant === "compact";
  const highlights = quest.highlights?.slice(0, featured ? 3 : 2) ?? [];
  const tags = quest.tags.slice(0, featured ? 7 : 5);
  const status = quest.status ? STATUS[quest.status] : undefined;

  return (
    <article
      className="group relative flex w-full flex-col overflow-hidden rounded-xl border border-border bg-bg-2/70 transition hover:border-border-strong hover:shadow-[0_18px_50px_-24px_rgba(99,102,241,0.45)]"
    >
      {!compact && <ProjectCover quest={quest} short={!featured} eager={featured} />}

      <div className={`flex flex-1 flex-col gap-3 ${compact ? "p-4" : "p-5"}`}>
        <div className="flex items-start gap-3">
          {showGameMeta && (
            <span
              aria-label={`Rank ${quest.rank}`}
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border font-mono text-sm font-bold ${RANK_BADGE[quest.rank]}`}
            >
              {quest.rank}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <H className={`font-semibold text-fg ${featured ? "text-lg" : "text-base"}`}>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="after:absolute after:inset-0 after:content-[''] hover:text-accent-2"
                >
                  {quest.title}
                </a>
              ) : (
                quest.title
              )}
            </H>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-xs text-fg-mute">
              {status && (
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
              )}
              {quest.year && <span>{quest.year}</span>}
              {quest.category.length > 0 && (
                <span>{quest.category.map((c) => PROJECT_CATEGORY_LABELS[c]).join(" · ")}</span>
              )}
              {showGameMeta && (
                <span className="text-green">+{quest.xpReward} XP</span>
              )}
            </div>
          </div>
        </div>

        <p className={`text-sm leading-relaxed text-fg-dim ${compact ? "line-clamp-3" : ""}`}>
          {quest.summary ?? quest.description}
        </p>

        {highlights.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm text-fg">
            {highlights.map((h) => (
              <li key={h} className="flex gap-2">
                <span aria-hidden className="mt-0.5 text-accent-2">▸</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        )}

        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Stack">
            {tags.map((t) => (
              <li
                key={t}
                className="rounded border border-border bg-panel px-1.5 py-0.5 font-mono text-xs text-fg-dim"
              >
                {t}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto pt-1">
          <ProjectLinks quest={quest} />
        </div>
      </div>
    </article>
  );
}
