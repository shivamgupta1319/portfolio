import Link from "next/link";
import { ACCESS_LABELS, type AppListItem } from "@/data/appMeta";
import type { CSSProperties } from "react";
import Status from "./Status";
import Arrow from "./Arrow";

/**
 * A row on the board. The whole row links to the app's page on this site;
 * the external "open" links live on that page.
 */
export default function AppRow({ app, index = 0 }: { app: AppListItem; index?: number }) {
  const access = ACCESS_LABELS[app.access];
  return (
    <li
      className="fade-up group relative grid gap-x-6 gap-y-1.5 border-b border-border px-5 py-5 transition-colors duration-300 last:border-0 hover:bg-panel-2 sm:px-6 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_10.5rem_2.75rem] md:items-center"
      style={{ "--d": `${Math.min(index, 12) * 0.035}s` } as CSSProperties}
    >
      <div className="min-w-0">
        <h3 className="wide-sm text-lg font-semibold leading-snug text-fg">
          {/* The link's ::after covers the whole row. The hover nudge sits on an inner span:
              a transform on any ancestor of that ::after would shrink it to the title. */}
          <Link
            href={`/apps/${app.slug}/`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">{app.title}</span>
          </Link>
        </h3>
        {app.host ? (
          <p className="truncate font-mono text-[0.8125rem] text-accent">{app.host}</p>
        ) : app.npmUrl ? (
          <p className="font-mono text-[0.8125rem] text-fg-mute">npm package</p>
        ) : null}
      </div>
      <p className="min-w-0 text-[0.9375rem] leading-relaxed text-fg-dim group-hover:text-fg">{app.line}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 md:flex-col md:items-end md:gap-1">
        <Status app={app} />
        {access && <span className="text-[0.8125rem] text-fg-mute">{access}</span>}
        {!app.liveUrl && app.credit && <span className="text-[0.8125rem] text-fg-mute">{app.credit}</span>}
      </div>
      <span className="hidden md:block">
        <Arrow />
      </span>
      {/* the row's link is stretched over it, so draw its keyboard focus on the row */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-1 rounded-[22px] ring-accent-2 group-has-[:focus-visible]:ring-2"
      />
    </li>
  );
}
