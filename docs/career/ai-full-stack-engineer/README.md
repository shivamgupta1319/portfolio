# Senior Full-Stack AI Engineer (Agentic AI): Career Track

This track is for the role title almost every Indian IT and product company is hiring for in
2026: **"Senior Full-Stack AI Engineer"**, also posted as "Agentic AI Engineer", "GenAI Full-Stack
Developer" or "AI Product Engineer". It's built from two real JDs (Jaipur/Indore, 3–6 yrs). It's
meant to stay useful **after** the interview, as a path you can keep coming back to.

> **How this differs from the other kits**
> - [`interview-qa/`](../interview-qa/INDEX.md) prepares a full-stack SDE-2 loop.
> - [`genai/`](../genai/INDEX.md) goes deep on GenAI interview theory (RAG metrics, evals, safety, model side).
> - **This folder** is the *builder's* track. It goes from basic to advanced, and every topic ends in
>   **"how you actually integrate it"** code, plus a plain-language explanation of **how your own
>   projects work**, since most of them were written with AI help.
>
> When a topic is already covered in depth in `genai/`, this track teaches the working level and
> links there for the interview-depth version. It doesn't repeat it.

---

## 1. The JD, decoded

Both JDs describe one job: **take a vague business problem and ship a working AI product end to
end, alone.** Every line in them maps to one of five skills:

| Skill | What the JD actually says | What they're really testing |
|---|---|---|
| **Build the product** | React.js/Next.js, TypeScript, Tailwind, MUI; Python FastAPI/Django | Can you build a polished UI *and* a solid API without a separate frontend or backend dev? |
| **Make it intelligent** | LLMs, RAG, re-ranking, citations, LangChain, LangGraph, tool calling, MCP, multi-agent, long-term memory | Do you understand *why* an agent behaves the way it does, beyond copying a tutorial? |
| **Make it fast and correct** | AsyncIO, concurrency/parallelism, Pydantic, SQLAlchemy, SQL + vector DB design | Can your backend handle 200 concurrent LLM calls without falling over? |
| **Make it trustworthy** | PyTest, Jest, RTL, eval frameworks (latency/cost/accuracy), LangSmith, Arize, SAST/DAST, CVE analysis | Can you *prove* it works and keep it safe as models change? |
| **Ship and own it** | Docker, Kubernetes, CI/CD, AWS/Azure, production releases, off-hours support, stakeholder updates | Will you deploy it, watch it, fix it at 11pm, and explain it to a non-engineer? |

The second JD's mission line is the tell: *"We are not looking for someone to simply build
wrappers around LLMs."* A wrapper is `prompt → API → print`. They want **systems**: state, memory,
tools, retrieval, evaluation and deployment around the model.

---

## 2. Where you stand today (honest gap map)

Built from the source code of your repos (see [`projects/`](projects/README.md)), not from your
résumé.

| JD requirement | Your evidence | Status | Close it with |
|---|---|---|---|
| React / Next.js / TypeScript / Tailwind | Portfolio, Resite, pSEO, Inbox Agent dashboard | ✅ Strong | [03](03-react-nextjs-typescript-for-ai-ui.md) (AI-UI patterns, RTL) |
| Material UI | Not used anywhere | ❌ | [03 §MUI](03-react-nextjs-typescript-for-ai-ui.md), 1 afternoon |
| Python + FastAPI | AI-observability-engine, trading-agent, crypto-ai | 🟡 Good, smaller than your TS work | [01](01-python-for-ai-backends.md), [02](02-fastapi-async-pydantic-sqlalchemy.md) |
| AsyncIO / concurrency / multiprocessing | Async ingest path in AI-observability-engine (DB access is sync in threads) | 🟡 Partial: can you explain the GIL and the event loop? | [01 §L3](01-python-for-ai-backends.md) |
| Pydantic / SQLAlchemy | AI-observability-engine | 🟡 | [02](02-fastapi-async-pydantic-sqlalchemy.md) |
| LLM SDKs (OpenAI/Claude/Gemini) | Schema-constrained calls with re-validation (Resite), AI-ROUTER gateway (pSEO), OpenAI SDK (trading-agent), Vercel AI SDK (AgentSystem) | ✅ Strong | [04](04-llm-fundamentals-sdks-tool-calling.md) |
| Tool / function calling | trading-agent, AgentSystem, Inbox Agent | ✅ | [04](04-llm-fundamentals-sdks-tool-calling.md) |
| RAG, hybrid search, citations | repo-intelligence (BM25 + embeddings + RRF + citation validator + eval set) | ✅ **Your best asset** | [05](05-rag-and-vector-databases.md) |
| Re-ranking (cross-encoder) | Not built | ❌ | [05 §L3](05-rag-and-vector-databases.md) |
| Vector DBs | pgvector (pSEO), Qdrant (AgentSystem), sqlite-vec (UACE) | ✅ | [05](05-rag-and-vector-databases.md), [08](08-databases-and-data-modelling.md) |
| **LangChain / LangGraph** | **Never used in a real project** (jarvis declares it, never calls it) | ❌ **Biggest gap: both JDs name it** | [06](06-agents-langchain-langgraph.md) + [capstone](13-capstone-build-plan.md) |
| Multi-agent, task delegation | AgentSystem (Architect → Planner → Coder → Reviewer → Executor → Evaluator), built by hand | ✅ | [06](06-agents-langchain-langgraph.md) |
| Long-term memory for agents | AgentSystem (Qdrant), UACE (layered memory with staleness + pruning) | ✅ | [06 §L3](06-agents-langchain-langgraph.md) |
| MCP | UACE (published npm MCP server), Inbox Agent MCP server | ✅ **Rare: most candidates have none** | [07](07-mcp-and-service-integration.md) |
| SQL design | Drizzle/Postgres (pSEO), Prisma (smart-trading), Postgres + ClickHouse (observability) | ✅ | [08](08-databases-and-data-modelling.md) |
| PyTest / Jest / RTL | PyTest in AI-observability-engine, Vitest in repo-intelligence/Resite | 🟡 No RTL, little Jest | [09](09-testing-pytest-jest-rtl.md) |
| LangSmith / Arize evals | Built your *own* tracing product (AI-observability-engine) and eval harness (repo-intelligence) | 🟡 You know the concepts; you haven't used the named tools | [10](10-observability-and-evals.md) |
| Docker / CI/CD | Dockerfiles + compose across pSEO, smart-trading, LACS; GitHub Actions in a few repos | 🟡 | [11](11-devsecops-docker-k8s-cicd-cloud.md) |
| Kubernetes | Not used | ❌ | [11 §L2–L3](11-devsecops-docker-k8s-cicd-cloud.md) |
| SAST / DAST / CVE gates | Not in any pipeline | ❌ | [11 §L3](11-devsecops-docker-k8s-cicd-cloud.md), 1 day |
| AWS / Azure production | VPS/self-hosted deployments mostly | 🟡 | [11](11-devsecops-docker-k8s-cicd-cloud.md) |
| Requirement → architecture | Every project you've shipped solo | ✅ | [12](12-solution-design-requirement-to-architecture.md) |

