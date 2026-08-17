# 14 — Deep-dive: the other AI projects

> Everything except [repo-intelligence](13-deepdive-repo-intelligence.md), which has its own file.
> Written from the source, not the READMEs.
>
> Each entry follows the same shape: **what it is → architecture in five lines → the one hard
> decision → the limitation you volunteer → the questions it uniquely answers**. Volunteering the
> limitation before the interviewer finds it is the single highest-value habit in a project round.
>
> The 90-second answer shape from
> [08-project-grilling.md:15-27](../interview-qa/08-project-grilling.md) still applies:
> problem → what you built → the hard part → the decision and its tradeoff → outcome and hook.

---

## The portfolio ledger — read this first

Before you cite anything, know which category it's in.

| Project | Status | Cite it? |
|---|---|---|
| **repo-intelligence** | 13.8k LOC, 53 commits, most active | **Yes — lead with it.** Fix the README first |
| **pSEO Engine** | Live at pseo.cloud | Yes — your best production LLM system |
| **UACE** | Published on npm, in daily use | Yes — your best shipped-infrastructure story |
| **AI-observability-engine** | 8.4k LOC, P1–P6a shipped | **Yes — underrated.** Your only real LLMOps artifact |
| **AgentSystem** | Full monorepo, working | Yes — your deepest agent architecture |
| **Inbox Agent** | Working, tested | Yes — your best HITL story |
| **trading-agent** | 2k LOC, working | Yes — the cleanest agent-loop explanation |
| **Glacier Dev** | Working, no live URL | Yes, with the weaknesses volunteered |
| **LACS** | Live at dr.alwacs.com | Yes — flagship, but it's a **team** project. Be precise |
| **crypto-ai / drl-trading** | Working | Yes — your only real ML/RL evidence |
| **card-selector / Photo-AI** | Working | Minor. Useful for the CV/document-AI question |
| **jarvis** | 793 LOC, partial | Careful — LangChain is declared and unused |
| `offline-enterprise-rag` | **README only, 0 source files** | **No.** "A design I've written up, not built" |
| `multi-agent-coding-platform` | **README only** | **No** |
| `ai-architecture-generator` | **README only** | **No** |
| `ai-devops-engineer` | **README only** | **No** |
| `lora/` | **LoRa radio, not LoRA** | **Never as ML.** Cite as embedded RF if at all |
| `AI-TRADING-BRAIN` | LightGBM, zero GenAI (by ADR) | As classical ML only |
| `personal-bot` | Broken import, won't start | **No** |
| `direwolf` | Third-party fork, not your code | **No** |

**Two stale READMEs are actively costing you:** `repo-intelligence` says *"Status: Planning — no
implementation yet"* with a complete pipeline in `packages/core/src`, and
`AI-observability-engine` lists only *"P1 ✅"* when its git log shows P1 through P6a shipped.

---

## pSEO Engine

**Live · pseo.cloud · `~/workspace/source-of-income` · Next.js 15, Drizzle, Postgres/pgvector,
pg-boss**

### What it is
A developer-first programmatic-SEO SaaS: generate and quality-gate penalty-resistant landing
pages, then ship them into the customer's own Next.js/Astro repo via a GitHub PR or a pull API.

### Architecture in five lines
1. `POST /generations` → quota check → create a Dataset + GenerationRun → enqueue **one pg-boss
   job per dataset row**.
2. Worker builds the prompt from a DB-stored template plus a **STYLE-ONLY brand context block**
   that explicitly forbids introducing new facts.
3. `routeGenerate()` walks a DB-ordered model chain until one succeeds.
4. Sanitize → derive slug/title/description → build and validate JSON-LD → insert as a **draft**.
5. Quality pass (thin content, near-duplicate, score, embedding) → on run completion, build the
   internal-link graph, which needs every page embedded first.

### The one hard decision — the model router
`src/lib/model-router.ts`. **Zero LLM SDKs in the project** — every provider call is hand-rolled
`fetch`, deliberately, because three providers with three response shapes is easier to own than
three SDKs with three release cadences.

