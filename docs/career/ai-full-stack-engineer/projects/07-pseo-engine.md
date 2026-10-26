# pSEO Engine — how your code actually works

**What it is, in plain English.** pSEO Engine is a SaaS app (live at pseo.cloud) that writes
"X vs Y" comparison landing pages for B2B software companies. The customer gives it rows of facts
("Acme: $29/mo, Slack integration…"), the app asks an LLM to write one page per row using *only*
those facts, checks each page for quality (too short? a near-copy of another page?), lets a human
approve it, and then ships approved pages into the customer's own website — either as a GitHub pull
request or through a token-protected API their site pulls from. "pSEO" = *programmatic SEO*:
generating many search-targeted pages from structured data.

| | |
|---|---|
| Path | `~/workspace/source-of-income` |
| Stack | Next.js 15 (App Router) + React 19, Drizzle ORM, Postgres 17 + pgvector, pg-boss, Better Auth, Octokit, Polar (payments), Zod (`source-of-income/package.json:22-35`) |
| Size | ~3.2k lines in `src/lib` + `src/db` + worker; 12 SQL migrations in `drizzle/`; 101 commits |
| Hosting | Docker Compose on a home machine, exposed via a Cloudflare named tunnel (`source-of-income/infra/README.md`, `source-of-income/infra/docker-compose.yml:93-99`) |
| Honest status | Live. **No unit-test framework and no CI workflow** (`.github/` holds only `copilot-instructions.md`). 14 hand-run `scripts/verify-*.ts` scripts that hit a real DB and live models. |

> **Important update vs `genai/14-deepdive-projects.md`.** That write-up describes the model router
> as it was before commit `c0c02d1` (2026-09-01). Today `src/lib/model-router.ts` contains **no
> fallback chain**: every call goes to **AI-ROUTER**, your separate self-hosted OpenAI-compatible
> gateway (`~/workspace/AI-ROUTER`), which now owns failover and cooldowns
> (`source-of-income/src/lib/model-router.ts:3-16`). The old chain still exists in git — read it
> with `git show c0c02d1^:src/lib/model-router.ts`. Below, citations to that version are written
> `model-router.ts@c0c02d1^:LINE`. Know both: interviewers love "why did you change it?"

Read alongside: [../04-llm-fundamentals-sdks-tool-calling.md](../04-llm-fundamentals-sdks-tool-calling.md),
[../05-rag-and-vector-databases.md](../05-rag-and-vector-databases.md),
[../08-databases-and-data-modelling.md](../08-databases-and-data-modelling.md),
[../11-devsecops-docker-k8s-cicd-cloud.md](../11-devsecops-docker-k8s-cicd-cloud.md).

---

## JD coverage

