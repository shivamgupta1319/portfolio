# AI-observability-engine — how your code actually works

**What it is, in plain English:** a homemade version of Langfuse / LangSmith. Developers drop
a small Python SDK into their LLM app. Every LLM call, function call or "step" becomes an
**event** (a JSON record of what happened: input, output, tokens, start/end time). The SDK
batches those events and POSTs them to an **ingestion API**. The ingestion API checks the API
key, validates each event, and drops it into an in-memory queue. A background **writer** drains
the queue, works out the dollar cost of each LLM call from a pricing table, and bulk-inserts
rows into **ClickHouse** (a database built for fast analytics). A second API, protected by
login sessions and role-based permissions, reads those rows back as trace trees, cost charts
and CSV reports for a small Next.js dashboard.

- **Path:** `~/workspace/AI-observability-engine`
- **Stack:** Python 3.12 · FastAPI · Pydantic v2 + pydantic-settings · SQLAlchemy 2.0 +
  Alembic → Postgres 16 · clickhouse-connect → ClickHouse 24.3 · Redis 7 · httpx · argon2 ·
  pytest + pytest-asyncio · Next.js 14 + React Query + Zustand + Zod + Axios · Docker Compose
  (`AI-observability-engine/pyproject.toml:6-18`, `AI-observability-engine/web/package.json:12-23`)
- **Honest status:** built in phases P1 → P6a, **13 commits, all on 2026-07-02**. About 8.5k lines
  (4.7k Python in `src/` + `sdk/`, 2.8k test code). **161 backend tests pass**: I ran
  `PYTHONPATH=src .venv/bin/python -m pytest tests -q` and got `161 passed in 8.56s`. There are 22
  test files, not ~95. Every test uses fakes. **None of them talks to a real ClickHouse,
  Postgres or Redis.** There is no CI. It has never been deployed, and the handoff says the
  Docker stack is "not verified in this sandbox" (`AI-observability-engine/docs/HANDOFF.md:116`).
  The dashboard has only a login page and a cost-summary page. P6b (trace explorer) and P6c
  (admin screens) were never built (`AI-observability-engine/docs/HANDOFF.md:62-89`).

> ⚠️ **Read the section "What's missing / what you must not claim" before you put this
> project in an interview.** Reading the real code turned up two bugs on the main data path.
> You need to know about them before an interviewer finds them.

> Reading order if you have 30 minutes: `sdk/aoe_sdk/tracing.py` → `sdk/aoe_sdk/client.py` →
> `src/aoe/ingestion/app.py` → `src/aoe/ingestion/writer.py` → `migrations/clickhouse/0001_init.sql`
> → `src/aoe/query/router.py`.

---

## JD coverage

| JD requirement | Where in this code | Strength |
|---|---|---|
| FastAPI | Two apps: the write path in `AI-observability-engine/src/aoe/ingestion/app.py:132-185` and the read/admin side in `AI-observability-engine/src/aoe/app.py:19-30`; routers in `src/aoe/query/router.py:28`, `src/aoe/admin/router.py` | **Strong** |
| FastAPI dependency injection | `Depends(resolve_project_id_dependency)` at `src/aoe/ingestion/app.py:160`; RBAC dependency factories at `src/aoe/auth/rbac.py:84-98` and `src/aoe/query/authz.py:49-71` | **Strong** |
| Pydantic v2 | Discriminated union of 8 event types at `src/aoe/schemas/events.py:223-235`; `extra="forbid"` at `:103`; field validator at `:126-129`; settings at `src/aoe/config.py:13-45` | **Strong** |
| AsyncIO | Lifespan plus background writer task (`src/aoe/ingestion/app.py:139-149`); `asyncio.Queue` buffer (`src/aoe/ingestion/buffer.py:45-78`); `asyncio.to_thread` for blocking inserts (`src/aoe/ingestion/writer.py:265`) | **Partial.** Only the ingest path is async. DB access is sync, run in threads. |
| SQLAlchemy 2.0 + migrations | Typed `Mapped[...]` models in `src/aoe/models/entities.py:41-144`; engine and pool at `src/aoe/db/postgres.py:15`; Alembic at `migrations/versions/0001_initial.py` | **Partial.** Solid ORM use, but sync engine only. No `AsyncSession`. |
| SQL / analytics DB design | ClickHouse `ReplacingMergeTree`, partitions and a materialized view in `migrations/clickhouse/0001_init.sql:6-117` | **Strong as a design.** Has correctness bugs (see below). |
| LLM provider SDKs | `wrap_openai` / `wrap_anthropic` proxies, including streaming time-to-first-token (`sdk/aoe_sdk/integrations/openai.py:60-121`) | **Strong** |
| LLM observability (LangSmith/Arize-style) | The whole product: traces, spans, generations, scores, cost and latency percentiles (`src/aoe/query/reads.py:152-228`) | **Strong as a concept. Partial in correctness.** |
| Evals | Only a `score-create` event with `source` = `USER_FEEDBACK`/`EVAL`/`LLM_JUDGE` (`src/aoe/schemas/events.py:70-73`, `:210-219`). Nothing *runs* an eval. | **Partial** |
| Auth / security | SHA-256-hashed API keys, shown once (`src/aoe/security.py:38-52`); argon2 passwords (`:25-35`); Redis sessions; HMAC CSRF (`src/aoe/auth/csrf.py:49-59`); RBAC | **Strong** |
| PyTest | 161 tests, `asyncio_mode = "auto"` (`pyproject.toml:43`), dependency overrides (`tests/ingestion/test_ingest_api.py:43-48`) | **Strong** (unit level only) |
| React / Next.js | Axios instance with a CSRF interceptor (`web/src/lib/api.ts:31-44`), a React Query hook (`web/src/hooks/useCostSummary.ts:9-15`) | **Partial** (2 pages) |
| Jest / RTL | No frontend tests. No test script in `web/package.json:5-11`. | **Not present** |
| Docker | `Dockerfile` plus a 5-service `docker-compose.yml` with health checks | **Partial** (never verified running) |
| K8s / CI/CD / cloud | No `.github/`, no manifests | **Not present** |
| Tool calling / RAG / LangChain / LangGraph / MCP / vector DB | None | **Not present** |

