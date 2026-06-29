#!/usr/bin/env bash
# UACE SessionEnd hook (auto-generated). Saves a session summary from the
# transcript Claude Code passes on stdin. Best-effort; never blocks.
input=$(cat)
tp=$(printf '%s' "$input" | sed -n 's/.*"transcript_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
[ -n "$tp" ] && exec npx -y uace-mcp save-session --project "portfolio" --from-transcript "$tp"
exit 0
