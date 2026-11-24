"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps old desktop links working: `/?app=questlog` opens Desktop mode.
 *
 * Old `#section` anchors are deliberately NOT redirected: browsers autocomplete
 * `shivamgupta.live/#contact` from history of the one-page site, and sending
 * those visitors to /contact made the home page impossible to reach.
 */
export default function LegacyDeepLink() {
  const router = useRouter();
  useEffect(() => {
    const { search, hash } = window.location;
    if (new URLSearchParams(search).has("app")) {
      router.replace(`/desktop/${search}`);
      return;
    }
    // Drop a stale `#section` from the address bar so it stops being suggested.
    if (hash) window.history.replaceState(null, "", window.location.pathname + search);
  }, [router]);
  return null;
}
