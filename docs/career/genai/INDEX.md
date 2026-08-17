# Gen AI Engineer Track

> A second kit, not an appendix. The [interview-qa](../interview-qa/INDEX.md) kit prepares you
> for a **full-stack SDE-2** loop. This one prepares you for a **Gen AI Software Engineer** loop,
> which is a different interview with different failure modes.
>
> Built from your **actual source code**, not your READMEs. Every project claim in files 13–14
> traces to a `file:line` that was read before it was written.

---

## Read this first — the blunt version

You are **stronger than you think on retrieval and agents**, and **weaker than you think on the
model side**. Four things you need to internalise before you read anything else:

1. **`repo-intelligence` is your best asset and nobody can see it.** 13.8k LOC, a real labelled
   eval harness, a citation validator, an honest negative result. It is not on
   shivamgupta.live, not in your resume, not in `08-project-grilling.md`, and its own README
   says *"Status: Planning — no implementation yet."* Most candidates claiming "GenAI
   experience" have wired up a LangChain tutorial. You have measured retrieval quality with
   labelled ground truth and reported a result that went against your own hypothesis. **That is
   a senior signal and you are currently hiding it.**

2. **`~/workspace/lora` is LoRa radio, not LoRA fine-tuning.** It is an EBYTE E220-900JP
   transceiver driver for LACS — pyserial, spreading factor, packet fragmentation. If you ever
   say "I have a LoRA project" and an interviewer opens it, the round is over. Say **LoRa radio
   / embedded RF** or don't mention it.

3. **You have shipped a fine-tuned Whisper-small, but you cannot describe how it was trained.**
   The artifact is real and deployed. The training script, dataset and WER number do not exist
   anywhere in your workspace. Claim the **serving and deployment engineering**. Do not claim
   the training methodology. Exact script in [10-model-side.md](10-model-side.md).

4. **Four of your "AI projects" are empty.** `offline-enterprise-rag`,
   `multi-agent-coding-platform`, `ai-architecture-generator`, `ai-devops-engineer` — one commit
   each, README only, zero source files. They are legitimate *plans*. They are not experience.
   Full ledger in [14-deepdive-projects.md](14-deepdive-projects.md).

---

## The files

| # | File | Covers | Items |
|---|---|---|---|
| — | [00-curriculum.md](00-curriculum.md) | **Schedule only.** Self-assessment → tier ladder → build tasks → what each unlocks. No teaching content. | 12 weeks |
| 1 | [01-foundations.md](01-foundations.md) | Attention, tokenization & BPE, KV cache, sampling params, context windows, model landscape, open vs closed weights, classical-ML metrics, why models hallucinate | 26 Q |
| 2 | [02-prompting-structured-output.md](02-prompting-structured-output.md) | Prompt craft, output contracts (JSON mode vs strict schema vs repair), function-calling depth, prompt caching + cost math, context budgeting, prompt versioning | 24 Q |
| 3 | [03-rag.md](03-rag.md) | Ingestion, chunking strategies, embedding selection, re-embedding migrations, hybrid + RRF, query rewriting/HyDE, reranking, graph RAG, citations, permission-aware and multi-tenant RAG | 34 Q |
| 4 | [04-evals.md](04-evals.md) | Retrieval vs generation metrics, LLM-as-judge bias, golden sets, evals in CI, online eval, agent trajectory eval, reporting a negative result | 22 Q |
| 5 | [05-agents.md](05-agents.md) | Patterns, framework map, durable execution, HITL gates, budgets & loop-breakers, sandboxing, tracing, MCP in production | 30 Q |
| 6 | [06-streaming-api-mechanics.md](06-streaming-api-mechanics.md) | TTFT, SSE vs WebSocket, partial JSON, streaming tool calls, cancellation propagation, proxy buffering, resumability | 18 Q |
| 7 | [07-safety-guardrails.md](07-safety-guardrails.md) | Direct & indirect injection, exfiltration, moderation, PII, DPDP/GDPR, cost-DoS, tool risk tiers, red-teaming | 20 Q |
| 8 | [08-llmops.md](08-llmops.md) | Tracing, cost attribution, the gateway pattern, phase-specific timeouts, TPM limiting, model migration, quality-drop triage | 18 Q |
| 9 | [09-multimodal-voice.md](09-multimodal-voice.md) | **Your moat.** Vision, document AI, STT/TTS, realtime voice latency budget, barge-in, WebRTC audio transport | 18 Q |
| 10 | [10-model-side.md](10-model-side.md) | Fine-tuning decision ladder, LoRA/QLoRA, DPO, distillation, quantization, vLLM, KV-cache & VRAM math, self-host break-even, your classical ML & RL work, the Whisper story | 26 Q |
| 11 | [11-ai-system-design.md](11-ai-system-design.md) | 8 AI HLD problems with full write-ups | 8 designs |
| 12 | [12-ai-machine-coding.md](12-ai-machine-coding.md) | 8 AI LLD drills with worked, executed solutions | 8 drills |
| 13 | [13-deepdive-repo-intelligence.md](13-deepdive-repo-intelligence.md) | **The flagship.** Full mechanism walkthrough + 30 grilling questions | 30 Q |
| 14 | [14-deepdive-projects.md](14-deepdive-projects.md) | The other ~11 AI projects + the portfolio ledger | ~45 Q |
| 15 | [15-positioning-stories.md](15-positioning-stories.md) | Capability audit, 8 GenAI STAR stories, AI round types, target companies, questions to ask them | 8 stories |

