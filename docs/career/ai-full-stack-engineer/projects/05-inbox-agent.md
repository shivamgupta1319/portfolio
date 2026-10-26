# Inbox Agent — how your code actually works

**What it is, in plain English:** a local tool that copies the *metadata* (sender, subject,
labels, a short snippet) of your Gmail accounts into a SQLite file, then uses plain rules (no
AI) to find threads where a real person is waiting on your reply. It exposes that data in two
ways: a React dashboard for you, and an **MCP server** for Claude. Through MCP, Claude (Claude
Code or Claude Desktop, on your own subscription) can list what needs a reply, read a thread
live from Gmail, write a draft, and send it, but only after a preview and an explicit
`confirm: true`.

- **Path:** `~/workspace/outlook-dashboard` (the repo name is historical; see below)
- **Stack:** pnpm monorepo, 4 packages (`core`, `mcp`, `server`, `web`) · TypeScript ·
  `@modelcontextprotocol/sdk` (stdio) · Gmail API (`googleapis`) · OAuth loopback flow ·
  SQLite (`better-sqlite3`, WAL) · Express + `ws` · React + Vite + Tailwind · vitest · Docker
  (multi-stage) + nginx
- **Honest status:** working and in use. 9 commits (2026-06-07 to 2026-06-26). **58 vitest tests
  pass** across 4 files in `packages/core/test/` (checked by running `vitest run`). `mcp`,
  `server` and `web` have no tests (`outlook-dashboard/packages/mcp/package.json:14`). Lint is
  "not configured yet" in every package.

> **Two corrections to the brief you may carry in your head.** (1) **No Outlook sync runs.**
> The Microsoft Graph/MSAL code is labelled "dormant" (`outlook-dashboard/packages/core/src/index.ts:41-45`);
> the project pivoted to Gmail because Outlook needed admin consent (`docs/SETUP-GMAIL.md:3-8`).
> (2) **There is no LLM call in the repo.** "Claude summarizes/drafts" means *Claude, as an MCP
> client, does the reasoning*; your code only serves data and executes the send. That was a
> logged decision (`outlook-dashboard/docs/PROGRESS.md:73-79`). `CLAUDE.md` is also stale: it still
> describes MSAL and Graph `conversationId` (`outlook-dashboard/CLAUDE.md:25-26,42`).

---

## JD coverage

