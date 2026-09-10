export interface BootLine {
  text: string;
  tone?: "ok" | "dim" | "accent";
  /** ms to wait before showing this line */
  delay: number;
}

/** ~0.7 s total — a flourish, not a gate. The Skip button is always visible. */
export const BOOT_LINES: BootLine[] = [
  { text: "shivamOS v3.0 — booting desktop mode…", tone: "accent", delay: 80 },
  { text: "mount /dev/projects ....... OK", tone: "ok", delay: 150 },
  { text: "mount /dev/skills ......... OK", tone: "ok", delay: 130 },
  { text: "init window-manager ....... OK", tone: "ok", delay: 150 },
  { text: "render pipeline ........... READY", tone: "ok", delay: 190 },
];
