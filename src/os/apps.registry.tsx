import type { ComponentType } from "react";
import type { AppId } from "./types";
import Placeholder from "@/apps/Placeholder";
import Terminal from "@/apps/terminal/Terminal";

export interface AppDef {
  id: AppId;
  /** monospace glyph used for desktop icons / dock tiles */
  glyph: string;
  /** tailwind text-color class for the glyph accent */
  accent: string;
  component: ComponentType<{ windowId: string }>;
}

/** Bind the shared Placeholder to a specific app (named for React devtools). */
function placeholderFor(appId: AppId): ComponentType<{ windowId: string }> {
  const C = () => <Placeholder appId={appId} />;
  C.displayName = `Placeholder(${appId})`;
  return C;
}

export const APPS: Record<AppId, AppDef> = {
  terminal: { id: "terminal", glyph: ">_", accent: "text-green", component: Terminal },
  character: { id: "character", glyph: "☻", accent: "text-cyan", component: placeholderFor("character") },
  questlog: { id: "questlog", glyph: "✦", accent: "text-amber", component: placeholderFor("questlog") },
  skilltree: { id: "skilltree", glyph: "⌘", accent: "text-accent-2", component: placeholderFor("skilltree") },
  campaign: { id: "campaign", glyph: "⚑", accent: "text-rose", component: placeholderFor("campaign") },
  contact: { id: "contact", glyph: "✉", accent: "text-cyan", component: placeholderFor("contact") },
};
