# 13: Capstone, "Insight Copilot"

> **Why this exists:** your evidence is strong on RAG, MCP, multi-agent and LLM integration, but it's
> almost all in **TypeScript, without LangGraph, without RTL, without K8s or security gates**. One
> project in the JD's exact stack closes every named-tool gap at once and gives you a demo link
> for every application from now on.
>
> **What it is:** a small version of the JD-2 product (designed in [12](12-solution-design-requirement-to-architecture.md)):
> upload company data (CSV + PDFs) → chat with it with citations → a multi-agent LangGraph
> workflow produces a structured, cited strategic roadmap → human approval before sharing.
>
> **Stack:** Next.js + TypeScript + Tailwind + MUI · FastAPI + Pydantic + SQLAlchemy (async) + Alembic
> · LangChain + LangGraph · Postgres + pgvector · Redis + arq · an MCP server (Python) · pytest +
> Jest/RTL + Playwright · LangSmith or Phoenix · Docker + kind/K8s · GitHub Actions with security gates.

---

## Rules

1. **Type the code yourself.** Use AI to explain and review, not to generate whole files. The point is that
   you can defend every line live. (This is the lesson from your other projects, see
   [projects/README.md](projects/README.md).)
2. **One slice = one PR** (≤ 500 lines), with tests, merged to main, CI green.
3. Every slice ends with a **"what I can now say"** line in the README.
4. Keep a `docs/decisions/` folder of ADRs, which is interview gold.

## Repo layout

```
insight-copilot/
  backend/   app/{api,core,db,schemas,services,rag,agents,mcp_client,workers}  tests/  alembic/
  mcp/       insights_mcp/server.py                     ← your Python MCP server
  frontend/  app/ components/ lib/ __tests__/ e2e/
  evals/     datasets/*.jsonl  run.py
  k8s/       base/ overlays/{dev,prod}
  .github/workflows/{ci.yml,evals.yml,deploy.yml}
  docker-compose.yml   README.md   docs/decisions/
```

---

## The 8 slices

### Slice 1: Skeleton end to end (modules [01](01-python-for-ai-backends.md), [02](02-fastapi-async-pydantic-sqlalchemy.md), [03](03-react-nextjs-typescript-for-ai-ui.md))
- FastAPI with `/health/live`, `/health/ready`, settings via pydantic-settings, async SQLAlchemy +
  Alembic, a `users` + `threads` + `messages` schema, and JWT auth (or a dev auth stub behind a flag).
- Next.js App Router, MUI theme + Tailwind, login page, thread list (TanStack Query).
- docker-compose: api, web, db (pgvector), redis.
- pytest: 5 API tests with dependency overrides. RTL: thread list renders, plus its empty state.
- **CI v1:** lint + typecheck + tests for both ends.
- **Say:** "Full-stack FastAPI + Next.js with async SQLAlchemy and CI."

### Slice 2: Streaming chat with tool calling, by hand ([04](04-llm-fundamentals-sdks-tool-calling.md))
- `POST /threads/{id}/runs/stream`: the **hand-written** tool loop with 2 tools (`get_kpi` on a
  seeded table, `calculator`) and typed SSE events.
- Frontend: the fetch-stream parser, a chat reducer, a Stop button (AbortController), tool-call cards.
- Record `llm_calls` (tokens, cost, latency).
- Tests: the loop with a `FakeLLM` (tool → answer, tool error, step cap). RTL with MSW SSE.
- **Say:** "I can write the agent loop by hand and stream it to React."

### Slice 3: Ingestion + RAG ([05](05-rag-and-vector-databases.md), [08](08-databases-and-data-modelling.md))
- `POST /documents` → 202 → arq worker: parse PDF → chunk → embed → pgvector + tsvector.
- Hybrid search SQL + RRF, then a cross-encoder re-ranker (in a thread/process pool).
- `search_documents` tool with numbered sources. Citation validation (IDs + quote check).
- UI: upload with job progress, citation chips that open the chunk and page.
- Tests: chunker, RRF, the citation validator, and an integration test on testcontainers Postgres.
- **Say:** "Hybrid retrieval with re-ranking and validated citations, in Python on pgvector."

### Slice 4: Port the agent to LangGraph ([06](06-agents-langchain-langgraph.md))
- Replace slice 2's loop with a `StateGraph` (agent ↔ `ToolNode`) and an **AsyncPostgresSaver**
  checkpointer keyed by `thread_id`.