> For exact `file:line` evidence, see each project's **JD coverage** table in [`projects/`](projects/README.md).
> Read [projects/README.md § Things you must know](projects/README.md#things-you-must-know-before-citing-these-projects)
> before your next interview: several older talking points no longer match the code.

**The one-line strategy:** your RAG, MCP, multi-agent and LLM-integration evidence is *above*
the bar for a 3–6 yr role. You're losing points on **named tools** (LangGraph, LangSmith, RTL,
Kubernetes, SAST/DAST) and **Python depth**. The [capstone](13-capstone-build-plan.md) is one
project that closes every named-tool gap at once, in the JD's exact stack.

---

## 3. The files

Every learning module has the same shape:

```
🟢 Level 1: Basics        ← recall the fundamentals from zero
🟡 Level 2: Intermediate  ← build a working version
🔴 Level 3: Advanced      ← what a senior engineer adds for production
🔧 Integration recipe     ← step-by-step code for wiring it into a real app
🔗 You already did this   ← links into your own code (projects/)
✅ Self-check             ← answer out loud, don't read
⚠️ Traps                  ← the mistakes interviewers fish for
```

| # | File | Covers |
|---|---|---|
| 00 | [00-roadmap.md](00-roadmap.md) | 16-week plan basic → advanced, weekly build tasks, the self-assessment |
| 01 | [01-python-for-ai-backends.md](01-python-for-ai-backends.md) | Python from basics to typing, generators, decorators, context managers, **AsyncIO**, threads vs processes, the GIL |
| 02 | [02-fastapi-async-pydantic-sqlalchemy.md](02-fastapi-async-pydantic-sqlalchemy.md) | FastAPI, Pydantic v2, SQLAlchemy 2.0 async, Alembic, dependency injection, auth, streaming (SSE), background work |
| 03 | [03-react-nextjs-typescript-for-ai-ui.md](03-react-nextjs-typescript-for-ai-ui.md) | React/Next.js/TS refresher, **AI-UI patterns** (streaming chat, tool-call rendering, citations, agent progress, HITL approval), Tailwind + MUI, data-heavy dashboards |
| 04 | [04-llm-fundamentals-sdks-tool-calling.md](04-llm-fundamentals-sdks-tool-calling.md) | Tokens, context, prompts, OpenAI/Claude/Gemini SDKs, structured output, **function calling**, the agent loop by hand, token-limit optimization |
| 05 | [05-rag-and-vector-databases.md](05-rag-and-vector-databases.md) | Embeddings, chunking, pgvector/Qdrant, hybrid + RRF, **re-ranking**, citation accuracy, RAG evaluation |
| 06 | [06-agents-langchain-langgraph.md](06-agents-langchain-langgraph.md) | LangChain (LCEL, tools, retrievers), **LangGraph** (state, nodes, edges, checkpointers, interrupts), multi-agent supervisor, short- and long-term memory |
| 07 | [07-mcp-and-service-integration.md](07-mcp-and-service-integration.md) | **MCP** from zero, building servers in Python, consuming MCP from LangGraph, third-party APIs, OAuth, webhooks, retries |
| 08 | [08-databases-and-data-modelling.md](08-databases-and-data-modelling.md) | Relational design, indexes, transactions, NoSQL, vector schema, the **data model of an AI app** (threads, runs, documents, chunks, evals) |
| 09 | [09-testing-pytest-jest-rtl.md](09-testing-pytest-jest-rtl.md) | Unit/integration/functional/smoke/E2E, **PyTest**, **Jest**, **React Testing Library**, mocking LLMs, testing agents, TDD |
| 10 | [10-observability-and-evals.md](10-observability-and-evals.md) | Tracing, **LangSmith**, **Arize Phoenix**, OpenTelemetry, latency/cost/accuracy metrics, eval datasets, LLM-as-judge, evals in CI |
| 11 | [11-devsecops-docker-k8s-cicd-cloud.md](11-devsecops-docker-k8s-cicd-cloud.md) | Docker, Compose, **Kubernetes**, GitHub Actions, **SAST/DAST/SCA/CVE** gates, secrets, AWS/Azure, releases and rollbacks |
| 12 | [12-solution-design-requirement-to-architecture.md](12-solution-design-requirement-to-architecture.md) | Turning a business requirement into modules, architecture, data structures and APIs, with a worked example |
| 13 | [13-capstone-build-plan.md](13-capstone-build-plan.md) | **"Insight Copilot"**: the JD-2 product built in the JD stack, in 8 vertical slices |
| 14 | [14-interview-qa.md](14-interview-qa.md) | Role-specific Q&A, project-grilling scripts, behavioural (ownership, off-hours), questions to ask |
| — | [projects/](projects/README.md) | **How your own code actually works**: one plain-language walkthrough per project |

