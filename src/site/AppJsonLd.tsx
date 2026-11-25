import { appCategory, appOperatingSystem } from "@/seo/appSchema";
import { oneLiner, type App } from "@/data/apps";
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
    applicationCategory: appCategory(app.category),
    operatingSystem: appOperatingSystem(app),
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
