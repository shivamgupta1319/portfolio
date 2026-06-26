export type AppId =
  | "terminal"
  | "character"
  | "questlog"
  | "skilltree"
  | "campaign"
  | "contact";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WindowState {
  /** unique instance id */
  id: string;
  appId: AppId;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** stacking order */
  z: number;
  minimized: boolean;
  maximized: boolean;
  /** saved rect to restore from a maximize */
  prevRect?: Rect;
}

/** Static, component-free metadata. Lives here (not in the registry) so the
 *  store can read it without importing React components — keeps the module
 *  graph acyclic (store → meta; registry → meta + components → store). */
export interface AppMeta {
  title: string;
  /** short label shown under the desktop icon / in the dock */
  short: string;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  /** single-instance apps reuse their existing window instead of spawning */
  single: boolean;
}
