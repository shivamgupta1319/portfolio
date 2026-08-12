# 05 — PostgreSQL, ORMs, Redis & pgvector

> Database depth is the clearest SDE-1 → SDE-2 signal in most backend interviews. Almost
> every "the API is slow" story ends at the database, and interviewers know it. Indexing,
> transactions and the N+1 problem are near-guaranteed questions.
>
> 🔥 = genuinely hard / commonly fumbled.

---

## PostgreSQL — indexing & query performance

**Q. How does an index work, and what does it cost?**

> A B-tree index is a sorted structure that lets the planner find matching rows in
> O(log n) instead of scanning the table. The cost is real: every insert, update and delete
> must also maintain every index on the table, and indexes consume disk and cache memory. So
> indexes are a read/write trade — I index what queries actually filter, join and sort on, and
> I periodically look for unused indexes (`pg_stat_user_indexes` with a zero scan count) and
> drop them.

---

**Q. Which index types does Postgres have, and when do you use each?**

| Type | Use for |
|---|---|
| **B-tree** (default) | Equality and range on scalar columns; also serves `ORDER BY`. 95% of cases. |
| **GIN** | Multi-value columns — `jsonb` containment, arrays, full-text search. |
| **GiST** | Geometric / range types, nearest-neighbour, PostGIS. |
| **BRIN** | Very large tables where the column correlates with physical order (append-only timestamps). Tiny index, coarse filtering. |
| **Hash** | Equality only; rarely worth it over B-tree. |

🔗 *Yours:* pgvector adds HNSW and IVFFlat on top of this for approximate nearest-neighbour —
covered below.

---

**Q. 🔥 Column order in a composite index — does it matter?**

> Very much. An index on `(a, b)` can serve queries filtering on `a`, or on `a` *and* `b`, but
> not on `b` alone — it's a sorted structure, and you can only use a prefix of the sort key.
> So the rule is: equality columns first, then the range or sort column. An index on
> `(tenant_id, created_at)` serves "this tenant's recent rows" perfectly; the reverse order
> doesn't.

↳ **If pushed:** covering indexes — adding `INCLUDE (cols)` lets a query be answered from the
  index alone (an index-only scan) without touching the heap.

---

**Q. How do you debug a slow query?**

> `EXPLAIN (ANALYZE, BUFFERS)` on the real query with real parameters. Then I read it inside-out
> looking for four things: a **sequential scan** on a large table where a filter should have
> used an index; a **big gap between estimated and actual rows**, which means the planner's
> statistics are stale and `ANALYZE` is due; the node where **actual time** is actually being
> spent, since the top-level number hides where; and **high buffer reads**, meaning it's going
> to disk instead of cache. Nine times out of ten the answer is a missing or wrongly-ordered
> index, or a function wrapped around the indexed column — `WHERE lower(email) = ...` can't use
> a plain index on `email`, it needs an expression index.

---

**Q. When is a sequential scan the right plan?**

> When the query touches a large fraction of the table — roughly above 5–10%, though the
> planner decides from cost estimates. Random index lookups plus heap fetches are more
> expensive per row than a sequential read, so for a big result set scanning is genuinely
> faster. This is why an index on a low-cardinality column like a boolean is usually useless:
> half the table matches. It's also why forcing index usage is almost always the wrong instinct.

---

## Transactions & concurrency

**Q. Explain ACID.**

> **Atomicity** — the transaction applies fully or not at all. **Consistency** — it moves the
> database from one valid state to another, respecting constraints. **Isolation** — concurrent
> transactions don't observe each other's partial work, to the degree the isolation level
> promises. **Durability** — once committed, it survives a crash, which in Postgres is the WAL
> being fsynced before the commit returns.

---

**Q. 🔥 What are the isolation levels and which anomalies do they prevent?**

| Level | Prevents | Still possible |
|---|---|---|
| Read Uncommitted | — | dirty reads (not in Postgres — it behaves as Read Committed) |
| **Read Committed** (PG default) | dirty reads | non-repeatable reads, phantoms |
| Repeatable Read | + non-repeatable reads, phantoms (in PG) | write skew |
| Serializable | everything | — (but transactions can be aborted and must be retried) |

