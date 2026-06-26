"use client";

import { useOsStore } from "@/os/store";
import Desktop from "@/os/Desktop";
import BootSequence from "@/boot/BootSequence";

export default function Home() {
  const booted = useOsStore((s) => s.booted);
  return (
    <main className="relative h-full w-full select-none">
      <Desktop />
      {!booted && <BootSequence />}
    </main>
  );
}