---

## The big picture

```
 YOUR LLM APP (any Python process)
 ┌───────────────────────────────────────────────────────────────┐
 │ @observe / with trace(): / with generation(): / wrap_openai()  │  sdk/aoe_sdk/tracing.py
 │        │ each enter/exit builds an event dict                  │  sdk/aoe_sdk/integrations/
 │        ▼                                                       │
 │ AOEClient.enqueue() ─► deque (max 10k, drop-oldest)            │  sdk/aoe_sdk/client.py:130
 │        ▲ daemon thread wakes every 1s or at 100 events         │
 │        └─► httpx POST {"batch":[...]}  Bearer sk-...           │  client.py:180-199
 └──────────────────────────────┬────────────────────────────────┘
                                │ HTTP
           ┌────────────────────▼─────────────────────┐
           │ INGEST API  :8001  aoe.ingestion.app     │
           │ 1 key → project_id  (Redis cache 300s,   │──► Redis
           │   else Postgres api_keys by SHA-256)     │──► Postgres
           │ 2 envelope check (413 / 422)             │
           │ 3 per-event Pydantic validation          │
           │ 4 stamp received_at + project_id         │
           │ 5 buffer.enqueue  (full → 429)           │
           │ 6 return 207 {accepted, rejected, errors}│
           └────────────────────┬─────────────────────┘
                                │ asyncio.Queue (in-process, max 10k)
           ┌────────────────────▼─────────────────────┐
           │ Writer task (same process)               │
           │ drain ≤500 / 0.5s → map to rows          │
           │ generations: compute_cost() ─────────────┼──► Postgres model_pricing
           │ INSERT per table, 3 retries, then DLQ    │
           └────────────────────┬─────────────────────┘
                                ▼
          ClickHouse: traces | observations | generations | scores
                      (+ trace_rollups MV, never read)
                                ▲  SELECT ... FINAL
           ┌────────────────────┴─────────────────────┐
           │ QUERY/ADMIN API  :8000  aoe.app          │◄── Next.js dashboard :3000
           │ cookie session (Redis) → user            │    (login + cost summary)
           │ RBAC: project → team → membership role   │
           │ /traces /traces/{id} (tree) /metrics/*   │
           │ /metrics/cost-summary /reports/*.csv     │
           │ admin: teams, members, api-keys, pricing │
           └──────────────────────────────────────────┘
```

The two-API split is deliberate. In compose, `api` runs `aoe.app:app` on 8000 and `ingest` runs
`aoe.ingestion.app:app` on 8001 (`AI-observability-engine/docker-compose.yml:62`, `:77`). The
compose comment gives the reason: "separate service so reads never backpressure writes" (`:64`).

---

## Follow one request end-to-end

Scenario: your app calls `wrap_openai(client).chat.completions.create(model="gpt-4o", ...)`.
Later, a Viewer opens that trace in the dashboard.

### Step 1: the SDK proxy opens a "generation"

