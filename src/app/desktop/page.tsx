import type { Metadata } from "next";
import DesktopShell from "@/os/DesktopShell";

export const metadata: Metadata = {
  title: "Desktop mode — Shivam Gupta",
  description:
    "shivamOS: explore Shivam Gupta's portfolio as an interactive game-styled desktop with a terminal, quest log and skill tree.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/" },
};

/** `/desktop` — the interactive game-OS. Not indexed; the profile page is canonical. */
export default function DesktopPage() {
  return <DesktopShell />;
}
