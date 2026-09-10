import {
  PROJECT_CATEGORIES,
  PROJECT_CATEGORY_LABELS,
  type ProjectCategory,
  type Quest,
} from "@/data/types";

export type Chip = ProjectCategory | "all";

export const CHIPS: { key: Chip; label: string }[] = [
  { key: "all", label: "All" },
  ...PROJECT_CATEGORIES.map((c) => ({ key: c, label: PROJECT_CATEGORY_LABELS[c] })),
];

/** Pure filter used by the client grid (data arrives as props). */
export function filterList(quests: Quest[], chip: Chip, query: string): Quest[] {
  const base = chip === "all" ? quests : quests.filter((q) => q.category.includes(chip));
  const q = query.trim().toLowerCase();
  if (!q) return base;
  const terms = q.split(/\s+/);
  return base.filter((x) => terms.every((t) => x.searchIndex.includes(t)));
}
