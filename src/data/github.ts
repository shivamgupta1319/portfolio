import type { Quest, Rank, RepoRecord } from "./types";

export const XP_BY_RANK: Record<Rank, number> = { S: 800, A: 500, B: 300 };

/** "smart-trading" → "Smart Trading" */
export function humanize(name: string): string {
  return name
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Map a raw GitHub record to a default (side-quest) Quest. */
export function recordToQuest(r: RepoRecord): Quest {
  const tags = r.topics.length
    ? r.topics.slice(0, 6)
    : r.language
      ? [r.language]
      : [];
  return {
    id: r.name,
    title: humanize(r.name),
    description: r.description || "A project by Shivam Gupta.",
    repoUrl: r.isPrivate ? undefined : r.url,
    liveUrl: r.homepage || undefined,
    language: r.language,
    tags,
    stars: r.stars,
    pushedAt: r.pushedAt,
    isPrivate: r.isPrivate,
    rank: "B",
    questType: "side",
    xpReward: XP_BY_RANK.B,
    featured: false,
  };
}
