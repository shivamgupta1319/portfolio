# 15 — Positioning & stories

> The existing kit positions you as a **full-stack engineer who also does AI**. For a Gen AI SWE
> role that ordering costs you the screen. This file fixes the framing and gives you eight STAR
> stories that don't overlap [story-bank.md](../story-bank.md)'s original eight.
>
> Per your scope decision, nothing here edits `resume-v2.md`, `linkedin-optimization.md` or
> `application-tracker.md` — the deltas are written out so you can apply them yourself.

---

## Part 1 — The honest capability audit

### Where you actually stand

| Flavour | Evidence you have | Evidence you lack | Verdict |
|---|---|---|---|
| **AI product engineering** | pSEO live in production with a multi-provider router, cost accounting and quality gates; repo-intelligence end-to-end; Resite; Glacier Dev | Prompt versioning, response caching, production A/B | **Target this first.** Strongest match, highest role volume |
| **Agentic systems** | Four agent loops; two published MCP servers; a server-enforced HITL gate; cross-run vector memory | Durable execution, real sandboxing, cost budgets, trajectory eval | **Target this too.** Strong story with named, credible gaps |
| **AI platform / infra** | The pSEO router *is* an LLM gateway; **AI-observability-engine is a built LLM-tracing product** — Postgres/ClickHouse split, ingestion with cost enrichment, a Python SDK with `@observe` plus OpenAI/Anthropic wrappers, RBAC, scoped query API, dashboard scaffold (P1–P6a shipped) | Never taken production traffic, no GPU fleet | **Stronger than it looks.** Worth applying to directly, especially at observability/gateway companies |
| **Applied ML / model-side** | Real classical ML (meta-labeling, walk-forward, Monte-Carlo); real RL (PPO/A2C/SAC, custom Gymnasium env); one shipped fine-tuned Whisper in production serving | No LLM fine-tuning, no training record for the Whisper model, no GPU serving | **Not an interview strategy.** A 6-month build, not a positioning choice |

**The recommendation, plainly:** lead with **AI product engineering + agentic systems**. That is
where your evidence is real, where the role volume is highest, and where you can be honest about
gaps without it costing you the round. Platform is a stretch you can sometimes land. Model-side
is a bet, not a plan.

### The one-line positioning

Your current LinkedIn headline leads with full-stack and trails AI. For GenAI roles, invert it:

> **AI Engineer · RAG, agents & LLM systems · Full-stack (TypeScript/Python) · Published MCP
> server · 4 yrs shipping production systems**

The full-stack signal still helps — most AI product teams want someone who can ship the product
around the model — but it should be the *second* clause, not the first.

### The three sentences that do the most work

Memorise these. They are the compressed version of everything in this kit.

1. **"I've built retrieval systems and measured them against labelled ground truth, including
   reporting a result that went against my own hypothesis."**
   *Nobody says this. It is your single strongest differentiator.*

2. **"I've published an MCP server to npm — 18 tools and 2 prompts — and the lesson was that tool
   naming and descriptions matter more than model choice."**
   *Proof you've shipped agent infrastructure to strangers, plus a real lesson.*

3. **"I've run a multi-provider LLM router in production with typed failover, persisted cooldowns
   and per-call cost accounting, because free-tier providers fail constantly."**
   *Proof of production LLM operations, not tutorial work.*

### Claim boundaries — read before every interview

| Never say | Because | Say instead |
|---|---|---|
| "I have a LoRA project" | `~/workspace/lora` is **LoRa radio** — an EBYTE E220 transceiver driver for LACS | "I've done embedded RF work — LoRa telemetry for the disaster-response system" |
| "I fine-tuned Whisper using [method]" | The artifact is real and deployed; **no training script, dataset or WER survives** | "A fine-tuned Whisper-small is deployed in our ASR serving path. I own the serving side — engine selection, quantization, the finetune slot, and the hallucination mitigation we had to add" |
| "I built an enterprise RAG platform" | `offline-enterprise-rag` is a README with zero source files | "That's a design I've written up, not built" |
| "I have a multi-agent coding platform" | Same — README only | Talk about Glacier Dev, which is real |
| "UACE is an LLM application" | It calls **no LLM at all** — zero provider SDKs | "UACE is MCP infrastructure the model consumes. That separation is the design." |
| "14+ MCP tools" | It's **18 tools + 2 prompts** | Use the real number — it's better |
| "I have evals in CI" | It's a project rule enforced by discipline | "It's a hard rule that no ranking change lands without an eval delta. Wiring it into CI is next." |
| "Production RAG at scale" | Local CLI, thousands of chunks | "Research-grade retrieval I measured rigorously" |

