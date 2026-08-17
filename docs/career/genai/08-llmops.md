# 08 — LLMOps

> Running LLM systems in production. Your strongest **platform/infra** material lives here: the
> pSEO router is an LLM gateway, and **AI-observability-engine is a built LLM-tracing product** —
> Postgres/ClickHouse split, ingestion with cost enrichment, an SDK with OpenAI and Anthropic
> wrappers, RBAC, a scoped query API.
>
> Part 1 you read. Part 2 you cover and answer out loud. 🔥 = hard or commonly fumbled.

---

## Part 1 — What you actually need to know

### What LLMOps adds over normal SRE

Four properties normal services don't have. Naming them is the frame for the whole round.

| Property | Consequence |
|---|---|
| **Nondeterminism** | The same input gives different output, so you can't assert equality — you measure distributions |
| **Cost variance** | Two requests to the same endpoint can differ 100× in cost. Per-request unit economics, not just per-server |
| **Silent quality regression** | Quality can halve with nothing erroring. There is no 500 to alert on |
| **Provider-side drift** | Your dependency changes underneath you — model updates, deprecations, capacity changes — without a deploy on your side |

**The one-line version:** *"In normal services failures are loud and cost is roughly flat. In LLM
services failures are silent and cost is per-request. Everything in LLMOps follows from that."*

### Tracing

**One span per operation**, nested into a trace per request: model calls, retrieval, tool calls,
guardrail checks. On each span record inputs, outputs, model + **version**, prompt version, token
counts in/out (and cached separately), cost, latency, and TTFT for streaming.

**OpenTelemetry has GenAI semantic conventions** — `gen_ai.system`, `gen_ai.request.model`,
`gen_ai.usage.input_tokens` — so use them rather than inventing attribute names, and your traces
land in whatever backend you already run.

**Sampling:** trace everything at low volume; at high volume sample, but **always keep errors,
high-cost outliers and thumbs-down sessions**. Uniform sampling throws away exactly the traces you
need.

**PII scrubbing at the boundary.** Prompts and completions are the highest-risk logs you will ever
write — redact before the trace leaves the process, not in the backend.

> 🔗 *Yours:* AI-observability-engine is this product. **ClickHouse** for trace events with a rollup
> materialised view, **Postgres** for config/metadata (teams, projects, API keys, model pricing),
> **Redis** for buffering. A Python SDK with an `@observe` decorator, context managers, and
> provider wrappers for OpenAI and Anthropic. Cost enriched **at ingestion** from a pricing table.

### SLOs that are specific to LLMs

| Metric | Why it's the right one |
|---|---|
| **TTFT p50/p95** | What the user actually feels on a streaming response |
| **Tokens/sec** | Perceived speed after the first token |
| **Total latency p95** | Only meaningful for non-streaming calls |
| **429 rate** | Your rate-limit headroom, per provider |
| **Cache hit rate** | Directly a cost metric |
| **Cost per request / per resolved task** | The unit economic |
| **Quality metric** | Sampled online eval — the SLO nobody sets and everybody needs |

**Total latency is the wrong headline for a streaming endpoint.** A 12-second response with a
300 ms TTFT feels fast; a 3-second response with a 3-second TTFT feels broken.

### 🔥 Cost attribution

The question that separates platform candidates.

**Meter at the gateway** — it's the only place that sees every call. Attribute along
**tenant × feature × model × environment**, and store `tokens_in`, `tokens_out`,
`cached_tokens`, `cost_cents` per request.

Three things people get wrong:

1. **Cached tokens are priced differently** — count them separately or your unit economics lie.
2. **Attribute to the *feature*, not just the tenant.** "Which customer costs most" is less
   actionable than "summarisation is 70% of spend."
3. **Compute the unit economic, not just the total.** Cost per resolved ticket, per generated
   page, per session. That's the number a business decision needs.

**Enforcement is two-phase:** check a **pre-flight estimate** against the budget, then **reconcile
post-flight** with actual usage. Without the pre-flight check, N concurrent requests all pass and
blow the budget together.

Then: budgets and alerts per tenant, anomaly detection on spend per feature, and a showback view.

> 🔗 *Yours:* pSEO computes cost per call in cents from the provider's real usage fields,
> accumulates it onto the run, and surfaces dollars to the user at 4dp. Tokens in/out are also
> stored **per page**. That's genuine cost accounting — most side projects have none.
>
> 🔗 *Yours (own it):* AgentSystem makes ~4 model calls per task and **discards the usage object
> entirely.** No cost tracking at all.

### 🔥 The LLM gateway pattern