```python
# AI-observability-engine/sdk/aoe_sdk/integrations/openai.py:67-87
obs = Observation(
    "openai.chat", "generation", client=self._aoe,
    provider="openai", model=model, model_params=_params(kwargs), input=messages,
)
obs.__enter__()
if not streaming:
    try:
        resp = self._target.create(*args, **kwargs)
    except BaseException:
        obs.__exit__(*sys.exc_info())
        raise
    obs.output = _extract_completion(resp)
    _apply_usage(obs, _get(resp, "usage"))
    obs.__exit__(None, None, None)
    return resp
```

- `wrap_openai` doesn't change OpenAI's code. It returns a **proxy**: an object that pretends
  to be the client. Every attribute it doesn't override is passed through by `__getattr__`
  (`openai.py:57-58`, `:142-143`). Only `chat.completions.create` gets intercepted.
- `obs.__enter__()` is called by hand instead of through `with`, because the streaming branch
  has to keep the observation open until the caller has read the whole stream (`:96-121`).
- `_apply_usage` copies `prompt_tokens`/`completion_tokens` onto the observation **after** the
  response comes back (`:42-49`). So token counts only exist in the *exit* event. That detail
  matters in the bugs section.

### Step 2: enter/exit become two events, and contextvars wire up the parent

```python
# AI-observability-engine/sdk/aoe_sdk/tracing.py:184-190
trace_id = ctx.current_trace_id()
if trace_id is None:
    self._implicit_trace = Trace(self.name, client=self._client)
    self._implicit_trace.__enter__()
    trace_id = self._implicit_trace.id
self.trace_id = trace_id
self.parent_observation_id = ctx.current_observation_id()
```

- If no trace is active, the SDK quietly opens an implicit root trace, so a bare
  `generation()` still works.
- The parent comes from a **contextvar** (`sdk/aoe_sdk/context.py:23-28`). After the event is
  queued, `set_context(...)` makes this observation the parent of anything nested inside it
  (`tracing.py:217`). `reset_context` puts the old values back on exit (`:253-254`).
- On enter it enqueues a `generation-create` with name, provider, model, input and start_time
  (`tracing.py:192-215`). On exit it enqueues a `generation-update` with output, end_time, level
  and tokens (`:232-251`). **The update carries no `name`, `provider`, `model` or `start_time`.**

### Step 3: the client batches in a background thread

```python
# AI-observability-engine/sdk/aoe_sdk/client.py:134-142
with self._lock:
    if len(self._queue) >= self.max_queue:
        self._queue.popleft()
        self.dropped += 1
        self._maybe_warn()
    self._queue.append(event)
    should_wake = len(self._queue) >= self.batch_size
if should_wake:
    self._wakeup.set()
```

- `enqueue` never blocks your app. When the queue is full it **drops the oldest** event and
  counts it (`:135-138`). Losing a trace is better than slowing the product down.
- A daemon thread (`:119-122`) waits up to `flush_interval` (1 s) or until woken. It then POSTs
  `{"batch": [...]}` with `Authorization: Bearer sk-...` (`:98-105`, `:182`). Errors are
  logged, never raised (`:193-199`). `atexit` drains the queue on shutdown (`:123`).

### Step 4: the ingest endpoint authenticates, validates and enqueues

```python
# AI-observability-engine/src/aoe/ingestion/app.py:157-183
@app.post("/api/v1/ingest", status_code=status.HTTP_207_MULTI_STATUS)
async def ingest(
    request: Request,
    project_id: uuid.UUID = Depends(resolve_project_id_dependency),
    buffer: Buffer = Depends(get_buffer),
) -> dict[str, object]:
    ...
    raw_events = _parse_envelope(raw, max_batch_events)
    received_at_us = int(time.time() * 1_000_000)
    accepted, errors = _validate_events(raw_events, project_id, received_at_us)
    try:
        await buffer.enqueue(accepted)
    except BufferFull as exc:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, ...)
    return {"accepted": len(accepted), "rejected": len(errors), "errors": errors}
```

- `Depends(resolve_project_id_dependency)`: FastAPI runs this function first and passes its
  result in. It strips `Bearer `. Then it calls the **blocking** `resolve_project_id` through
  `run_in_threadpool` so the event loop stays free (`app.py:60-75`).
- `resolve_project_id` hashes the key with SHA-256 and checks the Redis cache
  (`aoe:ingest:apikey:<hash>`, TTL 300 s). On a miss it looks up a **non-revoked** row in Postgres
  and caches it (`src/aoe/ingestion/auth.py:50-71`, `:86-99`).
- `_validate_events` validates **each** event against the union and collects failures by index
  instead of rejecting the whole batch (`app.py:106-129`). It then overwrites `project_id` with
  the key's project: "never the body's" (`:125-127`). A test proves it
  (`tests/ingestion/test_ingest_api.py:87-96`).