**One thing to fix before you cite anything:** `repo-intelligence/README.md` says *"Status:
Planning — no implementation yet."* An interviewer who opens your best project reads that first.
Five-minute fix, highest return in this kit.

---

## Part 2 — The stories

Same STAR shape as [story-bank.md](../story-bank.md). These are **Stories 9–16** — they do not
overlap the original eight. Each ends with a number or a concrete outcome, and each runs ≤ 90
seconds spoken.

---

### Story 9 — The measurement that said I was wrong
**Source: repo-intelligence eval harness** · *The best story you have. Use it in almost every loop.*

- **S:** I built a code-intelligence tool on an explicit hypothesis: that concern-level questions
  like "explain authentication" need a real code graph, because a concern is connected by edges
  rather than text similarity. I'd been tuning ranking by eye against three repositories.
- **T:** Before building further, I wanted to know whether the graph actually beat plain search —
  and I made Phase 1 a stop-or-continue gate on that question.
- **A:** I hand-labelled 11 questions across three repos with tiered relevance and explicit
  distractors, built three arms — a fair grep control, search-only, and search-plus-graph — and
  measured F1, precision, recall, core-recall, MRR and distractors returned. Critically I made the
  baseline fair: the grep control gets the same abbreviation bridging my retriever gets. I also
  found my own ablation was broken twice, in opposite directions, and fixed it.
- **R:** The finding was uncomfortable. Search and ranking beat grep by 0.127 F1; the graph added
  less on top and was marginally negative with vectors on. So the honest state is that the bet is
  no longer contradicted and **is not yet proven** — and I wrote that down in the project rather
  than spinning it.
- **Learned:** Building the measurement before the confidence is what makes the rest of the work
  real. Before the eval, one tuning change had cleaned up a Next.js app and silently dropped the
  most central auth file in a Nest app — and I'd have never known.

*Answers: "dive deep", "a time you were wrong", "data-driven decision", "disagreed with your own
plan", "highest technical bar".*

---

### Story 10 — Refusing to serve an answer
**Source: repo-intelligence citation validator**

- **S:** The tool answers questions about unfamiliar codebases with `path:line` citations. Early
  on, some citations were subtly wrong — one cited a file that existed, was in bounds, and pointed
  at the wrong place entirely, for a claim about model fields that actually lived in a schema file.
- **T:** Decide what to do about answers that look verified and aren't.
- **A:** I built a validator that re-reads every cited file **from disk** — not from the index,
  because the index records what the code said when it was built — and runs eight checks: path
  exists, range valid and in bounds, file unchanged by content hash, span under 150 lines, named
  symbol present, and the claim's code-shaped identifiers present in the span. Any failure drops
  the claim. Above 30% of claims dropped, the whole answer is refused.
- **R:** The product now fails loudly rather than confidently. An answer half of whose claims
  failed verification isn't a partial answer — it's evidence the model was guessing, so the rest
  isn't trustworthy either.
- **Learned:** For a tool people use precisely because they *can't* check the output, a fabricated
  citation is worse than no answer, because it looks verified. Refusing is a feature.

*Answers: "customer obsession", "a hard tradeoff", "quality bar", "a decision that cost you
something".*

---

### Story 11 — When the providers are the unreliable part
**Source: pSEO multi-LLM router**

- **S:** pSEO generates SEO pages at volume. I was running it on free-tier LLM providers, which
  rate-limit constantly, return 200 with an empty body, and go down without warning.
- **T:** Ship a system whose reliability doesn't depend on any provider's.
- **A:** I built a router where the **fallback chain is data, not code** — models live in a
  Postgres table ordered by priority, so reordering is a SQL update, not a deploy. Typed errors
  decide the policy: 429, 5xx, timeout, network failure, or empty output falls through to the next
  model; any other 4xx throws immediately, because retrying a bad request is pointless. A 429
  **persists a 60-second cooldown onto that model's row**, so the skip is shared across processes
  rather than living in one instance's memory. Every call records tokens and cost in cents. And
  there's a compliance dimension — paid customers are routed only to models flagged `no_train`.