One egress point for every provider call. Everything else gets easier once this exists.

| Responsibility | Why it belongs here |
|---|---|
| Key management | Provider keys never leave the gateway |
| Routing & failover | Chain as config, not code |
| Rate-limit smoothing | Queue and pace against provider TPM/RPM |
| Caching | Exact and semantic, shared across callers |
| Budgets | Pre-flight enforcement per tenant |
| Metering | The only complete view of usage |
| Observability | One place to instrument |
| Compliance routing | `no_train` / region-pinned models |

**Build vs buy:** LiteLLM, Portkey and Cloudflare AI Gateway exist. Buy unless you have a routing
or compliance requirement they don't serve — and be aware you've introduced a **SPOF on the hot
path**, so it must be stateless, horizontally scaled, and able to serve a stale model registry if
its database is down.

> 🔗 *Yours:* "I've built about 80% of a gateway inside one product. What makes it a gateway rather
> than a client is the OpenAI-compatible surface, shared caching, and per-tenant budgets."

### 🔥 Timeouts — the phase distinction

**One total timeout is wrong for streaming**, and this is the detail that reads as experience.

| Timeout | Guards against |
|---|---|
| **Connect** | Provider unreachable |
| **TTFT** | Accepted the request, produced nothing — the real hang |
| **Inter-token** | Stream stalled mid-generation |
| **Total** | Runaway generation |

A single 60s total timeout can't tell a legitimately long generation from a provider that accepted
your request and died. A 10s **TTFT** timeout plus a 120s total tells them apart precisely.

**Retries:** exponential backoff with **jitter** — synchronised retries turn a blip into an
outage. Honour `Retry-After`. And retrying a *streamed* response is hard once bytes have reached
the client, which is an argument for buffering the first chunk.

**Circuit breakers per provider**, not global — one provider failing shouldn't open the circuit on
another.

**Degradation ladder:** preferred model → equivalent model → smaller model → cached or stale
response → explicit, honest failure.

> 🔗 *Yours:* pSEO's typed failover — 429/5xx/timeout/network/**empty output** fall through, other
> 4xx throw immediately, and a 429 writes a **persisted 60-second cooldown onto the model row** so
> the skip is shared across processes rather than living in one instance's memory.

### Rate limits — RPM and TPM

Providers limit **both**, and they bind independently: you can have request headroom and no token
headroom. So the limiter must be a **token bucket on tokens**, not only on requests.

Because you don't know the real token count until after the call: **reserve on an estimate, settle
with the actual** ([12-ai-machine-coding.md](12-ai-machine-coding.md) drill 2).

Then: fair queueing so one tenant can't starve others, and priority lanes so interactive traffic
beats batch.

### 🔥 Model migration

Your provider deprecates a model on 60 days' notice. This will happen; have the playbook.

1. **Pin versions.** Never call a floating alias in production — the alias silently changes model
   under you and your evals become meaningless.
2. **Track the deprecation calendar** as a real operational calendar.
3. **Define equivalence classes** — "this feature works on any of these three models" — so failover
   has somewhere to go.
4. **Shadow the candidate** on real traffic; compare offline.
5. **Re-run the eval suite.** A newer, better model can be *worse* on your task, because your
   prompt was tuned to the old one.
6. **Re-tune the prompt per model.** Prompts don't transfer cleanly.
7. **Canary by tenant or percentage**, with the old model one config change away.
8. **Version the prompt alongside the model** — the pairing is what you roll back, not either alone.

### Feedback loops

`thumbs-down / retry / abandon → sampled into a dataset → labelled → golden set → eval → change →
measure`.

**Implicit signals are the underused ones**: copy, retry, rephrase, abandonment. Noisy
individually, meaningful in aggregate, and free.

The point is to make the eval set better over time **without a labelling team**, by sourcing from
the sessions that actually went wrong.

### Everything is a versioned deploy artifact

**Prompts, models, retrieval config and the index** each get a version, and each can be canaried
and rolled back **independently**. Otherwise, when quality drops, you cannot tell which of four
simultaneous changes caused it.

### 🔥 The "quality dropped overnight" diagnosis tree

Have this ready — it's a common scenario question.

```
1. Did WE change anything?         prompt / model / retrieval config / index rebuild — check versions first
2. Did THEY change anything?       floating alias? provider incident? new model version silently rolled?
3. Did the DATA change?            index rebuilt, ingestion job failed, embeddings backfilled halfway,
                                   a corpus source went stale or empty
4. Did the INPUT change?           new traffic segment, new language, a customer onboarded with
                                   different documents — the model is fine, your assumptions moved
5. Is it real?                     small sample? one loud complaint? check the metric, not the anecdote
6. Is it retrieval or generation?  measure recall@k first — that isolates the half
```

