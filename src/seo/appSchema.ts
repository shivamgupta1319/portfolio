import type { ProjectCategory } from "@/data/types";

/**
 * Google's Software App rich result needs at least two of offers, aggregateRating,
 * applicationCategory and operatingSystem. We state the two that are true for every app
 * (no prices or ratings are invented) and use Google's own category names.
 * https://developers.google.com/search/docs/appearance/structured-data/software-app
 */
const ORDER: [ProjectCategory, string][] = [
  ["fintech", "FinanceApplication"],
  ["realtime", "CommunicationApplication"],
  ["ai", "DeveloperApplication"],
  ["tools", "DeveloperApplication"],
  ["product", "BusinessApplication"],
];

export function appCategory(categories: readonly ProjectCategory[]): string {
  return ORDER.find(([c]) => categories.includes(c))?.[1] ?? "BusinessApplication";
}

/** Where it runs: phone apps (and the web, if it has a live site), npm packages, else the browser. */
export function appOperatingSystem(app: { tags?: readonly string[]; liveUrl?: string; npmUrl?: string }): string {
  const tags = (app.tags ?? []).join(" ").toLowerCase();
  // Whole words only: "portfolios" must not read as "iOS".
  const mobile = /\b(react native|expo|android|ios)\b/.test(tags);
  if (mobile) return app.liveUrl ? "Web browser, Android, iOS" : "Android, iOS";
  if (app.npmUrl && !app.liveUrl) return "Cross-platform (Node.js)";
  return "Web browser";
}