- **R:** No user-visible outages from provider failures, with per-run cost visible to the user in
  the UI. Only when every eligible model fails does it raise, and then the job re-queues.
- **Learned:** Treating a third-party model as a flaky dependency rather than a service — circuit
  breaker, typed failover, cross-process cooldown — is the difference between a demo and a product.

*Answers: "resilience", "a production incident", "deliver results", "design for failure".*

---

### Story 12 — Making an irreversible action safe
**Source: Inbox Agent MCP `send_reply`**

- **S:** I built an MCP server that lets an assistant read my mail, find threads waiting on a
  reply, and draft responses. The last step — actually sending — is irreversible and
  externally visible.
- **T:** Let the model do the useful part without ever being one hallucination away from emailing
  someone.
- **A:** `send_reply` without `confirm: true` doesn't send. It returns a preview — exactly what
  would be sent, to whom — plus an explicit note that nothing was sent. Sending requires a second
  call with `confirm: true`. The gate is **server-side**, so it isn't a prompt instruction the
  model can be talked out of. I also kept message bodies out of local storage entirely — only
  metadata is stored, bodies are fetched live when deliberately requested.
- **R:** The assistant is genuinely useful for triage and drafting, and cannot send anything
  without a deliberate second action.
- **Learned:** Guardrails for agents have to live outside the model. A prompt saying "always ask
  first" is a suggestion; a two-phase commit enforced by the server is a control.

*Answers: "ownership", "security judgement", "a time you said no to convenience", "earn trust".*

---

### Story 13 — Choosing not to use a model
**Source: Inbox Agent classifiers**

- **S:** The hard part of the mail assistant was deciding which threads are from real people
  waiting on a reply, versus the 90% that's newsletters, alerts, bank notifications and no-reply
  senders.
- **T:** Classify reliably, cheaply, and without shipping my inbox to a third party.
- **A:** The obvious move was an LLM classifier. I wrote deterministic heuristics instead — a
  pattern set for automated senders (`no-reply`, `mailer-daemon`, `bounce`, `newsletter`,
  `jobalerts`, role addresses), a hard block on India's regulated `.bank.in` space, and a category
  filter — with unit tests. The reasoning and drafting, which genuinely need judgement, stay with
  the model on the other side of the MCP boundary.
- **R:** It's the only one of my AI projects with a real unit-test suite, classification costs
  nothing and is deterministic, and no message content leaves the machine for the classification
  step.
- **Learned:** Knowing where *not* to put a model is a design skill. A regex you can test beats a
  model call you can't, for anything with a crisp rule — and it leaves the model's budget for the
  part that actually needs it.

*Answers: "simplify", "cost consciousness", "invent and simplify", "a decision others disagreed
with".*

---

### Story 14 — The bug that didn't crash
**Source: AgentSystem zero-vector embedding** · *Your failure story for the GenAI loop.*

> Use this or Story 6 in the original bank, not both. This one is stronger for an AI role.

- **S:** In my agent platform, every task outcome gets embedded and written to a Qdrant collection
  so future runs can recall past fixes and patterns.
- **T:** Handle embedding failures without taking the run down.
- **A:** What I originally wrote returned a 1536-dimension **zero vector** on embedding failure.
  It doesn't throw, the run continues, and the write succeeds — so a point whose similarity to
  everything is meaningless gets silently written into the memory that future runs learn from.
  The failure is invisible: nothing errors, nothing alerts, and the memory quietly degrades.
- **R:** I caught it reviewing the memory layer rather than from a symptom, which is itself the
  lesson — there was no symptom to catch. The fix is to fail the write rather than write a
  poisoned point, and to surface embedding failure rate as a metric.
- **Learned:** In AI systems the dangerous failures are the ones that don't throw. A crash gets
  fixed in an hour; a silently poisoned vector store degrades answers for months and looks like
  "the model got worse." I now treat any `catch` that returns a plausible-looking default in a
  data path as a defect by default.

*Answers: "biggest mistake", "a bug you're not proud of", "dive deep", "how do you ensure
quality".*

---

### Story 15 — Shipping infrastructure other people's tools depend on
**Source: UACE**

- **S:** Every AI coding assistant loses all context between sessions. I was re-explaining the same
  codebase to Claude Code, Cursor and Copilot separately, every day.
