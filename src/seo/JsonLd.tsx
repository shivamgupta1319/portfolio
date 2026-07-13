import { profile } from "@/data/profile";
import { stats, skills } from "@/data/skills";
import { experience } from "@/data/experience";
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

  // Verified identity URLs across the web. Placeholders (empty strings) are
  // filtered out so we never emit a broken `sameAs` link.
  const sameAs = [
    profile.github,
    profile.linkedin,
    profile.npm && `https://www.npmjs.com/~${profile.npm}`,
    profile.devto,
    profile.twitter && `https://x.com/${profile.twitter}`,
    profile.wikidata,
    profile.orcid,
    profile.crunchbase,
  ].filter(Boolean);

  // A real ImageObject (with caption) is a stronger Knowledge-Graph signal than
  // a bare URL; fall back to the OG card when no dedicated headshot is set.
  const image = profile.photo
    ? {
        "@type": "ImageObject",
        url: `${SITE_URL}${profile.photo}`,
        caption: profile.name,
      }
    : `${SITE_URL}/opengraph-image`;

  // Derive employer / school from the same experience data the timeline uses.
  const currentWork = experience.find((e) => e.kind === "work");
  const education = experience.find((e) => e.kind === "education");
  const worksFor = currentWork && {
    "@type": "Organization",
    name: currentWork.org,
  };
  const alumniOf = education && {
    "@type": "EducationalOrganization",
    name: education.org,
  };

  const person = {
    "@type": "Person",
    "@id": personId,
    name: profile.name,
    alternateName: profile.handle,
    url: SITE_URL,
    jobTitle: profile.role,
    description: profile.tagline,
    email: `mailto:${profile.email}`,
    image,
    address: {
      "@type": "PostalAddress",
      addressLocality: locality,
      addressCountry: country,
    },
    sameAs,
    knowsAbout,
    ...(worksFor && { worksFor }),
    ...(alumniOf && { alumniOf }),
  };

  const graph = [
    person,
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
      dateModified: new Date().toISOString().slice(0, 10),
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
