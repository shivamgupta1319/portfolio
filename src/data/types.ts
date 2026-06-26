export type Rank = "S" | "A" | "B";
export type QuestType = "main" | "side";

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
  highlight?: boolean;
}

export interface Profile {
  name: string;
  handle: string;
  role: string;
  tagline: string;
  location: string;
  email: string;
  github: string;
  githubUser: string;
  linkedin: string;
  resume: string;
  level: number;
  xp: number;
  xpForNext: number;
}
