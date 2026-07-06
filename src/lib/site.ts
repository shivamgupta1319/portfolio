/** Canonical production URL. Override per-environment via NEXT_PUBLIC_SITE_URL
 *  (set it in the Netlify dashboard once the production domain is known). */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://shivamgupta.live"
).replace(/\/+$/, "");

export const SITE_DESC =
  "Shivam Gupta — full-stack software engineer building trading systems, AI agents, real-time apps and shipped SaaS. Explore the portfolio as a bootable game-OS.";

/** Google Search Console verification token. Paste the value from GSC's
 *  "HTML tag" method into NEXT_PUBLIC_GOOGLE_VERIFICATION (Netlify env var);
 *  when empty, Next.js omits the meta tag entirely. */
export const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION ?? "";
