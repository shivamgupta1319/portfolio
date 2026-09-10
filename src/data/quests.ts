import generatedJson from "./quests.generated.json";
import { curated, EXCLUDED, SIDE_QUEST_CUTOFF } from "./quests.curated";
import { SHOTS } from "./shots";
import { recordToQuest, humanize, XP_BY_RANK } from "./github";
import {
  PROJECT_CATEGORIES,
  PROJECT_CATEGORY_LABELS,
  type CuratedQuest,
  type ProjectCategory,
  type Quest,
  type Rank,
  type RepoRecord,
} from "./types";

const generated = generatedJson as RepoRecord[];
const RANK_ORDER: Record<Rank, number> = { S: 0, A: 1, B: 2 };

/** How many featured projects the profile hero grid shows. */
export const FEATURED_TOP_N = 4;

function byOrderThenRank(a: Quest, b: Quest): number {
  const ao = a.order ?? Number.POSITIVE_INFINITY;
  const bo = b.order ?? Number.POSITIVE_INFINITY;
  if (ao !== bo) return ao - bo;
  return RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
}

/** Fill derived fields (year, screenshot, searchIndex). */
function withDerived(q: Quest): Quest {
  const year = q.year ?? new Date(q.pushedAt).getUTCFullYear();
  const screenshot =
    q.screenshot ?? (SHOTS.has(q.id) ? `/shots/${q.id}.webp` : undefined);
  const searchIndex = [
    q.title,
    q.summary,
    q.description,
    q.language,
    ...q.tags,
    ...(q.highlights ?? []),
    ...q.category.map((c) => PROJECT_CATEGORY_LABELS[c]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return { ...q, year, screenshot, searchIndex };
}

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
    credit: c.credit ?? base.credit,
    tags: c.tags ?? base.tags,
    language: c.language !== undefined ? c.language : base.language,
    isPrivate,
    repoUrl: isPrivate ? undefined : base.repoUrl,
    rank,
    featured,
    questType: featured ? "main" : "side",
    xpReward: XP_BY_RANK[rank],
    category: c.category ?? base.category,
    summary: c.summary,
    highlights: c.highlights,
    year: c.year ?? base.year,
    order: c.order,
    status: c.status,
    screenshot: c.screenshot,
  };
}

/** Build a Quest from curated data alone (repo absent from the GitHub fetch). */
function synthesize(name: string, c: CuratedQuest): Quest {
  const rank = c.rank ?? "A";
  const year = c.year ?? 2026;
  return {
    id: name,
    title: c.title ?? humanize(name),
    description: c.description ?? "",
    repoUrl: undefined,
    liveUrl: c.liveUrl,
    liveLabel: c.liveLabel,
    npmUrl: c.npmUrl,
    credit: c.credit,
    language: c.language ?? null,
    tags: c.tags ?? [],
    stars: 0,
    pushedAt: `${year}-06-01T00:00:00Z`,
    isPrivate: c.isPrivate ?? true,
    rank,
    featured: !!c.featured,
    questType: c.featured ? "main" : "side",
    xpReward: XP_BY_RANK[rank],
    category: c.category ?? [],
    summary: c.summary,
    highlights: c.highlights,
    year,
    order: c.order,
    status: c.status,
    screenshot: c.screenshot,
    searchIndex: "",
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

  return out.map(withDerived);
}

const all = build();

/** Desktop mode: featured ⇒ main, ordered by `order` then rank. */
export const mainQuests: Quest[] = all
  .filter((q) => q.questType === "main")
  .sort(byOrderThenRank);

export const sideQuests: Quest[] = all
  .filter((q) => q.questType === "side")
  .sort((a, b) => {
    if (a.rank !== b.rank) return RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
    return a.pushedAt < b.pushedAt ? 1 : -1;
  });

export const allQuests = all;

/** Profile page: every featured quest in `order` sequence. */
export const featuredQuests: Quest[] = mainQuests;
/** Profile page hero grid. */
export const featuredTop: Quest[] = featuredQuests.slice(0, FEATURED_TOP_N);

/** Profile page "All projects": featured first (by order), then the rest. */
export const catalogue: Quest[] = [...mainQuests, ...sideQuests];

export const byCategory: Record<ProjectCategory, Quest[]> = Object.fromEntries(
  PROJECT_CATEGORIES.map((c) => [
    c,
    catalogue.filter((q) => q.category.includes(c)),
  ]),
) as Record<ProjectCategory, Quest[]>;

export function filterQuests(opts: {
  category?: ProjectCategory | "all";
  query?: string;
}): Quest[] {
  const base =
    !opts.category || opts.category === "all"
      ? catalogue
      : byCategory[opts.category];
  const q = opts.query?.trim().toLowerCase();
  if (!q) return base;
  const terms = q.split(/\s+/);
  return base.filter((x) => terms.every((t) => x.searchIndex.includes(t)));
}