- **T:** Give any assistant one shared, local-first project brain.
- **A:** I built and published an MCP server — 18 tools and 2 prompts over stdio — with layered
  memory (working, session, long-term), local CPU embeddings via transformers.js into a sqlite-vec
  virtual table, BM25 full-text as a fallback, git ingestion and file watching. The design
  decisions I'd defend: vectors are an **enhancement, never a dependency**, so the embedder returns
  null instead of throwing and search degrades to keyword; the recall path is deliberately
  non-semantic by default so it never pays embedding cold-start; and the context packet is
  budget-assembled at 6000 characters by priority, deduped, with staleness flags on anything older
  than 14 days.
- **R:** Published to npm and used across Claude Code, Cursor and Copilot — including in the
  session where I'm writing this. It calls **no LLM itself**: it's infrastructure the model
  consumes, which is the whole point.
- **Learned:** The highest-leverage engineering is often removing a recurring friction for many
  people. And concretely: tool naming and descriptions mattered more than model choice, and
  returning large blobs made assistants measurably *worse* — context is the scarce resource.

*Answers: "impact beyond your team", "open source", "initiative", "think big".*

---

### Story 16 — Why I'm moving toward AI systems
**The "why this role" reframe**

> You'll be asked why you're looking and why AI specifically. Do not badmouth your employer or
> lead with pay.

- **Say:** "I've shipped end-to-end at a small startup — a live disaster-response platform, three
  SaaS products, two published npm packages. Over the last two years the work I've chosen has
  drifted the same direction: retrieval systems, agent harnesses, MCP servers, an LLM router in
  production. The thing I want now is to do that with a team and at a scale I can't reach alone —
  real traffic, real evaluation infrastructure, and people who've operated these systems longer
  than I have."
- **If pushed on why AI rather than staying full-stack:** "Because the interesting problems moved.
  The hard part of an LLM product isn't the model call — it's retrieval quality, evaluation,
  cost and failure handling, and those are systems problems, which is what I'm good at. My
  full-stack background is why I can ship the product around it rather than just the notebook."
- **If pushed on comp:** "It matters — I want it aligned with market and impact — but the driver
  is scale and the team."

*Answers: "why are you looking", "why AI", "why us", "where do you see yourself".*

---

### Story mapping

| Prompt | Story |
|---|---|
| Biggest technical achievement | 9 or 15 |
| A time you were wrong / data changed your mind | **9** |
| Biggest mistake | **14** |
| A hard tradeoff | 10 |
| Handling a failing dependency | 11 |
| Security or safety judgement | 12 |
| Simplifying / choosing the boring solution | 13 |
| Impact beyond your team | 15 |
| Why AI / why leaving | 16 |
| Amazon LP — Dive Deep | 9, 14 |
| Amazon LP — Insist on Highest Standards | 10 |
| Amazon LP — Invent and Simplify | 13, 15 |
| Amazon LP — Earn Trust | 12 |
| Amazon LP — Are Right, A Lot | 9 (the honest version) |

---

## Part 3 — Applying it

### Resume deltas
*(For `resume-v2.md` — apply yourself; not edited per your scope choice.)*

**Add repo-intelligence as a project entry.** It is missing entirely and it is your strongest.

> **repo-intelligence** — Code-intelligence engine answering natural-language questions about
> unfamiliar repositories with verified `path:line` citations. Tree-sitter code graph (symbols,
> imports, call edges, routes, ORM models), symbol-boundary chunking, hybrid BM25 + local
> code-specialised embeddings fused with RRF, and a citation validator that re-reads sources and
> refuses answers above a 30% unverified-claim threshold. Evaluated against hand-labelled ground
> truth across 3 repositories with a fairness-controlled baseline; 345 tests.

**GenAI keywords to add** (several are already in your ATS block; these are the missing ones):
RAG · Retrieval-Augmented Generation · Hybrid Search · Reciprocal Rank Fusion · Reranking ·
Embeddings · Semantic Search · LLM Evaluation · Prompt Engineering · Structured Outputs ·
Function Calling · Tool Use · Agent Orchestration · Model Context Protocol (MCP) · LLM Gateway ·
Multi-Provider Failover · Token Cost Optimization · Guardrails · Generative AI.

**Fix the numbers:** 18 MCP tools, not 14+.

### LinkedIn deltas
*(For `linkedin-optimization.md`.)*

- **Headline:** the inverted version above — AI first, full-stack second.
- **Open-to-work titles:** add **AI Engineer, Gen AI Engineer, LLM Engineer, Applied AI Engineer,
  AI Software Engineer, ML Engineer (Applied)**. Currently the list has none of these.