| JD requirement | Where in your code | Strength |
|---|---|---|
| LLM API integration (no SDK, raw HTTP) | `fetch` to `/chat/completions` and `/embeddings`, `source-of-income/src/lib/model-router.ts:55-83` | **Strong** |
| Multi-provider fallback | Today: delegated to AI-ROUTER (`model-router.ts:13-15`). Before: DB-ordered chain over Gemini/OpenRouter/NVIDIA, `model-router.ts@c0c02d1^:140-174` | Strong (history) / Partial (in this repo now) |
| Retries / cooldown | Job re-queue on `ChainExhaustedError` (`source-of-income/src/lib/generation.ts:129-138`); old persisted 60s cooldown `model-router.ts@c0c02d1^:163-168` | Partial |
| Timeouts | `AbortSignal.timeout(75_000)` + router budget 60s, `model-router.ts:19-21`, `:64`, `:104` | **Strong** |
| Cost / token tracking | Tokens summed onto the run with SQL increments, `generation.ts:188-197`; **cost is hard-coded 0**, `model-router.ts:123` | Partial |
| Prompt templates | DB-stored template with `{{placeholders}}`, `source-of-income/src/lib/prompt.ts:9-15`; seeded prompt `source-of-income/src/db/seed.ts:10-32` | **Strong** |
| Grounding / anti-hallucination | "use ONLY the facts" prompt + STYLE-ONLY brand block, `seed.ts:12-13`, `generation.ts:69-83` | **Strong** |
| Structured output | JSON-only prompt → strip fence → `JSON.parse` → Zod with `.catch()` defaults, `source-of-income/src/lib/suggest.ts:38-68` | **Strong** (prompt-based, no native JSON mode) |
| pgvector | `vector('embedding', { dimensions: 1024 })`, `source-of-income/src/db/schema.ts:218`; cosine query `source-of-income/src/lib/quality.ts:46-54` | **Strong** (no index) |
| Relational modelling (Drizzle) | 14 tables, enums, FKs with cascade, unique constraints, `source-of-income/src/db/schema.ts:21-318` | **Strong** |
| Migrations | 12 drizzle-kit SQL migrations incl. a hand-commented destructive one, `source-of-income/drizzle/0011_long_blazing_skull.sql:1-12` | **Strong** |
| Background jobs | pg-boss queue + standalone worker, `source-of-income/src/lib/queue.ts:21-29`, `source-of-income/src/worker/index.ts:11-15` | **Strong** |
| GitHub integration | One stable branch + one PR per project via Git Data API, `source-of-income/src/lib/github.ts:56-133` | **Strong** |
| Payments + webhooks | Polar checkout; Standard Webhooks signature; stale-event idempotency, `source-of-income/src/lib/billing/polar.ts:63-81`, `source-of-income/src/lib/billing/subscriptions.ts:47-53` | **Strong** |
| SSRF protection | `source-of-income/src/lib/website-analyze.ts:32-132` | **Strong** |
| XSS sanitisation | Regex `sanitizeMdx`, `source-of-income/src/lib/sanitize.ts:6-35` | Partial (regex, not a parser) |
| Auth / tenancy | Better Auth + `getProject(userId, id)` ownership check, `source-of-income/src/lib/auth.ts:22-49`, `source-of-income/src/lib/projects.ts:44-50` | **Strong** |
| Secrets at rest | AES-256-GCM for GitHub PATs, SHA-256 hashed API tokens, `source-of-income/src/lib/crypto.ts:10-26`, `source-of-income/src/lib/tokens.ts:9-20` | **Strong** |
| Rate limiting | In-memory fixed window, `source-of-income/src/lib/rate-limit.ts:31-48` | Partial (single instance) |
| Docker / nginx | Multi-stage Dockerfile, compose with healthchecks and one-shot migrate, nginx reverse proxy | **Strong** |
| CI/CD | No workflow; manual `build-and-push.sh` → Docker Hub → `deploy.sh` | Partial |
| Cloud | Self-hosted home box + Cloudflare Tunnel, not AWS/GCP/Azure | Partial |
| Tests | None automated | Not present |
| Python / FastAPI / LangChain | — | Not present |

---

## The big picture

```
 Browser (dashboard)                      Customer's site / CI
     │ POST /api/projects/:id/generations       │ GET /api/v1/projects/:id/pages (Bearer token)
     ▼                                          ▼
 nginx :80 ──► Next.js "web" container ─────────────────────────────┐
  (proxy)      route handlers: auth → ownership → Zod → quota        │
                     │ createGenerationRun                           │
                     ▼                                               │
             Postgres (pgvector/pgvector:pg17)                       │
   dataset · generation_run · page(embedding vector(1024)) · template │
   pg-boss tables (queue "page-generation")  ◄── one job per row     │
                     │                                               │
                     ▼                                               │
           "worker" container (pnpm worker)                          │
   processGenerationJob: template + brand block → routeGenerate ──►  AI-ROUTER (OpenAI-compatible
     → strip fence → slug/title → JSON-LD → INSERT page (draft)       gateway, free-tier chains)
     → assessPage: wordCount + routeEmbed + cosine nearest ──────►  /embeddings (1024-d)
     → finalizeIfDone → buildInternalLinks                           │
                     │                                               │
   human review: approve (override if flagged) → publish (attest, sanitizeMdx, plan cap)
                     ├──► GitHub: one branch + one PR per project (Octokit)
                     └──► Pull API returns published pages only ─────┘
 Polar ──webhook (signed)──► /api/webhooks/polar → subscription + user.plan → quotas/caps
 cloudflared tunnel ──► nginx  (public pseo.cloud)
```

---

## Follow one request end-to-end

### 1. The API route: auth → ownership → validation → quota → enqueue