---

## 4. How to use this

1. **Week 0:** take the self-assessment in [00-roadmap.md](00-roadmap.md). Read
   [projects/README.md](projects/README.md) and the walkthrough of whichever project you'd lead
   with in an interview.
2. **Learning:** go module by module. Read 🟢, *type* (don't paste) the 🟡 code, and treat 🔴 as
   the interview layer.
3. **Building:** run the [capstone](13-capstone-build-plan.md) slices in parallel with the
   modules. Slice N needs modules up to N. A project you built yourself in the JD stack beats any
   amount of reading.
4. **Before an interview:** [14-interview-qa.md](14-interview-qa.md) plus the "Say it in an
   interview" section of the project walkthroughs you'll cite.

**Rule carried over from the rest of the kit:** never claim a number or a tool you can't defend.
Every module ends with what you can honestly say *today*.

---

## 5. Volatile facts (as of 2026-10)

Framework APIs rot fast. Everything version-sensitive is quarantined here. Refresh this table,
not the modules.

| Thing | State as of 2026-10 | Check |
|---|---|---|
| LangChain | 1.x line. `create_agent` in `langchain.agents` replaced the old `AgentExecutor` / `initialize_agent` | docs.langchain.com |
| LangGraph | 1.x. `StateGraph`, `START`/`END`, `MessagesState`, `ToolNode`, `tools_condition`, checkpointers (`InMemorySaver`, Postgres/SQLite savers), `interrupt()` + `Command(resume=...)`, `Store` for long-term memory | langchain-ai.github.io/langgraph |
| MCP | Spec revisions are date-stamped. Transports: **stdio** and **Streamable HTTP** (the older HTTP+SSE transport is deprecated). OAuth 2.1 for remote servers. Python SDK `mcp` ships `FastMCP` | modelcontextprotocol.io |
| `langchain-mcp-adapters` | `MultiServerMCPClient({...})` → `await client.get_tools()` | GitHub langchain-ai/langchain-mcp-adapters |
| Claude models | `claude-opus-5-5` (default), `claude-sonnet-5-5`, `claude-haiku-5-5` | platform.claude.com/docs |
| Claude API quirks | `temperature`/`top_p`/`top_k` are **rejected** on the current API version. Structured output via `output_config.format` / `client.messages.parse()`. Forced `tool_choice` (`any`/`tool`) returns 400 on the newest models, so use `auto` + `strict: true` | platform.claude.com/docs |
| OpenAI | Chat Completions still works; the **Responses API** is the newer recommended surface | platform.openai.com/docs |
| Gemini | `google-genai` SDK (`from google import genai`) replaced `google-generativeai` | ai.google.dev |
| Pydantic | v2 (`model_dump`, `model_validate`, `field_validator`, `ConfigDict`) | docs.pydantic.dev |
| SQLAlchemy | 2.0 style (`select()`, `Mapped[...]`, `mapped_column`, `AsyncSession`) | docs.sqlalchemy.org |
| Next.js | App Router, Server Components, Server Actions, Route Handlers | nextjs.org/docs |
| Observability | LangSmith (LangChain's), Arize **Phoenix** (open source, OpenTelemetry/OpenInference based), Langfuse (open source) | vendor docs |
