# UACE — how your code actually works

**What it is, in plain English.** UACE ("Universal AI Context Engine") is a small program that
gives every AI coding assistant you use (Claude Code, Cursor, VS Code Copilot…) one shared memory
per project. When a new chat starts, the assistant asks UACE "what do I need to know about this
repo?" and gets back a short briefing: decisions you saved, the current task, what the last
session ended on, recent commits, files you touched. The assistant talks to UACE over **MCP**
(Model Context Protocol — an open standard for letting an AI app call outside tools). UACE itself
**never calls an LLM**. It is plumbing the model uses.

| | |
|---|---|
| Path | `~/workspace/UACE` (server in `src/`, VS Code extension in `extension/`) |
| Package | npm `uace-mcp` v0.2.3 (`UACE/package.json:3`), binary `uace-mcp` → `dist/server.js` (`UACE/package.json:28-30`) |
| Stack | TypeScript (Node ≥ 20), `@modelcontextprotocol/sdk`, `better-sqlite3`, `sqlite-vec`, `@huggingface/transformers`, `chokidar`, `simple-git`, `zod` (`UACE/package.json:44-52`) |
| Size | ~2.2k lines in `src/` (largest: `memory.ts` 643, `server.ts` 473) |
| Honest status | Published and working; 43 commits. Three hand-run smoke scripts (`npm run smoke`, `UACE/package.json:41`), **not** run in CI. No test framework, no evals. |

Read alongside: [../07-mcp-and-service-integration.md](../07-mcp-and-service-integration.md),
[../05-rag-and-vector-databases.md](../05-rag-and-vector-databases.md),
[../08-databases-and-data-modelling.md](../08-databases-and-data-modelling.md).

---

## JD coverage

| JD requirement | Where in your code | Strength |
|---|---|---|
| Build an MCP server | `McpServer` + 18 `registerTool` calls, `UACE/src/server.ts:66-450` | **Strong** |
| MCP prompts (not just tools) | `continue-project`, `save-checkpoint`, `UACE/src/server.ts:379-425` | **Strong** |
| MCP transport | stdio only, `StdioServerTransport`, `UACE/src/server.ts:460-461` | Partial (no Streamable HTTP) |
| JSON-RPC hygiene | `console.log` redirected to stderr so stdout stays pure JSON-RPC, `UACE/src/server.ts:40` | **Strong** |
| Tool input schemas / validation | Zod shapes per tool, `UACE/src/types.ts:52-79` (e.g. `limit` capped at 50, `:78`) | **Strong** |
| Consuming MCP as a client | VS Code extension spawns the server and calls tools, `UACE/extension/src/uaceClient.ts:74`, `:109` | Partial (TS client, not an agent framework) |
| Embeddings | Local MiniLM 384-dim, mean-pooled + normalised, `UACE/src/embedder.ts:18-19`, `:62` | **Strong** |
| Vector search | `sqlite-vec` `vec0` table + KNN query, `UACE/src/db.ts:33-36`, `UACE/src/memory.ts:242-264` | **Strong** (small scale) |
| Keyword search / BM25 | FTS5 external-content table + 3 sync triggers, `UACE/src/db.ts:116-137`; `ORDER BY bm25(...)`, `UACE/src/memory.ts:221` | **Strong** |
| "Hybrid" search | Semantic **first, FTS fallback** — not score fusion, `UACE/src/server.ts:108-110` | Partial |
| SQL schema design | 6 tables, partial unique indexes, composite PK, `UACE/src/db.ts:47-148` | **Strong** |
| Migrations | Hand-rolled `CREATE IF NOT EXISTS` + `addColumnIfMissing`, `UACE/src/db.ts:142`, `:151-161` | Partial |
| Packaging / release CI | Tag-triggered GitHub Actions, npm Trusted Publishing (OIDC), `UACE/.github/workflows/release.yml:19-40` | **Strong** |
| Tests in CI | None — release job only installs, builds, publishes (`release.yml:36-40`) | Not present |
| Python / LangChain / LangGraph | — | Not present |
| Auth / multi-tenant security | Local single-user process; no auth layer | Not present (by design) |