```ts
// source-of-income/src/app/api/projects/[id]/generations/route.ts:21-44 (trimmed)
const user = await getApiUser()
if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
const { id } = await params
if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: 'not_found' }, { status: 404 })
const project = await getProject(user.id, id) // tenant-isolation boundary
if (!project) return NextResponse.json({ error: 'not_found' }, { status: 404 })
const parsed = bodySchema.safeParse(await request.json().catch(() => null))
...
const quota = await checkGenerationQuota(user.id, parsed.data.rows.length)
if (!quota.allowed) {
  return NextResponse.json({ error: 'quota_exceeded', ... }, { status: 429 })
}
```

- `getApiUser` asks Better Auth for the session from the cookies
  (`source-of-income/src/lib/api-auth.ts:5-8`).
- `getProject(user.id, id)` selects `WHERE id = ? AND user_id = ?`
  (`source-of-income/src/lib/projects.ts:44-50`). Someone else's project returns **404, not 403**, so
  you don't even reveal it exists.
- The body schema caps a run at 500 rows (`route.ts:14`).
- Quota = pages created this calendar month across the user's projects vs the plan cap
  (`source-of-income/src/lib/quota.ts:18-25`, `:40-44`); caps live in
  `source-of-income/src/lib/billing/plans.ts:34`, `:43`, `:53`, `:64`.
- It answers **202 Accepted** (`route.ts:52`): "queued, not done".

### 2. `createGenerationRun`: one job per row

`source-of-income/src/lib/generation.ts:27-61` inserts a `dataset` row (the raw rows as JSONB), a
`generation_run` with `pageCount = rows.length`, then:

```ts
// source-of-income/src/lib/generation.ts:49-59
const boss = await getBoss()
for (let index = 0; index < opts.rows.length; index++) {
  const job: GenerationJob = {
    runId: run!.id, projectId: opts.projectId, templateId: opts.templateId,
    row: opts.rows[index]!, index,
  }
  await boss.send(GENERATION_QUEUE, job)
}
```

`getBoss()` starts one shared pg-boss instance and creates the queue
(`source-of-income/src/lib/queue.ts:21-29`). Jobs are rows in Postgres — there's no Redis.

### 3. The worker picks it up

A separate container runs `pnpm worker` (`source-of-income/docker-compose.yml:67-72`):

```ts
// source-of-income/src/worker/index.ts:10-15
const boss = await getBoss()
await boss.work<GenerationJob>(GENERATION_QUEUE, async (jobs) => {
  for (const job of jobs) {
    await processGenerationJob(job.data)
  }
})
```

If `processGenerationJob` throws, pg-boss marks the job failed and retries it per its default
policy — you don't set `retryLimit` or `retryDelay` anywhere (`generation.ts:58` passes no options).

### 4. Build the prompt (grounded)

```ts
// source-of-income/src/lib/generation.ts:120-128
const [proj] = await db.select().from(project).where(eq(project.id, job.projectId))
const brandContext = proj ? buildBrandContextBlock(proj) : ''
const prompt = buildPrompt(tpl.promptTemplate, { ...job.row, brandContext })
const noTrainOnly = await projectRequiresNoTrain(job.projectId)
let result
try {
  result = await routeGenerate(prompt, { noTrainOnly })
```

- The template (seeded in `source-of-income/src/db/seed.ts:10-32`) has `{{entityA}}`, `{{entityB}}`,
  `{{facts}}`, `{{brandContext}}` and says "Compare … using ONLY the facts provided below".
- `buildPrompt` is a regex replace; a missing field becomes `''`, never invented
  (`source-of-income/src/lib/prompt.ts:9-15`).
- The brand block is labelled *"STYLE ONLY — do NOT introduce any new fact"*
  (`generation.ts:78-82`), so tone guidance can't leak in as claims.

### 5. The model router (today)

```ts
// source-of-income/src/lib/model-router.ts:101-116 (trimmed)
const { json, model } = await callRouter('/chat/completions', {
  model: 'auto',
  messages: [{ role: 'user', content: prompt }],
  ai_router: { budget_ms: BUDGET_MS },
})
const text = data.choices?.[0]?.message?.content ?? ''
if (text.trim() === '') {
  throw new ChainExhaustedError('AI-ROUTER returned empty content from every candidate')
}
```

- `model: 'auto'` — AI-ROUTER chooses which upstream model answers.
- `callRouter` turns *every* failure (network, non-2xx) into `ChainExhaustedError`
  (`model-router.ts:66-77`), and records which model really served from the `x-ai-router-model`
  response header (`:81`).