- **Skills:** add **Generative AI** (LinkedIn's canonical tag — recruiters filter on it), **RAG**,
  **Vector Databases**, **Prompt Engineering**, **LangChain** *(only if you actually use it —
  otherwise leave it off)*, **PyTorch** *(you have real Stable-Baselines3/PyTorch work)*.
- **Featured:** repo-intelligence, once its README is fixed.

### Where to apply

Your existing target list in `application-tracker.md` is entirely generic product/unicorn/GCC and
contains **no AI-native companies**. Categories worth adding:

| Category | Why |
|---|---|
| **India AI-native product cos** | Sarvam AI, Krutrim, and the AI-first layer of the existing unicorns |
| **Dev-tool / AI-infra startups** | Your repo-intelligence and MCP work is directly on-thesis |
| **LLM observability & gateway cos** | Your router + AI-observability-engine map straight onto their product |
| **Voice AI** | Your WebRTC + on-device ASR/TTS combination is genuinely rare |
| **AI teams inside the companies already on your list** | Razorpay, CRED, Zerodha, Meesho, Sprinklr all have them — same referral path, better fit |

**Comp note:** GenAI-titled roles in India generally band above equivalent-level generic SDE roles.
Your existing 24–30 LPA anchor from `application-tracker.md` is a **floor** for an AI-engineer
title at 4 YOE with shipped production LLM systems, not a target. Keep current CTC face-down.

### The AI interview loop

Different from the SDE-2 loop in `application-tracker.md:74`:

| Round | What it is | Read |
|---|---|---|
| Recruiter screen | Narrative + "what have you actually shipped with LLMs" | 15, 13 |
| **Applied AI deep-dive** | RAG, agents, evals. Replaces the generic backend deep-dive | 03, 05, 04 |
| **AI system design** | LLM gateway, RAG platform, agent platform | 11 |
| **AI machine coding** | Agent loop, resilient client, retrieval — sometimes replaces LLD | 12 |
| Coding / DSA | Usually still there, sometimes lighter | interview-qa 09–10 |
| Hiring manager | Judgement, tradeoffs, what you'd do with more time | 13, 15 |
| Bar-raiser | Stories 9–16 |

### Questions to ask them

Generic questions are in `08-project-grilling.md:423`. These are AI-specific and signal seniority:

1. **"How do you evaluate model or prompt changes before they ship?"** — the single most
   diagnostic question. If the answer is "we try some prompts", you know the maturity level.
2. **"Who owns prompt quality — engineers, PM, or a dedicated role?"** — tells you whether the
   role is engineering or prompt-babysitting.
3. **"What's your per-request cost, and does anyone watch it?"**
4. **"Build or buy on the gateway/observability layer — LiteLLM and Langfuse, or in-house?"**
5. **"What happened last time a provider deprecated a model you depended on?"**
6. **"What's the split between model work and product engineering in this role?"** — catches
   roles advertised as GenAI that are actually CRUD.
7. **"What's the hardest quality problem you haven't solved yet?"**

### The 30-day sprint

Highest return, in order:

1. **Fix `repo-intelligence/README.md`.** 5 minutes. Highest ROI in this entire kit.
2. **Add repo-intelligence to the portfolio site and resume.** Half a day.
3. **Rewrite the LinkedIn headline and add the AI job titles to Open-to-Work.** 30 minutes.
4. **Build task 3 — prompt versioning in pSEO.** Half a day. Removes the most embarrassing gap.
5. **Say Stories 9, 11 and 12 out loud, timed, recorded once.** Two hours.

---

## What's NOT here

| Topic | Doc |
|---|---|
| The original 8 STAR stories | [story-bank.md](../story-bank.md) |
| Resume structure, ATS formatting rules | [resume-v2.md](../resume-v2.md) |
| LinkedIn About section, posting cadence | [linkedin-optimization.md](../linkedin-optimization.md) |
| Referral templates, negotiation, pipeline tracking | [application-tracker.md](../application-tracker.md) |
| Generic "questions to ask them" | [interview-qa/08-project-grilling.md](../interview-qa/08-project-grilling.md) |
| The project detail behind every story | [13](13-deepdive-repo-intelligence.md), [14](14-deepdive-projects.md) |

---

← Back to [INDEX.md](INDEX.md)
