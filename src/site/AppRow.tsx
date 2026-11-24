import Link from "next/link";
import { ACCESS_LABELS, type AppListItem } from "@/data/appMeta";
import Status from "./Status";

/**
 * A row on the board. The whole row links to the app's page on this site;
 * the external "open" links live on that page.
 */
export default function AppRow({ app }: { app: AppListItem }) {
  const access = ACCESS_LABELS[app.access];
  return (
    <li className="group relative grid gap-x-6 gap-y-1.5 border-b border-border py-4 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_10.5rem] md:items-baseline">
      <div className="min-w-0">
        <h3 className="wide-sm text-lg font-bold leading-snug text-fg">
          <Link
            href={`/apps/${app.slug}/`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {app.title}
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
      {/* the row's link is stretched over it, so draw its keyboard focus on the row */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-x-2 inset-y-1 rounded-md ring-accent-2 group-has-[:focus-visible]:ring-2"
      />
    </li>
  );
}
