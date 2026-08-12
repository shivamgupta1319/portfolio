# 03 — Node.js, NestJS, API Design, Auth & Queues

> The heaviest file, and the one most likely to decide an SDE-2 backend round. Auth and
> queues in particular are where interviewers probe for production scars — answer from what
> you've actually shipped, not from a blog.
>
> 🔥 = genuinely hard / commonly fumbled.

---

## Node.js runtime

**Q. 🔥 Walk me through the Node event loop phases.**

> libuv runs the loop through ordered phases. The ones worth naming: **timers** (`setTimeout`,
> `setInterval` callbacks whose threshold has elapsed), **pending callbacks**, **poll**
> (retrieve new I/O events and run their callbacks — this is where the loop spends most of its
> time and where it blocks when idle), **check** (`setImmediate`), and **close callbacks**.
> Between every phase — and between each individual callback — Node drains the microtask
> queues: `process.nextTick` first, then promises.

↳ **If pushed:** `setImmediate` vs `setTimeout(fn, 0)` — inside an I/O callback `setImmediate`
  always fires first, because the check phase comes right after poll. At the top level the
  order is nondeterministic, since it depends on how long the process took to start.

---

**Q. Node is single-threaded — so how does it do anything in parallel?**

> The *JavaScript* is single-threaded, but the runtime isn't. Network I/O is genuinely
> asynchronous at the OS level (epoll/kqueue), so it doesn't need a thread at all. Operations
> that have no async OS primitive — filesystem calls, DNS lookups, `crypto.pbkdf2`, zlib —
> are offloaded to libuv's thread pool, which defaults to 4 threads and is resizable with
> `UV_THREADPOOL_SIZE`. So a CPU-heavy crypto call doesn't block the loop, but four concurrent
> ones will saturate the pool and queue the fifth.

---

**Q. What happens if you block the event loop, and how do you avoid it?**

> Everything stops — no requests are accepted, no timers fire, health checks fail. The usual
> culprits are a synchronous crypto or compression call, a huge `JSON.parse`, a regex with
> catastrophic backtracking, or a tight loop over a large array. Fixes, in order of preference:
> move the work off the process entirely into a queue worker; use `worker_threads` if it must
> stay in-process; or chunk the work and yield with `setImmediate` between chunks. I'd detect
> it with event-loop-lag monitoring rather than waiting for a user to complain.

🔗 *Yours:* CopyTrade and Resite both push the heavy work (execution, PDF rendering via
Puppeteer) into BullMQ workers rather than doing it in the request.

---

**Q. `cluster` vs `worker_threads`?**

> `cluster` forks whole processes that share a listening socket — separate memory, separate
> event loops, and the OS load-balances connections. That's how you use all the cores for a
> normal web workload, and it's what a process manager or a container-per-core setup does for
> you. `worker_threads` are threads within one process that can share memory via
> `SharedArrayBuffer` — the right tool for CPU-bound computation where copying data between
> processes would dominate the cost. Rule of thumb: cluster for throughput, worker threads for
> CPU-bound work.

---

**Q. Explain streams and backpressure.**

> A stream processes data in chunks instead of loading it all into memory — essential for
> large files or proxying. Backpressure is the flow-control mechanism: when a writable stream's
> internal buffer exceeds its high-water mark, `write()` returns `false`, meaning "stop and
> wait for `drain`". If you ignore that return value the buffer grows unbounded and the
> process runs out of memory. Using `pipe()` — better, `pipeline()` — handles it for you, and
> `pipeline` also propagates errors and cleans up on failure, which raw `pipe` doesn't.

---

**Q. CommonJS vs ESM?**

> CommonJS `require` is synchronous and dynamic — resolved at runtime, so you can require
> conditionally, but bundlers can't tree-shake reliably. ESM `import` is static and hoisted,
> which enables tree-shaking and top-level `await`, and it's the standard. The friction is at
> the boundary: ESM can import CommonJS, but CommonJS can only load ESM through dynamic
> `import()`, and ESM has no `__dirname` or `require` — you reconstruct them from
> `import.meta.url`.

---

**Q. How do you handle errors in a Node service?**

> Distinguish operational errors (a failed upstream call, invalid input, a timeout) from
> programmer errors (a bug — a null dereference). Operational errors get handled, retried, or
> turned into a proper HTTP response. Programmer errors should crash the process — after
> logging — and let the supervisor restart it clean, because continuing in an unknown state is
> worse. I use a single error-handling layer (a NestJS exception filter, or Express error
> middleware) rather than try/catch scattered through handlers, plus `unhandledRejection` and
> `uncaughtException` handlers that log and exit rather than swallow.

