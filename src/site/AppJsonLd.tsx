import { oneLiner, type App } from "@/data/apps";
import { PROJECT_CATEGORY_LABELS } from "@/data/types";
import { SITE_URL } from "@/lib/site";

/** schema.org SoftwareApplication for an app page, authored by the site's Person entity. */
export default function AppJsonLd({ app }: { app: App }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/apps/${app.slug}/#app`,
    name: app.title,
    description: app.story?.headline ?? oneLiner(app),
    url: app.liveUrl ?? app.npmUrl ?? `${SITE_URL}/apps/${app.slug}/`,
    mainEntityOfPage: `${SITE_URL}/apps/${app.slug}/`,
    applicationCategory: app.category.map((c) => PROJECT_CATEGORY_LABELS[c]).join(", ") || undefined,
    ...(app.screenshot && { screenshot: `${SITE_URL}${app.screenshot}` }),
    author: { "@id": `${SITE_URL}/#person` },
  };
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output with "<" escaped cannot break out of the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
