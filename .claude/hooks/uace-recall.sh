#!/usr/bin/env bash
# UACE SessionStart hook (auto-generated). Injects the project context packet
# into the new session via stdout. No-embed/fast path.
exec npx -y uace-mcp context "portfolio"
