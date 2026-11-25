import { profile } from "@/data/profile";
import { photoSrcSet } from "./images";

/** The portrait as AVIF/WebP at the size the layout needs; the JPEG is the fallback. */
export default function Photo({
  sizes,
  className = "",
  priority = false,
}: {
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <picture>
      <source type="image/avif" srcSet={photoSrcSet("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={photoSrcSet("webp")} sizes={sizes} />
      <img
        src={profile.photo}
        alt={`${profile.name}, portrait`}
        width={1159}
        height={1358}
        fetchPriority={priority ? "high" : "auto"}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={className}
      />
    </picture>
  );
}
