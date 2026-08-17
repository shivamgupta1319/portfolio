# 11 — AI system design

> Use the same structure as any HLD round —
> [system-design-prep.md](../system-design-prep.md) §A: requirements → estimation → API → data
> model → diagram → deep dive → bottlenecks. This file supplies the **AI-specific content** that
> framework doesn't have.
>
> **Two of these eight are systems you have actually built.** Lead with those.

---

## Part 1 — What makes an AI design round different

A normal HLD round scores you on scale, consistency and failure handling. An AI design round adds
**five axes**, and candidates who only do the normal five sound junior.

| Axis | The question behind it | What a weak answer sounds like |
|---|---|---|
| **Token economics** | What does one request cost, and what's the unit economic? | Never mentions cost |
| **Eval strategy** | How do you know a change made it better? | "We'd test it" |
| **Nondeterminism** | Same input, different output — how does the system cope? | Treats the model as a pure function |
| **Safety** | Injection, data leakage, abuse, irreversible actions | Only thinks about authn/authz |
| **Model-change risk** | The provider deprecates your model in 60 days | No plan |

**Say all five in your requirements phase**, before you draw anything. That alone separates you.

### The extra estimation you must do

Alongside QPS and storage:

```
tokens/request  = prompt + retrieved context + output
cost/request    = in_tokens × in_price + out_tokens × out_price     (out is 3–5× in)
monthly cost    = cost/request × requests/month
TTFT budget     = prefill(prompt_len) + network + queue
vectors         = docs × chunks/doc      →  storage = vectors × dims × 4 bytes
```

Do this out loud with round numbers. It is the single most differentiating 60 seconds in the round.

### The extra components in almost every AI architecture

```
client → gateway (auth, rate limit, budget) → LLM gateway (routing, failover, cache, cost)
                                            → retrieval (vector + lexical + rerank)
                                            → guardrails (in/out)
                                            → tracing / eval sink
```

### Rollout is part of the design

Every answer should end with: pin model versions, shadow or canary the change, gate on an eval
delta, and be able to roll back prompts, models and indexes **independently**.

---

## Part 2 — The eight designs

Each: clarify → estimate → API → data model → architecture → the two deep dives they'll pick →
failure modes → eval & rollout → your anchor.

---

### 1. LLM gateway / model router 🔗 **you built this**

> *"Design a service that sits between all our applications and every LLM provider."*

**Clarify:** how many providers and models; are we routing for cost, quality or availability;
multi-tenant with per-tenant budgets; do we need streaming; are there data-residency or
no-training constraints; who owns the model catalogue.

**Estimate:** requests/sec, average tokens in/out, cost/request, monthly spend, and the p95 TTFT
budget the callers need.

**API:** `POST /v1/chat/completions` (OpenAI-compatible, so callers need no SDK change) with
headers or body carrying tenant, feature and priority. Plus `/models`, `/usage`, `/budgets`.

**Data model:** `model_registry(id, provider, model_id, priority, cost_per_1k_in,
cost_per_1k_out, data_handling, cooldown_until, enabled)` · `usage_events(request_id, tenant,
feature, model, tokens_in, tokens_out, cost_cents, latency_ms, cached, ts)` ·
`budgets(tenant, period, limit_cents, spent_cents)`.

**Architecture:** app → gateway (authn, per-tenant rate limit + **token budget**) → **semantic /
exact cache** → **router** (ordered chain filtered by capability + compliance) → provider adapter
→ streaming passthrough → usage event to an async sink.

**Deep dive A — routing and failover.** The chain is **data, not code**, so reordering is a config
change rather than a deploy. Typed error classification decides policy: `429 / 5xx / timeout /
network / empty output` fall through to the next model; other 4xx throw immediately because
retrying a malformed request is pointless. A 429 writes a **persisted cooldown** onto the model
row so the skip is shared across every gateway instance, not held in one process's memory. Per-
provider circuit breakers. Degradation ladder: preferred model → equivalent model → smaller model
→ cached/stale response → explicit failure.

**Deep dive B — cost and budgets.** Meter at the gateway, because it's the only place that sees
everything. Attribute by tenant × feature × model. Enforce budgets **pre-flight** with an estimated
token count and **reconcile post-flight** with actual usage. Cached tokens are billed differently
and must be counted separately or your unit economics lie.

**Failure modes:** the gateway becomes a SPOF (make it stateless and horizontally scaled, with the
registry cached and a stale-read fallback); streaming makes retries hard once bytes are sent;
semantic cache serving a wrong-but-similar answer; a mis-set cooldown taking your best model out.

