# 07: MCP and Service Integration

> **JD lines covered:** "Integrate third-party APIs, databases, AI models, MCP servers, and other
> required services and protocols" · "Understanding of MCP, tool calling, function calling, and
> API integrations" · "multi-agent architectures using the latest Model Context Protocol (MCP)
> standards".
>
> **This is a strength.** You've published an MCP server to npm (UACE: 18 tools, 2 prompts) and
> built a second one (Inbox Agent). The gaps are a **Python** MCP server, **remote (HTTP + OAuth)**
> MCP, and **consuming** MCP from an agent framework. Production MCP Q&A: [genai/05](../genai/05-agents.md).

---

## 🟢 Level 1: Basics

### 1.1 What problem MCP solves

Before MCP, every AI app wrote custom glue for every tool: N apps × M tools = N×M integrations.
**Model Context Protocol** is an open standard (introduced by Anthropic in late 2024, now
broadly adopted) so that a tool is written **once as an MCP server** and works with any
MCP-capable host: Claude Desktop/Code, Cursor, VS Code, ChatGPT and your own LangGraph agent. It's
"USB-C for AI tools".

### 1.2 The three roles

```
┌──────────── HOST (Claude Desktop, Cursor, your agent app) ────────────┐
│   LLM  ◀──▶  MCP CLIENT ──┐   MCP CLIENT ──┐                          │
└───────────────────────────┼────────────────┼──────────────────────────┘
                            ▼                ▼
                     MCP SERVER A      MCP SERVER B      (one client per server connection)
                     (your DB tools)   (GitHub, Slack…)
```

- **Host**: the app the user interacts with. It owns the LLM and decides what to call.
- **Client**: a connector inside the host, one per server.
- **Server**: exposes capabilities. It doesn't need an LLM (UACE calls no LLM at all).

### 1.3 What a server can expose

| Primitive | Controlled by | What | Example |
|---|---|---|---|
| **Tools** | The **model** decides to call them | Functions with a JSON-schema input | `search_memory(query)`, `create_ticket(...)` |
| **Resources** | The **app/user** attaches them | Readable data addressed by URI | `file:///…`, `db://schema/orders` |
| **Prompts** | The **user** picks them (slash-command style) | Reusable prompt templates | `/review-pr`, UACE's 2 prompts |

