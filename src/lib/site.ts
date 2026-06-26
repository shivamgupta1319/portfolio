/** Canonical production URL. Override per-environment via NEXT_PUBLIC_SITE_URL
 *  (set it in the Netlify dashboard once the production domain is known). */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://myselfshivam.netlify.app"
).replace(/\/+$/, "");

export const SITE_DESC =
  "Shivam Gupta — full-stack software engineer building trading systems, AI agents, real-time apps and shipped SaaS. Explore the portfolio as a bootable game-OS.";