| JD requirement | Where | Strength |
|---|---|---|
| MCP server | 7 tools over stdio, `outlook-dashboard/packages/mcp/src/index.ts:55-168` | **Strong** |
| Tool calling (tool *design*) | Zod input schemas + descriptions written for a model, e.g. `send_reply` `:138-164` | **Strong** (you're the tool provider; Claude is the caller) |
| Human-in-the-loop | Confirm-gated send in MCP `:153-159` and REST `outlook-dashboard/packages/server/src/index.ts:184-191`; Preview → Confirm UI `outlook-dashboard/packages/web/src/ThreadDrawer.tsx:41-69,148-173` | **Strong**, with one caveat (below) |
| Multi-agent | None | **Not present** |
| Task delegation | None in code. Claude decides which tool to call | **Not present** |
| Long-term memory | SQLite metadata store, `outlook-dashboard/packages/core/src/store/db.ts:27-56` | **Partial**: it's a data store, not agent memory; no embeddings |
| Short-term memory | Claude's own conversation; nothing in your code | **Not present** |
| Structured output | Tools return JSON text (`outlook-dashboard/packages/mcp/src/index.ts:51-53`); no LLM output is parsed by you | **Partial** |
| Queues / async work | Bounded-concurrency sync (10 in flight) + retry with backoff, `outlook-dashboard/packages/core/src/util/concurrency.ts:2-43`; daily maintenance loop, `outlook-dashboard/deploy/maintain.sh:26-36` | **Partial** (no job queue) |
| React UI | `outlook-dashboard/packages/web/src/App.tsx` (4 views + thread drawer) | **Strong**, responsive grid (`App.tsx:359,368`) |
| Realtime updates | WS server only sends `hello`, `outlook-dashboard/packages/server/src/index.ts:206-211` | **Not present** (stub) |
| Testing | 58 vitest unit tests on the heuristics + crypto, `outlook-dashboard/packages/core/test/*.test.ts` | **Strong** for core; none for mcp/server/web |
| Docker | Multi-stage `outlook-dashboard/Dockerfile:9-45`; compose with server/web/maintain, `outlook-dashboard/docker-compose.yml:10-57` | **Strong** |

---

## The big picture

```
                         Gmail API (OAuth, gmail.modify + gmail.send)
                           ▲ list/get metadata      ▲ threads.get(full)   ▲ messages.send
                           │                        │                     │
  CLI gmail:sync ──────────┤                        │                     │
  maintain (daily 08:00) ──┘                        │                     │
        │ upsertMessages (no bodies)                │                     │
        ▼                                           │                     │
  ┌──────────────── packages/core (all logic) ──────┴─────────────────────┴───┐
  │ store/db.ts (SQLite)  analysis/attention.ts  finance.ts  google/thread.ts │
  └────────────▲──────────────────────────────────────────▲──────────────────┘
               │ thin adapter                             │ thin adapter
     packages/mcp (stdio, 7 tools)              packages/server (Express :5179, /ws stub)
               ▲ JSON-RPC over stdin/stdout             ▲ fetch()
               │                                        │
     Claude Code / Claude Desktop             packages/web (React, Preview → Confirm & send)
     (the LLM: summarize, draft)              (the human writes the reply; no AI)
```

---

## Follow one run end-to-end

### Step 1: sync (metadata only)

`outlook-dashboard/packages/core/src/google/sync.ts:58-106`. First page through every message id
newer than N days (`q: newer_than:${sinceDays}d`, `:69-79`), then fetch each one's **metadata**
with at most 10 requests in flight:

```ts
await mapConcurrent(ids, 10, async (id) => {
  const res = await withRetry(() =>
    gmail.users.messages.get({ userId: 'me', id, format: 'metadata',
      metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Date', 'List-Unsubscribe'] }),
  );
  batch.push(toStoredMessage(account, res.data));
  if (batch.length >= FLUSH_AT) upsertMessages(db, batch.splice(0, batch.length));
});
```

- `format: 'metadata'` is the privacy boundary. **Bodies never reach the disk.**
- `mapConcurrent` (`outlook-dashboard/packages/core/src/util/concurrency.ts:2-19`) is a tiny worker
  pool: N async workers share a `next` index. It's a bounded-parallelism pattern worth knowing.
- `withRetry` (`:24-43`) retries 429, 403 and 5xx with exponential backoff plus jitter (random
  extra delay so retries don't all hit at once).
- `toStoredMessage` (`sync.ts:23-47`) derives flags: `isInbound` (not sent by you),
  `category` from Gmail's `CATEGORY_*` labels, and `hasListUnsubscribe` (a bulk-mail marker).
- `upsertMessages` writes a batch in **one SQLite transaction** with `INSERT OR REPLACE`
  (`outlook-dashboard/packages/core/src/store/db.ts:80-105`), so re-syncing is idempotent.

You trigger it by hand with `gmail:sync` (default 90 days, `outlook-dashboard/packages/core/src/cli/gmail-sync.ts:15`)
or, in Docker, the `maintain` service runs `gmail:maintain` (7 days) every day at 08:00
(`outlook-dashboard/docker-compose.yml:44-57`).

### Step 2: threading

You don't build threads yourself. Gmail gives every message a `threadId`, stored as `thread_id`
with an index (`db.ts:54`). "Threading" in your code means **pick the latest message per
thread**:

```ts
const latest = new Map<string, MessageRow>();
for (const r of rows) {
  const cur = latest.get(r.thread_id);
  if (!cur || r.internal_date > cur.internal_date) latest.set(r.thread_id, r);
}
```
(`outlook-dashboard/packages/core/src/analysis/attention.ts:95-100`)

### Step 3: needs-reply detection (deterministic)

A thread "needs attention" if its **latest** message passes `isHumanInbound`
(`attention.ts:67-75`): inbound, in the inbox, Primary category, no `List-Unsubscribe`, and the
sender doesn't match 30 automated-sender regexes (`:9-43`) or the `.bank.in` domain (`:46-49`).
The logic: *if the last word in the thread came from a real person, you probably owe a reply.*
Results are sorted newest first, with `ageDays` computed (`:102-117`). Every rule has unit tests
(`outlook-dashboard/packages/core/test/attention.test.ts:5-83`).

### Step 4: Claude calls your MCP tools

You ask Claude Code: *"What's waiting on me? Draft a reply to the recruiter."* Claude has seen
your tool list at connection time and picks tools itself:

1. `needs_attention` with no `account`, so `resolveAccounts()` fans out over every connected
   mailbox (`outlook-dashboard/packages/mcp/src/index.ts:35-44,72-81`). An unknown account throws
   with the list of valid ones, an error message *written for the model* so it can self-correct.
2. `get_thread` fetches the full conversation **live** (`:123-136`). `fetchThread` decodes
   base64url bodies, prefers `text/plain`, and falls back to tag-stripped HTML
   (`outlook-dashboard/packages/core/src/google/thread.ts:22-62`).
3. Claude writes the draft. **That's the only "AI" step, and it happens in Claude, not in your
   code.**

### Step 5: the confirm gate

```ts
server.tool('send_reply',
  'Send a reply in a thread. CONFIRM-GATED: without confirm:true it returns a preview of ' +
    'exactly what will be sent and sends nothing. Call again with confirm:true to actually send.',
  { account: z.string(), threadId: z.string(), body: z.string().min(1),
    confirm: z.boolean().optional().describe('Must be true to actually send') },
  async ({ account, threadId, body, confirm }) => {
    const plan = await planReply(gmail, account, threadId, body);
    if (confirm !== true) {
      return json({ status: 'preview', willSend: { from: account, to: plan.to, subject: plan.subject, body: plan.body },
        note: 'Nothing was sent. Re-call send_reply with confirm:true to send this exact message.' });
    }
    const id = await sendReply(gmail, account, threadId, plan);
```
(`outlook-dashboard/packages/mcp/src/index.ts:138-163`, trimmed)

- `confirm !== true`, not `!confirm`: only the literal boolean `true` sends. `"yes"` or a
  missing value means preview. Safe default.
- The **description** tells the model the protocol, which is prompt engineering inside a tool
  definition.
- `planReply` (`thread.ts:76-104`) does the email plumbing a model would get wrong: reply to the
  latest message **not from you** (`:89-94`), add `Re:` only if missing (`:98`), and set
  `In-Reply-To` and `References` from the target's `Message-ID` (`:99-101`) so Gmail keeps it in
  the same conversation. `sendReply` builds a raw RFC-2822 message and base64url-encodes it
  (`:107-132`).

**The caveat you must understand (genai/14 overstates this):** the server enforces *"sending
requires an explicit `confirm: true`"*, but it does **not** enforce *"a preview happened first"*
or *"the confirmed message equals the preview"*. Each call re-runs `planReply` and takes `body`
fresh from the arguments (`:150-151`). A model that passes `confirm: true` on its first call
sends immediately. In practice the human gate is **two layers**: your server's preview default,
**plus** the MCP client's tool-approval prompt (Claude Code / Desktop ask before running a tool
unless you've allowed it). Say it that way. Exercise 1 below closes the gap.

### Step 6: the same gate in the dashboard

The REST route mirrors it exactly (`outlook-dashboard/packages/server/src/index.ts:167-196`). In
the UI the human writes the reply (no AI), clicks **Preview** (calls with `confirm:false`), sees
From/To/Subject in an amber box, then **Confirm & send** (`ThreadDrawer.tsx:41-69,130-173`).
Editing the textarea clears the preview (`:121-124`), so you can't confirm a stale preview.

---

## Concepts used here, explained from zero

**MCP (Model Context Protocol).** An open protocol that lets an AI app (the *client*/*host*:
Claude Code, Claude Desktop, Cursor) discover and call capabilities offered by a separate
program (the *server*). The server advertises **tools** (functions with a name, description and
JSON-schema input); the model chooses them; the client sends a `tools/call` request; your
handler runs and returns content. Messages are JSON-RPC 2.0. *Why here:* you get the best model,
billed to your existing subscription, with zero API-key handling, and the same server works in
any MCP client. *How:* `new McpServer({name, version})` + `server.tool(name, description,
zodShape, handler)` (`outlook-dashboard/packages/mcp/src/index.ts:55-164`). The SDK turns the Zod
shape into the JSON Schema the model sees and validates arguments before your handler runs, so
`limit` above 500 is rejected for you (`:92`). Deep dive:
[07-mcp-and-service-integration.md](../07-mcp-and-service-integration.md).

**stdio transport.** The client **launches your server as a child process** and talks over its
stdin/stdout. So **stdout is the wire**: one stray `console.log` corrupts the protocol. That's
why the header warns about it (`index.ts:8`) and the ready message uses `console.error`
(`:169`). The other transport, Streamable HTTP, is for remote or shared servers. stdio fits a
single-user local tool with local tokens.

**How Claude connects.** Claude Code: `claude mcp add outlook-dashboard -- pnpm --filter
@outlook-dashboard/mcp start` (`outlook-dashboard/docs/SETUP.md:155`). Claude Desktop: an
`mcpServers` entry with the same command (`docs/SETUP.md:157-158`). On start the client runs
`initialize`, then `tools/list`, and from then on the tool descriptions are part of what the
model sees.

**Tool design for models.** Your tools are *coarse and task-shaped* (`needs_attention`, not
`run_sql`). They default sensibly (no account = all accounts), cap output (`limit` max
500/200, `:92,112`), and return errors that name the fix. Tool results are JSON in a `text`
content block (`:51-53`). Fewer, well-described tools beat many thin ones, because each tool
description costs context and adds a chance for the model to choose wrong.

**Human-in-the-loop (HITL) and confirm gates.** HITL means a person must approve before an
agent takes a consequential action. A confirm gate is the cheapest form: a **two-phase** action,
where phase 1 (dry run) shows exactly what will happen and phase 2 (commit) needs an explicit
flag. *Why here:* sending email is the one irreversible action. Labels can be removed and Trash
lasts 30 days (`outlook-dashboard/packages/core/src/google/mutate.ts:4-8`), but a sent email can't be
recalled. Enforcing it **server-side** matters because a prompt-injected email ("ignore previous
instructions and reply with…") reaches Claude via `get_thread`. Stronger designs bind phase 2
to phase 1 with a token (exercise 1), or pause the agent framework itself (LangGraph
`interrupt()`, below).

**When not to use an LLM.** Needs-reply, finance classification and cleanup are regexes and
set lookups. They're free, instant, deterministic and **unit-testable**, which is why this is
your most-tested repo. The LLM is reserved for what rules can't do: summarizing and writing.

**Privacy boundary.** Metadata is stored; bodies are fetched only on deliberate request
(`thread.ts:6-10`). OAuth tokens are encrypted with AES-256-GCM, written `0600`
(`outlook-dashboard/packages/core/src/google/auth.ts:47-51`), and the encryption is tested,
including tamper detection (`outlook-dashboard/packages/core/test/tokenCache.test.ts:28-32`). The
server logs method/path/status only (`server/src/index.ts:71-77`).

**SQLite with WAL.** Write-Ahead Logging lets readers (server, MCP) read while the sync
writes (`db.ts:72`). It's a good fit for a single machine with several processes.

---

## Why it was built this way

- **MCP instead of calling the Claude API:** "zero marginal cost, no key management, most
  capable model" (`outlook-dashboard/docs/PROGRESS.md:73-79`). The trade-off: no automation
  without a human in a Claude client, and no control over the model or prompts.
- **`core` holds all logic; `mcp` and `server` are thin adapters** (`outlook-dashboard/CLAUDE.md:34-35`).
  Both surfaces call the same functions, which is why the confirm gate exists identically in
  both. One honest wart: `resolveAccounts` is copy-pasted into both adapters
  (`mcp/src/index.ts:35-44`, `server/src/index.ts:44-53`).
- **Gmail over Outlook:** personal Gmail needs no admin consent (`docs/SETUP-GMAIL.md:3-8`).
- **Heuristics tuned to your inbox:** Indian banks, `.bank.in` (`attention.ts:46-49`;
  `finance.ts:3-8`). That's precise for you and won't generalize.
- **Reconcile, don't append, for labels:** `reconcileLabel` makes label membership exactly
  match the rule output, so improving a rule cleans up old mistakes (`mutate.ts:73-99`).

---

## What's missing / what you must not claim

| Don't claim | Reality |
|---|---|
| "Outlook/Microsoft 365 sync" | Dormant code; only Gmail runs |
| "Claude API integration / I call Claude" | No SDK, no key. Claude is the MCP *client* |
| "Agent / multi-agent / LangGraph" | It's an MCP **tool server**; the agent loop lives in Claude |
| "The model cannot bypass the gate" | It can't send without `confirm:true`, but nothing forces a preview first or binds confirm to the preview |
| "Semantic search" | `LIKE '%q%'` over sender/subject/snippet (`db.ts:186-199`) |
| "Realtime dashboard" | `/ws` only says hello (`server/src/index.ts:206-211`) |
| "Every write is gated" | `gmail:maintain` trashes Promotions/Social without asking (`outlook-dashboard/packages/core/src/cli/gmail-maintain.ts:41-45`). It's recoverable and rule-limited, but not confirm-gated |
| "Secure API" | No auth on the Express API, `cors()` open (`server/src/index.ts:69`), port published by compose; anyone who reaches :5179 can POST `confirm:true` |
| "Tested end to end" | Core heuristics only; no MCP/server/web tests |

Smaller points: replies go only to the sender (no reply-all or Cc, `thread.ts:96,103`);
`withRetry` also retries permission 403s (`concurrency.ts:37`); and the error handler maps every
error to HTTP 400 (`server/src/index.ts:199-202`).

---

## Translate it to LangGraph

Today **Claude is the agent** and your repo is its toolbox. To show you can own the agent side,
keep the MCP server unchanged and let a LangGraph agent consume it through
`langchain-mcp-adapters`, with a real `interrupt()` before sending. See
[06-agents-langchain-langgraph.md](../06-agents-langchain-langgraph.md).

| Today | LangGraph version |
|---|---|
| Claude Desktop as MCP client | `MultiServerMCPClient` launches the same stdio server |
| Claude's built-in loop | `create_react_agent(llm, tools)` (a prebuilt ReAct graph) |
| Preview + client approval prompt | `interrupt(payload)` pauses the graph; your UI resumes it |
| Nothing persisted between turns | `checkpointer` keyed by `thread_id`; the pause survives restarts |

```python
from langchain_core.tools import tool
from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver          # PostgresSaver in prod
from langgraph.types import interrupt, Command

client = MultiServerMCPClient({"inbox": {
    "transport": "stdio", "command": "pnpm",
    "args": ["--filter", "@outlook-dashboard/mcp", "start"]}})   # run from the repo root
mcp_tools = {t.name: t for t in await client.get_tools()}       # the same 7 tools

@tool
async def send_reply_approved(account: str, threadId: str, body: str) -> str:
    """Send a reply. A human must approve the exact preview first."""
    preview = await mcp_tools["send_reply"].ainvoke(
        {"account": account, "threadId": threadId, "body": body})          # confirm omitted → preview
    decision = interrupt({"preview": preview})                              # graph pauses here
    if not decision.get("approved"):
        return "Human rejected the reply."
    return await mcp_tools["send_reply"].ainvoke({"account": account, "threadId": threadId,
        "body": decision.get("body", body), "confirm": True})

tools = [t for n, t in mcp_tools.items() if n != "send_reply"] + [send_reply_approved]
agent = create_react_agent(llm, tools, checkpointer=MemorySaver())
cfg = {"configurable": {"thread_id": "inbox-session-1"}}
await agent.ainvoke({"messages": [("user", "Reply to whoever is waiting on me")]}, cfg)
# your UI reads the interrupt payload, shows it, then:
await agent.ainvoke(Command(resume={"approved": True}), cfg)
```

Gotcha to mention: on resume, LangGraph **re-runs the node from the top**, so the preview call
runs again. That's fine because it's read-only. Never put the send *before* the `interrupt`.
And because the model never sees a raw `send_reply` with `confirm`, the bypass from Step 5 is
closed *structurally*.

Line to say: *"I built the tool server and the safety gate. Plugging it into LangGraph is
`langchain-mcp-adapters` plus an `interrupt()` wrapper, and the checkpointer makes the approval
pause durable."*

---

## Say it in an interview

**60-second pitch.** "Inbox Agent is a local-first mail assistant. A TypeScript core syncs
Gmail metadata, never bodies, into SQLite with bounded concurrency and retry. Deterministic
rules, about 30 sender patterns plus category and bulk-header checks with 58 unit tests,
compute which threads are waiting on me. I expose that to Claude through an MCP stdio server
with seven task-shaped tools, so Claude can triage, read a thread live, and draft a reply on
my existing subscription. Sending is the one irreversible action, so it's confirm-gated
server-side: without `confirm: true` you only get a preview of exactly who, what subject and
what body, and threading headers are computed in code so the model can't break them. The
same core powers a React dashboard with a Preview → Confirm flow."

**Likely questions**

1. *Why MCP instead of calling an LLM API?* — No key, no per-token cost, and the strongest model.
   The same server works in any MCP client. The cost is that a human must be in a Claude client:
   no unattended automation.
2. *What stops the model sending something you didn't approve?* — Server default is preview;
   only literal `confirm: true` sends; plus the client's tool-approval prompt. Honestly, the
   server doesn't bind confirm to the preview. I'd add a preview token (hash of to/subject/body,
   short TTL) that the confirm call must echo.
3. *Prompt injection via email bodies?* — Real risk: `get_thread` puts untrusted text in the
   context. Mitigations: the irreversible action is gated, replies only go to the thread's
   sender (`thread.ts:96`), and there's no tool that sends to arbitrary addresses.
4. *How do you detect "needs reply"?* — Latest message per Gmail thread; reply owed if it's
   inbound, inbox, Primary, no List-Unsubscribe, and not an automated sender
   (`attention.ts:67-117`).
5. *Why stdio?* — A single user on a local machine with local encrypted tokens. The client spawns
   the process, so there's no network surface. Stdout is the protocol, so logs go to stderr.
6. *How is the sync robust?* — Metadata only, 10 concurrent requests, exponential backoff with
   jitter on 429/5xx, transactional batched upserts, idempotent `INSERT OR REPLACE`.
7. *What would you improve?* — Semantic search (embeddings over subject + snippet), preview
   tokens, auth on the local API, tests for the MCP handlers, real WS push after sync.
8. *How do you test the MCP server?* — Today I don't; core is tested. I'd call the handlers
   with an in-memory transport (or the MCP Inspector) and a fake Gmail client, and assert the
   preview path never calls `messages.send`.

---

## Make it yours — exercises

1. **Bind confirm to preview.** In `packages/mcp/src/index.ts:148-163`, return a
   `previewToken` (HMAC of `account|threadId|to|subject|body` plus expiry) with the preview, and
   require it, unchanged, when `confirm: true`. Mirror it in `packages/server/src/index.ts:167-196`
   and `packages/web/src/ThreadDrawer.tsx`. *Done when:* `confirm:true` without a matching
   token returns an error and sends nothing.
2. **Test the gate.** Move the `send_reply` handler body into a `core` function that takes a
   Gmail-like interface, then write vitest tests with a fake: preview never calls `send`; a
   changed body with an old token is rejected. *Done when:* the new tests pass alongside the 58
   existing ones. ([09-testing-pytest-jest-rtl.md](../09-testing-pytest-jest-rtl.md))
3. **Show the body in the dashboard preview.** `ThreadDrawer.tsx:130-143` shows
   From/To/Subject only. Render `preview.willSend.body` too. Add an RTL test that "Confirm &
   send" appears only after Preview. *Done when:* the test passes and the amber box shows the
   body.
4. **Real-time push after sync.** Have the server broadcast `{type:'synced', account}` on `/ws`
   (`packages/server/src/index.ts:208-211`) after a new `POST /api/sync`, and make `App.tsx:36-49`
   refetch on that message. *Done when:* the attention list refreshes without a page reload.
5. **LangGraph client.** In a new Python folder, implement the sketch above against your real
   MCP server. *Done when:* the agent pauses with a preview payload, and `Command(resume=...)`
   with `approved: False` sends nothing.