- Status **207 Multi-Status** means "here's a per-item result". Rows aren't written yet. The
  docstring states that 207 reports validation results, not storage success (`app.py:13-14`).

### Step 5: the writer drains, enriches and inserts

```python
# AI-observability-engine/src/aoe/ingestion/writer.py:102-113
async def run(self, buffer: Buffer, stop_event: asyncio.Event) -> None:
    while not stop_event.is_set():
        events = await buffer.drain(self._batch_size, self._max_wait_s)
        if events:
            await self.flush_once(events)
    while True:                       # graceful shutdown sweep
        events = await buffer.drain(self._batch_size, 0.0)
        if not events:
            break
        await self.flush_once(events)
```

- The app lifespan starts this as an `asyncio.create_task` on startup. On shutdown it sets
  `stop_event` and awaits the task (`app.py:139-149`).
- `drain` waits up to 0.5 s for the *first* event, then grabs whatever else is ready, up to 500
  (`src/aoe/ingestion/buffer.py:66-78`). Busy periods give big batches. Quiet periods still
  flush within half a second.
- `_build_rows` routes by `type`. `generation-*` writes **two** rows: one in `observations`
  and one in `generations` (`writer.py:145-147`).
- `_generation_row` derives total tokens and calls `compute_cost(provider, model, prompt,
  completion, start_time)` (`writer.py:201-237`). `compute_cost` picks the pricing row with the
  **latest `effective_from` ≤ the call's start time** (`src/aoe/pricing.py:99-124`), then does
  `prompt/1000*input + completion/1000*output` in `Decimal` (`:95`).
- `_insert_with_retry` runs the blocking ClickHouse insert in a thread
  (`asyncio.to_thread`, `writer.py:265`). It retries with backoff 0.1 s, 0.2 s, 0.4 s (`:276`).
  After 3 failures it **dead-letters** the batch: it logs it and passes it to an optional sink,
  and the loop keeps running (`:268-275`, `:292-300`).

### Step 6: a Viewer reads the trace

```python
# AI-observability-engine/src/aoe/query/router.py:83-93
@router.get("/traces/{trace_id}")
def get_trace(
    trace_id: uuid.UUID,
    access: AuthorizedProject = Depends(require_project_access(Role.VIEWER)),
    ch: CHClient = Depends(get_ch),
) -> dict[str, Any]:
    trace = reads.get_trace(ch, access.project_id, trace_id)
    if trace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="trace not found")
    observations = reads.get_trace_observations(ch, access.project_id, trace_id)
    return {"trace": trace, "observations": build_tree(observations)}
```

- `require_project_access` goes cookie → Redis session → user → project's team → membership →
  role. It returns 403 for both "not a member" and "role too low", so an attacker can't use the
  difference to learn which projects exist (`src/aoe/query/authz.py:56-71`).
- The SQL uses `FROM traces FINAL` and `observations FINAL ... LEFT JOIN generations FINAL`
  (`src/aoe/query/reads.py:94`, `:120-121`). Values go in through ClickHouse's typed parameters
  (`{project_id:UUID}`), not string concatenation, so they can't be used for SQL injection.
- `build_tree` turns the flat list into nested `children`. A child whose parent never arrived
  is attached at the root and flagged `orphaned` (`src/aoe/query/tree.py:12-34`).

---

## Concepts used here, explained from zero

**Dependency injection (FastAPI `Depends`).** What it is: instead of a route building its own
DB client or checking auth itself, it *declares* what it needs. FastAPI calls the providers
first and passes the results in. Why here: auth and DB clients can be swapped out in tests. How:
`ch: CHClient = Depends(get_ch)` (`src/aoe/query/router.py:31-33`, `:74`). The tests replace the
real ones with `app.dependency_overrides[resolve_project_id_dependency] = lambda: _PROJECT`
(`tests/ingestion/test_ingest_api.py:45-46`). **Dependency factories** like `require_role(Role.ADMIN)`
are functions that *return* a dependency (`src/aoe/auth/rbac.py:84-98`).
📚 ../02-fastapi-async-pydantic-sqlalchemy.md

**Pydantic models and discriminated unions.** A Pydantic model is a class that validates and
converts incoming data, for example turning `"2026-07-02T10:00:00Z"` into a `datetime`. A
*discriminated union* means "this is one of 8 shapes, and the `type` field tells you which one".
Pydantic jumps straight to the right model instead of trying them all. How:
`Event = Annotated[Union[TraceCreate, ...], Field(discriminator="type")]`
(`src/aoe/schemas/events.py:223-235`). Each subclass pins `type: Literal["trace-create"]` (`:161`).
`extra="forbid"` rejects unknown fields (`:103`). A `field_validator` caps `input`/`output`
at 256 KiB and puts a `_truncated` marker in place of anything bigger (`:76-94`, `:126-129`).
`TypeAdapter(Event)` validates a bare union with no wrapper model (`src/aoe/ingestion/app.py:48`).

