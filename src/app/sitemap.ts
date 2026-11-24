import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { apps } from "@/data/apps";

export const dynamic = "force-static";

/** Every indexable page. Desktop mode is noindex and stays out. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const page = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: "monthly",
    priority,
  });
  return [
    page("/", 1),
    page("/apps/", 0.9),
    ...apps.map((a) => page(`/apps/${a.slug}/`, a.group === "live" ? 0.8 : 0.5)),
    page("/experience/", 0.8),
    page("/about/", 0.7),
    page("/infra/", 0.6),
    page("/contact/", 0.6),
    page("/resume/Shivam_Gupta_Resume.pdf", 0.8),
  ];
}