| Mechanism | Detail |
|---|---|
| Chain as **data** | Models live in a `model_registry` table ordered by `priority`. Reordering is a SQL update, not a deploy |
| Typed failover | `429 / 5xx / timeout / network / empty output` → next model. Any other 4xx → **throw immediately**, because retrying a bad request is pointless |
| `EmptyOutputError` | Free tiers return **200 with an empty body**. That's a failure and it needed its own error type |
| **Persisted cooldown** | A 429 writes `cooldownUntil = now + 60s` onto that model's row. Cross-process, because it's in the DB — not an in-memory map |
| Compliance routing | `routeGenerate(prompt, { noTrainOnly })` filters the chain to `dataHandling === 'no_train'`. Paying customers are forced onto the paid no-train model |
| Cost | Computed per call in cents from the provider's real usage fields, accumulated onto the run, surfaced to the user |
| Key-missing = silent skip | So you can deploy with only some provider keys configured |
| `ChainExhaustedError` | Only when every eligible model fails — and then the job re-queues rather than losing the page |

### The guardrails (this repo is genuinely strong here)
- **Quality engine** — thin content below 300 words with markdown punctuation stripped *and* a
  fence-guard so a wholly-fenced body isn't false-flagged; near-duplicate at **cosine ≥ 0.92**;
  a composite 0–100 score with graduated penalties. Flagged pages need an explicit override to
  approve.
- **`sanitizeMdx`** on generate *and* publish — strips `script`/`style` blocks, dangerous tags,
  `on*=` handlers and `javascript:` URLs.
- **SSRF guard** on the website analyzer — blocks IPv4 private/loopback/link-local/CGNAT/multicast
  and the IPv6 equivalents, resolves via `node:dns` and rejects if *any* record is private,
  **re-validates every redirect hop**, http(s) only, 10s timeout, 512KB cap with stream
  cancellation, 10k-char truncation to bound prompt tokens. The residual DNS-rebinding risk is
  documented and explicitly accepted.
- **Graceful degradation contract** — the AI routes never 500. They return 200 with
  `EMPTY_SUGGESTION` plus a reason, so the form falls back to manual entry.

### The limitation you volunteer
> "There's **no vector index** — every similarity query is a sequential scan. That's correct at
> hundreds of pages per project behind a `project_id` filter, and it's the first thing that breaks
> at scale. There are also **no unit tests** — what I have is 15 hand-rolled verification scripts
> run manually against live models and a live DB. Useful, and not CI-gated. And **no prompt
> versioning and no LLM response caching**."

### Questions it uniquely answers
Resilience to a flaky third-party · LLM gateway design · compliance-driven routing · cost
accounting · content quality gates · SSRF · graceful degradation.

---

## UACE

**Published — npmjs.com/package/uace-mcp · `~/workspace/UACE` · TypeScript, MCP, sqlite-vec,
transformers.js**

### What it is
An MCP server giving every AI coding assistant one shared, local-first "project brain", so a new
session continues without re-explaining the codebase. **It calls no LLM at all** — zero provider
SDKs. That separation *is* the design: it's infrastructure the model consumes.

### Architecture in five lines
1. stdio MCP server, `~/.uace/memory.db` shared by every client, SQLite in WAL mode.
2. Memories in layers — working / session / long-term — plus sessions, projects and git state.
3. Local 384-dim MiniLM embeddings via transformers.js into a `sqlite-vec` `vec0` virtual table.
4. FTS5 external-content table kept in sync by three triggers, ranked by BM25 — the fallback.
5. **18 tools + 2 MCP prompts**, plus a dual-mode CLI so Claude Code *hooks* can read and write
   the brain without speaking MCP.

### The hard decisions
**The vec0 over-fetch.** `vec0` KNN can't apply the project filter inside the index scan, so
`searchSemantic` pulls `max(limit × 10, 50)` and post-filters — otherwise a multi-project database
starves results for the project you asked about. Found by having it happen.

