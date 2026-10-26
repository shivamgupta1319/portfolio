# Your projects: how the code actually works

These walkthroughs were written **from the source code of each repo** (every claim cites
`repo/path:line`), not from the READMEs. They're for a specific problem: most of this code was
written with AI help, so you know *what* each project does but not always *how*. In an interview,
"how" is the whole conversation.

Each file has the same shape: plain-English summary → **JD coverage table** → big-picture diagram →
**one request traced end to end** through real code → concepts explained from zero → why it was
built this way → **what's missing / what you must not claim** → a 60-second pitch + likely
questions → hands-on exercises.

| # | Project | What it proves for this JD | Read when |
|---|---|---|---|
| 01 | [AI-observability-engine](01-ai-observability-engine.md) | **Python/FastAPI**, Pydantic v2, RBAC, OLTP/OLAP split, an LLM tracing SDK (`@observe`, provider wrappers), 161 passing pytest tests | Python backend + observability rounds |
| 02 | [trading-agent](02-trading-agent.md) | Hand-written **tool-calling agent loop in Python** (OpenAI SDK), JSON-schema tools, read-only guardrails | "Explain an agent loop" questions |
| 03 | [repo-intelligence](03-repo-intelligence.md) | **Your best RAG evidence**: symbol chunking, BM25 + embeddings + RRF, citation validator, labelled evals, an honest negative result, 405 tests, CI | RAG / evals / "most technical project" |
| 04 | [AgentSystem](04-agent-system.md) | **Multi-agent** orchestration (architect/planner/router/coder/reviewer/executor/evaluator), 7 Zod structured-output schemas, BullMQ, Qdrant memory | Multi-agent / task-delegation rounds |
| 05 | [Inbox Agent](05-inbox-agent.md) | **MCP server** with 7 tools, server-side send confirmation, encrypted OAuth tokens, 58 tests | MCP + HITL + integration rounds |
| 06 | [UACE](06-uace-mcp-server.md) | **Published MCP server** (18 tools, 2 prompts), sqlite-vec + FTS5, local embeddings, context budgeting, OIDC npm release | MCP / memory / "something you shipped" |
| 07 | [pSEO Engine](07-pseo-engine.md) | **Live SaaS**: Drizzle/Postgres schema, pgvector dedupe, pg-boss queue, GitHub API, Polar webhooks, SSRF guard, Docker + nginx | End-to-end ownership / production stories |
| 08 | [Resite](08-resite.md) | **Live AI full-stack product**: schema-constrained LLM output + Ajv re-validation, OCR fallback, ATS scoring, subdomain publishing, Vitest + Playwright | Full-stack AI product / frontend rounds |
| 09 | [Deployment, CI & testing evidence](09-deployment-ci-testing-evidence.md) | Docker/Compose/nginx/systemd across repos, what CI exists, **the gaps + fix recipes** | DevOps / "how do you ship" |

---

## Things you must know before citing these projects

The walkthroughs found several places where **your older notes (`genai/13`, `genai/14`), READMEs
or résumé claims don't match the code any more.** Fix your talking points before your next interview:

| Project | What changed or was wrong | Say instead |
|---|---|---|
| **pSEO** | The in-repo multi-provider router (DB-ordered chain, persisted 429 cooldown, cost per call, no-train routing) was **replaced on 2026-09-01** (commit `c0c02d1`) by a single call to your separate **AI-ROUTER** gateway. `costCents` is hard-coded to 0. `noTrainOnly` is ignored | "I first built failover inside the app, then pulled it out into a standalone gateway so every product shares it." Describe the old design as history and AI-ROUTER as current |
| **pSEO** | `sanitizeMdx` runs on publish/export/render, *not* on generate. Embeddings are 1024-dim. No tests or CI | Don't say "sanitized on generate" or "2048-dim" |
| **AI-observability-engine** | Cost is never computed for SDK-wrapped OpenAI/Anthropic calls (tokens arrive on the update event, which carries no model). The Redis buffer exists but isn't wired (an in-process `asyncio.Queue` is used). The rollup MV is never queried. DB access is sync in threads | Present these as bugs you found by tracing the event flow, and how you'd fix them |
| **AgentSystem** | Redis "working memory" is **written but never read**, so it isn't two-tier memory in practice. "Tool calling" is tool *choice via structured output*, not native `tools`. No tests, no CI, no HITL. `run_command` passes the full `process.env` (incl. API key) to commands | "Long-term memory in Qdrant; Redis drives live UI updates." Volunteer the env leak as a known fix |
| **Inbox Agent** | No LLM call in the repo: Claude (the MCP host) does the summarizing and drafting. A first call with `confirm: true` sends immediately, so the gate relies on the server default + the host's tool-approval prompt. Outlook code is dormant, and it's Gmail now | "The server is model-agnostic; the host's model does the reasoning." Describe the preview-token fix |
| **repo-intelligence** | No vector DB: vectors are a JSON file, brute-force scanned. Re-ranking is rule-based, with no cross-encoder. The UI is vanilla JS, not React. 405 tests (not 345). The README now says "working". Held-out numbers rest on 2 questions | Quote the HANDOFF numbers with the sample-size caveat |
| **Resite** | pgvector is installed but no vector column or embeddings exist, so there's no RAG and no agent loop. The `target` field is interpolated into the system prompt (prompt-injection risk). No CI; deploys use `latest` tags | Don't claim RAG in Resite |
| **UACE** | Search is semantic-first with an FTS fallback, not fused hybrid. The function is `semanticSearch`, not `searchSemantic`. Smoke scripts aren't in CI | "Vectors are an enhancement, never a dependency" is still accurate |

## Security items to act on (not just interview prep)

- **LACS repo (team project):** a TLS private key is committed under `lacs-infra/docker/config/nginx/user_conf.d/cert/`.
  Raise it with the team: rotate the certificate/key, remove it from the repo and history, and load it from a secret store instead.
- **AgentSystem:** don't pass the full `process.env` to spawned commands. Allow-list the env vars instead.
- **Resite:** move the user-supplied `target` out of the system prompt and into a delimited user-content block.
- **Resite / smart-trading:** stop publishing Postgres ports on the host. Run smart-trading images as non-root.

## How to actually learn code you didn't write

1. **Run it.** Get it running locally first. Code you can't run, you can't explore.
2. **Pick one request and trace it**, as each walkthrough's "Follow one request end-to-end" does. Open
   each cited `file:line` in your editor and follow it with *Go to Definition*.
3. **Set a breakpoint or add a log line** at each hop and watch real values flow through.
4. **Break it on purpose**: change one line (the RRF constant, a threshold, a tool description) and
   see what changes. Undo.
5. **Explain it out loud** to an imaginary interviewer for 90 seconds without notes. Wherever you
   hesitate, re-read that part.
6. **Do one "Make it yours" exercise per project**. After that, the code is partly yours in a way you can defend.
7. Keep using AI as a **tutor** ("explain this function line by line", "what would break if I removed
   this?") rather than as an author.

## Cross-project map to the JD

| JD skill | Best project to cite | Backup |
|---|---|---|
| React/Next.js/TypeScript | Resite (08) | pSEO (07) |
| Python / FastAPI / Pydantic | AI-observability-engine (01) | trading-agent (02) |
| LLM SDK integration, structured output | Resite (08), AgentSystem (04) | pSEO + AI-ROUTER (07) |
| Tool calling / agent loop | trading-agent (02) | AgentSystem (04) |
| RAG, hybrid, citations, evals | repo-intelligence (03) | UACE (06) |
| Vector DBs | AgentSystem: Qdrant (04) · pSEO: pgvector (07) · UACE: sqlite-vec (06) | — |
| Multi-agent, delegation, memory | AgentSystem (04) | UACE memory layers (06) |
| MCP | UACE (06) | Inbox Agent (05) |
| HITL | Inbox Agent (05) | — |
| SQL data modelling | pSEO (07) | AI-observability-engine (01) |
| Observability | AI-observability-engine (01) | — |
| Testing | repo-intelligence (03), Resite (08) | AI-observability-engine (01) |
| Docker / deploy | Resite + LACS (09) | pSEO (07) |
| CI/CD | repo-intelligence CI, UACE release (03, 06) | smart-trading-v2 (09) |
| **LangChain/LangGraph, RTL, K8s, SAST/DAST, cloud** | **None yet → [capstone](../13-capstone-build-plan.md)** | — |
