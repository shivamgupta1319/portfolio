# 08: Databases and Data Modelling for AI Apps

> **JD lines covered:** "Design and manage relational databases and vector databases based on
> application requirements" · "SQL/NoSQL databases, REST APIs, and data modelling" · "SQL
> (PostgreSQL, MySQL) and Vector Databases" · "designing data structures".
>
> DB interview depth (isolation levels, indexing internals, replication): [interview-qa/05](../interview-qa/05-databases.md).
> Vector-specific mechanics: [05](05-rag-and-vector-databases.md). This file is about **designing
> the data model of an AI product**, which is the part both JDs ask you to own.

---

## 🟢 Level 1: Basics (recall)

### 1.1 Relational fundamentals

- **Table** = entity. **Row** = instance. **Primary key** = unique identity (bigint identity or UUID).
- **Foreign key** = a relationship with referential integrity (`ON DELETE CASCADE / SET NULL / RESTRICT`).
- **Relationships:** 1–1, 1–N (FK on the "many" side), N–N (join table).
- **Normalization:** each fact stored once (1NF atomic values, 2NF/3NF no partial or transitive
  dependencies). **Denormalize deliberately** for read speed (e.g. `tenant_id` copied onto `chunks`).
- **Constraints** are your last line of defence: `NOT NULL`, `UNIQUE`, `CHECK (score BETWEEN 0 AND 1)`.

### 1.2 SQL you must write fluently

```sql
-- join + aggregate + filter on aggregate
SELECT u.email, COUNT(r.id) AS runs, SUM(r.cost_usd) AS spend
FROM users u JOIN runs r ON r.user_id = u.id
WHERE r.created_at >= now() - interval '30 days'
GROUP BY u.email HAVING SUM(r.cost_usd) > 10
ORDER BY spend DESC LIMIT 20;

-- window function: latest run per thread
SELECT * FROM (
  SELECT r.*, row_number() OVER (PARTITION BY thread_id ORDER BY created_at DESC) AS rn
  FROM runs r) x
WHERE rn = 1;

-- CTE + upsert
INSERT INTO kpi_values (kpi_id, period, value) VALUES ($1, $2, $3)
ON CONFLICT (kpi_id, period) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
```

### 1.3 Indexes

- **B-tree** (default): equality and range, `ORDER BY`. **Composite index column order matters**:
  `(tenant_id, created_at)` serves `WHERE tenant_id = ? ORDER BY created_at` but not
  `WHERE created_at > ?` alone.
- **GIN**: JSONB containment, full-text (`tsvector`), arrays. **HNSW/IVFFlat**: vectors.
- **Partial** index: `CREATE INDEX ON runs (created_at) WHERE status = 'running'`.
- Verify with `EXPLAIN (ANALYZE, BUFFERS)`. Look for `Seq Scan` on big tables.

### 1.4 Transactions and ACID

Atomic (all or nothing), Consistent (constraints hold), Isolated (concurrent transactions don't
see each other's partial work; Postgres default is *Read Committed*), Durable (survives a crash
once committed). Insert a document *and* its chunks in one transaction, so a failure never leaves
half a document indexed.

### 1.5 SQL vs NoSQL: pick by access pattern

| Store | Model | Use in an AI app |
|---|---|---|
| **PostgreSQL** | Relational + JSONB + pgvector + full-text | Default for everything: users, threads, runs, documents, vectors, LangGraph checkpoints |
| MySQL | Relational | Fine if it's the company standard. Vector support is newer/weaker, so pair with a vector DB |
| **Redis** | Key-value in memory | Cache, rate limits, sessions, queues, pub/sub, semantic cache |
| MongoDB / DynamoDB | Document / key-value | Flexible event or profile documents, very high write scale with known access patterns |
| Vector DB (Qdrant, Pinecone…) | ANN index + payload | When vectors outgrow pgvector or need dedicated scaling |
| ClickHouse / BigQuery | Columnar OLAP | Analytics over traces, events, usage. Your AI-observability-engine uses ClickHouse for traces |
| Object storage (S3/Blob) | Files | Raw uploaded docs, exports, large tool outputs |

Senior heuristic: **"Postgres until proven otherwise"**, and know exactly which access pattern
would prove otherwise.

---

## 🟡 Level 2: The data model of an AI product