**Eval & rollout:** shadow traffic to a candidate model, gate the swap on an eval delta, canary by
tenant.

> 🔗 **Your anchor:** pSEO's `model-router.ts` — DB-ordered chain, typed `HttpError` and
> `EmptyOutputError`, persisted 60s cooldown, `no_train` compliance routing, per-call cost in
> cents. "I've built about 80% of this in production. What I'd add for a shared gateway is the
> OpenAI-compatible surface, semantic caching, and per-tenant budgets rather than per-account page
> quotas."

---

### 2. Enterprise RAG with permissions

> *"Design search-and-answer over a company's Google Drive and Confluence — 10M documents,
> 50k employees."*

**Clarify:** how fresh must results be; how do permissions work (per-doc ACLs, groups, inherited
folder perms); is answer latency or accuracy the priority; multilingual; audit requirements.

**Estimate:** 10M docs × ~10 chunks = **100M vectors**; at 768 dims × 4 bytes ≈ **300 GB** raw,
more with the index. Ingestion throughput for the initial crawl vs the steady-state delta.

**API:** `POST /search`, `POST /ask` (streaming), `POST /feedback`.

**Data model:** `documents(id, source, external_id, url, updated_at, content_hash, acl_ids[])` ·
`chunks(id, doc_id, ord, text, embedding, embedding_model_version, acl_ids[], updated_at)` ·
`acl_cache(principal, allowed_acl_ids[])`.

**Architecture:** connectors (Drive/Confluence change feeds) → parse/normalise → chunk → embed →
vector store + lexical index; query path → rewrite → **ACL-filtered hybrid retrieval** → RRF →
rerank → generate with citations.

**🔥 Deep dive A — permissions.** The trap: filtering **after** retrieval collapses recall. A user
with access to 5% of the corpus retrieves the ten globally-best chunks and keeps zero. So ACLs
must be **pre-filter**, indexed as queryable metadata on the chunk, applied inside the ANN search.
ACLs cannot be baked into the embedding, because sharing changes and revocation must take effect
immediately — so the ACL field is refreshed from the source of truth, and a permission-change event
updates chunk metadata without re-embedding. Fallback where the store can't filter efficiently:
over-fetch k×N then filter, with **late binding** — if too few survive, re-query with a larger
budget. And the subtle leak: anything *derived* from documents the user can't see — cached
summaries, "related documents", even the existence of a match — leaks too.

**Deep dive B — ingestion at scale.** Incremental via change feeds, keyed on content hash so
unchanged documents are skipped. Idempotent upserts so a retried job doesn't duplicate. Delete
propagates to the vector index (and remember most ANN indexes tombstone until rebuilt). Parsing is
the real work: scanned vs text-layer PDFs, tables, multi-column layouts.

**Failure modes:** stale ACL cache leaking a document (fail closed); an embedding-model upgrade
requiring a 100M-vector backfill (dual-write, shadow index, eval-gated cutover); noisy-neighbour
tenants; injection through the corpus itself.

**Eval:** golden set stratified by department and question type, recall@k and faithfulness, plus a
**permission-leak test suite** that asserts a low-privilege user never sees restricted content.

---

### 3. Agent platform

> *"Design a platform where teams deploy agents that use tools and take real actions."*

**Clarify:** who writes the agents and the tools; do agents run untrusted code; what actions are
irreversible; expected run duration; multi-tenant isolation requirements.

**Estimate:** concurrent runs, steps per run, model calls per step, cost per run — and be explicit
that **cost per run is the metric that decides the architecture**.

**API:** `POST /runs` → `{run_id}` · `GET /runs/{id}` (SSE for live steps) · `POST
/runs/{id}/approve` · `POST /runs/{id}/cancel` · tool registry CRUD.

**Data model:** `runs(id, tenant, agent_id, status, step_count, tokens, cost_cents,
checkpoint_json, created_at)` · `steps(run_id, ord, type, tool, input, output, tokens, cost,
latency, ts)` · `tools(id, schema, risk_tier, scopes)` · `approvals(run_id, step_ord, requested_at,
decided_by, decision)`.

**Architecture:** API → queue → worker pool; worker runs the loop, checkpointing state after each
step; tool calls dispatch into a **sandbox**; irreversible tools park the run in `awaiting_approval`;
every step emits a span.

