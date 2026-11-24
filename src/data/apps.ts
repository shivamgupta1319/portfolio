import landing from "../../scripts/landing/projects.json";
import { allQuests } from "./quests";
import type { Quest } from "./types";

/**
 * The site's app catalogue (`/apps`, `/apps/<slug>`, the home board).
 *
 * Built on top of `allQuests` so desktop mode and the site share one source of
 * copy; everything here is additive presentation data (group, access, probe,
 * story). Copy rules from quests.curated.ts apply: claims must be backed by
 * the project's code or README.
 */

export type AppGroup = "live" | "system" | "project";

/**
 * How a visitor meets the app at its URL:
 * - public:   usable or browsable without signing in
 * - overview: a public overview page; the app itself needs a sign-in
 * - login:    opens straight to a sign-in
 * - none:     no URL of its own (package, internal system, local tool)
 */
export type AppAccess = "public" | "overview" | "login" | "none";

export const GROUP_LABELS: Record<AppGroup, string> = {
  live: "Live on my domains",
  system: "Systems",
  project: "Projects",
};

export const GROUP_BLURBS: Record<AppGroup, string> = {
  live: "Products I built and run myself, served from my own server through Cloudflare.",
  system: "Platforms, infrastructure and engines: some for teams I've worked with, some that power my own apps.",
  project: "Shipped earlier, built for a team, or still in the lab.",
};

export const ACCESS_LABELS: Record<AppAccess, string> = {
  public: "Public",
  overview: "Overview + sign-in",
  login: "Sign-in only",
  none: "",
};

/** Ordered ids per group. Ids are curated keys / repo names. */
const GROUPS: Record<AppGroup, string[]> = {
  live: [
    "programmatic-SEO-engine",
    "resite",
    "catch-trades",
    "repo-intelligence",
    "AI-ROUTER",
    "delivery-os",
    "smart-trading",
    "market-news",
    "indian-ipo",
    "dividend",
    "strategy-backtest",
    "crypto-ai",
    "invitation",
    "notes",
    "linkedin-ai",
    "trip",
    "personal-drive",
    "zeev",
  ],
  system: [
    "UACE",
    "lacs-v2",
    "lacs-fleet",
    "x-face-app",
    "postgresql-db-sync",
    "drl-trading",
    "web-dev-workflow",
    "echo",
  ],
  project: [
    "typezap",
    "streamverse",
    "investment",
    "investment-plan",
    "swing-trading-system",
    "tailwind-ui-kit",
    "card-selector",
    "geo-india",
    "AI-TRADING-BRAIN",
    "All-In-One",
    "nova",
    "mediasoup-sfu-calling",
  ],
};

const ACCESS: Record<string, AppAccess> = {
  "repo-intelligence": "overview",
  "AI-ROUTER": "overview",
  "smart-trading": "overview",
  "crypto-ai": "overview",
  "catch-trades": "overview",
  notes: "login",
  "linkedin-ai": "login",
  trip: "login",
  "personal-drive": "login",
};

/**
 * Small, public image on each host used for the in-browser status probe.
 * Only assets verified to answer 200 image/* without auth are listed; apps
 * without one show a plain "Live" badge instead of a probed dot.
 */
const PROBES: Record<string, string> = {
  "programmatic-SEO-engine": "https://pseo.cloud/favicon.ico",
  resite: "https://resite.live/favicon.ico",
  "catch-trades": "https://trades.pseo.cloud/icon.svg",
  "AI-ROUTER": "https://ai.pseo.cloud/assets/favicon.svg",
  "delivery-os": "https://forjenta.pseo.cloud/icon.svg",
  "indian-ipo": "https://ipo.pseo.cloud/favicon.ico",
  invitation: "https://demo.pseo.cloud/icon.svg",
  notes: "https://notes.pseo.cloud/icon.svg",
  "linkedin-ai": "https://linkedin.pseo.cloud/icon.svg",
  trip: "https://trip.pseo.cloud/favicon.ico",
  "personal-drive": "https://drive.pseo.cloud/icons/icon-192.png",
};

/** Slug overrides where the title doesn't make a good URL. */
const SLUGS: Record<string, string> = {
  typezap: "typezap",
  "lacs-v2": "lacs-x-face",
};

/** Flagship products, shown large on the home page. */
export const FLAGSHIP_IDS = ["programmatic-SEO-engine", "repo-intelligence", "catch-trades"];