- Stream with `astream(stream_mode=["messages","updates"])`.
- `trim_messages` for long threads.
- Tests: graph with `GenericFakeChatModel`; resume after restarting the app (same thread).
- ADR: "Hand-written loop vs LangGraph". Write down what you gained and lost.
- **Say:** "LangGraph with a Postgres checkpointer: durable multi-turn state."

### Slice 5: MCP integration ([07](07-mcp-and-service-integration.md))
- Build `insights_mcp` with FastMCP: `list_kpis`, `get_kpi`, `kpi_trend`, plus a `schema://kpis` resource.
- Load it into the graph with `langchain-mcp-adapters` (stdio in dev, Streamable HTTP in compose).
- Also register it in Claude Code / Claude Desktop to show the same server working in two hosts.
- Tests: MCP tool functions as unit tests; an integration test that lists tools over stdio.
- **Say:** "I build MCP servers in Python and consume them from LangGraph agents."

### Slice 6: Multi-agent roadmap + long-term memory + HITL ([06 §3](06-agents-langchain-langgraph.md), [12](12-solution-design-requirement-to-architecture.md))
- Supervisor graph: `analyst` (KPI/MCP tools) · `researcher` (RAG tool) · `strategist`
  (structured `Roadmap` output) · `critic` (revise loop, max 2).
- Fan out analyst + researcher in parallel with `Send`.
- **Store** (PostgresStore) for per-org long-term memory: "preferred planning horizon",
  "company OKRs", and accepted/rejected past items.
- `interrupt()` before "share roadmap", plus the ApprovalCard UI and the resume endpoint.
- Roadmap page: MUI timeline + DataGrid of items, each with citations, editable.
- Tests: routing function, critic loop bound, interrupt pauses before share, RTL for the ApprovalCard.
- **Say:** "Supervisor multi-agent in LangGraph with parallel delegation, long-term memory and durable
  human approval."

### Slice 7: Observability + evals ([10](10-observability-and-evals.md))
- LangSmith tracing (or Phoenix in compose) with metadata `tenant`, `graph_version`.
- 40-example dataset: KPI questions, doc questions, no-answer, injection attempts.
- Evaluators: citation validity (code), tool-use (code), abstain-correctness (code), correctness
  (LLM-judge calibrated on 20 hand labels).
- `evals.yml`: runs on changes to `agents/`, `rag/` or `prompts/`, and fails under threshold.
- Cost dashboard page (from `llm_calls`): cost per tenant per feature, p95 latency.
- **Say:** "Every graph change is gated on an eval run in CI; I track latency, cost and accuracy per node."

### Slice 8: DevSecOps + deploy ([11](11-devsecops-docker-k8s-cicd-cloud.md), [09](09-testing-pytest-jest-rtl.md))
- Multi-stage non-root Dockerfiles. Image build tagged by SHA, with SBOM.
- Security job: gitleaks, Semgrep, Bandit, pip-audit, pnpm audit, Trivy fs + image (blocking on HIGH/CRITICAL fixable).
- K8s manifests (Deployment/Service/Ingress/HPA, probes, securityContext) → deploy to **kind** in CI
  or to a cheap managed cluster / ECS Fargate. ZAP baseline against it.
- Playwright E2E (upload → ask → approve) and a post-deploy smoke script with rollback.
- Public demo with a seeded fake company, rate-limited, with a capped budget.
- **Say:** "I own the pipeline: security gates, container scanning, K8s deploy, smoke tests, rollback."

---

## Definition of done (for the portfolio)

- [ ] README: problem, architecture diagram, demo GIF, **eval numbers**, cost per roadmap, ADR list, "what I'd do next".
- [ ] CI badge green. Security tab shows scans. At least one PR blocked by a gate (screenshot).
- [ ] Live demo link + a 3-minute walkthrough video.
- [ ] Added to shivamgupta.live and the résumé, with the honest stack line.
- [ ] You can rebuild slice 2's loop and slice 4's graph **on a whiteboard without notes**.

## Time budget

~8 hrs/week → about 1 slice per week, 8 weeks (matches stages 2–3 of [00-roadmap](00-roadmap.md)).
With an active interview process, do slices 1, 2, 4, 5, 6 first. Those are the LangGraph + MCP
story the JDs screen for.