**Then:** roll back the most recent artifact, confirm recovery, and only then investigate. Restore
service before you satisfy curiosity.

---

## Part 2 — Drill

**Cover the answers. Say yours out loud first.**

**1. 🔥 What does LLMOps add over normal SRE?**
> Four properties. Nondeterminism, so you can't assert equality — you measure distributions. Cost
> variance, because two requests to the same endpoint can differ a hundredfold, so the unit is
> per-request economics rather than per-server. Silent quality regression — quality can halve with
> nothing erroring, so there's no 500 to alert on. And provider-side drift, where your dependency
> changes underneath you without a deploy on your side. Everything else in LLMOps follows from
> those.

**2. What do you put on a span?**
> Inputs and outputs, model **and version**, prompt version, tokens in and out with cached tokens
> counted separately, cost, latency, and TTFT for streaming. Nested into a trace per request, so
> retrieval, model calls, tool calls and guardrail checks are all visible in one tree. I'd use the
> OpenTelemetry GenAI semantic conventions rather than inventing attribute names, so it lands in
> the backend we already run.

**3. How do you sample traces at high volume?**
> Not uniformly. Uniform sampling throws away exactly the traces you need. I'd sample the happy
> path and **always keep** errors, high-cost outliers, high-latency outliers, and any session with
> a thumbs-down or a retry — those are the ones that become eval cases.

**4. What's the biggest risk in LLM logging?**
> That prompts and completions are the highest-risk logs you'll ever write — they contain whatever
> the user typed and whatever you retrieved on their behalf. Redaction has to happen at the
> boundary, before the trace leaves the process, not as a backend policy you hope is applied. And
> the trace store inherits the retention and residency obligations of the data in it.

**5. 🔥 What SLOs would you set?**
> TTFT p50 and p95 as the headline, because that's what the user feels on a streaming response —
> total latency is the wrong headline there. A twelve-second response with a 300ms first token
> feels fast; a three-second response with a three-second first token feels broken. Then tokens per
> second, the 429 rate per provider, cache hit rate as a cost metric, cost per request and per
> resolved task, and a sampled **quality** metric — which is the SLO nobody sets and everybody
> needs, because it's the only one that catches a silent regression.

**6. 🔥 How do you attribute LLM cost per tenant?**
> Meter at the gateway, because it's the only place that sees every call, and record tokens in,
> tokens out, cached tokens and cost in cents against tenant, feature, model and environment.
> Three things people get wrong: cached tokens are priced differently and must be counted
> separately or the unit economics lie; attribution should be per **feature** not just per tenant,
> because "summarisation is 70% of spend" is more actionable than "customer X costs most"; and you
> want the unit economic — cost per resolved ticket — not just the monthly total.

**7. How do you enforce a budget?**
> Two phases. Pre-flight, estimate the tokens and check against the remaining budget before
> spending — without that, N concurrent requests all pass the check and blow the limit together.
> Post-flight, reconcile with actual usage and refund or charge the difference. Then alerting on
> the burn rate rather than only the cap, so you find out before you hit it, and a defined
> behaviour at exhaustion — degrade to a cheaper model rather than hard-failing, if the product
> allows it.

**8. 🔥 What is an LLM gateway and would you build or buy?**
> A single egress point for every provider call, owning key management, routing and failover,
> rate-limit smoothing, caching, budget enforcement, metering, observability and compliance
> routing. Buy — LiteLLM, Portkey, Cloudflare AI Gateway — unless there's a routing or compliance
> requirement they don't serve. And whichever way, it's now a SPOF on the hot path, so it has to be
> stateless, horizontally scaled, and able to serve a stale model registry if its database is down.
>
> 🔗 *Yours:* "I've built about 80% of one inside pSEO — a DB-ordered model chain with typed
> failover, persisted cooldowns, compliance routing and per-call cost accounting. What would make
> it a gateway rather than a client is an OpenAI-compatible surface, shared caching and per-tenant
> budgets."

**9. 🔥 What timeout would you set on an LLM call?**
> Not one — four, because a single total timeout can't distinguish a legitimately long generation
> from a provider that accepted the request and died. A connect timeout, a **TTFT** timeout at
> maybe ten seconds which is the one that catches the real hang, an inter-token timeout for a
> stalled stream, and a total timeout for runaway generation. The TTFT/total split is the one
> people miss.