---

## The big picture

```
  AI host app (Claude Code / Cursor / VS Code)            Claude Code hooks (shell)
  ┌──────────────────────────────┐                       ┌──────────────────────────┐
  │ MCP client  ── spawns ──────►│ npx -y uace-mcp       │ SessionStart: uace-recall│
  │   stdin  ◄── JSON-RPC ──────►│ (stdout = protocol,   │ → `uace-mcp context X`   │
  │   stdout                     │  stderr = logs)       │ stdout → model context   │
  └──────────────────────────────┘                       └────────────┬─────────────┘
                 │                                                    │ CLI mode
                 ▼                                                    ▼
        src/server.ts  ── 18 tools + 2 prompts ──┐          src/cli.ts (context | save-session
                                                 │                       | sync | prune)
                                                 ▼                       │
                                      src/memory.ts  MemoryStore ◄───────┘
                     ┌──────────────────┬───────┴─────────┬──────────────────────┐
                     ▼                  ▼                 ▼                      ▼
             src/embedder.ts     SQLite ~/.uace/memory.db (WAL)          src/scanner.ts, git.ts,
             MiniLM via          memories ─trigger─► memories_fts (FTS5)  watcher.ts, transcripts.ts
             transformers.js     vec_memories (vec0, 384-d)               (populate memory)
             (lazy, optional)    sessions · commits · file_events · projects
```

One SQLite file is shared by every client on the machine (`UACE/src/server.ts:49`). That sharing is
the whole product: whatever Cursor saved, Claude Code reads.

---

## Follow one request end-to-end

### Step 0 — the host starts your server

The host reads a config like `UACE/.mcp.json` (`"command": "npx", "args": ["-y", "uace-mcp"]`) and
launches the process. Your server talks to it through the process's **stdin/stdout**. The same
binary also has a CLI mode, so the first thing `server.ts` does is decide which mode it is in:

```ts
// UACE/src/server.ts:55-63
const cliSub = process.argv[2];
if (cliSub && CLI_SUBCOMMANDS.has(cliSub)) {
  process.exit(await runCli(process.argv.slice(2)));
}

const db = openDb(DB_PATH);
const embedder = createEmbedder();
const vectorsEnabled = embedder ? tryEnableVectors(db, embedder.dim) : false;
const store = new MemoryStore(db, { embedder, vectorsEnabled });
```

- Lines 55-58: if the first argument is `context`, `save-session`, `sync` or `prune`
  (`UACE/src/cli.ts:22`), run a one-shot command and exit. Otherwise become an MCP server.
- `openDb` turns on WAL mode and foreign keys, then creates tables (`UACE/src/db.ts:17-20`).
- `createEmbedder()` returns `null` if `UACE_NO_EMBED=1` (`UACE/src/embedder.ts:69`).
- `tryEnableVectors` loads the `sqlite-vec` extension in a try/catch; failure just logs and returns
  `false` (`UACE/src/db.ts:29-45`). Vectors are optional, never required.

Then `main()` connects the SDK's stdio transport (`UACE/src/server.ts:459-461`). The SDK handles the
MCP handshake for you: the client sends `initialize`, the server answers with its capabilities, and
the client asks `tools/list` and `prompts/list`. You never wrote that code — the SDK did.

### Step 1 — the model decides to call `get_project_context`

The model sees each tool's name, description and input schema. Your description literally tells it
when to call: *"Call this at the START of a session"* (`UACE/src/server.ts:78`). The host then writes
a JSON-RPC message like this to your stdin:

```json
{"jsonrpc":"2.0","id":7,"method":"tools/call",
 "params":{"name":"get_project_context","arguments":{"project":"portfolio"}}}
```

