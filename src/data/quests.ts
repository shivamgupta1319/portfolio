import generatedJson from "./quests.generated.json";
import { curated, EXCLUDED, SIDE_QUEST_CUTOFF } from "./quests.curated";
import { recordToQuest, humanize, XP_BY_RANK } from "./github";
import type { CuratedQuest, Quest, Rank, RepoRecord } from "./types";

const generated = generatedJson as RepoRecord[];
const RANK_ORDER: Record<Rank, number> = { S: 0, A: 1, B: 2 };

function applyCurated(base: Quest, c: CuratedQuest): Quest {
  const rank = c.rank ?? base.rank;
  const featured = c.featured ?? base.featured;
  const isPrivate = c.isPrivate ?? base.isPrivate;
  return {
    ...base,
    title: c.title ?? base.title,
    description: c.description ?? base.description,
    liveUrl: c.liveUrl ?? base.liveUrl,
    liveLabel: c.liveLabel ?? base.liveLabel,
    npmUrl: c.npmUrl ?? base.npmUrl,
    tags: c.tags ?? base.tags,
    language: c.language !== undefined ? c.language : base.language,
    isPrivate,
    repoUrl: isPrivate ? undefined : base.repoUrl,
    rank,
    featured,
    questType: featured ? "main" : "side",
    xpReward: XP_BY_RANK[rank],
  };
}

/** Build a Quest from curated data alone (repo absent from the GitHub fetch). */
function synthesize(name: string, c: CuratedQuest): Quest {
  const rank = c.rank ?? "A";
  return {
    id: name,
    title: c.title ?? humanize(name),
    description: c.description ?? "",
    repoUrl: undefined,
    liveUrl: c.liveUrl,
    liveLabel: c.liveLabel,
    npmUrl: c.npmUrl,
    language: c.language ?? null,
    tags: c.tags ?? [],
    stars: 0,
    pushedAt: "2026-06-01T00:00:00Z",
    isPrivate: c.isPrivate ?? true,
    rank,
    featured: !!c.featured,
    questType: c.featured ? "main" : "side",
    xpReward: XP_BY_RANK[rank],
  };
}

function build(): Quest[] {
  const byName = new Map(generated.map((r) => [r.name, r]));
  const out: Quest[] = [];
  const seen = new Set<string>();

  // 1) curated entries (in declaration order)
  for (const [name, c] of Object.entries(curated)) {
    const rec = byName.get(name);
    if (rec) out.push(applyCurated(recordToQuest(rec), c));
    else if (c.synthesize) out.push(synthesize(name, c));
    else continue;
    seen.add(name);
  }

  // 2) auto side quests — recent, real, not excluded, not already curated
  for (const r of generated) {
    if (seen.has(r.name) || EXCLUDED.has(r.name)) continue;
    if (r.pushedAt < SIDE_QUEST_CUTOFF) continue;
    out.push(recordToQuest(r));
  }

  return out;
}

const all = build();

export const mainQuests: Quest[] = all
  .filter((q) => q.questType === "main")
  .sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);

export const sideQuests: Quest[] = all
  .filter((q) => q.questType === "side")
  .sort((a, b) => {
    if (a.rank !== b.rank) return RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
    return a.pushedAt < b.pushedAt ? 1 : -1;
  });

export const allQuests = all;