**10. How do you retry safely?**
> Only on retryable errors — 429, 5xx, timeouts, network failures, and empty output. A 4xx means my
> request is malformed and retrying wastes money. Exponential backoff with **jitter**, because
> synchronised retries across instances turn a blip into an outage. Honour `Retry-After`. And
> retrying a streamed response is genuinely hard once bytes have reached the client, which is an
> argument for buffering the first chunk before committing to the stream.

**11. Why per-provider circuit breakers rather than one?**
> Because one provider degrading shouldn't take out the path to a healthy one. A global breaker
> would open on aggregate failures and stop you from doing the exact thing that saves you —
> failing over.

**12. What does your degradation ladder look like?**
> Preferred model, then an equivalent model at the same capability tier, then a smaller cheaper
> model with degraded quality, then a cached or stale response, then an explicit honest failure.
> The principle is that every rung should be better than an error page, and the last rung should
> tell the truth rather than serving something silently worse.

**13. 🔥 RPM and TPM — how do you limit both?**
> Two token buckets, refilled continuously, because they bind independently — you can have request
> headroom and no token headroom. The complication is that you don't know the true token count
> until after the call, so I reserve against a pre-flight estimate and settle with the actual
> usage afterwards, refunding an over-estimate. On top of that, fair queueing so one tenant can't
> starve the rest, and priority lanes so interactive traffic beats batch.

**14. 🔥 Your provider deprecates your model in 60 days. Walk me through it.**
> First, check I pinned a version rather than a floating alias — if I'm on an alias, my evals were
> already meaningless. Then: pick candidates, run the full eval suite on each, expecting that a
> newer better model can be *worse* on my task because the prompt was tuned to the old one. Re-tune
> the prompt per candidate. Shadow the winner on real traffic and compare offline. Canary by
> percentage or tenant with the old model one config change away. And roll the prompt and the model
> **together** as a pair, because that's the unit that gets rolled back.

**15. Why pin model versions?**
> Because a floating alias changes the model underneath you with no deploy on your side, which
> means quality can move for reasons that aren't in your git history — and it makes every eval
> result unreproducible. Pinning turns a provider update into a change you schedule and evaluate
> rather than one you discover from a support ticket.

**16. What do you version as deploy artifacts?**
> Prompts, model IDs, retrieval configuration and the index — four things, versioned and rolled
> back independently. If they move together you can't attribute a quality change to any of them.
>
> **Honest gap:** "I don't version prompts in any of my projects. pSEO gets halfway — templates in
> a table with the seed as the reviewed source of truth — but there's no version column, so I can't
> tell you which prompt produced a given page."

**17. 🔥 Quality dropped overnight. What do you do?**
> Restore first, investigate second. Check our changes — prompt, model, retrieval config, index
> rebuild — by comparing artifact versions, and roll back the most recent one to confirm. Then
> their changes: a floating alias, a provider incident, a silently rolled model version. Then the
> data: did an ingestion job fail, did an index rebuild half-complete, did a corpus source go
> empty. Then the input: a new traffic segment or a customer onboarded with different documents,
> where the model is fine and my assumptions moved. And I'd check it's real before any of that —
> one loud complaint isn't a metric. Once it's isolated, measure recall@k to tell whether it's
> retrieval or generation.

**18. How do you build a feedback loop without a labelling team?**
> Mine the sessions that went wrong. Explicit thumbs-down is the obvious signal but it's sparse;
> the implicit ones are richer and free — retries, rephrasings, copy events, abandonment. Sample
> those into a review queue, label a small number properly, and promote them into the golden set.
> The result is an eval set that gets more representative over time because it's sourced from real
> failures rather than from what I imagined users would ask.

---

## Rapid-fire

| Term | One-liner |
|---|---|
| Span | One traced operation with tokens, cost, latency |
| Trace | The tree of spans for one request |
| OTel GenAI conventions | Standard attribute names for LLM telemetry |
| TTFT | Time to first token — the streaming headline metric |
| Tokens/sec | Perceived speed after the first token |
| Cached tokens | Priced differently — count them separately |
| Unit economic | Cost per resolved task, not per month |
| Pre-flight budget check | Estimate and refuse before spending |
| Post-flight reconcile | Correct the estimate with real usage |
| Showback | Per-tenant cost visibility without billing |
| LLM gateway | Single egress: keys, routing, cache, budgets, metering |
| TTFT timeout | Catches "accepted the request, produced nothing" |
| Inter-token timeout | Catches a stalled stream |
| Jitter | Desynchronises retries so a blip isn't an outage |
| `Retry-After` | Honour it instead of guessing backoff |
| Per-provider breaker | So one provider failing doesn't block failover |
| Persisted cooldown | Rate-limit backoff shared across instances |
| Degradation ladder | Preferred → equivalent → smaller → cached → honest failure |
| RPM / TPM | Request and token limits — they bind independently |
| Fair queueing | One tenant can't starve the others |
| Floating alias | Unpinned model name — silently changes under you |
| Equivalence class | Models a feature can run on interchangeably |
| Shadow traffic | Run the candidate, serve the incumbent, compare offline |
| Canary | Percentage or tenant rollout with instant rollback |
| Implicit feedback | Retry, rephrase, copy, abandon |
| Deploy artifact | Prompt, model, retrieval config, index — versioned separately |