**Deep dive A — durable execution.** State is serialised per step — message history, step index,
accumulated results — into `checkpoint_json`, so a crashed worker resumes rather than restarts.
Side-effecting tools take an **idempotency key** of `run_id + step_ord`, so a resumed step that
already executed is a no-op at the far end. No `Date.now()`/`Math.random()` in the orchestration
path if you ever want deterministic replay. This is also what makes HITL possible: a run waiting
hours for a human cannot hold a process open.

**Deep dive B — sandboxing and blast radius.** Container or microVM per run; non-root, read-only
root fs, scoped writable workspace, dropped capabilities, CPU/mem/time limits, ephemeral and
destroyed after. **Deny-by-default network egress** — an agent that can make outbound requests can
exfiltrate whatever it read. No ambient credentials; secrets brokered outside the sandbox and
scoped per tool. Risk-tier the tools: read-only ungated, reversible writes logged, irreversible
actions gated server-side.

**Failure modes:** runaway loops (step + wall-clock + **token budget**, loop detection,
no-progress detection); a poisoned long-term memory silently degrading every future run; approval
requests nobody answers (timeout policy); one tenant's runs starving the pool.

**Eval:** trajectory eval — task success, tool-selection accuracy, steps vs minimum, cost per task,
recovery after tool failure.

> 🔗 **Your anchor:** AgentSystem for the orchestration, memory and evaluator loop; Inbox Agent's
> `send_reply` for the approval gate. Be honest that yours has job retry rather than durable
> resume, and a nominal sandbox.

---

### 4. Semantic search at 100M vectors

> *"Design semantic search over 100M documents with p95 under 200 ms."*

**Clarify:** recall target; filtered or unfiltered; write rate; is the corpus append-mostly or
frequently updated; single or multi-tenant.

**Estimate:** 100M × 768 dims × 4 bytes = **~300 GB** of raw vectors, plus HNSW graph overhead
(often +50–100%). That does not fit one machine's RAM cheaply, which is the whole design driver.

**Architecture:** shard by document space or hash; each shard holds an ANN index; a scatter-gather
query layer fans out and merges; a separate lexical index for hybrid; rerank the merged top-k.

**Deep dive A — the index.** HNSW gives high recall and fast queries at high memory cost and slow
builds; IVFFlat is cheaper to build and lighter but needs tuning (`probes`) and is weaker on
recall. Levers: **quantization** — scalar or product quantization, or Matryoshka truncation, to
search at 256 dims and rerank survivors at full dimension. Recall is a **tunable** (`ef_search`,
`probes`), so state the recall/latency curve rather than a single number.

**Deep dive B — updates and rebuilds.** Graph-based indexes handle deletes by tombstoning, so
deleted vectors keep consuming memory and degrading recall until a rebuild. Design a rebuild
strategy: build a new shard index offline, swap atomically, keep the old until verified. An
embedding-model change is the same operation at 100× the cost.

**Failure modes:** filtered queries falling off the ANN path into a scan; a hot shard; recall
silently degrading as deletes accumulate; the p95 being dominated by the slowest shard in a fan-out.

**Eval:** recall@k against an exact-search ground truth on a sample, plus latency percentiles per
shard.

---

### 5. Eval & experimentation platform 🔗 **you built a version of this**

> *"Design the system that tells us whether a prompt or model change made things better."*

**Clarify:** what's being evaluated (retrieval, generation, agents); who writes the labels; must it
gate CI; offline only or online too; budget per run.

**Estimate:** dataset size × cost per example (including judge calls) × runs per day.

**API:** `POST /datasets`, `POST /experiments` (config: prompt version, model, retrieval params),
`GET /experiments/{id}/results`, `POST /compare?a=&b=`.

**Data model:** `datasets` · `cases(dataset_id, input, expected, labels_json, strata)` ·
`experiments(id, config_hash, prompt_version, model, index_version, created_at)` ·
`results(experiment_id, case_id, output, metrics_json, cost, latency)`.

**Architecture:** trigger (CI/manual/schedule) → runner fans out cases → scorer chain
(deterministic → heuristic → LLM judge) → results store → comparison UI + a CI status check.

**Deep dive A — the scoring ladder and judge reliability.** Cheapest checks first: schema validity,
citation resolution, required fields, length. Then heuristics. Then LLM-as-judge with a written
rubric — and control its biases: swap order to cancel position bias, don't reward length, use a
different model than the one under test, and **calibrate against human labels** on a sample.

**Deep dive B — CI gating without flakiness.** Gate on **delta vs main**, not an absolute
threshold, so a growing dataset doesn't break the build. Pin model versions. Handle nondeterminism
with a tolerance band or N-run distributions. Tier the runs: deterministic checks on every PR, full
eval on merge, judge-based eval only when prompts or retrieval changed. And report **strata
separately** — a mean that improves while one stratum regresses is the failure you're trying to
catch.