**Vectors are an enhancement, never a dependency.** The heavy transformers import is *dynamic* so
startup isn't blocked; a load failure sets a permanent `failed` flag and `embed()` returns `null`
forever after; the extension load is wrapped in try/catch. Search silently degrades to FTS5 and
the DB stays fully usable.

**Orphaned vectors.** FTS5 auto-cleans via a delete trigger; `vec0` has none. So `deleteMemory` and
`deleteProject` explicitly `DELETE FROM vec_memories` inside a transaction first.

**Context packet assembly** — 6000-char budget, priority-ordered groups, lowest dropped first with
a `…trimmed` marker, normalised dedupe, relative-age labels, and a `⚠️ may be stale` flag on
working memory older than 14 days. The default recall path is deliberately **non-semantic**
(recency + priority) so the hot path never pays embedding cold-start; passing a `query` opts into a
semantic "Most Relevant" section.

**Transport discipline.** `console.log` is monkey-patched to `console.error` at startup so a stray
library write can't corrupt the JSON-RPC stream on stdout.

**Self-cleaning memory.** `pruneStale()` is dry-run by default, 30-day default, deletes only
working and session layers — long-term is never pruned.

**Transcript mining is extraction-only, no LLM** — regex heuristics pull decisions and next-steps
out of assistant prose, and `tool_use` blocks are walked for file paths. Sessions dedupe by
`external_id` with last-write-wins, because the same session is captured repeatedly as it grows.

### The limitation you volunteer
> "**There's no chunking at all** — one memory row is one embedding of the whole content string.
> The design bets on many small human-scale memories rather than chunked documents, which works
> for what it is and would not work for document retrieval. And **no evals** — three smoke scripts,
> no recall@k, no golden set. Which is ironic given how rigorous repo-intelligence is about
> exactly that."

### Questions it uniquely answers
MCP server design · tool design at scale · local/offline embeddings · graceful degradation ·
context budgeting · memory layering and staleness · open-source distribution.

---

## AI-observability-engine

**`~/workspace/AI-observability-engine` · 8.4k LOC · Python 3.12, FastAPI, Postgres, ClickHouse,
Redis, Next.js**

> **Underrated.** This is your only real **LLMOps** artifact and it is the direct answer to "have
> you worked on AI platform/infra". Its README understates it badly — the status section lists
> only P1 while the git log shows **P1 → P6a** shipped.

### What it is
LLM application tracing: capture prompts, responses, tokens, cost and latency across chains and
agents, then explore them through an API and a role-based dashboard. It is the product category of
Langfuse/Helicone — built, not just used.

### Architecture in five lines
1. **Postgres** for config and metadata (teams, projects, API keys, users, **model pricing**),
   **ClickHouse** for trace events with a rollup materialised view, **Redis** for buffer/cache/
   sessions.
2. Ingestion API with key auth and a buffer → writer with **cost enrichment** at write time.
3. **Python SDK** — an `@observe` decorator, context managers, and provider wrappers for
   **OpenAI and Anthropic**.
4. Auth, sessions and **RBAC**, plus an admin API for teams, projects, members, keys and pricing.
5. RBAC-scoped query API with a trace tree, CSV export, and a Next.js dashboard scaffold.

### The one hard decision — two databases
Config and trace data have opposite access patterns. Config is small, relational, transactional
and mutable; traces are append-only, enormous, and queried by aggregation over time ranges.
Postgres for the first, ClickHouse for the second, with a rollup MV so dashboard queries don't
scan raw events. Cost is enriched **at ingestion** from a pricing table rather than computed at
query time, so a later price change doesn't retroactively rewrite history.

### The limitation you volunteer
> "It's built in phases and the dashboard is a scaffold — P6b/c aren't done. It's never taken
> production traffic, so I can tell you the schema and the ingestion path in detail and I can't
> tell you how it behaves at a million spans a day. And the README badly understates what's
> shipped, which is on me."

### Questions it uniquely answers
LLM observability · trace data modelling · OLTP vs OLAP split · cost attribution · RBAC · SDK
design · ingestion buffering.

---