### 2.1 Entities

```
tenants ─< users
tenants ─< documents ─< chunks (embedding, tsv)
users ─< threads ─< messages
threads ─< runs ─< run_steps (node/tool, input, output, tokens, latency)
runs ─< llm_calls (model, tokens_in/out, cost, latency, cache hits)
runs ─< feedback (score, comment, user)
eval_datasets ─< eval_examples ;  eval_runs ─< eval_results (example, scores)
integrations (tenant/user, provider, encrypted tokens, scopes, status)
prompts (name, version, template, model, params, created_by)   ← versioned prompts
memories (user_id, namespace, key, value jsonb, embedding, updated_at)   ← long-term memory
jobs (type, payload, status, attempts, idempotency_key, error)
```

### 2.2 Core DDL (Postgres)

```sql
CREATE TABLE threads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE INDEX ON threads (user_id, created_at DESC);

CREATE TABLE messages (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  thread_id  uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('user','assistant','tool','system')),
  content    jsonb NOT NULL,                 -- blocks: text, tool_use, tool_result, citations
  run_id     uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON messages (thread_id, id);

CREATE TABLE runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id    uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  status       text NOT NULL CHECK (status IN ('queued','running','awaiting_approval','succeeded','failed','cancelled')),
  graph_version text NOT NULL,              -- which agent/prompt version ran
  trace_id     text,                        -- link to LangSmith/Phoenix
  tokens_in    int NOT NULL DEFAULT 0,
  tokens_out   int NOT NULL DEFAULT 0,
  cost_usd     numeric(12,6) NOT NULL DEFAULT 0,
  latency_ms   int,
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz
);
CREATE INDEX ON runs (status) WHERE status IN ('queued','running','awaiting_approval');

CREATE TABLE llm_calls (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id      uuid REFERENCES runs(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL,
  feature     text NOT NULL,                -- 'chat', 'ingest_summary', 'router' → cost per feature
  model       text NOT NULL,
  tokens_in   int NOT NULL, tokens_out int NOT NULL,
  cache_read_tokens int NOT NULL DEFAULT 0,
  cost_usd    numeric(12,6) NOT NULL,
  latency_ms  int NOT NULL,
  ok          boolean NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON llm_calls (tenant_id, created_at);
```

Design decisions worth saying out loud:
- **`messages.content` is JSONB blocks**, because LLM messages aren't plain strings (tool calls,
  citations, images). Store the provider-neutral form.
- **`runs` is separate from `messages`**: one user turn can spawn a multi-step run, and you need its
  status, cost and trace link.
