import type { AppId, AppMeta } from "./types";

/** Order here drives the desktop-icon / dock order. */
export const APP_ORDER: AppId[] = [
  "terminal",
  "character",
  "questlog",
  "skilltree",
  "campaign",
  "contact",
];

export const APP_META: Record<AppId, AppMeta> = {
  terminal: {
    title: "terminal",
    short: "terminal",
    defaultSize: { w: 620, h: 380 },
    minSize: { w: 360, h: 220 },
    single: true,
  },
  character: {
    title: "character_sheet.app",
    short: "character",
    defaultSize: { w: 560, h: 520 },
    minSize: { w: 360, h: 360 },
    single: true,
  },
  questlog: {
    title: "quest_log.app",
    short: "quests",
    defaultSize: { w: 820, h: 560 },
    minSize: { w: 420, h: 360 },
    single: true,
  },
  skilltree: {
    title: "skill_tree.app",
    short: "skills",
    defaultSize: { w: 760, h: 560 },
    minSize: { w: 420, h: 360 },
    single: true,
  },
  campaign: {
    title: "campaign.log",
    short: "campaign",
    defaultSize: { w: 640, h: 560 },
    minSize: { w: 380, h: 360 },
    single: true,
  },
  contact: {
    title: "comms.link",
    short: "contact",
    defaultSize: { w: 520, h: 420 },
    minSize: { w: 340, h: 320 },
    single: true,
  },
};
