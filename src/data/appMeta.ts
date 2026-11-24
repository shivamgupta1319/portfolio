import type { ProjectCategory } from "./types";

/**
 * Light catalogue types and labels, safe to import from client components
 * (no data, no JSON). The catalogue itself lives in apps.ts.
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

/** What a board row needs; built on the server by `toListItem`. */
export interface AppListItem {
  id: string;
  slug: string;
  title: string;
  /** one-line description */
  line: string;
  group: AppGroup;
  access: AppAccess;
  category: ProjectCategory[];
  host?: string;
  liveUrl?: string;
  npmUrl?: string;
  credit?: string;
  probe?: string;
}
