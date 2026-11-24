import type { Metadata } from "next";
import AppsCatalogue from "@/site/AppsCatalogue";
import PageHeader from "@/site/PageHeader";
import { apps, liveApps, toListItem } from "@/data/apps";

export const metadata: Metadata = {
  title: "Apps — Shivam Gupta",
  description: `Every app Shivam Gupta has built: ${liveApps.length} live on his own domains, plus the systems and projects behind them.`,
  alternates: { canonical: "/apps/" },
};

/** `/apps` — the whole catalogue: live apps first, then systems, then projects. */
export default function AppsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:pt-10">
      <PageHeader
        eyebrow="Work"
        title="Everything I've built."
        lede={
          <p>
            {`${apps.length} apps. ${liveApps.length} of them are live on my own domains, served from a server I run, and checked from your browser as you scroll. Each one has a page explaining what it does and how it’s built.`}
          </p>
        }
      />
      <AppsCatalogue items={apps.map(toListItem)} />
    </div>
  );
}
