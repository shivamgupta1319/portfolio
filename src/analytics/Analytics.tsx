/**
 * Cookieless analytics, opt-in via env at build time (static export):
 *   NEXT_PUBLIC_ANALYTICS_PROVIDER = umami | plausible
 *   NEXT_PUBLIC_ANALYTICS_SRC      = script URL (e.g. https://cloud.umami.is/script.js)
 *   NEXT_PUBLIC_ANALYTICS_ID       = umami website id | plausible domain
 * Renders nothing unless all three are set. A plain deferred <script> is used
 * (not next/script) so the tag is part of the prerendered HTML and loads even
 * before hydration. Custom events go through track().
 */
const PROVIDER = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER ?? "";
const SRC = process.env.NEXT_PUBLIC_ANALYTICS_SRC ?? "";
const ID = process.env.NEXT_PUBLIC_ANALYTICS_ID ?? "";

export default function Analytics() {
  if (!PROVIDER || !SRC || !ID) return null;
  if (PROVIDER === "umami") return <script defer src={SRC} data-website-id={ID} />;
  if (PROVIDER === "plausible") return <script defer src={SRC} data-domain={ID} />;
  return null;
}
