/**
 * Responsive copies made by `npm run images` (scripts/optimize-images.mjs) in public/img.
 * The originals stay where they are for links, schema and fallbacks.
 */
export const PHOTO_WIDTHS = [480, 800, 1100] as const;

export function photoSrcSet(format: "avif" | "webp"): string {
  return PHOTO_WIDTHS.map((w) => `/img/shivam-gupta-${w}.${format} ${w}w`).join(", ");
}

/** The header avatar (144px square crop, shown at 36px). */
export const AVATAR = "/img/shivam-gupta-144.webp";

/** "/shots/resite.jpg" → its 640/1280 WebP srcset, or null for anything else. */
export function shotSrcSet(src: string): string | null {
  const m = /^\/shots\/([^/]+)\.jpg$/.exec(src);
  if (!m) return null;
  return `/img/shots/${m[1]}-640.webp 640w, /img/shots/${m[1]}-1280.webp 1280w`;
}