/** The home page's live board (top of the Live group). */
export const HOME_BOARD_SIZE = 8;

/** Long-form page copy from the public landing pages (code-verified). */
export interface AppStory {
  headline: string;
  lede: string;
  numbers: [string, string][];
  problem: string[];
  steps: [string, string][];
  capabilities: [string, string][];
  flow: string[];
  decisions: [string, string][];
  limits: string[];
}

/** Shape of an entry in scripts/landing/projects.json (JSON infers pairs as string[][]). */
interface LandingProject {
  id: string;
  headline?: string;
  lede?: string;
  numbers?: string[][];
  problem?: string[];
  steps?: string[][];
  capabilities?: string[][];
  flow?: string[];
  decisions?: string[][];
  limits?: string[];
}

function pairs(rows: string[][] = []): [string, string][] {
  return rows.map(([a = "", b = ""]) => [a, b]);
}

/** landing id → quest id */
const LANDING_IDS: Record<string, string> = {
  "repo-intelligence": "repo-intelligence",
  "smart-trading": "smart-trading",
  "crypto-ai": "crypto-ai",
  "ai-router": "AI-ROUTER",
};

const stories = new Map<string, AppStory>();
const landingProjects: LandingProject[] = landing.projects;
for (const p of landingProjects) {
  const questId = LANDING_IDS[p.id];
  if (!questId || !p.headline || !p.lede) continue;
  stories.set(questId, {
    headline: p.headline,
    lede: p.lede,
    numbers: pairs(p.numbers),
    problem: p.problem ?? [],
    steps: pairs(p.steps),
    capabilities: pairs(p.capabilities),
    flow: p.flow ?? [],
    decisions: pairs(p.decisions),
    limits: p.limits ?? [],
  });
}

export type Hosting = "self" | "vercel" | "netlify" | "external";

export interface App extends Quest {
  slug: string;
  group: AppGroup;
  access: AppAccess;
  /** bare host of liveUrl, e.g. "ri.pseo.cloud" */
  host?: string;
  hosting?: Hosting;
  probe?: string;
  story?: AppStory;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function hostingOf(host: string): Hosting {
  if (host === "resite.live" || host === "pseo.cloud" || host.endsWith(".pseo.cloud")) return "self";
  if (host.endsWith("vercel.app")) return "vercel";
  if (host.endsWith("netlify.app")) return "netlify";
  return "external";
}

function build(): App[] {
  const byId = new Map(allQuests.map((q) => [q.id, q]));
  const out: App[] = [];
  const slugs = new Set<string>();
  for (const group of Object.keys(GROUPS) as AppGroup[]) {
    for (const id of GROUPS[group]) {
      const q = byId.get(id);
      if (!q) throw new Error(`app catalogue references unknown project "${id}"`);
      const slug = SLUGS[id] ?? slugify(q.title);
      if (slugs.has(slug)) throw new Error(`duplicate app slug "${slug}"`);
      slugs.add(slug);
      const host = q.liveUrl ? hostOf(q.liveUrl) : undefined;
      out.push({
        ...q,
        slug,
        group,
        access: ACCESS[id] ?? (q.liveUrl ? "public" : "none"),
        host,
        hosting: host ? hostingOf(host) : undefined,
        probe: PROBES[id],
        story: stories.get(id),
      });
    }
  }
  return out;
}

export const apps: App[] = build();

export const appsByGroup: Record<AppGroup, App[]> = {
  live: apps.filter((a) => a.group === "live"),
  system: apps.filter((a) => a.group === "system"),
  project: apps.filter((a) => a.group === "project"),
};

export const liveApps = appsByGroup.live;

export const flagshipApps: App[] = FLAGSHIP_IDS.map((id) => {
  const a = apps.find((x) => x.id === id);
  if (!a) throw new Error(`flagship "${id}" is not in the catalogue`);
  return a;
});

export function appBySlug(slug: string): App | undefined {
  return apps.find((a) => a.slug === slug);
}

/** Previous / next app in catalogue order, for the app page footer. */
export function neighbours(slug: string): { prev?: App; next?: App } {
  const i = apps.findIndex((a) => a.slug === slug);
  return { prev: i > 0 ? apps[i - 1] : undefined, next: i >= 0 ? apps[i + 1] : undefined };
}