**Failure modes:** dataset drift from production; overfitting to the eval set (watch for sharp
hyperparameter peaks); judge cost exceeding the value; a green mean hiding a regressed stratum.

> 🔗 **Your anchor:** repo-intelligence's harness — labelled cases with tiered relevance and
> distractors, three arms with a fairness-controlled baseline, F1/MRR/coreRecall, strata splits,
> and the rule that no ranking change lands without a delta. "I've built the runner and the metric
> layer. What I haven't built is the CI integration and the comparison UI."

---

### 6. Realtime voice agent 🔗 **your moat**

> *"Design a phone agent that handles customer calls."*

**Clarify:** target latency; barge-in required; languages; does it take actions or only answer;
call volume and concurrency; compliance recording.

**Estimate — the latency budget is the design.** Target **< 800 ms** perceived response:

| Stage | Budget |
|---|---|
| Network + jitter buffer | 50–100 ms |
| VAD + endpointing | 100–300 ms ← usually the biggest and most tunable |
| STT (streaming) | 50–150 ms after endpoint |
| LLM TTFT | 200–400 ms |
| TTS first audio | 100–200 ms |

The insight: **everything must stream and overlap.** STT streams partials, the LLM starts on the
partial transcript, TTS starts on the first sentence rather than the full response.

**Architecture:** telephony/WebRTC → media server → VAD → streaming STT → LLM (with tools) →
streaming TTS → back out. Cascade, versus a single speech-to-speech model.

**Deep dive A — barge-in.** When the user starts speaking while the agent is talking, you must
cancel **three things**: TTS playback, the in-flight TTS synthesis, and the in-flight LLM
generation — and truncate the conversation history to what the user actually *heard*, not what was
generated, or the agent references something it never said. Requires echo cancellation so the
agent doesn't detect its own audio as barge-in.

**Deep dive B — cascade vs speech-to-speech.** Cascade (STT→LLM→TTS) gives you a text transcript
for logging, tool calls, evals and compliance, plus independent component choice — at the cost of
accumulated latency. Speech-to-speech is lower latency and more natural prosody, with weaker tool
support, harder logging, and less control. Most production systems still choose cascade for the
observability.

**Failure modes:** tool calls creating dead air (emit filler speech); endpointing cutting off a
thinking user; accents and code-switching degrading STT; the model producing text that reads fine
and speaks badly.

> 🔗 **Your anchor:** LACS ships on-device ASR and TTS over Mediasoup WebRTC with zero internet
> dependency; jarvis is the barge-in prototype. **Very few GenAI candidates have both the WebRTC
> depth and shipped speech.** Volunteer it.

---

### 7. Document ingestion pipeline

> *"Design a system that turns uploaded documents into something answerable."*

**Clarify:** document types and volume; scanned or digital; tables and forms; how fresh; per-page
citation required; PII.

**Architecture:** upload → virus scan → type detect → **route by type** (text-layer extract vs
OCR vs VLM) → layout parse → chunk → enrich → embed → index; with a per-document status machine
and a dead-letter queue.

**Deep dive A — parsing strategy.** Route rather than using one parser: digital PDFs get text
extraction (cheap, exact); scanned pages get OCR; complex layouts and tables get a vision model
(expensive, better). Tables are the hard case — linearising destroys the row/column relationship,
so either preserve structure or render markdown and accept the loss. Keep page and bounding-box
coordinates so citations can point at a location in the original.

**Deep dive B — the pipeline as a workflow.** Long-running and partially failing, so: per-document
state, per-stage retries with backoff, idempotent stages keyed on content hash, DLQ for
unparseable documents with a human path, and backpressure so a bulk upload doesn't starve
interactive traffic.

**Failure modes:** a 500-page PDF blocking the queue (chunk the work per page); OCR quality
degrading silently; duplicate uploads; PII flowing to a third-party model without redaction.

> 🔗 **Your anchor:** card-selector's PaddleOCR/OpenCV microservice with Gemini only for the
> judgement step — deterministic extraction, model for interpretation.

---

### 8. AI coding assistant 🔗 **your gift question**

> *"Design a tool that answers questions about a large codebase."*

**Clarify:** repo size and languages; is the index per-user or shared; how fresh after a commit;
does it edit code or only answer; must answers be verifiable.

**Estimate:** files × symbols × chunks; embedding cost for the initial index vs the per-commit
delta; query latency budget.