## AgentSystem

**`~/workspace/ai-agent` · Turborepo, Fastify, BullMQ, Redis, Qdrant, Vercel AI SDK → OpenRouter**

### What it is
An autonomous developer-agent platform: give it a goal, it designs, plans, codes, reviews and
executes — learning across runs.

### Architecture in five lines
1. `apps/api` (Fastify + socket.io + bull-board) enqueues a run; `apps/worker` (BullMQ,
   concurrency 2) executes it.
2. **Orchestrator**: recall memories → Architect designs → Planner decomposes → per task, recall
   `type: 'fix'` memories → an **LLM router** picks coder / executor / architect.
3. **Coder → Reviewer**: if not approved, one retry with the reviewer's issues injected as
   `fixContext`.
4. **Executor**: a tool loop, `maxRetries = 3`, where an **Evaluator agent scores each tool result**
   and its `fix` feeds the next attempt.
5. Every outcome is written to Qdrant — successes as `code_pattern`/`fix`, failures as `error` —
   and recalled next run as a `## Relevant Past Knowledge` block.

### The one hard decision — LLM-as-judge inside the retry loop
This is the most interesting mechanism in your codebase. Rather than retrying blindly, the
Evaluator returns `{success, reasoning, fix?}` (trimming tool output to 5,000 chars to avoid
context overflow), and `fix` is appended to the context history for the next attempt. It converts a
dumb retry into a guided one.

**Structured output is the strongest of any of your projects**: `generateObject` with **seven Zod
schemas** — plan, execution decision, evaluation, code output, review (with severity levels),
architecture, routing — and **no manual JSON parsing anywhere**.

**Memory is genuinely two-tier**: Redis working memory (per-run hash, 24h TTL, pub/sub driving live
UI updates, all writes wrapped to degrade silently) and Qdrant long-term (`size: 1536`, cosine,
payload-filtered by memory type with `score_threshold: 0.7`, failure returning `[]` rather than
throwing).

### The limitations you volunteer
> "Three real ones. **The embedding failure path returns a zero vector** — a 1536-dim array of
> zeros — instead of failing, so a meaningless point gets silently written into the collection.
> It doesn't crash, which is exactly what makes it bad. **The sandbox is nominal**: file tools
> resolve against a workspace root but `path.resolve` doesn't prevent `../` escape, and
> `run_command` has no allowlist at all. And **there's no cost tracking** — it makes about four
> `gpt-4o-mini` calls per task and discards the AI SDK's usage object entirely. That's its biggest
> operational blind spot.
>
> One design nit I'd fix too: the executor builds tool descriptions as a hardcoded if-chain per
> tool name even though the tools already carry Zod schemas — duplicated, drift-prone metadata."

### Questions it uniquely answers
Agent orchestration · LLM-as-judge · cross-run vector memory · schema-constrained generation ·
queue-backed agent execution · what you'd fix.

---

## Glacier Dev

**`~/workspace/web-dev-workflow` · Next.js 16, Supabase, Gemini + OpenRouter**

### What it is
Prompt to deployed app: specialised Architect, Backend and UI agents take an idea through to a
working project with one-click GitHub → Vercel deploy.

### Architecture in five lines
1. A **fixed three-stage pipeline** — Architect → Backend Dev → UI Designer — sequential, each
   output threaded into the next as a plain string.
2. Architect returns `{projectName, stack, description, fileStructure[], databaseSchema,
   apiEndpoints[], dependencies[]}` for 6–12 files.
3. Backend returns `{files: [{path, content}]}`; UI Designer pre-filters to `.jsx/.tsx/.css/...`
   **in code** so the model only sees UI files.
4. Files upsert to Supabase; the orchestrate route streams **progress SSE events** (`{agent,
   status, message}` plus per-file lines) with `X-Accel-Buffering: no`.
5. `TASK_CHAINS` keyed `coding | reasoning | formatting | default`, each a 5–6 model ordered
   fallback list — the Architect uses `reasoning`, Backend uses `coding`, UI uses `formatting`.