**pydantic-settings.** Config read from environment variables with types. `AOE_MAX_BATCH_EVENTS`
becomes `settings.max_batch_events: int` (`src/aoe/config.py:13-36`). `@lru_cache` builds it once
per process (`:42-45`).

**async/await and the event loop.** One thread runs many requests, switching between them
whenever one is *waiting* (`await`). The catch: anything blocking (a sync DB driver) freezes
every request at once. That's why this code wraps blocking work in `run_in_threadpool`
(`src/aoe/ingestion/app.py:71`) and `asyncio.to_thread` (`src/aoe/ingestion/writer.py:265`). The
query/admin routes are plain `def` (`src/aoe/query/router.py:63`). FastAPI runs those in its
threadpool automatically.

**Lifespan and background tasks.** `lifespan` is an async context manager: code before `yield`
runs at startup, code after it at shutdown. Here it starts the writer task and stops it
cleanly (`src/aoe/ingestion/app.py:139-149`).

**Bounded buffers and backpressure.** A buffer is a queue between a fast producer (HTTP) and a
slower consumer (DB writes). *Bounded* means it has a max size. When it's full the API
answers **429 Too Many Requests**, so clients slow down instead of the server running out of
memory (`src/aoe/ingestion/buffer.py:54-64`, `src/aoe/ingestion/app.py:176-181`). The `Buffer`
abstract class has two implementations, `AsyncQueueBuffer` and `RedisBuffer` (`buffer.py:30-129`).
**Only the in-process one is wired up** (`app.py:136`).

**SQLAlchemy 2.0, sessions and connection pools.** An ORM maps Python classes to tables:
`class ApiKey(Base)` → `api_keys` (`src/aoe/models/entities.py:99-114`). `create_engine(...,
pool_pre_ping=True)` (`src/aoe/db/postgres.py:15`) sets up a **connection pool**: open DB
connections that get reused, because opening a new one per request is slow. `pre_ping` checks
a connection is still alive before handing it out. `session_scope()` is a context manager that
commits on success, rolls back on error and always closes (`postgres.py:19-30`). Alembic
versions the schema (`migrations/versions/0001_initial.py`).

**OLTP vs OLAP.** OLTP (online *transaction* processing) means small, frequent reads and writes
of individual rows that must be consistent: users, keys, prices. Postgres is built for that.
OLAP (online *analytical* processing) means huge append-only data that you aggregate: "p95
latency per hour last week". ClickHouse is a **columnar** database. It stores each column
separately, so `sum(cost)` reads one column and skips the rest. The split is the core design
decision. Compare `src/aoe/models/entities.py` with `migrations/clickhouse/0001_init.sql`.

**ReplacingMergeTree and `FINAL`.** ClickHouse doesn't update rows in place. A
`ReplacingMergeTree(version)` table keeps, for each **sorting key** (`ORDER BY`), the row with
the highest `version`. It only does this during background merges, which happen eventually.
Until then duplicates exist, so reads add `FINAL` to force dedup at query time
(`migrations/clickhouse/0001_init.sql:23-25`, `src/aoe/query/reads.py:82`). Here `version` =
server `received_at` in microseconds (`src/aoe/ingestion/app.py:173`). Two traps: it dedups
by the `ORDER BY` key, **not by `id`**, and it replaces the **whole row**. It never merges fields.

**Materialized views.** A materialized view (MV) is a trigger that runs a query on every
insert into a source table and writes the result into a target table. `trace_rollups_mv` sums
`cost`/`total_tokens` from `generations` into an `AggregatingMergeTree`
(`migrations/clickhouse/0001_init.sql:98-117`). No query reads it (`grep trace_rollups src` finds
nothing), and the writer leaves `traces.total_cost` NULL (`src/aoe/ingestion/writer.py:175-176`).

**API-key auth.** Keys come as a pair: public `pk-...` and secret `sk-...` (`src/aoe/security.py:38-42`).
Only `sha256(secret)` is stored (`:45-47`, `entities.py:109`), so a DB leak doesn't leak working
keys. The secret is returned once at mint time (`src/aoe/admin/router.py:406-414`). SHA-256 is
fine here because the secrets are random 32-byte tokens. Passwords are low-entropy, so they use
slow, salted **argon2** (`security.py:25-35`). Revoking a key also deletes its cache entry, so it
stops working immediately (`admin/router.py:446-451`, `ingestion/auth.py:74-83`).