---

## 🔗 Anchors

| Concept | Your project | The sentence to say |
|---|---|---|
| LLM tracing product | AI-observability-engine | "I built one — ClickHouse for trace events with a rollup MV, Postgres for config and pricing, an SDK with `@observe` and OpenAI/Anthropic wrappers." |
| OLTP vs OLAP split | AI-observability-engine | "Config is small, relational and mutable; traces are append-only and queried by aggregation. Two stores, deliberately." |
| Cost enrichment at write | AI-observability-engine | "Cost is computed at ingestion from a pricing table, so a later price change doesn't retroactively rewrite history." |
| Gateway routing | pSEO | "A DB-ordered chain — reordering is a SQL update, not a deploy." |
| Typed failover | pSEO | "429/5xx/timeout/network/empty-output fall through; other 4xx throw immediately." |
| Persisted cooldown | pSEO | "A 429 writes a 60-second cooldown onto the model row, so every process shares the skip." |
| Compliance routing | pSEO | "Paying customers are routed only to models flagged `no_train`." |
| Per-call cost accounting | pSEO | "Cents per call from the provider's usage fields, accumulated onto the run and shown to the user." |
| Rate limiting | pSEO | "In-memory fixed window with opportunistic sweep — documented as per-process and needing a shared store to scale out." |
| Quotas | pSEO | "Monthly page cap by plan, enforced before generation, explicitly not charged for suggestions." |
| Error monitoring | pSEO | "A dependency-free Sentry store-endpoint POST, fire-and-forget with a 5s timeout." |
| No cost tracking | AgentSystem | "Four model calls per task and the usage object discarded. Biggest operational blind spot in that repo." |

---

## Gaps — what you cannot claim yet

| Gap | The honest script |
|---|---|
| **Production traffic at scale** | "AI-observability-engine is built through P6a and has never taken production traffic. I can tell you the schema and the ingestion path in detail; I can't tell you how it behaves at a million spans a day." |
| **Per-tenant cost attribution** | "pSEO tracks cost per run and per page, not per tenant with budget enforcement. That's build task 7 and I know exactly what it looks like." |
| **OTel GenAI conventions in practice** | "My tracing schema is hand-rolled. I'd align to the OTel conventions so it lands in an existing backend rather than a bespoke one." |
| **Semantic caching in production** | "None of my systems cache LLM responses. I know the scoping hazard — cross-user hits are a data leak — and I've built the TTL-cache instinct one layer down, on market data." |
| **A model migration under deadline** | "Haven't run one against a deprecation clock. I have the playbook and the reason it matters — an unpinned alias makes every eval result unreproducible." |
| **LiteLLM / Portkey / Langfuse hands-on** | "I've built the equivalents rather than adopted them, which is a strange place to be. For a team I'd buy the gateway and spend the time on the product." |

---

## What's NOT here

| Topic | Doc |
|---|---|
| Token math and per-call cost arithmetic | [01-foundations.md](01-foundations.md), [02](02-prompting-structured-output.md) |
| Offline eval, golden sets, CI gating | [04-evals.md](04-evals.md) |
| TTFT mechanics, SSE, cancellation | [06-streaming-api-mechanics.md](06-streaming-api-mechanics.md) |
| PII, data retention, DPDP/GDPR | [07-safety-guardrails.md](07-safety-guardrails.md) |
| Agent tracing and trajectory replay | [05-agents.md](05-agents.md) |
| Designing a gateway as an HLD | [11-ai-system-design.md](11-ai-system-design.md) |
| Implementing a resilient client / TPM limiter | [12-ai-machine-coding.md](12-ai-machine-coding.md) |
| Docker, CI/CD, Nginx, systemd | [interview-qa/06-devops-infra.md](../interview-qa/06-devops-infra.md) |

---

← Back to [INDEX.md](INDEX.md)
