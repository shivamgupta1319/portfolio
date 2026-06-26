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
}

interface Command {
  desc: string;
  run: (args: string[], ctx: CmdCtx) => OutLine[];
}

const line = (text: string, tone?: Tone): OutLine => ({ text, tone });

export const COMMANDS: Record<string, Command> = {
  help: {
    desc: "list available commands",
    run: () => [
      line("available commands:", "accent"),
      ...Object.entries(COMMANDS).map(([name, c]) =>
        line(`  ${name.padEnd(10)} ${c.desc}`, "dim"),
      ),
      line("tip: `open quests` launches an app window.", "cyan"),
    ],
  },
  whoami: {
    desc: "print profile summary",
    run: () => [
      line("shivam gupta", "accent"),
      line("full-stack software engineer · jaipur, india", "dim"),
      line("builds: trading systems, ai agents, real-time apps, shipped SaaS", "dim"),
    ],
  },
  ls: {
    desc: "list installed apps",
    run: () =>
      APP_ORDER.map((id) =>
        line(`  ${APP_META[id].short.padEnd(12)} ${APP_META[id].title}`, "dim"),
      ),
  },
  open: {
    desc: "open <app>  — launch an app window",
    run: (args, ctx) => {
      const key = (args[0] ?? "").toLowerCase();
      const match = APP_ORDER.find(
        (id) => id === key || APP_META[id].short === key,
      );
      if (!match) {
        return [
          line(`open: unknown app "${args[0] ?? ""}"`, "rose"),
          line(`try: ${APP_ORDER.map((id) => APP_META[id].short).join(", ")}`, "dim"),
        ];
      }
      ctx.openApp(match);
      return [line(`launching ${APP_META[match].title}…`, "green")];
    },
  },
  social: {
    desc: "print links",
    run: () => [
      line("github   github.com/shivamgupta1319", "cyan"),
      line("linkedin linkedin.com/in/myselfshivam", "cyan"),
      line("email    profile.shivam@gmail.com", "cyan"),
    ],
  },
  clear: {
    desc: "clear the screen",
    run: (_args, ctx) => {
      ctx.clear();
      return [];
    },
  },
  sudo: {
    desc: "nice try",
    run: () => [line("permission denied: nice try 😏", "amber")],
  },
};

export function runCommand(input: string, ctx: CmdCtx): OutLine[] {
  const [name, ...args] = input.trim().split(/\s+/);
  if (!name) return [];
  const cmd = COMMANDS[name.toLowerCase()];
  if (!cmd) {
    return [
      line(`command not found: ${name}`, "rose"),
      line("type `help` for a list of commands.", "dim"),
    ];
  }
  return cmd.run(args, ctx);
}