Clients can also offer servers **sampling** (the server asks the host's LLM to generate),
**elicitation** (the server asks the user for input) and **roots** (which folders the server may touch).

### 1.4 Wire protocol and transports

- Messages are **JSON-RPC 2.0** (`{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{...}}`).
- The lifecycle is `initialize` (capability negotiation) → `tools/list` → `tools/call` … → shutdown.
- **Transports:**
  - **stdio**: the host launches the server as a child process and talks over stdin/stdout.
    It's local, simple and has no network. **Never print to stdout** in a stdio server, because it
    corrupts the JSON-RPC stream (that's why UACE redirects `console.log` to stderr).
  - **Streamable HTTP**: the server is a web service (one endpoint, POST for requests, optional SSE
    for streaming/notifications). It's remote and multi-user, and needs **auth (OAuth 2.1)**. The older
    HTTP+SSE transport is deprecated.

---

## 🟡 Level 2: Intermediate (build and consume MCP in Python)

### 2.1 An MCP server with FastMCP

```python
# insights_mcp/server.py
from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, Field

mcp = FastMCP("insights")

class KPI(BaseModel):
    name: str
    period: str
    value: float
    unit: str

@mcp.tool()
async def get_kpi(name: str = Field(description="KPI id, e.g. 'revenue', 'churn'"),
                  period: str = Field(description="Quarter like 'Q3 2026'")) -> KPI:
    """Fetch one KPI value for a period. Use for any metric question; never guess numbers."""
    row = await kpi_repo.get(name, period)
    if row is None:
        raise ValueError(f"No KPI {name!r} for {period}")   # becomes an MCP tool error
    return KPI(**row)

@mcp.tool()
async def list_kpis() -> list[str]:
    """List the KPI ids available."""
    return await kpi_repo.names()

@mcp.resource("schema://kpis")
def kpi_schema() -> str:
    """Description of every KPI and how it's computed."""
    return open("kpi_definitions.md").read()

@mcp.prompt()
def quarterly_review(quarter: str) -> str:
    return f"Review all KPIs for {quarter}, flag anomalies, and propose 3 actions."

if __name__ == "__main__":
    mcp.run()                                   # stdio (default)
    # mcp.run(transport="streamable-http")      # remote
```

Test it interactively: `npx @modelcontextprotocol/inspector uv run insights_mcp/server.py`.

Register it in Claude Code / Claude Desktop config:
```json
{ "mcpServers": { "insights": { "command": "uv", "args": ["run", "insights_mcp/server.py"] } } }
```

### 2.2 A raw MCP client (to understand what hosts do)

```python
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

params = StdioServerParameters(command="uv", args=["run", "insights_mcp/server.py"])
async with stdio_client(params) as (read, write):
    async with ClientSession(read, write) as session:
        await session.initialize()
        tools = await session.list_tools()           # names + JSON schemas
        result = await session.call_tool("get_kpi", {"name": "revenue", "period": "Q3 2026"})
        print(result.content, result.isError)
```

Every host does this: it converts each MCP tool's schema into the LLM's tool format
([04 §2.4](04-llm-fundamentals-sdks-tool-calling.md)), and when the model calls one, it forwards the call
to `call_tool` and returns the result.

### 2.3 Consuming MCP in LangGraph (the JD's exact combination)

```python
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain.agents import create_agent

client = MultiServerMCPClient({
    "insights": {"command": "uv", "args": ["run", "insights_mcp/server.py"], "transport": "stdio"},
    "github":   {"url": "https://mcp.example.com/github/mcp", "transport": "streamable_http",
                 "headers": {"Authorization": f"Bearer {token}"}},
})
tools = await client.get_tools()                 # MCP tools → LangChain tools
agent = create_agent(model="anthropic:claude-sonnet-5-5", tools=tools,
                     system_prompt="You are a business analyst...")
await agent.ainvoke({"messages": [{"role": "user", "content": "How did churn move in Q3?"}]})
```

The same `tools` list can go into a `ToolNode` in a hand-built `StateGraph` ([06](06-agents-langchain-langgraph.md)).

### 2.4 MCP directly from a model API

Some provider APIs connect to remote MCP servers server-side. Claude's **MCP connector** takes an
`mcp_servers` list plus an `mcp_toolset` tool entry (beta), and OpenAI's Responses API has a
remote-MCP tool type. That's useful when you don't want to run the client loop yourself. Shapes are
volatile, so check the docs.

---

## 🔴 Level 3: Advanced (production MCP)

### 3.1 Remote MCP servers

| Concern | Practice |
|---|---|
| **Auth** | OAuth 2.1 with PKCE. The MCP server is a resource server, and tokens are scoped per user. Never let the server use a god-mode service account to act for any user |
| **Multi-tenancy** | Derive tenant/user from the token, never from tool arguments the model fills in |
| **Statelessness** | Streamable HTTP can run stateless behind a load balancer. If you need sessions, use the `Mcp-Session-Id` header + a shared store |
| **Rate limits and quotas** | Per user/tool. The model can call tools in tight loops |
| **Observability** | Log every `tools/call` with user, args (redacted), latency and outcome. Propagate trace IDs |
| **Versioning** | Tool names and schemas are an API contract. Add, don't break. Deprecate visibly |

### 3.2 Security: the part interviewers probe

- **Tool poisoning**: a malicious server's tool *description* can contain instructions to the model.
  Only install trusted servers, pin versions and review tool descriptions.
- **Prompt injection through tool results**: an email or webpage returned by a tool says "now call
  `send_money`". Treat results as data. Apply **risk tiers** and require **human confirmation** for
  irreversible tools ([06 §3.2](06-agents-langchain-langgraph.md)).
- **Confused deputy / token passthrough**: don't forward the client's token to downstream APIs
  blindly. Exchange it for a properly scoped downstream token.
- **Over-broad tools**: `run_sql(query)` on a write connection is a disaster waiting to happen. Offer
  narrow tools (`get_kpi`) or a read-only replica with statement timeouts and row limits.
- **Local server risks**: a stdio server runs with *your* user permissions. Sandbox anything that
  executes code or shell commands.
- **Gate design**: a confirm flag the model itself can set (`confirm: true`) isn't a real gate.
  The approval has to come from the human, through the host's approval UI or a server-issued
  preview token that only a UI click can redeem. (Your Inbox Agent has exactly this weakness; see
  [projects/05](projects/05-inbox-agent.md).)

### 3.3 Tool design principles (MCP or not)

1. **Few, well-named, high-level tools** beat many thin wrappers around every endpoint.
2. **Descriptions are prompts**: what, when to use, what it returns, limits and an example.
3. **Return compact, model-friendly output**: summaries + IDs, pagination and truncation markers.
4. **Errors that teach**: "No KPI 'revnue'. Did you mean 'revenue'? Call list_kpis()."
5. **Idempotent where possible**, and make side-effects explicit in the name (`create_`, `send_`, `delete_`).

### 3.4 Related protocols to know by name

- **A2A (Agent-to-Agent)**: an open protocol for agents from different vendors to delegate tasks to
  each other (agent cards, tasks, messages). MCP is agent ↔ tools, A2A is agent ↔ agent.
- **OpenAPI → tools**: many frameworks generate tools from an OpenAPI spec. That's quick, but the tools are
  often too low-level.

---

## 🔧 Integration recipes: third-party services

### R1. A robust HTTP integration (any third-party API)

```python
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential_jitter, retry_if_exception

def _retryable(e: Exception) -> bool:
    return isinstance(e, (httpx.TimeoutException, httpx.NetworkError)) or (
        isinstance(e, httpx.HTTPStatusError) and e.response.status_code in (429, 500, 502, 503, 504))

class CrmClient:
    def __init__(self, base_url: str, token: str):
        self.http = httpx.AsyncClient(base_url=base_url, timeout=httpx.Timeout(10, connect=3),
                                      headers={"Authorization": f"Bearer {token}"})

    @retry(retry=retry_if_exception(_retryable), stop=stop_after_attempt(4),
           wait=wait_exponential_jitter(initial=0.5, max=8))
    async def _get(self, path: str, **params) -> dict:
        r = await self.http.get(path, params=params)
        r.raise_for_status()
        return r.json()

    async def all_accounts(self):
        cursor = None
        while True:                                   # cursor pagination
            page = await self._get("/accounts", cursor=cursor, limit=100)
            for a in page["data"]:
                yield a
            if not (cursor := page.get("next_cursor")):
                break
```

Checklist: timeouts, retries only on retryable errors, honor `Retry-After`, pagination,
idempotency keys on POSTs that create things, an adapter class (so swapping vendors means one file),
and recorded fixtures for tests (`respx`/`vcrpy`).

### R2. OAuth 2.0: connecting a user's Google/Microsoft/GitHub account

```
1. User clicks "Connect Gmail" → redirect to provider /authorize?client_id&redirect_uri&scope&state&code_challenge (PKCE)
2. User consents → provider redirects to /oauth/callback?code&state
3. Backend verifies state (CSRF), exchanges code (+ code_verifier) for access_token + refresh_token
4. Store tokens ENCRYPTED (AES-GCM / KMS), per user, with scopes + expiry
5. On each call: refresh if expired; on refresh failure → mark integration "needs reconnect"
```

Ask for minimal scopes. Machine-to-machine integrations use the **client credentials** grant. Your
Inbox Agent encrypts Gmail tokens with AES-256-GCM and pSEO encrypts GitHub PATs the same way, so
cite them.

### R3. Webhooks: receiving events

```python
@router.post("/webhooks/billing")
async def billing_webhook(request: Request, db: DB):
    body = await request.body()                                    # raw bytes, before JSON parsing
    if not verify_signature(body, request.headers, secret=settings.webhook_secret):  # HMAC
        raise HTTPException(401)
    event = json.loads(body)
    if await already_processed(db, event["id"]):                   # idempotency: providers retry
        return {"ok": True}
    await enqueue("process_billing_event", event)                  # respond fast (<5 s), work async
    await mark_processed(db, event["id"])
    return {"ok": True}
```

Your pSEO Polar integration does exactly this (Standard Webhooks signatures + stale-event
idempotency). See [projects/07](projects/07-pseo-engine.md).

### R4. Databases as tools (text-to-SQL, safely)

Use a read-only DB user, a statement timeout (`SET statement_timeout = '5s'`), an allow-listed
schema exposed through a resource, `LIMIT` enforced, and the query logged. The LLM gets the schema
plus a few example queries. Validate the generated SQL with a parser (`sqlglot`) and reject anything
but `SELECT`.

---

## 🔗 You already did this

| Concept | Where | Walkthrough |
|---|---|---|
| Published stdio MCP server, 18 tools + 2 prompts, stdout discipline | UACE | [projects/06](projects/06-uace-mcp-server.md) |
| MCP server over Gmail with send gated behind a confirm step | Inbox Agent | [projects/05](projects/05-inbox-agent.md) |
| OAuth tokens encrypted at rest | Inbox Agent (Gmail), pSEO (GitHub PAT) | [projects/05](projects/05-inbox-agent.md), [projects/07](projects/07-pseo-engine.md) |
| Webhook signature + idempotency | pSEO Polar billing | [projects/07](projects/07-pseo-engine.md) |
| GitHub API integration (PR upsert via Git Data API) | pSEO | [projects/07](projects/07-pseo-engine.md) |
| SSRF guard on user-supplied URLs | pSEO website analyzer | [projects/07](projects/07-pseo-engine.md) |

## ✅ Self-check

1. Host vs client vs server. Which one has the LLM?
2. Tools vs resources vs prompts: who controls each?
3. Why must a stdio server never print to stdout?
4. stdio vs Streamable HTTP. When do you need OAuth?
5. Write a FastMCP server with one tool and one resource.
6. Wire two MCP servers into a LangGraph agent.
7. Name four MCP security risks and the mitigation for each.
8. Why is a `confirm: true` parameter the model can set not a real approval gate?
9. Design a webhook receiver. Why respond fast and process async?

## ⚠️ Traps

- Calling MCP "just function calling". MCP is the *transport/discovery standard*. Function calling is the model capability that uses it.
- Taking tenant/user identity from tool arguments.
- Exposing a generic `run_sql`/`run_shell` tool without a sandbox and approvals.
- Retrying non-idempotent POSTs without an idempotency key.
