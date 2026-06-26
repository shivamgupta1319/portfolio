export interface BootLine {
  text: string;
  tone?: "ok" | "dim" | "accent";
  /** ms to wait before showing this line */
  delay: number;
}

export const BOOT_LINES: BootLine[] = [
  { text: "shivamOS BIOS v2.0 — booting…", tone: "accent", delay: 120 },
  { text: "POST .................... OK", tone: "ok", delay: 220 },
  { text: "mount /dev/quests ....... OK", tone: "ok", delay: 180 },
  { text: "mount /dev/skills ....... OK", tone: "ok", delay: 160 },
  { text: "init window-manager ..... OK", tone: "ok", delay: 200 },
  { text: "load profile: shivam.gupta", tone: "dim", delay: 200 },
  { text: "  role  = full-stack engineer", tone: "dim", delay: 120 },
  { text: "  class = systems · ai · trading · realtime", tone: "dim", delay: 120 },
  { text: "render pipeline .......... READY", tone: "ok", delay: 260 },
];