---

**Q. How do you find a memory leak in a Node service?**

> Confirm it first: watch RSS and heap-used over time — a leak trends up and never returns to
> baseline after GC, whereas a sawtooth is healthy. Then take heap snapshots with `--inspect`
> at two points under load and diff them, sorting by retained size. The usual causes are
> listeners on a long-lived emitter added per request, an unbounded in-memory cache or Map, a
> closure holding a large buffer, and timers never cleared. `--max-old-space-size` raises the
> ceiling but doesn't fix anything.

---

**Q. What is graceful shutdown, and why does it matter?**

> On `SIGTERM` — which is what Docker and orchestrators send — you stop accepting new
> connections, finish in-flight requests, close database pools and queue workers, then exit.
> Without it, a deploy kills requests mid-flight and can leave jobs half-processed. The subtle
> part is ordering: stop taking new work first, drain second, close resources last, and keep a
> hard timeout so a stuck request can't block the shutdown forever.

---

**Q. How would you scale a Node API?**

> Vertically first (it's cheap): profile and fix the actual bottleneck, which is usually the
> database, not Node. Then horizontally — make the process stateless so any instance can serve
> any request, put sessions in Redis rather than memory, run multiple instances behind a load
> balancer. Then the standard levers: connection pooling with sane limits, caching reads,
> moving slow work to queues, and adding read replicas. The order matters — people reach for
> more instances when a missing index is the real problem.

---

## NestJS

**Q. Why NestJS over plain Express?**

> Structure and dependency injection. Express gives you a router and leaves architecture to
> you, which is fine solo and painful across a team and three years. Nest brings an opinionated
> module system, a DI container that makes services testable by injecting mocks rather than
> monkey-patching, decorator-based routing and validation, and a consistent request pipeline.
> It's also transport-agnostic — the same providers work over HTTP, WebSockets or a message
> broker. The cost is a steeper learning curve and more boilerplate; for a small service Express
> or Fastify is still the right call.

---

**Q. Explain NestJS dependency injection.**

> Providers are registered in a module and resolved by the DI container using the constructor
> parameter types as tokens. You depend on the class (or an injection token for an interface),
> and Nest constructs and caches the instance. The payoff is testing: in a unit test you build
> a testing module and override a provider with a mock, no import mangling. Default scope is
> singleton — one instance for the whole app — with `REQUEST` and `TRANSIENT` scopes available,
> but request-scoped providers bubble up and force everything depending on them to be
> request-scoped too, which has a real performance cost.

---

**Q. 🔥 Walk me through the NestJS request lifecycle.**

> Incoming request → **middleware** → **guards** → **interceptors** (pre) → **pipes** →
> **route handler** → **interceptors** (post) → **exception filters** if anything threw.
>
> Each has a job: middleware for framework-level concerns (logging, raw body, helmet); guards
> for "is this request allowed" — auth and RBAC, returning boolean; pipes for transforming and
> validating input, which is where `ValidationPipe` turns a payload into a typed DTO;
> interceptors wrap the handler on both sides — response shaping, caching, timing, timeouts;
> filters turn thrown exceptions into HTTP responses.

↳ **If pushed:** why authorisation belongs in a guard, not an interceptor — guards run before
  pipes so you reject unauthorised requests before spending work on validation.

---

**Q. How do you validate input in Nest?**

> DTO classes with `class-validator` decorators, and a global `ValidationPipe` with
> `whitelist: true` and `forbidNonWhitelisted: true` so unexpected properties are stripped or
> rejected — that closes mass-assignment holes. `transform: true` gives you real class
> instances with coerced types. The DTO is then a single source of truth for shape,
> validation, and Swagger documentation.

---

**Q. How do you test a NestJS app?**

> Unit tests build a `Test.createTestingModule` with the real provider under test and mocks
> for its dependencies — fast, no I/O. Integration tests wire the real module against a test
> database, usually a throwaway container, and hit the app through `supertest` so the whole
> pipeline (guards, pipes, filters) is exercised. E2E covers the critical user flows. I don't
> chase coverage numbers; I make sure the paths where being wrong is expensive — money
> movement, permissions, anything destructive — are covered properly.

🔗 *Yours:* GIBP is exactly this argument — Playwright E2E on the financial flows because a
reconciliation bug isn't recoverable with an apology.

---

**Q. How do you manage configuration and secrets?**

> `@nestjs/config` with a schema-validated config object, so a missing or malformed env var
> fails at boot rather than at 2am on the one code path that reads it. Secrets come from the
> environment, injected by the platform — never committed, never in the image. In development a
> `.env` that's gitignored; in production the orchestrator's secret store.

---

**Q. What's a custom decorator good for?**

> Removing repetition at the handler signature. The canonical one is `@CurrentUser()` — a
> param decorator that pulls the authenticated user off the request so every handler doesn't
> destructure `req.user` and lose typing. Composed decorators are also useful: bundling
> `@UseGuards(AuthGuard, RolesGuard)` plus `@ApiBearerAuth()` into a single `@Auth()` so the
> security posture of an endpoint is one obvious line.

---

## REST API design

**Q. How do you design a REST API?**

> Resources as plural nouns, HTTP verbs for the operation — `GET /users`, `POST /users`,
> `GET /users/:id`, `PATCH /users/:id`, `DELETE /users/:id`. Nesting only one level deep to
> express ownership (`/users/:id/orders`); beyond that use query filters instead. Correct
> status codes, consistent error shape, pagination on every collection endpoint from day one,
> and versioning decided before the first client integrates. The thing I care about most is
> consistency — a predictable API is worth more than a clever one.

---

**Q. Which status codes do you actually use?**

> `200` OK, `201` Created (with a `Location` header), `202` Accepted for async work,
> `204` No Content for a delete. `400` malformed request, `401` not authenticated,
> `403` authenticated but not permitted, `404` not found, `409` conflict — duplicate or a
> version clash, `422` semantically invalid, `429` rate limited (with `Retry-After`).
> `500` unhandled, `503` dependency down.
>
> The distinction interviewers check is 401 vs 403 — who you are versus what you're allowed —
> and 400 vs 422.

---

**Q. 🔥 What is idempotency and how do you implement it?**

> An idempotent operation produces the same result whether it's applied once or many times.
> `GET`, `PUT` and `DELETE` are idempotent by definition; `POST` is not, which is the problem —
> a client that times out and retries a payment can charge twice. The fix is an idempotency
> key: the client sends a unique key with the request, the server stores the key with the
> result in a table with a unique constraint, and a repeat of the same key returns the stored
> response instead of re-executing. The subtlety is the in-flight case — a second request
> arriving while the first is still processing should be rejected with a conflict, not queued,
> and the key insert must be in the same transaction as the effect.

🔗 *Yours:* CopyTrade's trade execution — the queue is at-least-once, so job handlers must be
idempotent or a redelivery duplicates a real position.

---

**Q. Offset vs cursor pagination?**

> Offset (`LIMIT 20 OFFSET 1000`) is simple and lets you jump to a page, but the database must
> scan and discard everything before the offset, so deep pages get slow, and rows inserted
> during paging cause items to be skipped or repeated. Cursor pagination uses the last seen
> sorted key (`WHERE created_at < ? ORDER BY created_at DESC LIMIT 20`) — it's O(limit) with an
> index and stable under concurrent writes, at the cost of no random page access. Offset for a
> small admin table, cursor for feeds, logs and anything large or live.

---

**Q. How do you version an API?**

> URL path versioning (`/v1/users`) in practice — it's explicit, cache-friendly, trivially
> visible in logs, and every client and proxy handles it. Header versioning is cleaner in
> theory and worse in operations. The more important discipline is avoiding a v2 at all:
> additive changes only, never repurpose a field's meaning, treat removal as a breaking change
> with a deprecation window and metrics on who's still calling the old shape.

---

**Q. REST vs GraphQL vs gRPC?**

> REST for public and general-purpose APIs — universal, cacheable at the HTTP layer, simple.
> GraphQL when clients have widely differing data needs and over-fetching or waterfall requests
> are the real pain — you pay for it with N+1 risk (needs DataLoader), harder caching, and
> query-cost limiting to prevent abuse. gRPC for internal service-to-service calls where you
> want a strict contract, binary efficiency and streaming — not for browsers without a proxy.
> Most systems I'd build are REST at the edge, and I'd only add GraphQL if a client team was
> genuinely blocked by endpoint shape.

---

**Q. How do you rate limit an API?**

> Token bucket in Redis, keyed by API key or user ID rather than IP where possible, since IP
> punishes anyone behind NAT. Return `429` with `Retry-After` and expose the limit in
> `RateLimit-*` headers so good clients can self-regulate. Different limits per tier and per
> endpoint — an expensive report endpoint deserves a tighter budget than a health check. And
> it belongs at the edge (Nginx or a gateway) as well as in the app, so abusive traffic is shed
> before it costs you a database connection.

---

**Q. What does a good error response look like?**

> Consistent envelope, machine-readable code, human-readable message, and per-field details
> for validation errors — plus a request/correlation ID the user can quote in a support ticket
> and I can grep in logs.

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request validation failed",
    "details": [{ "field": "email", "issue": "must be a valid email" }],
    "requestId": "req_01HV8..."
  }
}
```

> And never leak stack traces, SQL, or internal hostnames to the client.

---

**Q. How do you secure an API?**

> Layered: TLS everywhere; authenticate every request; authorise per-resource, not just per-
> route; validate and whitelist all input; parameterised queries only, so injection isn't
> possible; rate limit; set security headers (helmet); restrictive CORS with an explicit
> origin allowlist rather than `*`; and keep secrets out of code and logs. Then the specific
> ones people miss — IDOR (checking the record actually belongs to the caller), mass assignment,
> and verbose errors that leak schema.

---

## Auth: JWT & RBAC

**Q. What's inside a JWT and how is it verified?**

> Three base64url parts: header (algorithm), payload (claims — `sub`, `exp`, `iat`, `iss`,
> `aud`, plus your own), and a signature over the first two. The server verifies the signature
> with the secret (HMAC) or public key (RS256), then checks expiry, issuer and audience. The
> critical thing to say out loud: the payload is **encoded, not encrypted** — anyone holding
> the token can read it, so it must never carry anything sensitive.

---

**Q. 🔥 Why access + refresh tokens rather than one long-lived token?**

> A JWT is stateless, so you can't revoke it before it expires — that's the whole tradeoff.
> Short-lived access tokens (minutes) limit the blast radius of a stolen token; a long-lived
> refresh token, stored server-side so it *can* be revoked, mints new access tokens. You get
> stateless verification on the hot path and real revocation where it matters.

↳ **If pushed:** refresh token rotation — issue a new refresh token on each use and invalidate
  the old one. If a previously-used token is presented again, that's replay: revoke the entire
  token family and force re-authentication.

---

**Q. Where do you store tokens on the client?**

> `httpOnly`, `secure`, `sameSite` cookies. `localStorage` is readable by any JavaScript on the
> page, so a single XSS — including from a compromised dependency — exfiltrates the session.
> Cookies bring CSRF into scope, which `sameSite=lax`/`strict` largely handles, plus a CSRF
> token for cross-site flows. Summarised: localStorage trades a hard-to-fix vulnerability (XSS
> token theft) for an easy-to-fix one (CSRF), which is the wrong trade.

---

**Q. How do you revoke a JWT?**

> Properly, you don't — you design around it. Keep access tokens short so the window is small,
> revoke the refresh token server-side, and for immediate revocation keep a denylist of token
> IDs (`jti`) in Redis with a TTL matching the token's remaining lifetime — that's a cache
> lookup, not a database round-trip. A `tokenVersion` on the user record, checked at refresh
> time, is the cheap way to invalidate everything for one user after a password change.

---

**Q. RBAC vs ABAC?**

> RBAC assigns permissions to roles and roles to users — simple, auditable, and covers most
> applications. ABAC evaluates attributes at request time (this user's department, this
> record's owner, the time of day), which is far more expressive and far harder to reason
> about. In practice I build RBAC with resource-level ownership checks, which handles the
> common "editors can edit, but only their own records" case without a full policy engine.

---

**Q. How do you model permissions in the database?**

> `users` ↔ `roles` many-to-many, `roles` ↔ `permissions` many-to-many, permissions as
> `resource:action` strings (`invoice:approve`). Checks are against permissions, never role
> names — so adding a role doesn't require touching code. In a multi-tenant system the role
> assignment is scoped to the tenant, because a user can be an admin in one organisation and a
> viewer in another. Permissions are cached per session and busted on change.

🔗 *Yours:* GIBP — multi-tenant fintech with company and super-admin portals is precisely this
model, including cross-tenant scoping.

---

**Q. Explain OAuth2 / OIDC briefly.**

> OAuth2 is *authorisation* — it lets a third party act on a user's behalf without their
> password. OIDC layers *authentication* on top, adding an ID token that says who the user is.
> The flow you should use in a web or mobile app is authorisation code with PKCE: the client
> gets a short-lived code, then exchanges it for tokens with a proof key, so intercepting the
> code alone is useless. Implicit flow is deprecated — tokens in the URL fragment end up in
> history and logs.

---

**Q. How do you store passwords?**

> A slow, salted, memory-hard hash — argon2id preferred, bcrypt acceptable — with a cost
> factor tuned so hashing takes on the order of a hundred milliseconds on your hardware. Never
> SHA-256, which is fast and therefore trivially brute-forced on a GPU. Salt is per-user and
> handled by the library. On login, always run the comparison even for a non-existent user, so
> response timing doesn't reveal which emails are registered.

---

## Queues: BullMQ

**Q. Why use a queue at all?**

> To decouple accepting work from doing it. It keeps request latency low by returning as soon
> as the job is durable, absorbs traffic spikes instead of collapsing under them, gives you
> retries with backoff for free, and lets the worker tier scale independently of the API tier.
> The cost is real: eventual consistency, a new failure mode (jobs stuck or lost), and the
> operational burden of monitoring queue depth.

🔗 *Yours:* Resite (PDF rendering + résumé parsing) and CopyTrade (trade execution) both live
on BullMQ; pSEO uses pg-boss for the same reason with Postgres as the broker.

---

**Q. How does BullMQ work?**

> Redis-backed. Producers add jobs to a queue; workers pull them, and BullMQ uses Redis atomic
> primitives to make sure exactly one worker takes each job. Jobs move through waiting →
> active → completed/failed, with support for delayed jobs, repeatable (cron) jobs, priorities,
> and per-worker concurrency. A stalled job — one whose worker died mid-processing — is
> detected by a missed lock renewal and re-queued.

---

**Q. 🔥 What delivery guarantee do you get, and what follows from that?**

> At-least-once. A worker can complete the real-world side effect and then die before marking
> the job complete, so the job gets redelivered. That means **handlers must be idempotent** —
> a natural key, a unique constraint, or a check-then-act inside a transaction. Exactly-once
> across a queue and an external system doesn't exist without distributed transactions; you
> get it in practice by making the effect idempotent instead.

---

**Q. How do you handle a failing job?**

> Retries with exponential backoff and jitter, capped at a sensible attempt count. Distinguish
> retryable failures (timeout, 503, rate limit) from permanent ones (validation error, 404) —
> retrying a permanent failure twenty times just burns capacity and delays the alert. After
> the final attempt the job goes to a dead-letter queue with its error and payload, so it can
> be inspected and replayed after the fix rather than silently lost. And I alert on DLQ depth,
> because a queue that quietly fills is an outage nobody noticed.

---

**Q. What do you monitor on a queue?**

> Queue depth and its rate of change, job age (oldest waiting job is the real user-facing
> latency), processing duration percentiles, failure rate, DLQ size, and active worker count.
> The alert that matters most is depth growing steadily — it means arrival rate exceeds service
> rate, and it will not recover on its own.

---

**Q. When would you use Redis for queues vs something else?**

> Redis/BullMQ when you want low latency, rich job features and you already run Redis — with
> the caveat that Redis persistence is not as durable as a database, so for jobs you truly
> cannot lose, either configure AOF with `appendfsync everysec` and accept a small window, or
> use a database-backed queue. Postgres-backed (pg-boss) when the job is tied to data you're
> already writing, because you can enqueue in the same transaction as the write and eliminate
> the "committed the row but lost the job" gap. Kafka is a different tool — a durable, replayable
> log for event streaming and multiple independent consumers, not a work queue.

↳ **If pushed on the transactional gap:** this is the outbox pattern — write the job into an
  outbox table in the same transaction as the business data, and a relay publishes it. Worth
  naming; it's a strong senior signal.

---

## Rapid-fire

| Question | One-liner |
|---|---|
| CORS | Browser-enforced policy; the server declares which origins may read its responses. |
| Preflight | An `OPTIONS` request the browser sends before non-simple cross-origin requests. |
| WebSocket vs SSE vs polling | Bidirectional / server→client only, auto-reconnecting / dumb but universal. |
| Long polling | Hold the request open until data arrives — fallback when WebSockets are blocked. |
| Middleware | A function in the request chain that can act and then pass control on. |
| DTO | The validated shape of data crossing a boundary, decoupled from the DB entity. |
| Salting | Per-user random added before hashing so identical passwords hash differently. |
| HTTPS handshake | Negotiate cipher, verify certificate, exchange keys, then symmetric encryption. |
| `helmet` | Sets security headers (HSTS, CSP, X-Frame-Options, etc.). |
| Health check | Liveness = is the process up; readiness = can it serve traffic (deps OK). |
| Correlation ID | A per-request ID propagated across services so logs can be stitched together. |
| Circuit breaker | After N failures, stop calling a dead dependency and fail fast until it recovers. |
| Webhook security | Verify the HMAC signature and reject stale timestamps to prevent replay. |
| Soft delete | Flag the row instead of removing it — preserves audit trail and referential integrity. |

---

## Back to [INDEX.md](INDEX.md)