### The one hard decision — two-layer JSON retry
`generateJSON` nests two retry mechanisms. The **inner** loop retries the *same* model up to three
attempts and escalates the prompt each time, appending `CRITICAL: Your previous response was NOT
valid JSON… Error was: ${error.message}` — feeding the parse error back. Exhausting it throws
`ModelUnavailableError`, and the **outer** `callWithFallback` moves to the next model in the chain.
`cleanJSONString` slices from the first `{` to the last `}` to discard conversational filler.

Also worth noting: Gemini gets real JSON mode (`responseMimeType`), OpenRouter doesn't — the
`response_format` line is commented out with "many free models don't support JSON mode reliably".

### The limitations you volunteer
> "Compared to pSEO — written by the same person — this one is the weaker design and I can say
> why. Failover decisions are **string-matching on error messages** rather than typed errors, so
> it's brittle. There's **no Zod at all**: results are `as ArchitectOutput` casts, so valid JSON
> with the wrong shape sails straight through. `streamText` exists and **nothing calls it** — the
> SSE the UI sees is progress events, not token streaming. The editor chat route **doesn't check
> auth**, unlike the orchestrate route. And it stuffs every project file into the prompt with no
> truncation and no token budget."

### Questions it uniquely answers
Multi-agent pipelines · JSON repair with error feedback · task-based model routing · SSE progress
streaming · and a genuinely good "compare two of your own designs" answer.

---

## Inbox Agent

**`~/workspace/outlook-dashboard` · pnpm monorepo, MCP, Gmail API, SQLite, React**

### What it is
A local-first mail assistant: unify multiple Gmail accounts into a "needs-reply" queue and expose
it to Claude over MCP for summarising, analysing and drafting.

### Architecture in five lines
1. Four packages — `core` / `mcp` / `server` / `web`. **No LLM anywhere in the repo** (the package
   descriptions say so outright).
2. **7 MCP tools over stdio**: `list_accounts`, `get_overview`, `needs_attention`, `list_finance`,
   `search_mail`, `get_thread`, `send_reply`.
3. Metadata in SQLite; **message bodies are never stored** — fetched live from Gmail only when
   deliberately requested.
4. Deterministic heuristics do the classification: a ~30-pattern automated-sender set, a hard block
   on India's regulated `.bank.in` space, a category noise filter, and regex finance
   classification.
5. `resolveAccounts()` fans a tool out over every connected mailbox when `account` is omitted, and
   throws with the valid list on an unknown one.

### The one hard decision — the confirm-gated send
`send_reply` without `confirm: true` calls `planReply()` and returns
`{status: 'preview', willSend: {from, to, subject, body}, note: 'Nothing was sent…'}`. The model
must make a **second explicit call** with `confirm: true` to send. **Two-phase commit for an
irreversible action, enforced server-side — the model cannot bypass it.**

`planReply` is also careful RFC plumbing the model would get wrong: it picks the latest message
*not from you*, prefixes `Re:` only if absent, and threads `In-Reply-To` and `References` from the
prior chain.

### The limitation you volunteer
> "Search is SQL `LIKE` over metadata — no embeddings, no semantic ranking. For 'find the thread
> about the invoice' that's genuinely worse than semantic search, and I'd add it. And the
> heuristics are tuned to *my* inbox — the automated-sender patterns and the `.bank.in` block are
> India-specific, which is right for me and wouldn't generalise."

### Questions it uniquely answers
**HITL approval gates** · MCP tool design · when *not* to use an LLM · privacy boundaries ·
testing (the only project of yours with a real unit-test suite — 4 vitest files).

---

## trading-agent

**`~/workspace/trading-agent` · 2k LOC Python, `openai` SDK → OpenRouter, Streamlit**

### What it is
An NSE trading assistant built as a from-scratch tool-calling agent, written deliberately
pedagogically — the docstrings explain what an agent *is*, which makes it your best
explain-the-loop artifact.