The SDK validates `arguments` against the Zod shape (`UACE/src/types.ts:81-94`, where `limit`
defaults to 20 and maxes at 50), fills in defaults, and calls your handler:

```ts
// UACE/src/server.ts:73-83
server.registerTool(
  "get_project_context",
  { title: "Get Project Context", description: "...", inputSchema: getProjectContextSchema },
  async ({ project, query, limit }) =>
    text(await store.buildContextPacket(project, limit, query))
);
```

`text()` (`UACE/src/server.ts:71`) wraps a string into MCP's result shape:
`{ content: [{ type: "text", text }] }`.

### Step 2 — assembling the context packet

`buildContextPacket` (`UACE/src/memory.ts:506-610`) is the most "designed" function in the repo:

1. **Optional semantic section.** Only if a `query` was passed does it run vector search
   (`UACE/src/memory.ts:530-540`). The default path never loads the embedding model, so the first
   call of the day is fast.
2. **Priority-ordered groups**: working memory → last session → long-term → session memory → git
   commits → recently active files (`UACE/src/memory.ts:543-587`).
3. **Dedupe** by normalised text (`UACE/src/memory.ts:512-518`).
4. **Age labels and staleness**: every line gets "3d" / "2w"; working memory older than 14 days
   gets `⚠️ may be stale` (`UACE/src/memory.ts:519-524`).
5. **Character budget** of 6000 (`UACE/src/memory.ts:510`). Groups are added in order until the
   next one would overflow, then it stops and appends a "trimmed" note:

```ts
// UACE/src/memory.ts:593-605
for (const g of groups) {
  if (!g.lines.length) continue;
  const block = `\n## ${g.title}\n${g.lines.join("\n")}`;
  if (used + block.length > maxChars) {
    truncated = true;
    break;
  }
  out.push(block);
  used += block.length;
}
if (truncated) {
  out.push(`\n_…trimmed to ~${maxChars} chars. Use search_memory or pass a query for more._`);
}
```

Note the `break`: once one group doesn't fit, **all** lower-priority groups are dropped, even small
ones that would have fitted. That keeps priority strict; know it in case someone asks.

The string goes back as the JSON-RPC `result` for `id: 7`, and the host puts it in front of the model.

### Step 3 — `save_memory`: writing, indexing, embedding

```ts
// UACE/src/memory.ts:60-75 (trimmed)
if (input.key) {
  const existing = this.db.prepare(
    `SELECT id FROM memories WHERE project = ? AND layer = ? AND key = ?`
  ).get(input.project, input.layer, input.key) as { id: number } | undefined;
  if (existing) {
    this.db.prepare(`UPDATE memories SET content = ?, tags = ?, updated_at = datetime('now')
                     WHERE id = ?`).run(input.content, tags, existing.id);
    await this.indexEmbedding(existing.id, input.content);
    return this.getMemory(existing.id)!;
  }
}
```

- A `key` makes the save an **upsert** (update if it exists, insert if not). The database enforces
  "one row per project+layer+key" with a *partial* unique index (`UACE/src/db.ts:66-67`, `WHERE key
  IS NOT NULL`), so memories without a key can repeat.
- You never write to the FTS table yourself. The `memories_au` / `memories_ai` triggers do it
  (`UACE/src/db.ts:124-137`).
- `indexEmbedding` embeds the content and replaces the vector with DELETE + INSERT
  (`UACE/src/memory.ts:32-41`). The `await` means the tool call waits for the embedding to finish —
  on the very first save that includes loading the model.

### Step 4 — `search_memory`: semantic first, keyword fallback

```ts
// UACE/src/server.ts:107-110
async (args) => {
  const semantic = await store.semanticSearch(args);
  const rows = semantic && semantic.length ? semantic : store.searchMemory(args);
  const mode = semantic && semantic.length ? "semantic" : "keyword";
```

`semanticSearch` (`UACE/src/memory.ts:232-265`) embeds the query, then:

```sql
-- UACE/src/memory.ts:244-255
WITH knn AS (
  SELECT memory_id, distance FROM vec_memories
   WHERE embedding MATCH ? ORDER BY distance LIMIT ?   -- overfetch
)
SELECT m.*, knn.distance AS distance
  FROM knn JOIN memories m ON m.id = knn.memory_id
 WHERE m.project = ?
```

The KNN runs over **all projects**, then the project filter is applied. So it fetches
`max(limit × 10, 50)` neighbours first (`UACE/src/memory.ts:242`); otherwise the top 10 might all
belong to another project and you'd get zero results. If the embedder is off or returns nothing,
`searchMemory` runs FTS5 with BM25 ranking (`UACE/src/memory.ts:204-224`).

### Side door — Claude Code hooks without MCP

`UACE/.claude/settings.json:3` registers a SessionStart hook that runs
`npx -y uace-mcp context "UACE"` (`UACE/.claude/hooks/uace-recall.sh:4`). `cmdContext`
(`UACE/src/cli.ts:90-104`) builds the same packet and prints it to stdout, which Claude Code injects
into the new session. It deliberately skips the embedder unless `--query` is given
(`UACE/src/cli.ts:98-100`) so it fits the hook timeout.

---

## Concepts used here, explained from zero

**MCP architecture.** Three roles. The *host* is the app the user sees (Claude Code). Inside it, a
*client* holds one connection to one *server* (UACE). A server can offer three kinds of things:
**tools** (functions the *model* chooses to call — your 18), **resources** (read-only data the
*app* attaches as context — UACE offers none), and **prompts** (reusable message templates the
*user* picks, like a slash command — your two). *Why here:* tools fit because the model decides
when to save or recall. *In your code:* `registerTool` (`UACE/src/server.ts:73`), `registerPrompt`
(`UACE/src/server.ts:379`). A prompt just returns messages; `continue-project` returns one user
message telling the model to call `get_project_context` (`UACE/src/server.ts:386-400`).

**stdio vs Streamable HTTP.** These are *transports* — how the JSON-RPC bytes travel. **stdio**: the
host starts your server as a child process and talks through stdin/stdout; local, single user, no
network, no auth needed. **Streamable HTTP**: the server is a web service at a URL; many clients can
connect, so you need auth (MCP specifies OAuth 2.1 for this). *Why stdio here:* the DB is a local
file and the user is you. *In your code:* `StdioServerTransport` only (`UACE/src/server.ts:460`).
Consequence: **anything printed to stdout that isn't protocol breaks the connection**, hence
`UACE/src/server.ts:40` and the stdout/stderr split in the CLI (`UACE/src/cli.ts:51-58`).

**JSON-RPC 2.0.** A tiny message format: a *request* has `jsonrpc`, `id`, `method`, `params`; a
*response* echoes the `id` with `result` or `error`; a *notification* has no `id` and gets no reply.
The `id` lets many calls be in flight at once. MCP is JSON-RPC with agreed method names
(`initialize`, `tools/list`, `tools/call`, `prompts/get`…). See
[../07-mcp-and-service-integration.md](../07-mcp-and-service-integration.md).

**Embeddings and cosine similarity.** An embedding model turns text into a fixed-length list of
numbers (here 384) so that texts with similar meaning land near each other. *Cosine similarity*
measures the angle between two vectors (1 = same direction). If vectors are *normalised* to length
1, ranking by smallest Euclidean (L2) distance gives the same order as ranking by largest cosine.
*In your code:* `normalize: true` (`UACE/src/embedder.ts:62`), and `vec0` ranks by `distance` with no
metric set (`UACE/src/db.ts:33-36`) — sqlite-vec's default is L2, which is fine *because* of the
normalisation. *Mean pooling* (`pooling: "mean"`) averages the per-token vectors into one.

**sqlite-vec / `vec0`.** A SQLite extension that adds a *virtual table* (a table backed by custom
code) storing vectors and answering `WHERE embedding MATCH ? ORDER BY distance LIMIT k` — a
nearest-neighbour (KNN) search. It is a brute-force scan, not an approximate index like HNSW; at a
few thousand memories that's milliseconds. *Gotcha you handled:* the vec table has no triggers, so
deletes must clear vectors by hand, inside a transaction (`UACE/src/memory.ts:108-114`,
`:134-142`).

**FTS5 and BM25.** FTS5 is SQLite's full-text search: it builds an *inverted index* (word → rows
containing it). **BM25** is the classic ranking formula: rare words matter more than common ones,
more occurrences help with diminishing returns, long documents are penalised slightly. Your table
is *external-content* (`content='memories'`, `UACE/src/db.ts:116-121`): FTS stores only the index
and reads text from `memories`, so the triggers must keep it in sync — including the special
`'delete'` insert form (`UACE/src/db.ts:128-131`). `sanitizeFts` quotes every token and ORs them
(`UACE/src/memory.ts:637-643`) so a query like `auth-flow: v2` can't throw a syntax error.

**WAL mode.** By default SQLite writes changes into the main file and blocks readers during a write.
In *Write-Ahead Logging* mode, writes go to a side log first, so **readers don't block the writer
and the writer doesn't block readers**; there is still only one writer at a time. *Why here:* Claude
Code, Cursor, the VS Code dashboard and hook scripts are separate processes on the same file.
*In your code:* `UACE/src/db.ts:18`. You never set a busy timeout explicitly; better-sqlite3's
default wait applies.

**Graceful degradation.** Every optional piece fails soft: model load sets `failed = true` and
`embed()` returns `null` forever (`UACE/src/embedder.ts:25`, `:48`, `:56-57`); the heavy library is
imported lazily (`UACE/src/embedder.ts:43`); non-git folders return `[]`
(`UACE/src/git.ts:23`, `:35-37`).

**Idempotent ingestion.** Running the same import twice must not duplicate. Commits use
`INSERT OR IGNORE` on a `(project, hash)` primary key (`UACE/src/db.ts:109`,
`UACE/src/memory.ts:460`). Transcript sessions dedupe on `external_id` with last-write-wins update
(`UACE/src/memory.ts:328-354`) backed by a partial unique index (`UACE/src/db.ts:146-147`).

**Release CI with OIDC.** OIDC "Trusted Publishing" means GitHub Actions proves its identity to npm
with a short-lived signed token instead of a stored `NPM_TOKEN` secret. *In your code:*
`permissions: id-token: write` (`UACE/.github/workflows/release.yml:28`) and a tag trigger `v*`
(`release.yml:19-22`). The extension job runs only after npm succeeds (`release.yml:43`) because the
extension installs that exact server version.

---

## Why it was built this way

- **No LLM inside.** The assistant already has a model. UACE only stores and retrieves, so it costs
  nothing and has no API keys. Even transcript "summaries" are regex extraction
  (`UACE/src/transcripts.ts:39-50`, docstring `:65`).
- **SQLite, one file, user-global path.** Zero setup; every client shares it by default
  (`UACE/src/server.ts:49`). Trade-off: one machine only, no sync.
- **Local embeddings.** MiniLM runs on CPU, offline after one download. Trade-off: weaker than hosted
  embedding models, and a cold start on first use — hence the non-semantic default recall path.
- **Layers instead of chunks.** `long-term | working | session` is enforced by a `CHECK` constraint
  (`UACE/src/db.ts:57`). Pruning only touches working/session, dry-run by default
  (`UACE/src/memory.ts:161-201`). Long-term is never auto-deleted.
- **Fallback, not fusion.** Semantic if available, else keyword. Simple and predictable; loses the
  benefit of exact-term matches *alongside* meaning matches.
- **Same binary, two modes.** Hooks are shell commands that can't speak MCP, so the CLI reuses the
  `MemoryStore` directly (`UACE/src/cli.ts:60-69`).

---

## What's missing / what you must not claim

- **No tests in CI, no test framework.** `scripts/smoke.ts` has ~70 `assert` calls with a fake
  deterministic embedder (`UACE/scripts/smoke.ts:25-37`) — real, but run by hand. The release
  workflow publishes without running them (`UACE/.github/workflows/release.yml:36-40`).
- **No retrieval evals** (no recall@k, no golden set).
- **Not true hybrid search.** Don't say "RRF" or "hybrid ranking". Say "vector search with an FTS5
  BM25 fallback" (`UACE/src/server.ts:108-110`).
- **No chunking.** One memory = one embedding of the whole string (`UACE/src/memory.ts:34`).
- **No ANN index.** vec0 KNN here is exact/brute force.
- **stdio only.** No HTTP transport, no OAuth, no multi-user, no resources, no sampling, no
  `structuredContent` / output schemas — every tool returns plain text.
- **No migration framework.** Schema changes are idempotent `CREATE IF NOT EXISTS` plus one
  `addColumnIfMissing` (`UACE/src/db.ts:142`).
- **Python, LangChain, LangGraph: not in this repo.**
- Small doc mismatch to fix: `search_memory`'s schema says "FTS5 syntax allowed"
  (`UACE/src/types.ts:73`) but `sanitizeFts` quotes tokens, so operators like `NEAR` or `-` are
  neutralised (only trailing `*` survives).
- Contradiction with `genai/14`: that file calls the function `searchSemantic`; the real name is
  `semanticSearch` (`UACE/src/memory.ts:232`). Everything else there checks out.

---

## Translate it to the JD stack

**Same server in Python with the official `mcp` SDK (FastMCP).** Decorators replace `registerTool`;
type hints replace Zod (FastMCP builds the JSON Schema from them).

```python
# uace_py/server.py  — sketch
import sqlite3, sqlite_vec
from typing import Literal
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("uace")
db = sqlite3.connect("memory.db"); db.execute("PRAGMA journal_mode=WAL")
db.enable_load_extension(True); sqlite_vec.load(db)

@mcp.tool()
def save_memory(project: str, content: str,
                layer: Literal["long-term", "working", "session"] = "long-term",
                key: str | None = None) -> str:
    """Persist a durable fact. Provide a stable key to upsert."""
    ...  # same SQL as memory.ts:60-87
    return "Saved memory #42"

@mcp.prompt()
def continue_project(project: str) -> str:
    return f'Call get_project_context for "{project}", then summarise and ask what is next.'

if __name__ == "__main__":
    mcp.run()                              # stdio, like server.ts:460
    # mcp.run(transport="streamable-http")  # the remote variant you don't have yet
```

Logging rule carries over: in Python, `print()` goes to stdout — use `logging` to stderr.

**Consume it from LangGraph via `langchain-mcp-adapters`.** The adapter turns MCP tools into
LangChain tools, so an agent can call your existing npm server unchanged:

```python
from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.prebuilt import create_react_agent

client = MultiServerMCPClient({
    "uace": {"command": "npx", "args": ["-y", "uace-mcp"], "transport": "stdio"},
})
tools = await client.get_tools()            # get_project_context, save_memory, ...
agent = create_react_agent("<provider:model>", tools)
await agent.ainvoke({"messages": [("user", "Continue project portfolio")]})
```

**pgvector instead of sqlite-vec** (if it ever became a multi-user service): `embedding vector(384)`,
`ORDER BY embedding <=> $1` for cosine distance, an HNSW index, and `WHERE project = $2` applied
*inside* the query — which removes the over-fetch workaround. See
[../05-rag-and-vector-databases.md](../05-rag-and-vector-databases.md).

---

## Say it in an interview

**60-second pitch.** "UACE is an MCP server I published on npm that gives every AI coding assistant
one shared, local memory per project. It's stdio MCP in TypeScript: 18 tools and 2 prompts, all
schema-validated with Zod, over a single SQLite file in WAL mode so Claude Code, Cursor and a VS Code
dashboard can share it. Memory is layered — long-term, working, session — and retrieval is local
MiniLM embeddings in sqlite-vec with an FTS5 BM25 fallback. The main tool assembles a 6,000-character
context packet in priority order with staleness flags, and its default path is deliberately
non-semantic so session start never pays model cold-start. It calls no LLM itself. Releases are
tag-triggered GitHub Actions using npm OIDC trusted publishing. What I'd add next: tests in CI and a
retrieval eval set."

**Likely questions**

1. *Tools vs resources vs prompts — why tools?* The model must decide *when* to save or recall, and
   only tools are model-invoked. Prompts cover the user-initiated flows
   (`UACE/src/server.ts:379-425`). Resources would suit a read-only "project packet" the host
   attaches automatically — a fair next step.
2. *What breaks a stdio MCP server?* Anything else writing to stdout. You redirect `console.log` to
   stderr (`UACE/src/server.ts:40`); the transport writes to `process.stdout` directly.
3. *How do you keep FTS in sync?* External-content FTS5 plus three triggers
   (`UACE/src/db.ts:124-137`). vec0 has no triggers, so deletes clear vectors in a transaction
   (`UACE/src/memory.ts:108-114`).
4. *Why over-fetch in vector search?* The KNN runs across all projects before the project filter;
   fetching `max(limit×10, 50)` avoids empty results (`UACE/src/memory.ts:242`).
5. *What if the embedding model can't download?* `failed` latches, `embed()` returns null, search
   falls back to BM25 (`UACE/src/embedder.ts:48`, `UACE/src/server.ts:109`).
6. *Concurrency with several clients?* WAL lets readers and one writer coexist
   (`UACE/src/db.ts:18`); the partial unique index stops duplicate keyed memories
   (`UACE/src/db.ts:66-67`). Honest gap: the upsert is read-then-write, not
   `INSERT … ON CONFLICT`, so two simultaneous saves of the same new key could make one fail.
7. *How would you take it remote?* Streamable HTTP transport, OAuth 2.1, per-user tenancy in Postgres
   + pgvector, and rate limits — none of which exist today.
8. *How do you test it?* Smoke scripts with a deterministic fake embedder
   (`UACE/scripts/smoke.ts:25-43`); not in CI yet — say so.

---

## Make it yours — exercises

1. **Put the smoke tests in CI.** Start in `UACE/.github/workflows/release.yml`. Add a `ci.yml` on
   `pull_request` running `npm ci && npm run build && npm run smoke`, and make `publish-npm` depend
   on it. *Done:* a PR with a broken assertion shows a red check.
2. **Real hybrid search with RRF.** Start in `UACE/src/server.ts:107`. Run both searches, then
   score each row `Σ 1/(60 + rank)` across the two lists. *Done:* a smoke test where the keyword-only
   match and the meaning-only match both appear in the top 3.
3. **Atomic upsert.** Rewrite `saveMemory` (`UACE/src/memory.ts:60-87`) with
   `INSERT … ON CONFLICT(project, layer, key) WHERE key IS NOT NULL DO UPDATE … RETURNING id`.
   *Done:* smoke tests pass and the SELECT-then-UPDATE path is gone.
4. **Expose the packet as an MCP resource.** Add `server.registerResource` with a URI template like
   `uace://{project}/context` returning `buildContextPacket`. *Done:* MCP Inspector lists and reads it.
5. **Port one tool to FastMCP.** Re-implement `search_memory` in Python against the same
   `memory.db`, then call it from a LangGraph agent using `langchain-mcp-adapters`. *Done:* the
   agent's answer cites a memory you saved from Claude Code.