> The anomalies: a **dirty read** sees uncommitted data; a **non-repeatable read** is the same
> row returning different values twice in one transaction; a **phantom** is new rows appearing
> for a repeated query. Postgres implements Repeatable Read with snapshot isolation, so it
> already blocks phantoms — but **write skew** survives: two transactions each read a condition,
> each decide their write is safe, and together they violate an invariant. That's the case
> Serializable exists for, and the price is that you must be prepared to catch a
> serialization failure and retry.

---

**Q. What is MVCC?**

> Multi-Version Concurrency Control — an update writes a new row version rather than
> overwriting, and each transaction sees the version consistent with its snapshot. The huge
> win is that **readers never block writers and writers never block readers**. The cost is dead
> tuples: old versions accumulate and must be reclaimed by VACUUM, and autovacuum falling
> behind on a write-heavy table causes table bloat and degrading performance. It's also why
> `COUNT(*)` has to actually count — visibility is per-transaction.

---

**Q. What's a deadlock and how do you avoid it?**

> Two transactions each hold a lock the other needs, so neither can proceed. Postgres detects
> the cycle and kills one with a deadlock error. The standard prevention is **consistent lock
> ordering** — if every transaction touches rows in the same order (say, ascending primary
> key), a cycle can't form. Beyond that: keep transactions short, don't do network calls or
> user interaction inside one, and set a `lock_timeout` so a pathological case fails fast
> rather than hanging.

---

**Q. Pessimistic vs optimistic locking?**

> Pessimistic takes the lock upfront — `SELECT ... FOR UPDATE` — so nobody else can modify the
> row until you commit. Correct under contention, but it serialises access and risks deadlock.
> Optimistic assumes conflicts are rare: read a version number, and on write use
> `WHERE version = ?`; if zero rows update, someone else got there first and you retry. I use
> optimistic for user-facing edits where conflicts are rare and a retry is cheap, and
> pessimistic where the invariant is hard — decrementing inventory or a balance.

---

## Schema & scale

**Q. Normalisation — and when do you denormalise?**

> Normalise to 3NF by default: each fact in one place, so updates can't create inconsistency.
> Denormalise deliberately when a read path is hot and the join cost is proven — a cached
> counter, a duplicated display name, a materialised view. The moment you denormalise you own
> a consistency problem, so it needs a clear owner: a trigger, an application-level write path,
> or a scheduled refresh. Never denormalise "for performance" without a measurement.

---

**Q. What's the N+1 problem?**

> One query fetches N parent rows, then the code loops and issues one query per parent for its
> children — N+1 round trips where two would do. It's the single most common cause of a slow
> endpoint, and ORMs make it invisible because the extra queries look like ordinary property
> access. Fixes: eager-load the relation (Prisma `include`, Sequelize `include`), or fetch the
> children in one `WHERE parent_id IN (...)` and group in memory (this is what DataLoader does
> for GraphQL). I catch these by logging query counts per request in development — a spike is
> obvious.

---

**Q. When do you partition a table?**

> When it's large enough that maintenance, not just queries, becomes the problem — typically
> tens of millions of rows and growing. Range partitioning by time is the common case: queries
> filtered by date only touch relevant partitions (partition pruning), and dropping old data
> becomes a `DROP TABLE` on a partition instead of a massive `DELETE` plus vacuum. Partition on
> the column your queries actually filter by, or you get all the complexity and none of the
> pruning.

---

**Q. Sharding vs read replicas?**

> Read replicas solve *read* scaling: stream the WAL to copies and route reads there. Cheap,
> low-risk, and the caveat is replication lag — a read immediately after a write may not see
> it, so read-your-own-writes must go to the primary. Sharding solves *write* and *data-size*
> scaling by splitting rows across independent databases by a shard key, and it's a large
> step: cross-shard joins and transactions become application problems, and rebalancing is
> painful. I'd exhaust indexing, caching, partitioning and replicas before sharding.

---

**Q. Why do you need connection pooling?**