**Architecture:** clone/watch → parse (AST) → **symbol graph** → chunk on symbol boundaries →
index (vector + lexical) → retrieve (seed → expand → rank) → generate with citations → **validate
citations** → render diagrams from resolved edges.

**Deep dive A — chunking and retrieval for code.** Fixed windows are wrong: they split functions
and destroy the symbol→chunk mapping that graph traversal needs. Chunk on symbols; embed with the
path and signature prefixed, because a function body often contains none of the words a natural-
language question uses. Retrieve hybrid — BM25 finds the identifier, embeddings find the concept —
fused by RRF because their scores share no scale.

**Deep dive B — trust.** Every claim carries a `path:line`; the validator re-reads the file from
disk (not the index, which records what the code said at build time), checks the path exists, the
range is in bounds, the file is unchanged by content hash, the span is narrow enough to check, and
the claim's code identifiers actually appear there. Drop failing claims; refuse the whole answer
above a threshold, because an answer half of whose claims failed is evidence the model was
guessing.

**Failure modes:** index staleness after a commit (content-hash-keyed incremental re-index);
monorepo scale (shard by package, ANN index, move the store off JSON); multi-language coverage;
false-refusal from an over-strict validator.

**Eval:** hand-labelled questions with tiered relevance and distractors, a **fair** grep baseline,
F1/MRR/coreRecall, strata by repository.

> 🔗 **Your anchor:** this is repo-intelligence, end to end. You can answer this question from
> memory including the tuning constants and the ablation result. **Ask for this one if you get a
> choice.**

---

## Rapid-fire — design vocabulary

| Term | One-liner |
|---|---|
| LLM gateway | Single egress: routing, failover, cache, budgets, metering |
| Degradation ladder | Preferred → equivalent → smaller → cached → explicit failure |
| Persisted cooldown | Rate-limit backoff stored so all instances share it |
| Pre-flight budget check | Estimate tokens and refuse before spending |
| Post-flight reconcile | Correct the estimate with actual usage |
| ACL pre-filter | Permissions applied inside the search, not after |
| Recall collapse | Post-filtering deletes everything retrieval found |
| Late binding | Re-query with a bigger budget when the filter empties results |
| Tombstone | ANN delete that persists until rebuild |
| Shadow index | New index built alongside the old for a safe cutover |
| Durable execution | Per-step checkpoint so a crash resumes |
| Idempotency key | `run_id + step_ord` — stops a resumed step double-firing |
| Risk tier | Read / reversible / irreversible → determines the gate |
| Egress deny-by-default | The control that stops agent exfiltration |
| Trajectory eval | Scoring an agent's steps, not just its answer |
| Delta gating | CI gates on change-vs-main, not an absolute score |
| Strata split | Per-segment results, so a good mean can't hide a regression |
| Endpointing | Deciding the user has stopped speaking |
| Barge-in | User interrupts — cancel TTS, synthesis, and generation |
| Cascade vs S2S | STT→LLM→TTS vs one speech model |
| Scatter-gather | Fan a query across shards and merge |
| Product quantization | Compress vectors to fit the index in memory |

---

## The five sentences that lift any AI design answer

1. *"Before I design, let me state the cost per request — because it determines the model tier and
   therefore most of this architecture."*
2. *"I'd put every provider call behind one gateway, because it's the only place that can meter,
   route, cache and enforce budgets."*
3. *"Filtering permissions after retrieval collapses recall, so the ACL has to be a pre-filter."*
4. *"Nothing ships without an eval delta, and I'd gate on the delta rather than an absolute
   threshold so a growing dataset doesn't break the build."*
5. *"Prompts, models and indexes are three independently versioned deploy artifacts — each
   canaried and rolled back on its own."*

---

## What's NOT here

| Topic | Doc |
|---|---|
| The HLD framework itself | [system-design-prep.md](../system-design-prep.md) §A |
| Classic non-AI designs (URL shortener, chat, feed) | [system-design-prep.md](../system-design-prep.md) |
| Implementing these components under a timer | [12-ai-machine-coding.md](12-ai-machine-coding.md) |
| Retrieval technique detail | [03-rag.md](03-rag.md) |
| Agent production concerns in depth | [05-agents.md](05-agents.md) |
| Gateway/observability operational detail | [08-llmops.md](08-llmops.md) |
| Voice detail | [09-multimodal-voice.md](09-multimodal-voice.md) |
| Safety detail | [07-safety-guardrails.md](07-safety-guardrails.md) |

---

← Back to [INDEX.md](INDEX.md)
