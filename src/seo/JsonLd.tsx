import { profile } from "@/data/profile";
import { stats, skills } from "@/data/skills";
import { SITE_URL } from "@/lib/site";

/**
 * schema.org structured data (JSON-LD) so search engines can build a "Shivam
 * Gupta" person entity — the foundation for name-query ranking and a Knowledge
 * Panel. Rendered server-side into the static HTML via a plain <script> tag.
 *
 * All values are pulled from existing data modules — nothing is hardcoded here.
 */
export default function JsonLd() {
  const personId = `${SITE_URL}/#person`;

  // "Jaipur, India" -> locality + country for postal address.
  const [locality, country] = profile.location.split(",").map((s) => s.trim());

  // Topics this person is known for — feeds the Person `knowsAbout` signal.
  const knowsAbout = [
    ...stats.map((s) => s.label),
    ...skills.map((s) => s.label),
  ];

  const graph = [
    {
      "@type": "Person",
      "@id": personId,
      name: profile.name,
      alternateName: profile.handle,
      url: SITE_URL,
      jobTitle: profile.role,
      description: profile.tagline,
      email: `mailto:${profile.email}`,
      image: `${SITE_URL}/opengraph-image`,
      address: {
        "@type": "PostalAddress",
        addressLocality: locality,
        addressCountry: country,
      },
      sameAs: [profile.github, profile.linkedin],
      knowsAbout,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "shivamOS",
      description: `${profile.name} — ${profile.role}. ${profile.tagline}`,
      inLanguage: "en",
      author: { "@id": personId },
      publisher: { "@id": personId },
    },
    {
      "@type": "ProfilePage",
      "@id": `${SITE_URL}/#profilepage`,
      url: SITE_URL,
      name: `${profile.name} — ${profile.role}`,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": personId },
      mainEntity: { "@id": personId },
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": graph,
  };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe to inject; no user input is involved.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