> Each Postgres connection is a separate OS process with its own memory, so connections are
> expensive and the practical ceiling is a few hundred. An app that opens a connection per
> request will exhaust that and fall over. A pool keeps a small set of connections and hands
> them out. With multiple app instances or serverless functions the pool count multiplies, and
> that's where pgbouncer helps — an external pooler in transaction mode multiplexing thousands
> of client connections onto a few dozen server ones. The catch with transaction mode: session
> state, prepared statements and `LISTEN/NOTIFY` don't survive across statements.

---

**Q. `JSONB` — when is it right?**

> For genuinely schemaless or client-defined data — settings blobs, event payloads, third-party
> API responses I want to keep whole. It's indexable with GIN and queryable with the containment
> operators, so it's not a black box. What I don't do is use it to avoid designing a schema: you
> lose type checking, foreign keys and constraints, and queries get harder to optimise. If a
> field is queried and filtered on regularly, promote it to a real column.

---

**Q. CTE vs subquery?**

> A CTE (`WITH`) is usually about readability, and it's the only way to express recursion —
> traversing a tree or hierarchy. Historically Postgres always materialised CTEs, acting as an
> optimisation fence; since Postgres 12 they're inlined when it's safe, with `MATERIALIZED` /
> `NOT MATERIALIZED` to force either behaviour. So the version matters when someone claims
> "CTEs are slow".

---

**Q. Window functions — when do you use one?**

> When you need a per-row aggregate without collapsing rows: a running total, a rank within a
> group, comparison to the previous row via `LAG`. The pattern I use most is
> `ROW_NUMBER() OVER (PARTITION BY x ORDER BY y DESC)` filtered to `= 1` to get the latest row
> per group — much cleaner and faster than a correlated subquery.

---

## ORMs — Prisma & Sequelize

**Q. Prisma vs Sequelize vs raw SQL?**

> Prisma: schema-first, generates a fully typed client, excellent DX, and the type safety is
> genuine end-to-end. Its limits are complex analytical SQL and some advanced Postgres features,
> where you drop to `$queryRaw`. Sequelize: older, JavaScript-first, model-defined-in-code,
> more flexible in some ways but weaker typing and easier to write accidentally inefficient
> queries. Raw SQL: whenever the query is the interesting part — reporting, window functions,
> bulk operations. I don't treat these as exclusive; ORM for CRUD, raw SQL where it earns it.

🔗 *Yours:* Prisma on StockSafe and SmartTrader, Sequelize on GIBP, Drizzle on pSEO, TypeORM on
Resite — a fair answer is that you've used four and the tradeoffs are more similar than the
marketing suggests.

---

**Q. How do you handle migrations?**

> Versioned migration files in source control, applied in order, run as an explicit deploy
> step — never auto-sync against production. Two disciplines matter: migrations must be
> **backwards-compatible** with the currently running code, because during a rolling deploy old
> and new versions run simultaneously; and destructive changes are done in phases — add the new
> column, backfill, switch reads, then drop the old one in a later release. And I test the
> migration against a copy of production data, because an `ALTER TABLE` that takes a lock on a
> 50-million-row table is an outage.

---

**Q. How do you use transactions through an ORM?**

> A transaction callback that receives a transactional client, and every query inside must use
> *that* client — a query accidentally using the global client runs outside the transaction and
> won't roll back. Keep the transaction short and never put an HTTP call inside one: you'd hold
> row locks for the duration of someone else's latency. If a workflow spans services, that's a
> saga with compensating actions, not a database transaction.

---

**Q. When do you drop to raw SQL?**

> Bulk operations (a single `INSERT ... ON CONFLICT` over thousands of rows beats an ORM loop
> by orders of magnitude), reporting queries with window functions or complex aggregation,
> anything using a Postgres-specific feature the ORM doesn't model, and cases where I've read
> the generated SQL and it's a poor plan. Always parameterised — string interpolation into SQL
> is how injection happens, regardless of which layer you're at.

---

## Redis

**Q. What is Redis and when do you use it?**

