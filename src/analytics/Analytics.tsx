import Script from "next/script";

/**
 * Cookieless analytics, opt-in via env at build time (static export):
 *   NEXT_PUBLIC_ANALYTICS_PROVIDER = umami | plausible
 *   NEXT_PUBLIC_ANALYTICS_SRC      = script URL (e.g. https://cloud.umami.is/script.js)
 *   NEXT_PUBLIC_ANALYTICS_ID       = umami website id | plausible domain
 * Renders nothing unless all three are set. Custom events go through track().
 */
const PROVIDER = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER ?? "";
const SRC = process.env.NEXT_PUBLIC_ANALYTICS_SRC ?? "";
const ID = process.env.NEXT_PUBLIC_ANALYTICS_ID ?? "";

export default function Analytics() {
  if (!PROVIDER || !SRC || !ID) return null;
  if (PROVIDER === "umami") {
    return <Script src={SRC} data-website-id={ID} strategy="afterInteractive" defer />;
  }
  if (PROVIDER === "plausible") {
    return <Script src={SRC} data-domain={ID} strategy="afterInteractive" defer />;
  }
  return null;
}
