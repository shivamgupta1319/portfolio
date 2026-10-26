# 12: Solution Design (Business Requirement → Working Architecture)

> **JD lines covered:** "taking a business requirement, breaking it into modules, deciding the
> application architecture, designing data structures and APIs, integrating AI components" · "Can
> independently convert business requirements into a working technical solution" · "The Architect's
> Mindset … structure data flow".
>
> This is the round where the "Senior" in the title gets decided. Generic HLD structure:
> [system-design-prep.md](../system-design-prep.md). AI HLD problems with full write-ups:
> [genai/11](../genai/11-ai-system-design.md). This file gives you a **repeatable method** and one
> fully worked example in the JD-2 domain.

---

## 🟢 Level 1: The method (8 steps, ~45 minutes in an interview)

| # | Step | Output | Time |
|---|---|---|---|
| 1 | **Clarify the business goal** | One-sentence problem, users, success metric | 5 min |
| 2 | **Requirements** | Functional (user stories) + non-functional (latency, scale, cost, security, compliance) | 5 min |
| 3 | **Decide where AI is (and isn't) needed** | For each step: deterministic code, a single LLM call, a workflow, or an agent? | 5 min |
| 4 | **Modules** | 5–8 bounded modules with one responsibility each | 5 min |
| 5 | **Architecture diagram + data flow** | Boxes and arrows, sync vs async paths | 10 min |
| 6 | **Data model + APIs** | Key tables, the main endpoints and event types | 5 min |
| 7 | **Risks & quality** | Failure modes, evals, security, cost controls, observability | 5 min |
| 8 | **Delivery plan** | MVP slice → iterations, what you'd cut | 5 min |

### Step 1–2 question bank (ask these out loud)

- Who uses it? How many users/tenants? Internal or customer-facing?
- What does "good" look like? What decision does the output drive?
- What data exists, where does it live, how big is it, how fresh does it need to be, and who's allowed to see what?
- Latency expectation: interactive (seconds) or report-style (minutes is fine)?
- What's the cost of a wrong answer? (That decides HITL, citations and eval rigour.)
- Compliance: PII, data residency, can data go to an external LLM provider?
- Existing stack and team constraints? Build vs buy?

### Step 3: the "how much AI" ladder

```
deterministic code  <  single LLM call  <  fixed workflow (chain/graph)  <  agent  <  multi-agent
cheaper, faster, testable  ─────────────────────────────────────────────▶  flexible, costly, risky
```
Pick the **lowest rung that meets the requirement, for each step.** Interviewers reward a
candidate who says "this part doesn't need an LLM".

---

## 🟡 Level 2: Worked example (the JD-2 product)

> **Brief:** "An Agentic AI-driven insight platform that transforms complex data into actionable
> strategic roadmaps."

### 1. Clarified goal
Leadership teams upload company data (financial KPIs in CSV/DB, market reports in PDF, customer
feedback). The platform analyses it and produces a **cited, editable strategic roadmap** (themes →
initiatives → quarterly milestones → KPIs → risks), and answers follow-up questions in chat.
**Success metric:** analysts accept 70% or more of the roadmap items with only minor edits, and every
claim is traceable to a source.

### 2. Requirements
**Functional:** connect/upload data sources · automatic profiling of datasets · chat Q&A over docs
+ numbers · generate a roadmap · edit and regenerate sections · export (PDF/slides) · share within
the org · approval before anything is sent externally.
**Non-functional:** multi-tenant isolation · chat TTFT < 2 s, roadmap generation < 5 min with live
progress · every number comes from a tool, never from the model's memory · per-tenant cost
caps · audit log · SOC2-style practices · runs on AWS/Azure.

### 3. Where AI goes

| Step | Rung | Why |
|---|---|---|
| Parse PDFs/CSVs, compute KPIs, trends | **Deterministic code** (pandas/SQL) | Numbers must be exact and reproducible |
| Dataset profiling summary | Single LLM call over computed stats | Narrative only, the stats come from code |
| Doc Q&A | **RAG** (hybrid + re-rank + citations) | Knowledge in documents |
| Numeric Q&A | **Text-to-SQL tool** on a read-only replica | Aggregations can't be retrieved as text |
| Roadmap generation | **Multi-agent workflow** in LangGraph (supervisor → analyst / researcher / strategist → critic) | Multi-step, mixes tools, needs critique |
| Sending/sharing externally | **HITL interrupt** | Irreversible |

### 4. Modules

1. **Identity & tenancy**: orgs, users, roles, RLS.
2. **Ingestion**: upload/connectors → parse → chunk → embed → index. Datasets → typed tables.
3. **Analytics engine**: deterministic KPI computation, exposed as tools.
4. **Retrieval service**: hybrid search + re-ranker + citation formatting.
5. **Agent runtime**: LangGraph graphs, checkpointer, store, tool registry (incl. MCP).
6. **Roadmap domain**: roadmap/version/item entities, editing, export.
7. **Observability & evals**: traces, cost ledger, eval datasets, feedback.
8. **Frontend**: chat, roadmap editor, dashboards, approvals.

### 5. Architecture

```
                         ┌───────────────────── Next.js (BFF) ─────────────────────┐
 Browser ──HTTPS/SSE────▶│ auth session · proxy · server components · dashboards   │
                         └───────────────┬─────────────────────────────────────────┘
                                         │ REST + SSE (JWT)
                         ┌───────────────▼─────────────────────────────────────────┐
                         │ FastAPI "core-api"                                       │
                         │  /threads /runs/stream /runs/{id}/resume /roadmaps       │
                         │  /datasets /documents /evals /feedback                   │
                         └───┬───────────────┬───────────────┬────────────────────┘
                 enqueue jobs│               │ invoke graph  │ read
                  ┌──────────▼───┐   ┌───────▼──────────┐    │
                  │ Workers       │   │ LangGraph runtime │    │
                  │ (arq/Celery)  │   │ supervisor+agents │────┼──▶ LLM gateway ──▶ Claude / OpenAI / Gemini
                  │ parse, embed, │   │ tools:            │    │      (fallbacks, caching, cost ledger)
                  │ profile, KPIs │   │  retrieval svc    │    │
                  └──────┬────────┘   │  analytics (SQL)  │    │
                         │            │  MCP servers      │    │
                         │            └───────┬───────────┘    │
        ┌────────────────▼────────────────────▼────────────────▼───────────────┐
        │ PostgreSQL: app tables · pgvector chunks · tsvector · LangGraph       │
        │ checkpoints + store · llm_calls ledger      (read replica for SQL tool)│
        ├──────────────────────────────────────────────────────────────────────┤
        │ Redis: cache, rate limits, job queue   ·   S3/Blob: raw files, exports │
        └──────────────────────────────────────────────────────────────────────┘
                      Traces → LangSmith/Phoenix   ·   Metrics/logs → Grafana/CloudWatch
```

**Sync path:** chat. **Async path:** ingestion and roadmap generation (a job plus progress over
SSE). Roadmap generation runs as a graph *inside a worker*, with checkpoints, so it survives restarts
and can pause for approval.

### 6. Data model + APIs (key parts)

```
roadmaps(id, tenant_id, title, status, current_version_id, created_by)
roadmap_versions(id, roadmap_id, run_id, created_at, summary)
roadmap_items(id, version_id, theme, initiative, quarter, kpis jsonb, risks jsonb,
              citations jsonb[{source_id, chunk_id|query_id, quote}], confidence, accepted bool)
datasets(id, tenant_id, name, table_name, schema jsonb, profile jsonb, row_count)
+ documents/chunks, threads/messages/runs/llm_calls, eval_* (see 08)
```

```
POST /datasets                      → 202 {job_id}     (upload, async profile)
POST /documents                     → 202 {job_id}     (upload, async index)
GET  /jobs/{id}                     → status/progress
POST /threads/{id}/runs/stream      → SSE: token | step | tool_call | citation | approval | done | error
POST /roadmaps                      → 202 {roadmap_id, run_id}  (starts generation graph)
GET  /roadmaps/{id}/events          → SSE progress
POST /runs/{id}/resume              → approve / edit / reject an interrupt
PATCH /roadmaps/{id}/items/{item}   → human edits (feeds eval data)
POST /feedback                      → {run_id, score, comment}
```

The roadmap agent returns **structured output** (`Roadmap` Pydantic model, see
[04 §2.3](04-llm-fundamentals-sdks-tool-calling.md)), validated, with every number required to have
a `query_id` from the analytics tool. A validator rejects items whose numbers don't trace back to a
tool result.

### 7. Risks & quality

| Risk | Control |
|---|---|
| Hallucinated numbers | Numbers only from tools; validator; citation required per item |
| Weak/irrelevant evidence | Hybrid + re-rank; critic node; "insufficient evidence" allowed per item |
| Cross-tenant leakage | RLS + tenant filter in vector queries + tests |
| Prompt injection in uploaded docs | Docs treated as data; agents have no external-send tool without approval |
| Cost blow-up | Per-tenant budget, cheap model for routing/profiling, caching, step limits |
| Slow generation | Async job, parallel analyst/researcher via `Send`, live progress |
| Quality regressions | Golden set of past roadmaps + accepted-rate metric; evals in CI; canary for prompt changes |
| Provider outage | Gateway fallback chain; degraded mode (analytics-only report) |

### 8. Delivery plan

- **MVP (2–3 weeks):** single tenant, CSV + PDF upload, RAG chat with citations, one-shot roadmap
  generation (single agent + tools), basic traces.
- **v1:** multi-agent graph + critic, editing + versioning, HITL share, evals in CI, multi-tenant RLS.
- **v2:** connectors (DB, Google Drive via MCP), dashboards, canary prompts, cost dashboards, K8s.
- **Cut first if late:** exports, connectors. **Never cut:** citations, tenant isolation, evals.

### Write the key decisions as ADRs

```markdown
# ADR-003: Numbers come only from the analytics tool
Status: accepted · Date: 2026-10-26
Context: Roadmaps drive budget decisions; LLMs misstate numbers.
Decision: Agents must call `run_kpi_query` for any figure; output schema requires query_id per number;
          validator rejects unsupported figures.
Consequences: + trustworthy numbers, auditable; − extra tool calls (~+1.5 s), more complex prompts.
Alternatives: free-form generation + post-hoc check (rejected: too many false passes).
```

---

## 🔴 Level 3: What makes it "senior"

- **Trade-offs are named, with numbers.** "pgvector, because we're under 5M chunks and already run
  Postgres; we'd move to Qdrant at ~20M chunks or if filtered p95 goes over 200 ms."
- **Failure modes come first, not last.** Walk through what happens when the LLM is down, slow or wrong.
- **Cost is designed in.** Do the back-of-envelope: 200 tenants × 20 roadmaps/month × ~150k tokens ≈
  600M tokens/month. At a blended ~$4 per million tokens (mostly input on a mid-tier model), that's
  roughly **$2,400/month**. Then explain how routing, caching and smaller contexts cut it.
- **Evaluation is part of the architecture**, not a post-launch idea.
- **Ownership:** rollout plan, runbook, on-call alerts, and how you'd communicate risk to the stakeholder.
- **Say what you'd *not* build**: no fine-tuning, no custom vector DB, no Kubernetes for the MVP.

---

## 🔧 Drills (do each out loud, 45 minutes, then compare with the method)

1. **Customer-support copilot** for a SaaS company: drafts replies from KB + past tickets, takes
   actions (refund ≤ ₹2,000 automatically, above that with approval) via the billing API.
2. **Contract review agent** for a legal team: extract clauses, compare to a playbook, flag risks,
   redline suggestions, and cite clause and page.
3. **Sales-call intelligence**: transcribe calls, summarize, update the CRM via MCP, produce a weekly
   pipeline-risk report.
4. **Internal "ask our codebase and docs" assistant** for 500 engineers, with permission-aware
   retrieval over GitHub, Confluence and Jira. (Your repo-intelligence and UACE are the seed answers.)
5. **Invoice processing**: OCR → extraction → validation against POs → ERP entry with exceptions
   routed to humans. (Your card-selector/Photo-AI document-AI work applies.)

For each, produce: the "how much AI" table, a module list, a diagram, 5 tables, 6 endpoints, a risk table
and an MVP cut.

## 🔗 You already did this

Every solo project you shipped went through this loop. Practise telling it this way:

| Project | Requirement → architecture story | Walkthrough |
|---|---|---|
| pSEO Engine | "Bulk pages that don't get penalized" → queue-per-row, router, quality gates, GitHub PR delivery | [projects/07](projects/07-pseo-engine.md) |
| Resite | "Tailor a résumé to a JD" → deterministic parsing + one LLM extraction + versioned scoring weights | [projects/08](projects/08-resite.md) |
| repo-intelligence | "Explain a concern in a codebase" → graph + hybrid retrieval + citation validation + eval gate | [projects/03](projects/03-repo-intelligence.md) |
| AgentSystem | "Goal → working code" → planner/coder/reviewer/executor with memory | [projects/04](projects/04-agent-system.md) |

## ✅ Self-check

1. Recite the 8 steps.
2. For the worked example, which steps are deliberately *not* LLM-driven, and why?
3. Draw the architecture from memory in 5 minutes.
4. Name 5 risks and their controls.
5. Write an ADR for "LangGraph vs a hand-written loop".
6. What's in the MVP, and what would you never cut?