> An in-memory data-structure store. I use it for caching, sessions, rate limiting, queues
> (BullMQ), pub/sub, distributed locks, and leaderboards via sorted sets. The reason it's fast
> is memory plus a simple single-threaded command loop — which is also the constraint: a single
> `KEYS *` on a big dataset blocks every other client, so you use `SCAN`.

---

**Q. Which data structures, and a use case each?**

| Structure | Use |
|---|---|
| String | Cached value, counter (`INCR`), feature flag |
| Hash | An object's fields, updatable individually — a session |
| List | Simple queue / recent-items feed |
| Set | Unique membership — "who's online", dedup |
| Sorted set | Leaderboard, priority queue, sliding-window rate limiter by timestamp score |
| Stream | Append-only log with consumer groups — event processing |
| HyperLogLog | Approximate unique counts in tiny fixed memory |

---

**Q. Cache-aside vs write-through vs write-behind?**

> **Cache-aside** (what I use by default): app checks the cache, on a miss reads the DB and
> populates it. Simple, resilient — a cache failure degrades to slow, not broken — but the first
> request after a miss is slow and there's a staleness window. **Write-through**: write to
> cache and DB together, so the cache is always fresh at the cost of write latency.
> **Write-behind**: write to cache and flush to the DB asynchronously — fastest writes, and you
> can lose data if the cache dies before the flush.

---

**Q. 🔥 How do you invalidate a cache?**

> TTL is the default answer, and usually the right one — bounded staleness with no coordination.
> Explicit invalidation on write for data where staleness is actually harmful. Key versioning
> (include a version or an `updated_at` in the key) when invalidation is hard, since the old
> key just ages out. And I set the TTL from how stale the data may acceptably be, not from a
> round number.
>
> Two failure modes to name: a **cache stampede** — a hot key expires and a thousand concurrent
> requests all hit the database — solved by a short lock so one request rebuilds while others
> wait, or by refreshing slightly before expiry. And **thundering herd** on restart when the
> whole cache is cold, mitigated by jittered TTLs so keys don't all expire together.

---

**Q. What eviction policies does Redis have?**

> When `maxmemory` is reached: `noeviction` (writes error — right for a queue or anything you
> can't lose), `allkeys-lru` (evict least-recently-used — the sensible default for a pure
> cache), `volatile-lru` (only keys with a TTL), plus LFU and random variants. `allkeys-lru`
> for a cache; `noeviction` if the same Redis also backs BullMQ, which is a good argument for
> not sharing one instance between a cache and a queue.

---

**Q. How does Redis persist data?**

> **RDB** takes point-in-time snapshots — compact, fast to restore, but you lose everything
> since the last snapshot. **AOF** appends every write command; with `appendfsync everysec` you
> lose at most a second, at some throughput cost. Running both is common: AOF for durability,
> RDB for fast restarts and backups. The honest framing is that Redis is not a database of
> record — anything that must not be lost needs a real durable store behind it.

---

**Q. 🔥 How do you implement a distributed lock, and what's the catch?**

> `SET key value NX PX 30000` — set only if not exists, with an expiry so a dead holder doesn't
> lock forever. The value must be a unique token, and release must be a Lua script that checks
> the token before deleting, otherwise you can delete a lock that has expired and been acquired
> by someone else. The catch nobody mentions: this is not safe under arbitrary process pauses
> or clock issues — if your holder is stopped by GC past the expiry, two processes believe they
> hold the lock. So a Redis lock is an optimisation to avoid duplicate work, not a correctness
> guarantee. When correctness matters I put the invariant in the database with a unique
> constraint or `SELECT ... FOR UPDATE`.

---

## pgvector & semantic search

**Q. What is an embedding?**

> A dense vector representation of text (or an image) produced by a model, where semantic
> similarity corresponds to closeness in vector space. That's what lets you find "documents
> about this topic" rather than "documents containing this word" — the query and the document
> don't have to share vocabulary.

---

**Q. Which distance metric do you use?**