---

## How to use this

Each content file has the same shape:

```
Part 1 — What you actually need to know   ← you READ this
Part 2 — Drill                            ← you NEVER read this first
Rapid-fire                                ← one-liners, night before
🔗 Anchors                                ← concept → your project → the sentence to say
Gaps — what you cannot claim yet          ← the honest script
What's NOT here                           ← cross-references
```

**Part 1 you read. Part 2 you cover and answer out loud, then compare.** Reading an answer
produces recognition; speaking produces recall, and recall is what the interview tests. Mark
every question ✅ / ⚠️ / ❌ and only ever re-drill ⚠️ and ❌.

Format cues carry over from the existing kit: `🔥` = genuinely hard or commonly fumbled ·
`↳ **If pushed:**` = the follow-up that is actually coming · `🔗 *Yours:*` = a real project of
yours that proves the concept.

Two conventions are new here:

- **🔗 Anchors table** — every file ends with a grid of *concept → your project → the exact
  sentence to say*. These are the highest-value lines in the kit. Anyone can define reranking;
  you can say what your eval showed when you tried it.
- **Gaps section** — per file, blunt, with the honest script. A named gap costs almost nothing.
  A bluff caught costs the round.

---

## Which flavour are you interviewing for?

You said all four. They are not the same interview. Read in this order for each:

| Flavour | Read order | Your position today |
|---|---|---|
| **AI product engineering** | 02 → 03 → 06 → 04 → 07 | **Strongest.** pSEO, Resite and repo-intelligence are all this. Lead here. |
| **Agentic systems** | 05 → 02 → 04 → 07 → 12 | **Strong, with production gaps.** You have built four agent loops. You have never shipped HITL gates, sandboxing or durable checkpointing. |
| **AI platform / infra** | 08 → 10 → 11 → 06 → 07 | **Better than you think.** The pSEO router *is* an LLM gateway, and AI-observability-engine is a built LLM-tracing product — Postgres/ClickHouse split, ingestion with cost enrichment, an SDK with OpenAI + Anthropic wrappers, RBAC, query API. Never run at scale, and that's the only real gap. |
| **Applied ML / model-side** | 01 → 10 → 04 | **Weakest.** Real classical ML and RL work, one shipped fine-tuned model you can't fully describe, zero LLM fine-tuning. This is a 6-month bet, not an interview strategy. |

