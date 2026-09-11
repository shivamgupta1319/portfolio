export type Rank = "S" | "A" | "B";
export type QuestType = "main" | "side";

/** Filter chips on the profile page ("All" is synthesised by the UI). */
export type ProjectCategory = "ai" | "fintech" | "realtime" | "product" | "tools";

export const PROJECT_CATEGORIES: ProjectCategory[] = [
  "ai",
  "fintech",
  "realtime",
  "product",
  "tools",
];

export const PROJECT_CATEGORY_LABELS: Record<ProjectCategory, string> = {
  ai: "AI",
  fintech: "FinTech",
  realtime: "Real-time",
  product: "Products",
  tools: "Tools",
};

export type ProjectStatus = "live" | "active" | "archived" | "wip";

/** Raw shape written by scripts/fetch-github.mjs */
export interface RepoRecord {
  name: string;
  description: string;
  language: string | null;
  topics: string[];
  stars: number;
  isPrivate: boolean;
  url: string;
  homepage: string;
  pushedAt: string;
  updatedAt: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  /** repo link — omitted for private repos */
  repoUrl?: string;
  /** live product / deployed demo */
  liveUrl?: string;
  liveLabel?: string;
  npmUrl?: string;
  /** team/company attribution shown instead of a source link */
  credit?: string;
  language: string | null;
  /** architecture / stack tags shown on the card */
  tags: string[];
  stars: number;
  pushedAt: string;
  isPrivate: boolean;
  rank: Rank;
  questType: QuestType;
  xpReward: number;
  featured: boolean;

  // ── profile-page fields (additive; the desktop quest log ignores them) ──
  /** filter chips; [] for uncurated auto side-quests */
  category: ProjectCategory[];
  /** one-liner (≤ ~90 chars), distinct from `description` */
  summary?: string;
  /** 1–3 metric-bearing proof lines */
  highlights?: string[];
  /** display year; derived from pushedAt when not curated */
  year?: number;
  /** featured ordering — lower first; undefined sorts last */
  order?: number;
  /** derived: `/shots/<id>.jpg` when listed in shots.ts */
  screenshot?: string;
  status?: ProjectStatus;
  /** derived: lower-cased haystack for client-side search */
  searchIndex: string;
}

/** Curated override / seed keyed by repo name. */
export interface CuratedQuest {
  title?: string;
  description?: string;
  liveUrl?: string;
  liveLabel?: string;
  npmUrl?: string;
  credit?: string;
  tags?: string[];
  rank?: Rank;
  featured?: boolean;
  /** include even if the GitHub fetch didn't return it (e.g. CI without a token) */
  synthesize?: boolean;
  language?: string | null;
  isPrivate?: boolean;
  category?: ProjectCategory[];
  summary?: string;
  highlights?: string[];
  year?: number;
  order?: number;
  status?: ProjectStatus;
  /** explicit override; normally derived from shots.ts */
  screenshot?: string;
}

export interface StatBar {
  key: string;
  label: string;
  /** 0–100 */
  value: number;
}

export interface SkillNode {
  id: string;
  label: string;
  group: SkillGroup;
  /** tier within the tree column (0 = root) */
  tier: number;
  /** ids this node branches from */
  deps: string[];
}

export type SkillGroup =
  | "frontend"
  | "backend"
  | "data"
  | "infra"
  | "specialty";

export interface ExperienceEntry {
  role: string;
  org: string;
  location: string;
  start: string;
  end: string;
  kind: "work" | "education" | "milestone";
  bullets: string[];
  /** short metric chips rendered above the bullets, e.g. "40+ users / node" */
  metrics?: string[];
  highlight?: boolean;
}

export interface Profile {
  name: string;
  handle: string;
  /** clean job title — used for JSON-LD jobTitle */
  role: string;
  /** marketing headline for the hero */
  headline: string;
  tagline: string;
  location: string;
  email: string;
  github: string;
  githubUser: string;
  linkedin: string;
  resume: string;
  /** npm username → https://www.npmjs.com/~<npm> */
  npm?: string;
  /** full dev.to profile URL */
  devto?: string;
  /** X/Twitter handle without the @ */
  twitter?: string;
  /** public headshot path under /public, e.g. "/shivam-gupta.jpg" */
  photo?: string;
  /** external-identity placeholders — filled once the accounts exist */
  wikidata?: string;
  orcid?: string;
  crunchbase?: string;
  level: number;
  xp: number;
  xpForNext: number;
}
