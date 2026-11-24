"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Section anchors of the old single-page site → their pages now. */
const HASH_ROUTES: Record<string, string> = {
  "#work": "/apps/",
  "#projects": "/apps/",
  "#showcase": "/apps/",
  "#experience": "/experience/",
  "#skills": "/experience/",
  "#contact": "/contact/",
  "#about": "/about/",
};

/**
 * Keeps old links working: `/?app=questlog` opens Desktop mode, and
 * `/#experience`-style anchors go to the page that now holds that section.
 */
export default function LegacyDeepLink() {
  const router = useRouter();
  useEffect(() => {
    const { search, hash } = window.location;
    if (new URLSearchParams(search).has("app")) {
      router.replace(`/desktop/${search}`);
      return;
    }
    const to = HASH_ROUTES[hash.toLowerCase()];
    if (to) router.replace(to);
  }, [router]);
  return null;
}
