import type { ComponentType } from "react";
import type { AppId } from "./types";
import Terminal from "@/apps/terminal/Terminal";
import QuestLog from "@/apps/questlog/QuestLog";
import CharacterSheet from "@/apps/character/CharacterSheet";
import Campaign from "@/apps/campaign/Campaign";
import SkillTree from "@/apps/skilltree/SkillTree";
import Contact from "@/apps/contact/Contact";

export interface AppDef {
  id: AppId;
  /** monospace glyph used for desktop icons / dock tiles */
  glyph: string;
  /** tailwind text-color class for the glyph accent */
  accent: string;
  component: ComponentType<{ windowId: string }>;
}

export const APPS: Record<AppId, AppDef> = {
  terminal: { id: "terminal", glyph: ">_", accent: "text-green", component: Terminal },
  character: { id: "character", glyph: "☻", accent: "text-cyan", component: CharacterSheet },
  questlog: { id: "questlog", glyph: "✦", accent: "text-amber", component: QuestLog },
  skilltree: { id: "skilltree", glyph: "⌘", accent: "text-accent-2", component: SkillTree },
  campaign: { id: "campaign", glyph: "⚑", accent: "text-rose", component: Campaign },
  contact: { id: "contact", glyph: "✉", accent: "text-cyan", component: Contact },
};
