import type { Quest } from "@/data/types";
import ProfileLinks from "../ProfileLinks";
import ProjectImage from "../ProjectImage";
import { categoryLabel, STATUS_LABEL } from "./meta";

/** Full case-study body shared by the desktop panel and the phone carousel. */
export default function ProjectDetail({
  quest,
  eager = false,
  compact = false,
}: {
  quest: Quest;
  eager?: boolean;
  /** carousel cards: fewer highlights and tags */
  compact?: boolean;
}) {
  const highlights = quest.highlights?.slice(0, compact ? 2 : 3) ?? [];
  const tags = quest.tags.slice(0, compact ? 4 : 7);
  return (
    <div className="flex h-full flex-col">
      <div className="overflow-hidden rounded-2xl border border-border">
        <ProjectImage quest={quest} eager={eager} />
      </div>
      <div className="flex flex-1 flex-col gap-4 pt-6">
        <div>
          <h3 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold leading-none tracking-[-0.03em] text-fg">
            {quest.title}
          </h3>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-mute">
            {quest.status && (
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={`h-2 w-2 rounded-full ${quest.status === "live" ? "bg-green" : "bg-accent-fill"}`}
                />
                {STATUS_LABEL[quest.status]}
              </span>
            )}
            {quest.year && <span>{quest.year}</span>}
            {quest.category.length > 0 && <span>{categoryLabel(quest)}</span>}
          </p>
        </div>
        <p className="text-lg leading-snug text-fg">{quest.summary ?? quest.description}</p>
        {highlights.length > 0 && (
          <ul className="flex flex-col gap-2 text-base leading-relaxed text-fg-dim">
            {highlights.map((h) => (
              <li key={h} className="flex gap-3">
                <span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-fill" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        )}
        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Stack">
            {tags.map((t) => (
              <li key={t} className="rounded-full bg-panel-2 px-3 py-1 text-sm text-fg-dim">
                {t}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto pt-2">
          <ProfileLinks quest={quest} />
        </div>
      </div>
    </div>
  );
}
