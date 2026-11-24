import type { Metadata } from "next";
import AppsCatalogue from "@/site/AppsCatalogue";
import { apps, liveApps, toListItem } from "@/data/apps";

export const metadata: Metadata = {
  title: "Apps — Shivam Gupta",
  description: `Every app Shivam Gupta has built: ${liveApps.length} live on his own domains, plus the systems and projects behind them.`,
  alternates: { canonical: "/apps/" },
};

/** `/apps` — the whole catalogue: live apps first, then systems, then projects. */
export default function AppsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:pt-12">
      <h1 className="wide text-4xl font-bold leading-[1.05] text-fg sm:text-5xl">Apps</h1>
      <p className="mt-3 max-w-2xl text-lg text-fg-dim">
        {`${apps.length} apps. ${liveApps.length} of them are live on my own domains, served from a server I run, and checked from your browser as you scroll. Each one has a page explaining what it does and how it’s built.`}
      </p>
      <AppsCatalogue items={apps.map(toListItem)} />
    </div>
  );
}