**Sessions and CSRF.** The dashboard logs in with a cookie holding a random session id. The
id→user mapping lives in Redis for 7 days (`src/aoe/auth/sessions.py:34`, `:49-53`). The cookie is
`HttpOnly` (JavaScript can't read it), `Secure` and `SameSite=Lax` (`:29-31`). Browsers attach
cookies automatically, so a malicious site could trigger a POST. **CSRF** (cross-site request
forgery) protection requires a second value that the attacker can't know: `HMAC(secret,
session_id)`, returned at login and echoed in `X-CSRF-Token` (`src/aoe/auth/csrf.py:49-59`,
`src/aoe/auth/router.py:93-98`). The Axios interceptor adds it to mutating requests
(`web/src/lib/api.ts:36-44`).

**RBAC (role-based access control).** Permissions come from your role in a team, not from who
you are. Roles are ranked `VIEWER=1 < MEMBER=2 < ADMIN=3` (`src/aoe/auth/rbac.py:28`), and
`role_at_least` compares ranks (`:31-36`). A user can be in many teams with different roles
(unique on `(team_id, user_id)`, `entities.py:87`).

**Context managers, decorators and contextvars (the SDK).** A context manager is an object
with `__enter__`/`__exit__`, used through `with`. It's perfect for "start timer / stop timer, and
record the exception if one happened" (`sdk/aoe_sdk/tracing.py:180-259`). A decorator wraps a
function. `@observe` wraps each call in an `Observation` and detects `async def` functions so
it can `await` them (`tracing.py:277-335`). A **contextvar** is a variable whose value is
separate per thread and per asyncio task. That lets nested spans find their parent even when
many requests run concurrently (`sdk/aoe_sdk/context.py:23-28`, `:63-78`).

**UUIDv7.** An id with the creation timestamp in its top bits, so ids sort by time. The SDK
mints them client-side, so a retry carries the same id (`sdk/aoe_sdk/ids.py:1-11`, `:29-40`).

**Protocols (structural typing) for testability.** `class ClickHouseClient(Protocol)` says
"anything with an `insert(...)` method will do" (`src/aoe/ingestion/writer.py:67-70`). Tests pass a
`FakeClient` without inheriting from anything. That's how 161 tests run with no databases.
📚 ../09-testing-pytest-jest-rtl.md

**Decimal for money.** Floats can't represent 0.1 exactly. Cost math uses `Decimal`, quantized to 8
places to match ClickHouse `Decimal(18, 8)` (`src/aoe/pricing.py:92-96`, `src/aoe/ingestion/writer.py:305`).

---

## Why it was built this way

- **Two databases.** Config is small, relational and mutable, so it goes in Postgres. Traces are
  huge, append-only and aggregated, so they go in ClickHouse. One database would be bad at one
  of the two jobs.
- **Two FastAPI apps.** Ingestion is high-volume. Reads are heavy queries. As separate services
  (`docker-compose.yml:49-77`) they scale separately, and a slow dashboard query can't starve
  ingestion.
- **Accept fast, write later.** The endpoint only validates and queues, and the writer batches.
  ClickHouse is happiest with few, large inserts. Small, frequent ones cause merge pressure.
- **Partial success (207).** One malformed event from a buggy SDK shouldn't drop 999 good ones
  (`src/aoe/ingestion/app.py:106-129`).
- **Tenant from the key, never the body.** This blocks cross-tenant writes (`app.py:125-126`).
- **Cost at write time, using the price effective at call time.** If OpenAI changes prices
  next month, last month's history stays correct (`src/aoe/pricing.py:99-124`). A
  `reported_cost` hook exists for providers that return cost (`:76-77`).
- **Never break the host app.** The SDK drops the oldest event on overflow, swallows transport
  errors and flushes from a daemon thread (`sdk/aoe_sdk/client.py:130-199`). Observability
  should never take the product down.
- **Capture policy for PII.** `full`/`truncated`/`masked`/`none`. `masked` regex-redacts bearer
  tokens, `sk-`/`ghp_` keys, emails and phone numbers before anything leaves the process
  (`sdk/aoe_sdk/capture.py:31-40`, `:96-118`). The server applies its own byte cap on top.
- **Interfaces at every I/O seam** (`Buffer`, `ClickHouseClient`, `CHClient`, `DeadLetterSink`).
  The Redis buffer → Kafka path stays open, and tests stay fast.

---

## What's missing / what you must not claim

### Two real bugs on the main data path (found by reading the code and an offline simulation)

1. **SDK update events will break the ClickHouse insert.** `trace-update` / `span-update` /
   `generation-update` don't include `start_time` (`sdk/aoe_sdk/tracing.py:103-111`, `:232-250`).
   The writer then puts `None` into `start_time` (`src/aoe/ingestion/writer.py:173`, `:195`, `:203`).
   That column is non-nullable `DateTime64(6)` (`migrations/clickhouse/0001_init.sql:16`, `:42`, `:67`).
   I ran clickhouse-connect's own `DateTime64` serializer offline on `[datetime, None]`, and it raises
   `AttributeError: 'NoneType' object has no attribute 'timestamp'`. Each table's insert would
   therefore fail 3 times and **dead-letter the whole batch, valid creates included**. The tests
   never feed an SDK-style create+update pair through the writer, which is why they're green.
   Even if the update carried `start_time`, `ReplacingMergeTree` would replace the whole create row
   (name, input, model) with the sparse update. The docstring's "partial updates merge"
   (`src/aoe/schemas/events.py:7-9`) is not how that engine works.
2. **Cost is never computed for wrapped OpenAI/Anthropic calls.** Tokens arrive only on the
   update (`sdk/aoe_sdk/integrations/openai.py:84-86`), and the update has no provider/model. So
   `compute_cost(None, None, 100, 50, None)` returns `UNKNOWN` (`src/aoe/pricing.py:83-84`). I
   pushed SDK-shaped events through `_validate_events` and `_build_rows` offline. Both generation
   rows came out `cost_source='UNKNOWN'`. The writer test passes only because it sends tokens on
   the *create* event (`tests/ingestion/test_writer.py:99-131`).

**How to talk about it:** "My unit tests used fakes. When I traced the SDK's real event
sequence through the writer, I found update events were incompatible with my ClickHouse
schema. The fix is to merge create and update in the SDK into one event on exit, or switch the
dedup key/engine." That's a strong senior answer. Claiming it "works end-to-end" is not.

### Other gaps

- **The rollup MV is dead code, and it would double-count.** It's never read, and
  `traces.total_cost` is always NULL. `sumState` also runs on *every* inserted row, so a
  create plus an update row for one generation would be summed twice. Don't claim "dashboards read
  from a rollup". `genai/14` says they do. They query `generations FINAL` directly
  (`src/aoe/query/reads.py:163-170`).
- **The Redis buffer isn't wired.** The default is an in-process `asyncio.Queue`
  (`src/aoe/ingestion/app.py:136`). A crash loses up to 10k accepted events, and you can't run
  more than one ingest replica with a shared buffer.
- **Pricing is global, and any team's admin can change it** (`src/aoe/admin/router.py:512-524`).
  One tenant can change every tenant's costs.
- **Not async DB.** The engine is sync SQLAlchemy plus sync `redis`, run in threads. Don't say
  "fully async".
- **Lint/type claims.** `pyproject.toml` sets `mypy strict = true` (`:48`), but `mypy src`
  reports 10 errors and `ruff check src sdk` reports 91. There's no CI to enforce either.
- **No integration tests, no CI, never deployed.** The Dockerfile has no `CMD` (compose supplies
  it). The SDK docstring example points at `:8000` (`sdk/aoe_sdk/__init__.py:12`), but ingest
  listens on `:8001`.
- **Dashboard:** only login and cost summary. No trace explorer, no admin UI, no Jest/RTL.
- **Not present at all:** OpenTelemetry/OTLP export, a LangChain callback handler, running
  evals or an LLM judge, sampling, retention/TTL, PII detection beyond regex, Kubernetes.
- **Corrections to `genai/14-deepdive-projects.md`:** "Redis for buffer" (not wired); "rollup
  MV so dashboard queries don't scan raw events" (not true); "cost enrichment at write time"
  (true only for events that carry provider, model and tokens together, which the SDK never
  sends). "P1 → P6a shipped" and "README understates" are accurate. README still says only P1
  is done (`README.md:32-35`).

📚 ../10-observability-and-evals.md · ../11-devsecops-docker-k8s-cicd-cloud.md

---

## Say it in an interview

**60-second pitch:**
> "I built a small Langfuse-style LLM observability platform to understand what those tools
> do under the hood. There's a Python SDK with an `@observe` decorator, context managers and
> drop-in wrappers for the OpenAI and Anthropic clients, including streaming time-to-first-token.
> It batches events from a background thread and never blocks the host app. Ingestion is its
> own FastAPI service. It authenticates a hashed API key, validates every event against a
> Pydantic discriminated union with per-event partial success, and pushes into a bounded queue
> that returns 429 under pressure. An async writer batches into ClickHouse with retries and a
> dead-letter path, and it computes cost from a time-versioned pricing table in Postgres.
> Postgres holds tenants, keys and RBAC. ClickHouse holds traces. A separate read API enforces
> team-scoped roles with session cookies and CSRF. There are 161 unit tests. It's not in
> production. When I traced the SDK's real event sequence through the writer, I found a
> schema mismatch on update events, and I can walk you through it and the fix."

**Likely questions:**

1. **Why ClickHouse and not just Postgres?** Trace data is append-only and queried by
   aggregation over time ranges. A columnar store reads only `cost` and `start_time` for a cost
   chart. Partitioning by `(project_id, day)` (`0001_init.sql:24`) prunes whole days and tenants.
   Postgres stays for transactional config.
2. **How do you handle duplicate events from retries?** The SDK reuses the same id. The server
   stamps `version = received_at`, and `ReplacingMergeTree` plus `FINAL` keeps one row. Then be
   honest: it dedups on the sorting key, which includes `start_time`, and it replaces whole rows.
   So my create/update design needs fixing. Either the SDK emits one complete event on exit, or
   I use `argMax` per field.
3. **What happens if ClickHouse is down?** Each table insert retries 3 times with exponential
   backoff, then the batch goes to a dead-letter sink and the loop continues
   (`writer.py:261-300`). The buffer fills, the API returns 429, and the SDK logs and counts
   failures. Weakness: the buffer is in memory, so a crash loses it. Fix: wire `RedisBuffer` or Kafka.
4. **How is multi-tenancy enforced?** On write, the project comes from the API key, never the
   body (`app.py:125-126`). On read, every route resolves project → team → membership role in a
   dependency and returns 403 before any query runs (`authz.py:56-71`). Every SQL statement still
   filters `project_id`.
5. **Why SHA-256 for API keys but argon2 for passwords?** Keys are 256-bit random values, so brute
   force is hopeless and a fast hash allows an indexed lookup. Passwords are guessable, so they
   need a slow, salted hash.
6. **How does `@observe` know the parent span in async code?** Through contextvars. Each asyncio
   task gets its own copy of the context, so concurrent requests don't mix parents
   (`context.py:23-28`).
7. **How do you test this without databases?** Every I/O boundary is a Protocol or ABC. Tests
   inject fakes (`FakeClient`, `RecordingBuffer`) and use FastAPI `dependency_overrides`
   (`tests/ingestion/test_ingest_api.py:20-48`). Gap: no integration tests with testcontainers,
   which is exactly how the update bug slipped through.
8. **How would you compute cost if prices change?** Pricing rows have `effective_from`, and I pick the
   latest one ≤ the call's start time, so history isn't rewritten (`pricing.py:99-124`).

---

## Make it yours — exercises

1. **Fix the update bug in the SDK (the most valuable one).** Start in
   `sdk/aoe_sdk/tracing.py:220-251`. On `__exit__`, send a *complete* `*-create`-style event
   containing every field: name, provider, model, start_time, end_time, tokens, output. Drop
   the enter-time event, or keep it only for streaming. Then add a test in
   `tests/ingestion/test_writer.py` that runs SDK-shaped events through `_build_rows` and asserts
   no `None` start_time and `cost_source == "COMPUTED"`. Done = that test fails before your fix
   and passes after, and the 161 existing tests are still green.
2. **Wire the Redis buffer.** In `src/aoe/ingestion/app.py:136`, choose `RedisBuffer(redis.asyncio
   .Redis.from_url(...), key="aoe:ingest:buffer", max_length=...)` when a new setting
   `AOE_BUFFER_BACKEND=redis` is set (`src/aoe/config.py`). Done = a test using `FakeAsyncRedis`
   (`tests/ingestion/conftest.py`, imported at `tests/ingestion/test_buffer.py:11`) shows
   `create_app()` picks the right backend.
3. **Add an integration test with real ClickHouse.** Create `tests/integration/test_clickhouse_e2e.py`
   using `docker compose up clickhouse`, mark it `@pytest.mark.integration`, run
   `python -m aoe.db.ch_migrate`, insert through `Writer`, and read back with
   `reads.get_trace_observations`. Done = it reproduces bug #1 before your fix.
4. **Export spans to OpenTelemetry.** In the writer, add an optional `DeadLetterSink`-style
   "exporter" Protocol that also sends each observation as an OTel span (`opentelemetry-sdk`,
   OTLP exporter). Done = an in-memory OTel exporter test sees one span per observation, with
   `parent_span_id` mapped from `parent_observation_id`.
5. **Add an LLM-as-judge scorer.** Write a small script that reads recent generations through
   `GET /api/v1/traces/{id}`, asks a model to grade the output 1–5, and POSTs a `score-create`
   with `source="LLM_JUDGE"` to `/api/v1/ingest`. Done = `GET /api/v1/scores?trace_id=...` returns
   your score. Now "evals" in your pitch is true.
