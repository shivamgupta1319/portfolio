import type { ProjectStatus, Quest } from "@/data/types";
import { PROJECT_CATEGORY_LABELS } from "@/data/types";

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  live: "Live",
  active: "In active development",
  wip: "In progress",
  archived: "Archived",
};

/** e.g. "AI, Products" */
export function categoryLabel(q: Quest): string {
  return q.category.map((c) => PROJECT_CATEGORY_LABELS[c]).join(", ");
}
