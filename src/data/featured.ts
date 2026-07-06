/** Headline products showcased in the desktop's top-right "Featured Products"
 *  widget. Kept as a small standalone list so the widget is decoupled from the
 *  quest catalogue and the copy can be tuned independently. */
export interface FeaturedProduct {
  id: string;
  /** Product name shown as the card title. */
  name: string;
  /** Bare domain shown under the name (also the visible link label). */
  domain: string;
  /** Outbound URL. */
  href: string;
  /** One-line pitch. */
  tagline: string;
  /** Monospace glyph for the card's icon tile. */
  glyph: string;
  /** Tailwind text-color utility (theme token) for the glyph + domain. */
  accent: string;
}

export const featuredProducts: FeaturedProduct[] = [
  {
    id: "pseo",
    name: "pSEO Engine",
    domain: "pseo.cloud",
    href: "https://pseo.cloud",
    tagline: "Programmatic-SEO SaaS — penalty-resistant pages shipped as PRs.",
    glyph: "◎",
    accent: "text-accent-2",
  },
  {
    id: "resite",
    name: "Resite",
    domain: "resite.live",
    href: "https://resite.live",
    tagline: "AI résumé builder, ATS scoring & subdomain portfolios.",
    glyph: "✦",
    accent: "text-cyan",
  },
];