- Two timeouts: router budget 60s, your own abort at 75s, so the router's more informative error
  arrives first (`model-router.ts:19-21`).
- Honest note: `_opts.noTrainOnly` is **intentionally ignored** (`model-router.ts:94-99`) and
  `costCents: 0` is hard-coded (`:123`).

**The router as it was (and why it's a good story).** Before `c0c02d1`, this file walked a chain:

```ts
// model-router.ts@c0c02d1^:152-170 (trimmed)
for (const spec of chain) {
  if (spec.cooldownUntil && spec.cooldownUntil.getTime() > now) continue
  const apiKey = apiKeyFor(spec)
  if (!apiKey) continue // provider key not configured → skip silently
  try {
    const out = await callProvider(spec, prompt, apiKey)
    const costCents = ((out.tokensIn + out.tokensOut) / 1000) * Number(spec.costPer1kTokens) * 100
    return { ...out, modelId: spec.modelId, costCents }
  } catch (err) {
    lastError = err
    if (err instanceof HttpError && err.status === 429) {
      await db.update(modelRegistry).set({ cooldownUntil: new Date(Date.now() + COOLDOWN_MS) }) ...
    }
    if (!shouldFailover(err)) throw err
```

The chain came from `model_registry` ordered by `priority` (`model-router.ts@c0c02d1^:127-133`);
`shouldFailover` allowed 429/5xx/network/empty and threw on other 4xx (`@c0c02d1^:43-46`). The
commit message explains the failure that ended it: the only embedding model was withdrawn upstream,
and because a withdrawn chat model returns a 4xx, "one withdrawn model aborted the whole request
rather than advancing". Lesson you can say out loud: **a 4xx from a provider can mean "this model is
gone", not "your request is bad"** — classify by error body/type, not just status class.

### 6. Clean, derive, structure, store as draft

`generation.ts:142-169`: unwrap a whole-body ```` ```mdx ```` fence (`stripWrappingCodeFence`,
`source-of-income/src/lib/sanitize.ts:18-27`), derive slug `a-vs-b` (`prompt.ts:27-31`), a 160-char
description, build FAQPage JSON-LD **deterministically from the row, not the LLM**
(`source-of-income/src/lib/schema-org.ts:8-32`), validate it (`schema-org.ts:46-66`) and insert the
page with `status: 'draft'`.

### 7. Quality gate + embeddings

```ts
// source-of-income/src/lib/quality.ts:90-101
const words = wordCount(opts.mdx)
const thin = words < THIN_WORD_THRESHOLD
...
try {
  embedding = await opts.embed(opts.mdx)
  nearest = await findNearest(opts.projectId, opts.pageId, embedding)
} catch {
  embeddingMissing = true
}
```

- Thin = under 300 words (`quality.ts:13`), counted after removing markdown punctuation and code
  fences, with a guard for wholly-fenced bodies (`quality.ts:24-33`).
- `routeEmbed` refuses any vector that isn't exactly 1024 wide (`model-router.ts:140-145`) — a
  wrong-width vector "would insert fine and quietly poison recall".
- `findNearest` is a pgvector cosine query scoped to the project (`quality.ts:46-54`); ≥ 0.92 is a
  duplicate (`quality.ts:15`).
- Score: start 100, −40 thin, −50 duplicate, graduated penalty above 0.8 similarity, −15 if the
  embedding failed (`quality.ts:65-72`). An embedding failure **doesn't fail the page**.

Then tokens are added to the run with SQL-side increments (`generation.ts:188-197`) — `col + n` in
SQL, not read-modify-write in JS, so parallel workers don't overwrite each other.

### 8. Run completion → internal links → review → publish

`finalizeIfDone` flips the run to `completed`/`partial` once `completed + failed >= pageCount`,
then builds internal links (`generation.ts:96-107`): for each page, top 3 most similar pages in the
project (`source-of-income/src/lib/internal-links.ts:21-45`), idempotently (delete then insert with
`onConflictDoNothing`).

A human approves; flagged pages need `override: true` (`source-of-income/src/lib/review.ts:89-92`,
returned as 409 by `source-of-income/src/app/api/projects/[id]/pages/[pageId]/route.ts:61-62`).
`publishPage` requires an accuracy attestation, checks the plan's publish cap, and **re-sanitizes**
the body (`source-of-income/src/lib/publish.ts:39-61`). GitHub sync is plan-gated
(`publish.ts:113`) and goes through `upsertPublishPr` (`github.ts:56-133`).

---

## Concepts used here, explained from zero

**Raw HTTP LLM calls vs SDKs.** An SDK is a library wrapping the provider's HTTP API. You use plain
`fetch` with an OpenAI-shaped body (`messages`, `choices[0].message.content`, `usage`). Because
AI-ROUTER is OpenAI-compatible, *any* OpenAI SDK could point at it. See
[../04-llm-fundamentals-sdks-tool-calling.md](../04-llm-fundamentals-sdks-tool-calling.md).

**Retries, fallback, cooldown, circuit breaker.** *Retry* = try the same thing again (good for
blips). *Fallback* = try a different model (good when one provider is down). *Cooldown* = after a
429 ("too many requests"), skip that model for a while instead of hammering it. A *circuit breaker*
generalises cooldown: after N failures the circuit "opens" and calls are skipped; after a timeout one
trial call is let through ("half-open"); success closes it. Your old router had a persisted cooldown
in Postgres — so all worker processes shared it — which is a simple breaker without the half-open
state (`model-router.ts@c0c02d1^:163-168`). Today that logic lives in AI-ROUTER; in this repo the
retry layer is the job queue.

**Structured output.** Getting machine-readable JSON out of a model. Options, weakest to strongest:
ask for JSON in the prompt; provider "JSON mode"; JSON-Schema-constrained output / tool calling. You
use the first plus defensive parsing: strip a fence, `JSON.parse`, then Zod where every field has
`.catch(default)` so one bad field doesn't sink the object (`suggest.ts:38-44`, `:53-68`). The route
never 500s — it returns `EMPTY_SUGGESTION` with a `reason`
(`source-of-income/src/app/api/projects/analyze/route.ts:36-51`).

**pgvector.** A Postgres extension adding a `vector(n)` column type and distance operators (`<=>` is
cosine distance). Drizzle's `cosineDistance()` generates it; `1 - distance` = similarity
(`quality.ts:46`). Enabled with `CREATE EXTENSION vector` (`source-of-income/infra/db/init/01-init.sql:3`).
**No index exists** (no `CREATE INDEX` in `drizzle/*.sql`), so each query scans the project's pages.
Changing models means re-embedding everything — migration 0011 nulls all vectors before shrinking
2048 → 1024 (`drizzle/0011_long_blazing_skull.sql:11-12`) because vectors from different models
aren't comparable. See [../05-rag-and-vector-databases.md](../05-rag-and-vector-databases.md).

**ORM and migrations (Drizzle).** An ORM lets you describe tables in code and write typed queries.
In Drizzle the TypeScript schema (`schema.ts`) is the source of truth; `drizzle-kit generate` diffs it
against the last snapshot and writes a SQL migration; `drizzle-kit migrate` applies pending ones
(`package.json:16-17`). Types like `Page` come free from `$inferSelect` (`schema.ts:320-332`).
Modelling choices worth naming: UUID PKs with `defaultRandom()`; `onDelete: 'cascade'` from project
to its datasets/runs/pages; Postgres enums for statuses (`schema.ts:135-136`); JSONB for flexible
rows/flags; a unique pair constraint on internal links (`schema.ts:265`); `user.unique()` on
subscription for one-per-user (`schema.ts:285-288`). See
[../08-databases-and-data-modelling.md](../08-databases-and-data-modelling.md).

**Job queues and idempotency.** A queue decouples "accept the request" from "do the slow work". pg-boss
stores jobs in Postgres and uses `SELECT … FOR UPDATE SKIP LOCKED` so multiple workers never grab the
same job. Queues are *at-least-once*: a job can run twice. *Idempotent* = running twice has the same
effect as once. Where you have it: internal links (delete + insert), the Polar webhook (ignore events
older than the stored `providerUpdatedAt`, `subscriptions.ts:47-53`), the seed (upsert on
`template.key`, `seed.ts:38-56`). Where you don't: `page` has no unique `(project_id, run_id, slug)`
(`schema.ts:199-230`), so a retry after a partial success could insert a second draft.

**Webhooks and signatures.** A webhook is the provider calling *your* URL when something happens.
Anyone can POST to that URL, so you verify an HMAC signature over the raw body plus a timestamp
(replay window ±5 min) using Standard Webhooks (`polar.ts:63-81`). You read the body as text *before*
parsing (`source-of-income/src/app/api/webhooks/polar/route.ts:16-17`) because re-serialised JSON
wouldn't match the signature. Returning 500 on failure makes Polar retry (`route.ts:38-40`).

**SSRF.** *Server-Side Request Forgery*: your server fetches a URL the user typed, and the user types
`http://169.254.169.254/` (cloud metadata) or `http://localhost:5432`. Defence here: http(s) only;
block `localhost`/`.internal`/`.local`; resolve DNS and reject if **any** address is private, loopback,
link-local, CGNAT, multicast or IPv4-mapped IPv6 (`website-analyze.ts:32-77`); `redirect: 'manual'`
so every hop is re-checked (`:115-124`); 10s timeout, 512KB cap with stream cancel, 10k-char
truncation (`:26-29`, `:80-98`). Residual risk documented: DNS rebinding between your lookup and
`fetch` (`:11-14`).

**XSS sanitisation.** *Cross-site scripting*: attacker-controlled HTML runs JavaScript in your
visitors' browsers. LLM output is untrusted input. `sanitizeMdx` strips `<script>`/`<style>` blocks,
dangerous tags, `on*=` handlers and `javascript:` (`sanitize.ts:6-35`). It runs at publish
(`publish.ts:54`), when building GitHub files (`github.ts:23`) and before rendering the public hub
(`source-of-income/src/app/comparisons/[slug]/page.tsx:34`), whose HTML is injected with
`dangerouslySetInnerHTML` (`page.tsx:66`). Regex sanitisers are bypassable (entity-encoded
`javascript:`, odd tags); a parser-based allowlist (DOMPurify / sanitize-html) is the stronger fix.

**Secrets handling.** GitHub tokens: AES-256-GCM, random 12-byte IV, auth tag stored with the
ciphertext so tampering fails decryption (`crypto.ts:10-26`). API tokens: only the SHA-256 hash is
stored; plaintext shown once (`tokens.ts:9-20`). Env vars validated by Zod but optional at build time,
with `requireEnv` at point of use (`source-of-income/src/env.ts:12-68`).

**Docker multi-stage builds.** One Dockerfile, several `FROM … AS name` stages; later stages copy only
what they need from earlier ones. Yours: `deps` (install with a pnpm cache mount), `build`
(`pnpm build`), `runtime` (`source-of-income/Dockerfile:4-33`). One image serves three services —
web, worker (`pnpm worker`) and a one-shot `migrate` that web/worker wait on with
`service_completed_successfully` (`docker-compose.yml:40-78`). Honest: the runtime stage copies the
full source and all node_modules incl. dev deps (`Dockerfile:29-31`, needed for `tsx` and
`drizzle-kit`), and runs as root.

**Reverse proxy (nginx).** A server in front of your app that receives public traffic and forwards
it. Yours forwards to `web:3000` and sets `X-Real-IP` / `X-Forwarded-For` so the rate limiter sees
client IPs (`source-of-income/nginx/nginx.conf:15-25`). Cloudflare Tunnel sits in front of nginx so
the home box needs no open ports.

**Env-based config.** Everything optional degrades: no Polar token ⇒ billing off
(`polar.ts:150-152`); no Google creds ⇒ button hidden (`auth.ts:17-20`); `POLAR_SERVER` defaults to
sandbox so a half-configured prod can't charge cards (`polar.ts:14-16`).

---

## Why it was built this way

- **Queue per row, not per run.** One bad row fails one job; progress is countable; workers can scale.
- **Postgres for everything** (data, vectors, queue, sessions). One backup (`infra/scripts/backup-db.sh`),
  one thing to run. Trade-off: the queue and vector search compete with OLTP traffic.
- **Facts from data, style from brand, structure from code.** JSON-LD is built in code, not by the
  LLM — always valid, no tokens spent.
- **Human-in-the-loop publish.** Flagged pages need an override, every publish needs an attestation.
- **Moving routing out to AI-ROUTER.** The commit message: model ids rotted unnoticed; a shared
  gateway serving five projects tracks health centrally. Trade-off: a new dependency and a single
  point of failure — mitigated by turning router failure into a re-queue, not a lost page.
- **Graceful degradation over 500s.** AI-assist routes return empty suggestions; embedding failure
  just lowers the score.

---

## What's missing / what you must not claim

- **Don't claim the multi-provider failover is in this repo today.** Say "I built it, then extracted
  it into a shared gateway" and cite `c0c02d1`.
- **Don't claim cost tracking produces real numbers.** The column and the SQL accumulation exist;
  the value is 0 (`model-router.ts:123`).
- **Don't claim no-train compliance routing is active.** It's computed and ignored
  (`model-router.ts:94-99`).
- **Don't say "sanitised on generate".** Generation only strips a wrapping fence
  (`generation.ts:142`); sanitising happens on publish/export/render. (`genai/14` says otherwise.)
- **No tests, no CI.** 14 manual verify scripts.
- **No vector index**; **no prompt versioning**; **no response caching**; **no streaming**.
- **No native structured output / tool calling** — prompt-and-parse only.
- **Rate limiter is per-process memory** (`rate-limit.ts:1-6`) and trusts the first
  `X-Forwarded-For` hop (`rate-limit.ts:51-55`), which a client can spoof because nginx *appends*
  to the header rather than replacing it.
- **Quota race:** it counts pages *already created* (`quota.ts:18-25`), so two runs started back
  to back can both pass before either has inserted pages.
- **Run counters can drift on retries:** a failed attempt increments `failedCount` and the retry may
  later increment `completedCount` (`generation.ts:131-134`, `:191`), so `finalizeIfDone` can fire
  early or mark `partial` wrongly.
- **Not cloud-hosted** (home machine + tunnel). **No Kubernetes. No Python/FastAPI/LangChain.**
- Small stale comment: `quota.ts:9` says "Free=100 … Scale=10,000", plans say 50 … 100,000.

---

## Translate it to the JD stack

**The router as a FastAPI service** — same contract, Python, async:

```python
# router_service.py — sketch
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()
CHAIN = [("https://openrouter.ai/api/v1", "OPENROUTER_KEY", "model-a"),
         ("https://integrate.api.nvidia.com/v1", "NVIDIA_KEY", "model-b")]

class GenReq(BaseModel):
    prompt: str

@app.post("/generate")
async def generate(req: GenReq):
    async with httpx.AsyncClient(timeout=60) as c:
        for base, key_env, model in CHAIN:          # skip if in cooldown (Redis TTL key)
            r = await c.post(f"{base}/chat/completions", headers={"Authorization": f"Bearer {env(key_env)}"},
                             json={"model": model, "messages": [{"role": "user", "content": req.prompt}]})
            if r.status_code == 429 or r.status_code >= 500: continue   # set cooldown, fail over
            r.raise_for_status()
            text = r.json()["choices"][0]["message"]["content"]
            if text.strip(): return {"text": text, "model": model, "usage": r.json().get("usage")}
    raise HTTPException(503, "chain exhausted")
```

**Same idea in LangChain:** `primary.with_retry(stop_after_attempt=2).with_fallbacks([backup1, backup2])`,
and `llm.with_structured_output(SuggestionModel)` replaces strip-fence-and-Zod with a Pydantic model.

**pg-boss → Celery / arq / RQ:**

```python
# Celery: at-least-once + retries + idempotency
@celery.task(bind=True, acks_late=True, autoretry_for=(ChainExhausted,),
             retry_backoff=True, max_retries=5)
def generate_page(self, run_id: str, row: dict, index: int):
    if page_exists(run_id, index):      # idempotency key = (run_id, index), unique in DB
        return
    ...
```

arq (asyncio + Redis) is the closest fit for an async FastAPI app; RQ is the simplest. All three need
Redis, unlike pg-boss.

**Drizzle → SQLAlchemy 2.0 + Alembic:**

```python
from pgvector.sqlalchemy import Vector
class Page(Base):
    __tablename__ = "page"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("project.id", ondelete="CASCADE"))
    status: Mapped[PageStatus] = mapped_column(default=PageStatus.draft)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1024))
    __table_args__ = (UniqueConstraint("run_id", "slug"),)
# query: select(Page).order_by(Page.embedding.cosine_distance(vec)).limit(1)
# migrations: alembic revision --autogenerate -m "..." && alembic upgrade head
```

---

## Say it in an interview

**60-second pitch.** "pSEO Engine is a live SaaS that generates grounded comparison landing pages and
ships them into customers' repos. A Next.js API validates, checks tenancy and a monthly plan quota,
then fans out one pg-boss job per dataset row. Workers build the prompt from a stored template where
facts come only from the row and brand voice is fenced off as style-only, call the model through an
OpenAI-compatible gateway, unwrap and store a draft, then run a quality gate: word-count thinness and
pgvector cosine near-duplicate detection at 0.92. Humans approve, flagged pages need an override, and
publishing re-sanitises and opens or refreshes one PR per project via the Git Data API. Around it:
SSRF-guarded website analysis, Polar billing with signed idempotent webhooks, AES-GCM-encrypted tokens,
all in Docker Compose behind nginx. The router started as an in-repo fallback chain with persisted
cooldowns; I extracted it into a shared gateway after a withdrawn upstream model exposed a flaw in how
it classified 4xx errors."

**Likely questions**

1. *Walk me through your fallback logic.* Old: DB-ordered chain, skip cooled-down or keyless models,
   fail over on 429/5xx/network/empty, persist a 60s cooldown on 429 (`model-router.ts@c0c02d1^:140-174`).
   New: one call to AI-ROUTER; any failure → `ChainExhaustedError` → job retried (`generation.ts:129-138`).
2. *Why did you change it?* A withdrawn model returned 4xx, treated as fatal, so failover stopped.
   Model ids are now nowhere in the repo (commit `c0c02d1`).
3. *How do you stop hallucinated facts?* Facts only from `{{facts}}`, explicit "not specified"
   instruction (`seed.ts:12-13`, `:31-32`), style-only brand block, deterministic JSON-LD, human
   attestation before publish (`publish.ts:39`).
4. *How does dedup work and what breaks at scale?* Cosine nearest neighbour within the project
   (`quality.ts:41-62`); no HNSW index, so it's a scan — fine at hundreds of pages per project, add
   `CREATE INDEX … USING hnsw (embedding vector_cosine_ops)` before thousands.
5. *How do you make webhooks safe?* Signature over raw body, timestamp window, stale-event check on
   `providerUpdatedAt`, upsert on `user_id`, 500 to trigger retry (`polar.ts:63-81`,
   `subscriptions.ts:47-82`).
6. *What's SSRF and how did you block it?* See concepts; mention DNS rebinding as the accepted residual.
7. *What happens if a worker crashes mid-job?* pg-boss re-delivers. Honest: page insert isn't keyed,
   so a duplicate draft is possible; fix with a unique `(run_id, slug)` and `ON CONFLICT DO NOTHING`.
8. *How is it deployed?* Image built and pushed by `infra/scripts/build-and-push.sh` (which also fails
   the build if a real `.env` got into the image, `build-and-push.sh:33-42`), pulled by `deploy.sh`;
   compose runs migrate → web + worker → nginx → cloudflared. No CI yet.

---

## Make it yours — exercises

1. **Make generation idempotent.** Start in `src/db/schema.ts:199` — add `unique().on(t.runId, t.slug)`,
   run `pnpm db:generate`, and use `.onConflictDoNothing()` in `generation.ts:153`. *Done:* calling
   `processGenerationJob` twice with the same job leaves one page.
2. **Add a pgvector HNSW index.** New migration with `CREATE INDEX page_embedding_hnsw ON page USING
   hnsw (embedding vector_cosine_ops)`. *Done:* `EXPLAIN` on the `findNearest` query shows an index scan
   once the table is large enough for the planner to use it.
3. **CI on every PR.** Add `.github/workflows/ci.yml` running `pnpm install --frozen-lockfile`,
   `pnpm typecheck`, `pnpm lint`, `pnpm build`, plus Vitest unit tests for the pure functions
   `isBlockedIp`, `sanitizeMdx`, `parseSuggestion`, `computeScore`, `buildPrompt`. *Done:* a green
   check, and a deliberately broken `isBlockedIp('10.0.0.1')` turns it red.
4. **Real cost accounting.** Have AI-ROUTER return the serving model's price (or a cost header), and
   compute `costCents` in `model-router.ts:118-124`. *Done:* a run shows non-zero cost for a paid model.
5. **Swap the regex sanitiser for an allowlist.** Use `sanitize-html` (or DOMPurify on the rendered
   HTML) in `src/lib/sanitize.ts`. *Done:* a test with `<a href="jav&#x61;script:alert(1)">` and
   `<svg onload=…>` produces inert output.
