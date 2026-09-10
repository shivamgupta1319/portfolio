"use client";

import { useOsStore } from "@/os/store";
import { usePrefs } from "@/lib/prefsStore";
import { useMediaQuery } from "@/lib/useMediaQuery";
import Desktop from "@/os/Desktop";
import MobileShell from "@/mobile/MobileShell";
import BootSequence from "@/boot/BootSequence";
import CustomCursor from "@/cursor/CustomCursor";

/** Client root for /desktop: boot overlay, then the windowed OS (phone shell < 768px). */
export default function DesktopShell() {
  const booted = useOsStore((s) => s.booted);
  const cursorFx = usePrefs((s) => s.cursorFx);
  const isMobile = useMediaQuery("(max-width: 767px)");
  return (
    <main id="main" className="relative h-full w-full select-none">
      {isMobile ? <MobileShell /> : <Desktop />}
      {!booted && <BootSequence />}
      {cursorFx && <CustomCursor />}
    </main>
  );
}