**Recommendation: target AI product engineering and agentic systems first.** They match your
evidence, they are the highest-volume roles, and they get you an offer while the model-side gap
closes on its own schedule.

---

## Round-by-round map

| Round | Read | Notes |
|---|---|---|
| **Recruiter / AI screen** | 15, 13 | Narrative, not internals. The repo-intelligence pitch is the differentiator — lead with the eval harness. |
| **AI deep-dive / applied AI** | 03, 05, 04 | The three that decide most GenAI loops. Expect RAG failure diagnosis and "how do you know it got better". |
| **AI system design** | 11, 08, 03 | Structure from [system-design-prep.md](../system-design-prep.md) §A; the AI-specific content is in 11. |
| **AI machine coding** | 12 | 90-min format, same as [system-design-prep.md](../system-design-prep.md) §B. Agent loop and resilient client come up most. |
| **Agent / tool-use round** | 05, 13, 14 | They will ask what happens when the agent does the wrong thing. Have the HITL answer ready. |
| **Model / applied-ML round** | 01, 10 | Answer-depth only, by design. Know where your honest boundary is and say it cleanly. |
| **Safety / trust round** | 07 | Rare, but it is where a bluff is most visible. Indirect injection via the corpus is the flagship question. |
| **Behavioural / bar-raiser** | 15 | Stories 9–16. The existing 8 are in [story-bank.md](../story-bank.md); these do not overlap them. |
| **Coding / DSA** | — | Unchanged. [09](../interview-qa/09-coding-arrays-strings.md), [10](../interview-qa/10-coding-structures-dp.md). |

---

## Honest capability ledger

The exact wording matters. Column 2 is what you can say **today** without risk.

| Capability | Claim today | After the curriculum | Never claim |
|---|---|---|---|
| RAG systems | "Built retrieval over code with hybrid BM25 + embeddings and RRF fusion, measured against a labelled set" | + permission-aware, + reranked | — |
| Chunking | "Symbol-boundary chunking for code; I can explain why fixed windows fail there" | + parent-document, contextual retrieval | — |
| Evals | "I gate ranking changes on an eval delta and I have reported a negative result" | + LLM-as-judge with calibration | — |
| Agent loops | "Built four, including one from scratch with native tool calling" | + durable execution, HITL gates | — |
| MCP | "Published an MCP server to npm — 18 tools, 2 prompts, stdio" | + remote/OAuth MCP | — |
| Multi-provider routing | "DB-driven ordered fallback chain with persisted cooldown and per-call cost accounting" | + semantic caching | — |
| Vector DBs | "pgvector, sqlite-vec and Qdrant in production code" | + index tuning at scale | "I have run ANN at 100M vectors" |
| Cost/latency | "Per-call cost accounting to the run and the UI" | + per-tenant attribution, TTFT SLOs | — |
| Prompt engineering | "Structured system prompts with explicit tool-routing rules" | + versioned prompts with eval gates | "I version and A/B my prompts" — **you don't, anywhere** |
| Agent frameworks | "Vercel AI SDK, and loops written from scratch — I've built what these abstract" | "LangGraph — checkpointers and interrupts" *(after build task 6b)* | "I've used LangChain" — **not until you have.** Delete the unused deps in `jarvis/package.json` |
| Speech / ASR | "Shipped on-device ASR/TTS in a deployed offline-first system, and a fine-tuned Whisper-small in production serving" | + WER numbers | "I fine-tuned Whisper using method X" |
| Classical ML | "Meta-labeling with walk-forward and Monte-Carlo validation; PPO/A2C/SAC on a custom Gymnasium env" | — | — |
| LLM fine-tuning | *(nothing)* | "I fine-tuned and evaluated a small model with LoRA" | Anything, until you do it |
| GPU serving | *(nothing)* | "I served a quantized model with vLLM and measured throughput" | Anything, until you do it |
| Guardrails | "SSRF guard, content quality gates, confirm-gated irreversible actions" | + moderation, PII redaction | — |