### Architecture in five lines
1. `run_conversation()` — send messages + `TOOL_SCHEMAS`; if the model returns tool calls, execute
   them, append as `role: "tool"` messages, loop; if it returns content, **that's the stopping
   condition**.
2. `max_steps = 6` — "a safety cap so a confused model can't loop forever" — returning an explicit
   "Stopped: hit the max step limit" rather than truncating silently.
3. **7 tools** dispatched from a plain dict: `get_quote`, `get_price_history`, `get_indicators`,
   `analyze_setup`, `position_size`, `backtest_strategy`, `scan_market`.
4. Memory is the mutated `messages` list held in Streamlit session state, so "yes, go ahead"
   resolves across turns.
5. Backing modules: `indicators.py` (RSI, EMA, MACD, ATR, ADX, Supertrend, Bollinger),
   `strategies.py`, `backtest.py`, `risk.py`, `scanner.py`, `universe.py` (Nifty 50).

### The one hard decision — the system prompt as a control surface
Fifty lines in four sections: timeframe routing (infer swing/intraday/positional from intent),
symbol convention, an explicit **intent → tool map** ("how does X look" → `get_indicators`; "does
this strategy work" → `backtest_strategy`) with an instruction to *chain* tools, and hard rules —
"ALWAYS back claims with data you actually fetched, never invent numbers", "a clear 'no trade,
because…' is a valid answer", "a stop-loss and position size are not optional", and a mandatory
not-financial-advice line.

**Backtesting is the eval.** The agent can be asked to validate its own recommendations against
historical win-rate and expectancy, and the prompt tells it to do so proactively. That's a
legitimate answer to "how do you know the output is any good" in a domain with no golden set.

### The limitation you volunteer
> "Tool arguments are **not validated** — it's `json.loads` then `func(**args)`, so a hallucinated
> parameter name raises a `TypeError` that propagates uncaught. The unknown-*tool* case is handled
> and returns an error to the model; bad *arguments* aren't. Also single provider, no fallback, no
> timeout, no cost tracking beyond `max_tokens=1024`, and the message history grows unbounded — no
> summarisation, no window management."

### Questions it uniquely answers
The agent loop, explained cleanly · tool schema design · prompt-level guardrails · domain eval
without labels · why you'd cap steps.

---

## LACS / X-FACE

**Live · dr.alwacs.com · Team project · `~/workspace/lacs-v2`, `lacs-infra`, `lacs-fleet`,
`lacs-sync`**

> **Be precise about attribution.** This is a team project at Wisflux/ATR and you are a core
> engineer on it, not its sole author. The existing grilling questions for the sync and WebRTC
> layers are in
> [08-project-grilling.md:30-98](../interview-qa/08-project-grilling.md) — this section is only
> the **AI parts**, which that file doesn't cover at all.

### The AI surface
A deployed disaster-response comms platform with **on-device ASR and TTS** and NLP, over
Mediasoup WebRTC, with offline-first edge↔cloud sync — running on field mini-PCs with **zero
internet dependency**.

### What makes it a strong AI answer
**The constraint drives every decision.** You cannot call a speech API when the network is the
thing that failed. So: local models, quantized, on constrained hardware, with engine selection at
deploy time.

`lacs-v2/packages/speech-recognition-server/` supports **multiple engines** — whisper.cpp and
faster-whisper — resolved at runtime. `model_resolver.py` has a `_ct2_has_model()` that scans
`FW_FINETUNED_DIR` for a CTranslate2 model directory, supporting either a single directory or
multiple selectable sub-directories. The README documents `IS_FINETUNED_MODEL`,
`FINETUNED_MODEL_FILE` and `FW_FINETUNED_DIR` with per-engine formats.

**And there is a deployed fine-tuned model.** `small_enFineTuning_En1540_ja_tohoku_ct2/` is a real
fine-tuned **Whisper-small** (244M params, fp16, multilingual, 12 decoder layers) converted to
CTranslate2 for faster-whisper. `lacs-infra` documents `WHISPER_NO_FALLBACK` existing specifically
*"to stop finetune hallucinations"* — which is evidence the fine-tune was deployed and its failure
modes debugged in production.

### 🔥 The limitation you MUST volunteer
> "I own the **serving** side of that — engine selection, the quantized CT2 export, the finetune
> slot in the resolver, and the hallucination mitigation we had to add. I can't give you the
> training methodology, the dataset composition or a WER number, because that record doesn't exist
> in a form I can defend, and CT2 conversion merges any adapter into the base weights so the
> artifact can't tell me either. I'd rather say that than guess at it."

**Never** describe this as "I fine-tuned Whisper using [method]". Full script in
[10-model-side.md](10-model-side.md).

### Questions it uniquely answers
On-device / edge inference · why you'd self-host · quantized ASR · multi-engine serving · realtime
voice constraints · deploying models to hardware you can't SSH into reliably.

---

## crypto-ai and drl-trading

**`~/workspace/crypto-ai`, `~/workspace/drl-trading` · Python, scikit-learn / Stable-Baselines3,
PyTorch**

> Your **only real ML evidence**. Not GenAI, and that's fine — an applied-ML round will probe
> exactly this, and "I've done classical ML and RL properly, and I haven't fine-tuned an LLM" is a
> much better position than pretending otherwise.

**crypto-ai** — a crypto-futures research and paper-trading system: 12 long/short strategies
through one engine, a scikit-learn **meta-label P(win) filter**, regime detection, and
**walk-forward + Monte-Carlo + out-of-sample robustness testing** with a human-in-the-loop
self-optimising agent.

**drl-trading** — a deep RL intraday agent: **PPO / A2C / SAC** via Stable-Baselines3 on a custom
**Gymnasium** environment that models real NSE costs (STT, GST, slippage, stamp duty), with a
risk-adjusted composite reward penalising drawdown, concentration and overtrading.

### The one hard decision — validation methodology
The whole value is in not fooling yourself. A random train/test split on time-series leaks the
future and makes any strategy look profitable, so: walk-forward validation, out-of-sample holdout,
and Monte-Carlo resampling to check the result isn't one lucky path. **Meta-labeling** exists for
the same reason — predicting direction is hard, predicting whether a given signal is trustworthy is
easier and it's what improves risk-adjusted return.

Modelling real costs in the RL environment is the same instinct: an agent trained without slippage
and taxes learns to overtrade, and looks brilliant in simulation.

### The limitation you volunteer
> "Paper-traded and backtested, not live-capital-validated at scale. And the reward function is
> hand-designed — I penalise drawdown, concentration and overtrading because those are the failure
> modes I saw, which is judgement, not a principled objective."

### Questions it uniquely answers
Precision/recall in practice · overfitting and leakage · time-series validation · RL fundamentals ·
reward shaping · sim-to-real gap.

---

## card-selector and Photo-AI

**`~/workspace/card-selector`, `~/workspace/Photo-AI` · PaddleOCR/OpenCV + Gemini;
face-api.js + TensorFlow.js**

**card-selector** — scan physical credit cards with a **PaddleOCR + OpenCV** CV microservice
(FastAPI), then use **Gemini** to parse offer text and recommend the optimal card for a purchase.
Next.js PWA, NestJS backend, AES-256 encryption.

**Photo-AI** — on-device CV with `@vladmandic/face-api` + `@tensorflow/tfjs-node`: SSD MobileNet
detection, 68-point landmarks, expression, age/gender, and face-recognition embeddings, weights
bundled on disk.

**Why they're worth mentioning:** they're your answer to the **document-AI / multimodal** question.
The card-selector split is the right one and worth stating — deterministic CV for extraction, a
model only for the judgement step. Photo-AI is a genuine on-device inference story, and face
embeddings are the same primitive as text embeddings applied to a different modality.

### The limitation you volunteer
> "Both are small. card-selector is OCR on a well-structured object under decent lighting — not a
> general document pipeline with scanned PDFs, multi-column layouts and tables."

---

## jarvis

**`~/workspace/jarvis` · Tauri v2 + Rust + React, Groq Whisper, OpenRouter**

Voice-first native assistant: sub-second STT, streaming LLM, barge-in interruptions.

**Cite it carefully.** 793 LOC, and `langchain`, `@langchain/core` and `@langchain/google-genai` are
declared in `package.json` and **not used**. Working: the `openai` SDK against OpenRouter and
`groq-sdk` for Whisper STT.

> If it comes up: "It's a prototype — a Tauri shell around Groq Whisper and a streaming LLM, and I
> built it to feel out the latency budget for a voice loop. There are LangChain deps in the
> manifest I never ended up using, which I should clean up."

It's also **excluded from your portfolio site** deliberately. Good instinct — but it's the honest
seed of the voice-agent story in [09-multimodal-voice.md](09-multimodal-voice.md).

---

## Cross-project comparison table

Useful when an interviewer asks you to compare your own designs — a question that rewards
self-awareness more than any single project answer.

| | LLM SDK | Fallback | Structured output | Vectors | Agent loop | Cost tracking | Tests |
|---|---|---|---|---|---|---|---|
| **repo-intelligence** | multi-provider | — | — | transformers.js local, 768d | — | — | **345 tests + eval harness** |
| **pSEO** | none (raw fetch) | **DB-driven, typed, persisted cooldown** | Zod 4 `.catch()`, fence-strip | pgvector 2048d, **no index** | — (pg-boss pipeline) | **yes, per-call → run → UI** | 15 manual scripts |
| **UACE** | **none** | — | Zod (tool inputs) | sqlite-vec 384d local | — (is the callee) | N/A ($0) | 3 smoke scripts |
| **AI-observability-engine** | wraps others | — | Pydantic | — | — | **it *is* the cost tracker** | tests per package |
| **AgentSystem** | Vercel AI SDK | **none** | **7 Zod schemas, `generateObject`** | Qdrant 1536d, filtered, 0.7 | **2 loops + LLM-as-judge** | **none** | none |
| **Glacier Dev** | Gemini SDK + fetch | string-matched | **unchecked `as` cast** | — | fixed 3-stage | none | none |
| **Inbox Agent** | **none** | — | Zod (tool inputs) | — | — (Claude runs it) | N/A | **4 vitest suites** |
| **trading-agent** | `openai` → OpenRouter | none | native tool calling, **unvalidated** | — | **classic 6-step** | none | backtest as eval |

**Three things nobody has:** prompt versioning, LLM response caching, automated LLM evals *(except
repo-intelligence)*.
**Two things only pSEO has:** real cost accounting and a data-driven fallback chain.

---

## Project → round routing

| Round | Lead with |
|---|---|
| AI screen | repo-intelligence, then pSEO |
| RAG deep-dive | repo-intelligence, UACE, pSEO dedup |
| Agents deep-dive | AgentSystem, trading-agent, Inbox Agent |
| Evals | repo-intelligence (only real answer) |
| AI platform / infra | pSEO router, AI-observability-engine |
| Safety / guardrails | Inbox Agent confirm-gate, pSEO SSRF + quality gates |
| Multimodal / voice | LACS, card-selector, jarvis |
| Applied ML | crypto-ai, drl-trading |
| "What would you do differently" | AgentSystem (three named bugs), Glacier Dev |
| "Compare two of your designs" | pSEO router vs Glacier's — same author, opposite rigour |

---

## What's NOT here

| Topic | Doc |
|---|---|
| repo-intelligence in full | [13-deepdive-repo-intelligence.md](13-deepdive-repo-intelligence.md) |
| LACS sync, WebRTC, StockSafe, GIBP, StreamVerse, SmartTrader | [interview-qa/08-project-grilling.md](../interview-qa/08-project-grilling.md) |
| The Whisper fine-tune claim boundary in full | [10-model-side.md](10-model-side.md) |
| STAR stories built from these projects | [15-positioning-stories.md](15-positioning-stories.md) |
| The concepts each project demonstrates | [03](03-rag.md), [04](04-evals.md), [05](05-agents.md) |

---

← Back to [INDEX.md](INDEX.md)
