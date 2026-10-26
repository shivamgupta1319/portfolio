# 06: Agents with LangChain and LangGraph

> **JD lines covered:** "AI agents, tool calling, and frameworks such as LangChain and LangGraph" ·
> "agent architectures using LangGraph and custom frameworks that support long-term memory,
> tool/function calling, and task delegation" · "Multi-Agent Systems" · "design for long-term
> memory in AI agents".
>
> **This is your #1 gap.** You've built four agent systems *by hand*, which is a strength, because you
> understand what the frameworks abstract. But neither JD will accept "I'd rather write my own"
> without proof you know LangGraph. This module plus the [capstone](13-capstone-build-plan.md) fixes that.
>
> Pattern theory and production concerns in interview depth: [genai/05](../genai/05-agents.md).
> API names are volatile; see the [README table](README.md#5-volatile-facts-as-of-2026-10).

---

## 🟢 Level 1: Basics

### 1.1 Workflow vs agent: the most important distinction

| | Workflow | Agent |
|---|---|---|
| Who decides the next step? | **Your code** (fixed graph) | **The LLM** (loops until done) |
| Predictability | High | Lower |
| Cost/latency | Bounded | Variable |
| Use when | Steps are known: extract → classify → summarize | Steps depend on what's discovered: research, debugging, multi-tool tasks |

Senior answer: **start with a workflow, and add agency only where it's needed.** LangGraph is good
at this because the same graph can mix fixed edges and LLM-decided edges.

### 1.2 Agent patterns you should be able to draw

| Pattern | Shape | Your project |
|---|---|---|
| **Prompt chaining** | A → B → C, each an LLM call | pSEO generate → sanitize → quality |
| **Routing** | Classifier picks one branch | AgentSystem's LLM router (coder/executor/architect) |
| **Parallelization** | Fan out N calls, merge | — |
| **ReAct / tool loop** | Think → act (tool) → observe → repeat | trading-agent, AgentSystem Executor |
| **Plan-and-execute** | Planner makes a list, executor does each step | AgentSystem Architect → Planner → per-task |
| **Orchestrator–workers / supervisor** | Boss delegates subtasks to specialist agents | AgentSystem orchestrator |
| **Evaluator–optimizer / reflection** | Generate → critique → revise | AgentSystem Coder → Reviewer, Evaluator `fix` feedback |
| **Human-in-the-loop** | Pause for approval before risky steps | Inbox Agent confirm gate |

You've built almost every pattern on this list. Now you need the names and the LangGraph version.

### 1.3 LangChain vs LangGraph

- **LangChain** = the building blocks: a uniform **chat model** interface across providers,
  messages, prompt templates, **tools**, output parsers, document loaders, text splitters, embeddings,
  vector stores and **retrievers**, plus **LCEL** for chaining them.
- **LangGraph** = the **orchestration runtime** for stateful, multi-step, multi-actor apps: a graph of
  nodes that read and write shared **state**, with **checkpointing** (memory, resume, time travel),
  **interrupts** (human in the loop), streaming and durable execution.
- In LangChain 1.x, `create_agent` (the high-level agent) *runs on LangGraph*. So: LangChain for
  components, LangGraph for control flow.

Other frameworks to name and compare: **OpenAI Agents SDK**, **Claude Agent SDK**, **CrewAI**
(role-based crews), **AutoGen/AG2** (conversational multi-agent), **LlamaIndex** (RAG-first),
**Pydantic AI** (typed, lightweight), **Vercel AI SDK** (TS, which you've used), **Google ADK**.

---

## 🟡 Level 2: LangChain building blocks

### 2.1 Chat models and messages

```python
from langchain.chat_models import init_chat_model
from langchain_core.messages import SystemMessage, HumanMessage

llm = init_chat_model("anthropic:claude-sonnet-5-5")           # or "openai:<model>", "google_genai:<model>"
# equivalently: from langchain_anthropic import ChatAnthropic; ChatAnthropic(model="claude-sonnet-5-5")

ai = llm.invoke([SystemMessage("Be concise."), HumanMessage("What is RAG?")])
print(ai.content, ai.usage_metadata)          # {'input_tokens':..., 'output_tokens':...}

for chunk in llm.stream("Explain HNSW"):      # streaming
    print(chunk.content, end="")
await llm.ainvoke("...")                      # async
llm.batch(["q1", "q2", "q3"])                 # concurrent
```

Message types: `SystemMessage`, `HumanMessage`, `AIMessage` (may carry `.tool_calls`) and
`ToolMessage` (a tool result, linked by `tool_call_id`).

### 2.2 Prompt templates + LCEL (`|` pipes)

```python
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser

prompt = ChatPromptTemplate.from_messages([
    ("system", "You summarize documents for {audience}."),
    MessagesPlaceholder("history"),
    ("human", "{text}"),
])
chain = prompt | llm | StrOutputParser()          # Runnable: invoke / stream / batch / ainvoke
summary = chain.invoke({"audience": "executives", "history": [], "text": doc})
```

Every component is a **Runnable** with the same methods, which is why they compose.
`RunnableParallel({...})` runs branches concurrently. `RunnablePassthrough` forwards input.
`RunnableLambda(fn)` wraps any function.

### 2.3 Structured output

```python
from pydantic import BaseModel, Field
class Triage(BaseModel):
    category: Literal["billing", "bug", "feature", "other"]
    urgency: int = Field(ge=1, le=5)
    summary: str

triage = llm.with_structured_output(Triage)       # provider-native schema enforcement
t: Triage = triage.invoke("My invoice is charged twice and I'm furious")
```

### 2.4 Tools

```python
from langchain_core.tools import tool

@tool
def get_revenue(region: str, quarter: str) -> dict:
    """Return revenue in INR crore for a region and quarter like 'Q3 2026'.
    Use for any revenue or sales figure question."""
    return finance_api.revenue(region, quarter)

llm_t = llm.bind_tools([get_revenue])
ai = llm_t.invoke("What was North revenue in Q3 2026?")
ai.tool_calls   # [{'name': 'get_revenue', 'args': {'region': 'North', 'quarter': 'Q3 2026'}, 'id': '...'}]
```

The docstring becomes the tool description and the type hints become the JSON schema. For complex
args, pass `args_schema=SomePydanticModel`.

### 2.5 Retrievers (RAG in LangChain)

```python
from langchain_postgres import PGVector
from langchain_openai import OpenAIEmbeddings

store = PGVector(embeddings=OpenAIEmbeddings(model="text-embedding-3-small"),
                 collection_name="docs", connection=DB_URL, use_jsonb=True)
store.add_documents(docs)                                     # Document(page_content, metadata)
retriever = store.as_retriever(search_kwargs={"k": 5, "filter": {"tenant_id": tid}})

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | rag_prompt | llm | StrOutputParser()
)
```

For your hybrid + re-rank pipeline from [05](05-rag-and-vector-databases.md), wrap your own service
as a tool or a custom `BaseRetriever` rather than forcing it into the defaults.

### 2.6 The high-level agent (`create_agent`)

```python
from langchain.agents import create_agent

agent = create_agent(
    model="anthropic:claude-sonnet-5-5",
    tools=[get_revenue, search_knowledge_base],
    system_prompt="You are a finance analyst. Use tools for every number. Cite sources.",
)
out = agent.invoke({"messages": [{"role": "user", "content": "Compare North vs South Q3"}]})
print(out["messages"][-1].content)
```

That's a tool loop in a few lines. Use it for simple agents. Drop down to a hand-built `StateGraph`
when you need custom state, branching, approvals or multiple agents. That's where the interview
questions go.

---

## 🟡 Level 2 continued: LangGraph from zero

### 2.7 The three concepts

1. **State**: a typed dict shared by all nodes. Each key can have a **reducer** that says how
   updates merge (e.g. `add_messages` *appends* messages instead of overwriting them).
2. **Nodes**: plain functions `state → partial update`.
3. **Edges**: fixed (`A → B`) or **conditional** (a function looks at the state and returns the next node).

### 2.8 Build the tool-calling agent as a graph

This is the same loop as [04 §2.5](04-llm-fundamentals-sdks-tool-calling.md), now as a graph:

```python
from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import InMemorySaver

class State(TypedDict):
    messages: Annotated[list, add_messages]     # reducer: append, don't replace

tools = [get_revenue, search_knowledge_base]
llm_t = llm.bind_tools(tools)

def agent(state: State) -> dict:
    return {"messages": [llm_t.invoke([SYSTEM, *state["messages"]])]}

g = StateGraph(State)
g.add_node("agent", agent)
g.add_node("tools", ToolNode(tools))             # executes every tool_call in the last AIMessage
g.add_edge(START, "agent")
g.add_conditional_edges("agent", tools_condition)   # → "tools" if tool_calls else END
g.add_edge("tools", "agent")                     # loop back with results

graph = g.compile(checkpointer=InMemorySaver())

cfg = {"configurable": {"thread_id": "user-42-chat-1"}, "recursion_limit": 20}   # loop breaker
graph.invoke({"messages": [("user", "North revenue Q3?")]}, cfg)
graph.invoke({"messages": [("user", "And South?")]}, cfg)     # remembers: same thread_id
```

```
START → agent ──tool_calls?──yes──▶ tools ─┐
          ▲            │no                  │
          └────────────┼────────────────────┘
                       ▼
                      END
```

What each piece gives you over the hand-written loop:
- `checkpointer` + `thread_id`: the conversation state is saved after **every step**. That gives you
  multi-turn memory, resume after a crash, and time travel.
- `recursion_limit`: the max-steps safety net.
- `ToolNode`: runs the tool calls (in parallel when there are several) and turns exceptions into
  error `ToolMessage`s.
- Streaming of tokens *and* node updates (`stream_mode=["messages","updates"]`), as used in
  [02's integration recipe](02-fastapi-async-pydantic-sqlalchemy.md).

### 2.9 Custom state, non-chat workflows

LangGraph isn't only for chat. Here's a deterministic workflow with one LLM-decided branch:

```python
class ReportState(TypedDict):
    question: str
    plan: list[str]
    findings: Annotated[list[str], operator.add]     # reducer: concatenate lists
    draft: str
    critique: str
    revisions: int

def plan(s):     return {"plan": planner.invoke(s["question"]).steps}
def research(s): return {"findings": [researcher.invoke(step) for step in s["plan"]]}
def write(s):    return {"draft": writer.invoke({"q": s["question"], "f": s["findings"]}),
                         "revisions": s.get("revisions", 0) + 1}
def review(s):   return {"critique": critic.invoke(s["draft"])}
def should_revise(s): return "write" if "REVISE" in s["critique"] and s["revisions"] < 3 else END

g = StateGraph(ReportState)
for name, fn in [("plan", plan), ("research", research), ("write", write), ("review", review)]:
    g.add_node(name, fn)
g.add_edge(START, "plan"); g.add_edge("plan", "research"); g.add_edge("research", "write")
g.add_edge("write", "review"); g.add_conditional_edges("review", should_revise)
report_graph = g.compile(checkpointer=checkpointer)
```

That's **plan-and-execute + evaluator–optimizer**, the same shape as your AgentSystem's Coder →
Reviewer retry.

---

## 🔴 Level 3: Advanced (memory, HITL, multi-agent, production)

### 3.1 Memory: short-term vs long-term

| | Short-term (thread memory) | Long-term (cross-thread memory) |
|---|---|---|
| Scope | One conversation (`thread_id`) | A user/org across all conversations |
| LangGraph mechanism | **Checkpointer** (InMemorySaver → **Postgres**/SQLite/Redis saver) | **Store** (`InMemoryStore` → `PostgresStore`) with namespaces + optional semantic search |
| Holds | Messages, intermediate state | Facts ("prefers INR"), episodes (past successful runs), procedures (refined instructions) |
| Grows how | Every step | When you decide to write (in the hot path, or a background "memory manager") |
| Problem | Context overflow, so **trim/summarize** | Staleness, conflicting facts, privacy |

Three kinds of long-term memory to name: **semantic** (facts about the user/domain),
**episodic** (past experiences, i.e. "last time this approach worked"), **procedural** (rules and
prompts the agent refines about itself).

```python
from langgraph.store.memory import InMemoryStore            # prod: PostgresStore
from langgraph.store.base import BaseStore
from langchain_core.runnables import RunnableConfig

store = InMemoryStore(index={"embed": embeddings, "dims": 1536})   # enables semantic search

def agent(state: State, config: RunnableConfig, *, store: BaseStore):
    user = config["configurable"]["user_id"]
    ns = ("memories", user)
    facts = store.search(ns, query=state["messages"][-1].content, limit=5)
    mem = "\n".join(f"- {f.value['text']}" for f in facts)
    reply = llm_t.invoke([SystemMessage(f"{SYSTEM}\nKnown about user:\n{mem}"), *state["messages"]])
    return {"messages": [reply]}

def remember(state: State, config: RunnableConfig, *, store: BaseStore):
    new_facts = extractor.invoke(state["messages"][-4:])     # structured: list[str] of durable facts
    for f in new_facts.facts:
        store.put(("memories", config["configurable"]["user_id"]), str(uuid4()), {"text": f})
    return {}

graph = g.compile(checkpointer=checkpointer, store=store)
```

Your AgentSystem does the long-term half by hand (Qdrant `fix` / `code_pattern` / `error`
memories recalled next run). Its Redis "working memory" is written but never read back, so don't
call it two-tier, and UACE does layered memory (working /
session / long-term) with staleness flags and pruning. Say so in the interview: **"I built this
memory split by hand; in LangGraph it maps to checkpointer vs store."**

**Short-term trimming:**
```python
from langchain_core.messages import trim_messages
trimmed = trim_messages(state["messages"], max_tokens=6000, strategy="last",
                        token_counter=llm, start_on="human", include_system=True)
```
Or keep a `summary` key in state and summarize old turns in a node once there are more than N messages.

### 3.2 Human-in-the-loop with `interrupt()`

```python
from langgraph.types import interrupt, Command

def send_email_node(state):
    decision = interrupt({                       # pauses the graph; state is checkpointed
        "action": "send_email",
        "to": state["draft"]["to"],
        "body": state["draft"]["body"],
    })
    if decision["type"] == "reject":
        return {"messages": [("user", "The user rejected sending. Ask what to change.")]}
    draft = decision.get("edited") or state["draft"]
    gmail.send(**draft)                          # irreversible: only after approval
    return {"messages": [("user", f"Email sent to {draft['to']}.")]}

# 1st call runs until the interrupt → the stream emits "__interrupt__" with the payload → UI shows ApprovalCard
graph.invoke({"messages": [("user", "Email the Q3 summary to the CFO")]}, cfg)
# later, a different HTTP request, maybe hours later, possibly on a different server:
graph.invoke(Command(resume={"type": "approve"}), cfg)
```

Why this is powerful: the pause is **durable**. It survives restarts because it's in the
checkpointer (use Postgres in production). Rules: code *before* `interrupt()` in that node
re-runs on resume, so keep side effects after it. Put the interrupt in a dedicated approval node.
The UI side is in [03 §3.4](03-react-nextjs-typescript-for-ai-ui.md).

### 3.3 Multi-agent: supervisor and task delegation

```
                ┌──────────── supervisor (router LLM, structured output) ────────────┐
                ▼                         ▼                         ▼               │
        data_analyst agent        research agent            writer agent           │
        (SQL tool, charts)        (RAG + web tools)         (report format)        │
                └─────────────────────────┴─────────────────────────┴──────► back to supervisor → FINISH
```

```python
class Route(BaseModel):
    next: Literal["data_analyst", "researcher", "writer", "FINISH"]
    instruction: str = Field(description="What the chosen agent should do next")

class TeamState(MessagesState):
    next: str

supervisor_llm = llm.with_structured_output(Route)

def supervisor(state: TeamState):
    r = supervisor_llm.invoke([SystemMessage(SUPERVISOR_PROMPT), *state["messages"]])
    return {"next": r.next, "messages": [("user", f"[supervisor → {r.next}] {r.instruction}")]}

analyst    = create_agent(model=llm, tools=[run_sql, make_chart], system_prompt=ANALYST_PROMPT)
researcher = create_agent(model=llm, tools=[search_knowledge_base, web_search], system_prompt=RESEARCH_PROMPT)
writer     = create_agent(model=llm, tools=[], system_prompt=WRITER_PROMPT)

def wrap(agent, name):
    def node(state: TeamState):
        out = agent.invoke({"messages": state["messages"]})
        return {"messages": [AIMessage(out["messages"][-1].content, name=name)]}
    return node

g = StateGraph(TeamState)
g.add_node("supervisor", supervisor)
for name, a in [("data_analyst", analyst), ("researcher", researcher), ("writer", writer)]:
    g.add_node(name, wrap(a, name))
    g.add_edge(name, "supervisor")
g.add_edge(START, "supervisor")
g.add_conditional_edges("supervisor", lambda s: END if s["next"] == "FINISH" else s["next"])
team = g.compile(checkpointer=checkpointer)
```

Variants to know:
- **Handoffs with `Command`**: a node returns `Command(goto="writer", update={...})` to route
  without a central supervisor (a "swarm"-style network).
- **Map-reduce with `Send`**: a conditional edge returns `[Send("analyze_section", {"section": s}) for s in sections]`
  to fan out in parallel, and a reducer (`operator.add`) merges the results.
- **Subgraphs**: a compiled graph used as a node, so each team keeps its own private state.
- Prebuilt helpers: the `langgraph-supervisor` / `langgraph-swarm` packages.

**When *not* to go multi-agent:** each agent hop adds latency, cost and error compounding. Use it
when tools/prompts genuinely conflict (too many tools for one agent, different expertise) or
when parallelism helps. Otherwise use one agent with good tools.

### 3.4 Production concerns

| Concern | LangGraph feature / practice |
|---|---|
| Crash mid-run | Postgres checkpointer. Resume by invoking with the same `thread_id` |
| Flaky tool/LLM | `g.add_node("x", fn, retry_policy=RetryPolicy(max_attempts=3))` |
| Runaway loops | `recursion_limit`, per-run token/cost budget in state, timeouts |
| Debugging | `graph.get_state(cfg)`, `get_state_history(cfg)` (time travel), **LangSmith traces** ([10](10-observability-and-evals.md)) |
| UI progress | `astream(stream_mode=["messages","updates","custom"])`, and the `get_stream_writer()` custom events |
| Concurrency | async nodes (`ainvoke`) + a semaphore around LLM calls |
| Tool safety | Risk tiers, HITL for irreversible actions, authorize tools as the *user* ([07](07-mcp-and-service-integration.md)) |
| Deploy | Graph inside your FastAPI app (this track), or LangGraph Platform/Server |
| Eval | Final-answer evals + **trajectory** evals (did it call the right tools in a sane order?) |

### 3.5 Token-limit design for agents (JD-2: "optimize token limits")

- Keep tool outputs small: summarize, paginate and return IDs plus previews. Fetch details on demand.
- Give sub-agents **isolated context**, and return only their conclusion to the supervisor.
- Trim or summarize thread history. Long-term memory goes in the store and is retrieved selectively.
- Use prompt caching for stable system prompts and tool definitions.
- Use a cheap model for the router/supervisor and worker steps, and a strong model for planning/writing.

---

## 🔧 Integration recipe: end-to-end agent service

```
React (useReducer chat + ApprovalCard)
   │ POST /agent/runs/stream (SSE)          POST /agent/runs/{thread}/resume
   ▼
FastAPI  ── lifespan: AsyncPostgresSaver + PostgresStore + compiled graph
   │        astream(stream_mode=["messages","updates"]) → typed SSE events
   ▼
LangGraph supervisor ──▶ agents ──▶ tools (RAG service, SQL read-replica, MCP servers)
   │
   ├── Postgres: checkpoints (short-term), store (long-term), app tables (threads, runs, feedback)
   └── LangSmith / Phoenix: traces, token/cost/latency, eval datasets
```

```python
# app/agents/runtime.py
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

async def build_graph(db_uri: str):
    cm = AsyncPostgresSaver.from_conn_string(db_uri)
    checkpointer = await cm.__aenter__()          # keep open for app lifetime; close in lifespan
    await checkpointer.setup()                    # creates checkpoint tables (idempotent)
    return team_builder.compile(checkpointer=checkpointer, store=await make_store(db_uri)), cm

# resume endpoint
@router.post("/runs/{thread_id}/resume")
async def resume(thread_id: str, body: ResumeIn, user: CurrentUser, request: Request):
    cfg = {"configurable": {"thread_id": thread_id, "user_id": str(user.id)}}
    await assert_thread_owner(thread_id, user)                   # authz!
    out = await request.app.state.graph.ainvoke(Command(resume=body.model_dump()), cfg)
    return {"messages": [m.content for m in out["messages"][-3:]]}
```

---

## 🔗 You already did this (by hand)

| LangGraph concept | Your hand-built version | Walkthrough |
|---|---|---|
| Supervisor / orchestrator–workers | AgentSystem orchestrator + LLM router | [projects/04](projects/04-agent-system.md) |
| Evaluator–optimizer | Coder → Reviewer retry; Evaluator `fix` fed into the next attempt | [projects/04](projects/04-agent-system.md) |
| Checkpointer (short-term) | *Not really built*: AgentSystem's Redis working memory is write-only, and a BullMQ retry restarts the whole run | [projects/04](projects/04-agent-system.md) |
| Store (long-term, semantic) | Qdrant memories recalled per task; UACE layered memory | [projects/04](projects/04-agent-system.md), [projects/06](projects/06-uace-mcp-server.md) |
| `interrupt()` HITL | Inbox Agent confirm-gated send | [projects/05](projects/05-inbox-agent.md) |
| ToolNode + loop | trading-agent tool loop | [projects/02](projects/02-trading-agent.md) |
| Structured routing | AgentSystem `generateObject` routing schema | [projects/04](projects/04-agent-system.md) |

**What you can say today:** "I've built agent loops, multi-agent orchestration and two-tier
memory from scratch, so I know what LangGraph abstracts." **What you can say after the capstone:**
"…and I've built a supervisor multi-agent system in LangGraph with a Postgres checkpointer, a long-term
store and interrupt-based approvals."

## ✅ Self-check

1. Workflow vs agent. When is an agent the wrong choice?
2. LangChain vs LangGraph in two sentences.
3. Write the tool-calling agent as a `StateGraph` from memory. What does `add_messages` do?
4. What does a checkpointer give you? What's `thread_id`?
5. Checkpointer vs Store. Name the three kinds of long-term memory.
6. Implement an approval step. What re-runs on resume?
7. Draw a supervisor system. How does the supervisor decide? How do you stop it looping?
8. `Send` vs `Command`. When do you use each?
9. Your agent's context grows to 150k tokens over a long session. Fix it.

## ⚠️ Traps

- Claiming LangChain/LangGraph experience you can't code live. Do the capstone first.
- InMemorySaver in production (state lost on restart, not shared across replicas).
- Side effects before `interrupt()` that execute twice on resume.
- Multi-agent for a task one agent with 4 tools could do.
- No `recursion_limit` or budget, which means the agent burns money in a loop.