---

## Concept ownership — where each topic lives

Sixteen files all touch "chunking" and "cost". Each concept has exactly **one** owning file;
everything else cross-references it. If you are adding to this track, respect this table.

| Concept | Owner | Everyone else |
|---|---|---|
| Tokenization, sampling, context windows | `01` | links |
| Prompt caching + cost math | `02` | `08` links for the ops view |
| Function/tool-call schema mechanics | `02` | `05` covers tool *design*, not schemas |
| Chunking (all strategies) | `03` | `13` shows the symbol-boundary instance |
| Embedding model selection, re-embedding | `03` | — |
| Reranking, hybrid, RRF | `03` | `05-databases.md:421` has the DB-layer version |
| Retrieval & generation metrics | `04` | `13` shows the real numbers |
| LLM-as-judge | `04` | `05` links for evaluator-agents |
| Agent patterns & frameworks | `05` | — |
| Durable execution, HITL, sandboxing | `05` | `11` designs a platform around them |
| Streaming, SSE, cancellation | `06` | `08` owns latency SLOs |
| Injection, exfiltration, PII, DPDP | `07` | `05` links for tool risk tiers |
| Per-tenant cost attribution, gateway | `08` | `02` owns the per-call token math |
| Multi-tenancy for vectors | `03` | `07-specialities.md:349` owns relational tenancy |
| Voice, barge-in, STT/TTS | `09` | `10` owns the Whisper fine-tune claim |
| Fine-tuning, quantization, serving | `10` | — |
| Project mechanism & `file:line` | `13`, `14` | every file's Anchors table links here |
| Stories, positioning, target companies | `15` | — |

---

## Volatile facts

Model names, prices, MTEB rankings and framework APIs rot in about three months. Every file
quarantines them into a single table marked **`as of <date>`**. When one goes stale, you refresh
that table — you do not rewrite the file.

Numbers about **your own projects** are tagged `[verify]` when they could drift. Never say a
`[verify]` number in an interview without checking it that week. The kit's existing rule stands:
*never claim a number you can't defend.*

---

## Weak-spot tracker

| File | Pass 1 (✅/⚠️/❌) | Pass 2 | Still weak |
|---|---|---|---|
| 01 — Foundations | | | |
| 02 — Prompting & structured output | | | |
| 03 — RAG | | | |
| 04 — Evals | | | |
| 05 — Agents | | | |
| 06 — Streaming & API mechanics | | | |
| 07 — Safety & guardrails | | | |
| 08 — LLMOps | | | |
| 09 — Multimodal & voice | | | |
| 10 — Model side | | | |
| 11 — AI system design | | | |
| 12 — AI machine coding | | | |
| 13 — repo-intelligence | | | |
| 14 — Projects | | | |

---

## What's NOT here

| Topic | Doc |
|---|---|
| LLM orchestration & agent/MCP **overview** (the 10-minute version) | [interview-qa/07-specialities.md](../interview-qa/07-specialities.md) |
| pgvector operators, HNSW vs IVFFlat, DB-layer hybrid search | [interview-qa/05-databases.md](../interview-qa/05-databases.md) §vector |
| asyncio, Pydantic v2, FastAPI DI | [interview-qa/04-python-fastapi.md](../interview-qa/04-python-fastapi.md) |
| WebRTC signalling, SFU, simulcast | [interview-qa/07-specialities.md](../interview-qa/07-specialities.md) |
| Generic HLD framework & OOP machine-coding drills | [system-design-prep.md](../system-design-prep.md) |
| Non-AI project grilling (LACS sync, StockSafe, GIBP, StreamVerse) | [interview-qa/08-project-grilling.md](../interview-qa/08-project-grilling.md) |
| The original 8 STAR stories | [story-bank.md](../story-bank.md) |
| DSA schedule | [dsa-6-month-plan.md](../dsa-6-month-plan.md) |

---

← Back to the [Career Acceleration Kit](../README.md)