> Cosine similarity for text embeddings, because it measures direction and ignores magnitude,
> and most text models are trained with it. If vectors are already normalised, inner product is
> equivalent and cheaper. L2 (Euclidean) when magnitude carries meaning. The important part is
> matching the metric your model was trained with, and using the matching pgvector operator
> (`<=>` cosine, `<#>` inner product, `<->` L2) — a mismatch silently degrades results rather
> than erroring.

---

**Q. 🔥 HNSW vs IVFFlat?**

> Both are approximate-nearest-neighbour indexes trading a little recall for a lot of speed.
> **IVFFlat** clusters vectors into lists and searches only the nearest few — small index, fast
> to build, but it must be built *after* the data is loaded because the clusters are derived
> from it, and recall degrades as new data drifts from the original clustering.
> **HNSW** builds a navigable small-world graph — better recall and query speed, handles
> incremental inserts gracefully, at the cost of a slower build and more memory. I default to
> HNSW unless the index size or build time is a hard constraint. Both have a knob trading recall
> for latency (`ef_search` / `probes`), and exact search with no index is always an option
> below a few tens of thousands of vectors.

---

**Q. How do you chunk documents for retrieval?**

> Chunk on semantic boundaries — headings, paragraphs — rather than a fixed character count
> that cuts mid-sentence. Something in the region of a few hundred tokens with a small overlap
> so context spanning a boundary isn't lost. Keep metadata (source, section, tenant) alongside
> the vector so you can filter before or after the similarity search and cite the source. And
> chunk size is a real tuning parameter: too small and each chunk lacks context, too large and
> the embedding blurs across multiple topics and matches nothing well.

---

**Q. Why pgvector rather than a dedicated vector database?**

> Because it's one less system. The vectors live next to the relational data, so I can filter
> by tenant, date or status in the same query as the similarity search, get transactional
> consistency between a document and its embedding, and use the backups and access control I
> already have. A dedicated vector DB (Qdrant, Pinecone) earns its place at very large scale, or
> when you need features Postgres doesn't have — sophisticated hybrid search, distributed
> sharding of the index. For the scale most products operate at, pgvector is the pragmatic call.

🔗 *Yours:* pSEO uses pgvector for semantic dedup of generated pages; UACE uses sqlite-vec for
the same idea offline and local-first; AgentSystem uses Qdrant — so you've genuinely made this
choice three different ways.

---

**Q. What is hybrid search?**

> Combining keyword search (BM25 / Postgres full-text) with vector similarity, then merging the
> rankings — reciprocal rank fusion is the usual method. It exists because each fails
> differently: keyword search misses paraphrases, vector search misses exact identifiers,
> product codes and rare proper nouns because they're poorly represented in the embedding
> space. Hybrid covers both, and a reranking model on the merged top-k improves precision
> further.

---

## Rapid-fire

| Question | One-liner |
|---|---|
| SQL vs NoSQL | Relational + strong consistency + ad-hoc queries vs flexible schema + horizontal scale. |
| Primary vs unique key | One per table, not null, the row's identity; unique can be many and nullable. |
| Foreign key | Referential integrity — plus a reason to index the referencing column. |
| `INNER` vs `LEFT JOIN` | Only matches vs all left rows with NULLs for non-matches. |
| `WHERE` vs `HAVING` | Filters rows before aggregation vs groups after. |
| `UNION` vs `UNION ALL` | Deduplicates (costs a sort) vs concatenates — use ALL unless you need dedup. |
| `DELETE` vs `TRUNCATE` | Row-by-row, transactional, fires triggers vs fast whole-table reset. |
| View vs materialised view | Stored query vs stored *result* needing refresh. |
| Trigger | DB-side function on a data event — powerful, and easy to make behaviour invisible. |
| `SERIAL` vs `UUID` PK | Compact and ordered vs globally unique and client-generatable (use UUIDv7 for ordering). |
| CAP theorem | Under a partition you choose availability or consistency. |
| Eventual consistency | Replicas converge given no new writes — read-your-writes needs care. |
| Idempotent write | `INSERT ... ON CONFLICT DO NOTHING/UPDATE` — the upsert. |
| SQL injection defence | Parameterised queries. Always. No exceptions for "internal" endpoints. |

---

## Back to [INDEX.md](INDEX.md)
