"use client";

import { useEffect, useRef, useState } from "react";
import { useOsStore } from "@/os/store";
import { runCommand, type OutLine, type Tone } from "./commands";

interface Entry {
  input: string;
  output: OutLine[];
}

const toneClass: Record<Tone, string> = {
  fg: "text-fg",
  dim: "text-fg-dim",
  accent: "text-accent-2",
  green: "text-green",
  cyan: "text-cyan",
  rose: "text-rose",
  amber: "text-amber",
};

const BANNER: OutLine[] = [
  { text: "shivamOS terminal — type `help` to begin", tone: "accent" },
  { text: "try: whoami · ls · open quests", tone: "dim" },
];

export default function Terminal() {
  const openApp = useOsStore((s) => s.openApp);
  const [entries, setEntries] = useState<Entry[]>([{ input: "", output: BANNER }]);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [entries]);

  const submit = () => {
    const input = value;
    setValue("");
    if (input.trim()) {
      setHistory((h) => [...h, input]);
      setHistIdx(-1);
    }
    const output = runCommand(input, {
      openApp,
      clear: () => setEntries([]),
    });
    // `clear` empties entries inside runCommand; only append when it didn't.
    if (input.trim().toLowerCase() === "clear") {
      setEntries([]);
      return;
    }
    setEntries((e) => [...e, { input, output }]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!history.length) return;
      const idx = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(idx);
      setValue(history[idx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx < 0) return;
      const idx = histIdx + 1;
      if (idx >= history.length) {
        setHistIdx(-1);
        setValue("");
      } else {
        setHistIdx(idx);
        setValue(history[idx]);
      }
    }
  };

  return (
    <div
      ref={scrollRef}
      onClick={() => inputRef.current?.focus()}
      className="os-scroll h-full overflow-auto bg-bg/40 p-3 font-mono text-[13px] leading-relaxed"
    >
      {entries.map((entry, i) => (
        <div key={i}>
          {entry.input !== "" || i > 0 ? (
            <div>
              <span className="text-green">guest@shivamos</span>
              <span className="text-fg-mute">:~$ </span>
              <span>{entry.input}</span>
            </div>
          ) : null}
          {entry.output.map((o, j) => (
            <div key={j} className={toneClass[o.tone ?? "fg"]}>
              {o.text}
            </div>
          ))}
        </div>
      ))}

      <div className="flex items-center">
        <span className="text-green">guest@shivamos</span>
        <span className="text-fg-mute">:~$ </span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          aria-label="terminal input"
          className="ml-1 flex-1 bg-transparent text-fg caret-green outline-none"
        />
      </div>
    </div>
  );
}
