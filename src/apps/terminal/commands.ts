import type { AppId } from "@/os/types";
import { APP_ORDER, APP_META } from "@/os/apps.meta";

export type Tone = "fg" | "dim" | "accent" | "green" | "cyan" | "rose" | "amber";
export interface OutLine {
  text: string;
  tone?: Tone;
}

export interface CmdCtx {
  openApp: (id: AppId) => void;
  clear: () => void;
  /** close this terminal window (desktop only) */
  close: () => void;
  isMobile: boolean;
}

interface Command {
  usage: string;
  desc: string;
  run: (args: string[], ctx: CmdCtx) => OutLine[];
}

const line = (text: string, tone?: Tone): OutLine => ({ text, tone });

/** bare app-name shortcuts → `quests`, `about`, `skills` … launch directly */
const APP_ALIASES: Record<string, AppId> = {
  guide: "guide",
  manual: "guide",
  docs: "guide",
  terminal: "terminal",
  about: "character",
  character: "character",
  profile: "character",
  quests: "questlog",
  questlog: "questlog",
  projects: "questlog",
  work: "questlog",
  skills: "skilltree",
  skilltree: "skilltree",
  tree: "skilltree",
  campaign: "campaign",
  experience: "campaign",
  contact: "contact",
  comms: "contact",
  email: "contact",
};

function launch(id: AppId, ctx: CmdCtx): OutLine[] {
  ctx.openApp(id);
  return [line(`launching ${APP_META[id].title}…`, "green")];
}

export const COMMANDS: Record<string, Command> = {
  help: {
    usage: "help",
    desc: "list available commands",
    run: () => {
      const rows = Object.entries(COMMANDS).map(([, c]) =>
        line(`  ${c.usage.padEnd(14)}${c.desc}`, "dim"),
      );
      return [
        line("available commands", "accent"),
        ...rows,
        line(""),
        line("shortcuts — just type an app name to open it:", "accent"),
        line(
          "  " + APP_ORDER.map((id) => APP_META[id].short).join(" · "),
          "cyan",
        ),
        line(""),
        line("new here? run `guide` for the full walkthrough.", "amber"),
      ];
    },
  },
  guide: {
    usage: "guide",
    desc: "open the full user guide",
    run: (_a, ctx) => launch("guide", ctx),
  },
  whoami: {
    usage: "whoami",
    desc: "print a profile summary",
    run: () => [
      line("shivam gupta", "accent"),
      line("full-stack software engineer · jaipur, india", "dim"),
      line("builds: trading systems, AI agents, real-time apps, shipped SaaS", "dim"),
      line("run `about` for the full character sheet.", "cyan"),
    ],
  },
  ls: {
    usage: "ls",
    desc: "list installed apps",
    run: () =>
      APP_ORDER.map((id) =>
        line(`  ${APP_META[id].short.padEnd(12)}${APP_META[id].title}`, "dim"),
      ),
  },
  open: {
    usage: "open <app>",
    desc: "launch an app window",
    run: (args, ctx) => {
      const key = (args[0] ?? "").toLowerCase();
      const id =
        APP_ALIASES[key] ?? APP_ORDER.find((a) => a === key);
      if (!id) {
        return [
          line(`open: unknown app "${args[0] ?? ""}"`, "rose"),
          line(`apps: ${APP_ORDER.map((a) => APP_META[a].short).join(", ")}`, "dim"),
        ];
      }
      return launch(id, ctx);
    },
  },
  social: {
    usage: "social",
    desc: "print contact links",
    run: () => [
      line("github    github.com/shivamgupta1319", "cyan"),
      line("linkedin  linkedin.com/in/myselfshivam", "cyan"),
      line("email     profile.shivam@gmail.com", "cyan"),
    ],
  },
  clear: {
    usage: "clear",
    desc: "clear the screen",
    run: (_a, ctx) => {
      ctx.clear();
      return [];
    },
  },
  exit: {
    usage: "exit",
    desc: "close the terminal",
    run: (_a, ctx) => {
      if (ctx.isMobile) {
        return [line("use the ‹ back button to exit on mobile.", "dim")];
      }
      ctx.close();
      return [];
    },
  },
  sudo: {
    usage: "sudo",
    desc: "nice try",
    run: () => [line("permission denied: nice try 😏", "amber")],
  },
};

export function runCommand(input: string, ctx: CmdCtx): OutLine[] {
  const parts = input.trim().split(/\s+/);
  const name = (parts[0] ?? "").toLowerCase();
  if (!name) return [];

  const cmd = COMMANDS[name];
  if (cmd) return cmd.run(parts.slice(1), ctx);

  // forgiving: a bare app name just opens that app
  if (APP_ALIASES[name]) return launch(APP_ALIASES[name], ctx);

  return [
    line(`command not found: ${name}`, "rose"),
    line("type `help` for commands, or `guide` for the full manual.", "dim"),
  ];
}