- **`graph_version` / prompt version** on every run, so you can tell which version caused a regression.
- **`feature` on `llm_calls`** gives per-feature and per-tenant cost attribution (the JD's "Cost" metric).
- **Cost is computed and stored at write time** from a pricing table, so later price changes
  don't rewrite history. That's the same decision you made in AI-observability-engine.
- LangGraph's checkpointer creates **its own tables**. Don't duplicate checkpoint state in yours.
  Store the `thread_id` link only.

### 2.3 Multi-tenancy options

| Model | Isolation | Cost | Use |
|---|---|---|---|
| Shared tables + `tenant_id` column | Logical (enforce in every query + **Row-Level Security**) | Lowest | Most SaaS |
| Schema per tenant | Stronger | Medium | Dozens to hundreds of tenants, compliance needs |
| Database per tenant | Strongest | Highest | Enterprise, data residency |

```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON documents
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
-- app sets per transaction: SET LOCAL app.tenant_id = '...';
```

Relational multi-tenancy in depth: [interview-qa/07](../interview-qa/07-specialities.md).

### 2.4 Migrations discipline

- Every schema change is a migration in git (Alembic / Drizzle / Prisma).
- **Expand → migrate → contract** for zero-downtime changes: add the nullable column → backfill →
  deploy code that uses it → add NOT NULL / drop the old column in a later release.
- Use `CREATE INDEX CONCURRENTLY` on big tables (it doesn't lock writes).
- Re-embedding (new embedding model): add a new vector column or table, backfill in the background,
  switch reads, then drop the old one. Never change it in place.

---

## 🔴 Level 3: Advanced

### 3.1 Performance at scale

- **Connection pooling**: PgBouncer (transaction mode) in front of Postgres when you have many app
  replicas. Watch out for prepared statements with asyncpg in transaction mode.
- **Read replicas** for analytics and text-to-SQL tools. Keep agents off the primary.
- **Partitioning** big append-only tables (`llm_calls`, `run_steps`) by month, so dropping old data means
  dropping a partition.
- **N+1** queries: eager-load with `selectinload`, or batch.
- **Pagination**: keyset (`WHERE id < $last ORDER BY id DESC LIMIT 50`), not `OFFSET 100000`.

### 3.2 OLTP vs OLAP split

Traces and usage events are append-only, huge, and queried by time-range aggregation. Put them in a
columnar store (ClickHouse) with rollups, and keep config and transactions in Postgres. This is
exactly the design of your AI-observability-engine ([projects/01](projects/01-ai-observability-engine.md)).

### 3.3 Caching layers for AI

| Cache | Key | Invalidate when |
|---|---|---|
| Embedding cache | hash(model, text) | never (deterministic) |
| Exact LLM response cache | hash(model, prompt, params) | prompt/model version changes |
| **Semantic cache** | embedding of the query, similarity ≥ threshold | data changes. Risky for personalized answers |
| Retrieval cache | (tenant, normalized query) | document updates |
| Provider prompt caching | (handled by the provider) | prefix changes |

### 3.4 Data lifecycle and compliance

Retention policies per table, deletion that cascades through documents → chunks → vectors →
caches, PII redaction before logging prompts, encryption at rest for tokens, and audit logs for
admin actions. India's **DPDP Act** and GDPR both require purpose limitation and erasure.

---

## 🔧 Integration recipe: recording every LLM call for cost dashboards

```python
PRICING = {"claude-sonnet-5-5": (2.00, 10.00), "claude-haiku-5-5": (0.10, 0.50)}  # $/MTok (in, out)

async def record_llm_call(db, *, run_id, tenant_id, feature, model, usage, latency_ms, ok=True):
    pin, pout = PRICING[model]
    cost = (usage.input_tokens * pin + usage.output_tokens * pout) / 1_000_000
    await db.execute(insert(LlmCall).values(
        run_id=run_id, tenant_id=tenant_id, feature=feature, model=model,
        tokens_in=usage.input_tokens, tokens_out=usage.output_tokens,
        cache_read_tokens=getattr(usage, "cache_read_input_tokens", 0) or 0,
        cost_usd=cost, latency_ms=latency_ms, ok=ok))
```

```sql
-- the dashboard query: daily cost per tenant per feature
SELECT date_trunc('day', created_at) AS day, tenant_id, feature,
       SUM(cost_usd) AS cost, percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_ms
FROM llm_calls WHERE created_at >= now() - interval '30 days'
GROUP BY 1, 2, 3 ORDER BY 1 DESC;
```

---

## 🔗 You already did this

| Concept | Where | Walkthrough |
|---|---|---|
| 14-table Drizzle schema, 12 migrations, pgvector | pSEO | [projects/07](projects/07-pseo-engine.md) |
| Postgres (config) + ClickHouse (traces) + Redis, cost enriched at ingestion | AI-observability-engine | [projects/01](projects/01-ai-observability-engine.md) |
| SQLite WAL + FTS5 triggers + sqlite-vec, transactional orphan cleanup | UACE | [projects/06](projects/06-uace-mcp-server.md) |
| Prisma schema, Postgres | smart-trading | [projects/09](projects/09-deployment-ci-testing-evidence.md) |
| Structured résumé schema, multi-tenant subdomains | Resite | [projects/08](projects/08-resite.md) |

## ✅ Self-check

1. Design the tables for a multi-tenant chat-with-documents product. Defend JSONB for message content.
2. Composite index `(a, b)`: which queries does it serve?
3. Why store cost at write time instead of computing it at query time?
4. Shared-table multi-tenancy: how do you make a leak impossible rather than unlikely?
5. Walk through a zero-downtime column rename.
6. When would you move vectors out of pgvector?
7. Where do traces go and why not in Postgres?

## ⚠️ Traps

- `OFFSET` pagination on large tables.
- Storing messages as plain text (you lose tool calls and citations).
- No `tenant_id` on child tables, so every query needs a join to enforce isolation.
- Changing the embedding model in place.
