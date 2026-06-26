"use client";

import { useOsStore } from "@/os/store";
import { useMediaQuery } from "@/lib/useMediaQuery";
import Desktop from "@/os/Desktop";
import MobileShell from "@/mobile/MobileShell";
import BootSequence from "@/boot/BootSequence";
import CustomCursor from "@/cursor/CustomCursor";

export default function Home() {
  const booted = useOsStore((s) => s.booted);
  const isMobile = useMediaQuery("(max-width: 767px)");
  return (
    <main className="relative h-full w-full select-none">
      {isMobile ? <MobileShell /> : <Desktop />}
      {!booted && <BootSequence />}
      <CustomCursor />
    </main>
  );
}
