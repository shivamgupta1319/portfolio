import type { AppId, AppMeta } from "./types";

/** Order here drives the desktop-icon / dock order. */
export const APP_ORDER: AppId[] = [
  "guide",
  "questlog",
  "character",
  "campaign",
  "skilltree",
  "contact",
  "terminal",
];

/** `short` is the plain label under icons / in menus; `title` is the window title. */
export const APP_META: Record<AppId, AppMeta> = {
  guide: {
    title: "Guide",
    short: "Guide",
    defaultSize: { w: 620, h: 580 },
    minSize: { w: 360, h: 360 },
    single: true,
  },
  terminal: {
    title: "Terminal",
    short: "Terminal",
    defaultSize: { w: 620, h: 380 },
    minSize: { w: 360, h: 220 },
    single: true,
  },
  character: {
    title: "About · character sheet",
    short: "About",
    defaultSize: { w: 560, h: 560 },
    minSize: { w: 360, h: 360 },
    single: true,
  },
  questlog: {
    title: "Projects · quest log",
    short: "Projects",
    defaultSize: { w: 860, h: 600 },
    minSize: { w: 420, h: 360 },
    single: true,
  },
  skilltree: {
    title: "Skills · skill tree",
    short: "Skills",
    defaultSize: { w: 760, h: 560 },
    minSize: { w: 420, h: 360 },
    single: true,
  },
  campaign: {
    title: "Experience · campaign log",
    short: "Experience",
    defaultSize: { w: 660, h: 600 },
    minSize: { w: 380, h: 360 },
    single: true,
  },
  contact: {
    title: "Contact",
    short: "Contact",
    defaultSize: { w: 520, h: 440 },
    minSize: { w: 340, h: 320 },
    single: true,
  },
};
