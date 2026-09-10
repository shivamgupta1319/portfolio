"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Old links looked like `/?app=questlog`; send them to the desktop route. */
export default function LegacyDeepLink() {
  const router = useRouter();
  useEffect(() => {
    const search = window.location.search;
    if (new URLSearchParams(search).has("app")) {
      router.replace(`/desktop${search}`);
    }
  }, [router]);
  return null;
}
