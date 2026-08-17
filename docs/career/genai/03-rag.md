# 03 — RAG

> The single most-probed topic in a Gen AI SWE interview, and the one where a shallow answer is
> most obvious. Everyone can recite "embed, store, retrieve, generate". The questions that sort
> candidates are about **chunking strategy, what happens when the embedding model changes, and
> why permission filtering collapses recall**.
>
> This file assumes you already know the DB layer — pgvector operators, HNSW vs IVFFlat, distance
> metrics — from [interview-qa/05-databases.md](../interview-qa/05-databases.md) §vector. It does
> not repeat them.
>
> Part 1 you read. Part 2 you cover and answer out loud. 🔥 = hard or commonly fumbled.

---

## Part 1 — What you actually need to know

### The pipeline, and where quality actually dies

```
INGEST   load → parse → normalise → chunk → enrich → embed → store (vectors + metadata)
QUERY    understand → retrieve (dense + lexical) → filter → fuse → rerank → assemble → generate → cite
```

**The single most important sentence in this file:** when a RAG system gives bad answers, it is
usually **retrieval** that failed, not generation. Measure them separately. If recall@k is 0.4,
every hour spent on the prompt is wasted.

The corollary interviewers listen for: **you cannot debug RAG without evals.** See
[04-evals.md](04-evals.md).

---

### Ingestion engineering

The unglamorous half, and the half that decides your ceiling.

**Parsing is the hard part, not the embedding.**

| Source | The real problem |
|---|---|
| PDF | Text-layer vs scanned. A "PDF parser" that works on one fails silently on the other. Multi-column layouts read in the wrong order |
| Tables | Linearising a table destroys the row/column relationship. Either keep them as structured data or render them as markdown and accept the loss |
| HTML | Boilerplate — nav, footers, cookie banners — becomes chunks that match everything |
| Code | Needs structural parsing, not text splitting (see chunking) |
| Slides / email | Fragmented; context lives in adjacent units |

**Deletion is the requirement people forget.** GDPR/DPDP right-to-erasure means a document must
be removable from the vector index, not just from the source DB. Design for it: keep a
`document_id → chunk_ids` mapping so deletion is one query, and remember most ANN indexes
tombstone rather than truly delete until rebuilt.

**Incremental ingestion.** Full re-index doesn't scale. Key chunks on a content hash so unchanged
content is skipped; changed documents delete-then-reinsert their chunks. `[This is exactly what
repo-intelligence's contentHash gives you — it's used for staleness detection today and is the
natural key for incremental indexing.]`

**Also: dedup at ingest, freshness/TTL metadata, and idempotent upserts** so a retried ingestion
job doesn't double-insert.

---

### Chunking — the topic that separates levels

**Fixed-size + overlap is the default and the weakest option.** It splits sentences, functions and
table rows arbitrarily. Overlap makes it less bad; it doesn't make it right.

| Strategy | How it works | When it's right |
|---|---|---|
| **Fixed-size + overlap** | N tokens, M overlap | Baseline. Homogeneous prose |
| **Recursive character** | Split on paragraph → sentence → word, in priority order | Good general default for documents |
| **Structural / document-aware** | Split on markdown headings, HTML sections, slide boundaries | Structured docs. Cheap and effective |
| **Semantic** | Embed sentences, split where similarity drops | Topically drifting prose. Costs an embedding pass at ingest |
| **Symbol-boundary** | Split on functions/classes via AST | **Code.** Nothing else is acceptable |
| **Parent-document / small-to-big** | Embed small chunks for precision, return the larger parent for context | Very strong general default |
| **Sentence-window** | Embed a sentence, return it plus N neighbours | Similar goal, finer grain |
| **Contextual retrieval** | Prepend an LLM-generated summary of the document's context to each chunk before embedding | Highest quality; costs one LLM call per chunk at ingest (mitigated by prompt caching) |
| **Late chunking** | Embed the long document, then pool per-chunk from the full-context token embeddings | Preserves cross-chunk context without an LLM pass |

**Small-to-big is the idea to lead with when asked "how would you improve chunking".** The tension
is that small chunks retrieve precisely and answer poorly, large chunks answer well and retrieve
imprecisely. Small-to-big resolves it: index small, return big.

**The cheap version of contextual retrieval — put metadata in the embedded text.** No LLM call
needed.

> 🔗 *Yours:* repo-intelligence's `chunkSearchText` prefixes the file path and symbol signature
> onto the body before embedding, because "`verifyToken`'s body mentions `jwt` and `secret` but
> never 'authentication'; the path `src/auth/token.ts` does the work instead." That one example
> explains the entire technique.

**Chunk metadata to always carry:** source id, path/URL, position, section heading, timestamp,
tenant/ACL, content hash, and the **embedding model version** (see below).

> 🔗 *Yours:* the symbol chunker at 900 tokens max, 4 lines of overlap on oversized symbols,
> 24-char minimum, and `estimateTokens = len/3.6` measured on source code rather than prose.
> Module symbols excluded so they don't duplicate every chunk in the file; methods chunked *in
> addition to* their class, paying duplication to get the right granularity. Full reasoning in
> [13](13-deepdive-repo-intelligence.md#dd1--symbol-boundary-chunking).

---

### Embedding model selection

**Choose by your eval, not by the leaderboard.** MTEB is useful for a shortlist and actively
misleading as a decision — models are trained on it, and your domain isn't in it.

| Axis | Trade |
|---|---|
| **Dimensions** | Higher usually better, linearly more storage and slower search. 384 → 768 → 1536 → 3072 |
| **Domain fit** | A code model beats a general model on code by a wide margin. Same for legal, medical, multilingual |
| **Matryoshka (MRL)** | Trained so a *truncated* prefix of the vector is still valid — store 1536, search at 256, rerank at full. Big cost lever |
| **Asymmetric models** | Separate query/passage encodings (`input_type: query` vs `passage`). Using the wrong one silently degrades recall |
| **Local vs API** | Local: free, private, deterministic, no rate limit, weaker models. API: stronger, per-call cost, data leaves |
| **Max sequence length** | A model with a 512-token limit silently truncates your 900-token chunks |

> 🔗 *Yours:* three different choices across three projects, and you can justify each —
> `jina-embeddings-v2-base-code` 768d local in repo-intelligence (code-specialised, and local
> because the eval re-runs indexing hundreds of times so a per-call cost would make the
> measurement expensive to take), `nvidia/llama-nemotron-embed-1b-v2` 2048d with
> `input_type: passage` in pSEO, `all-MiniLM-L6-v2` 384d local in UACE, and
> `text-embedding-3-small` 1536d in AgentSystem.

### 🔥 Re-embedding, versioning and backfill

The question that catches almost everyone, because it only bites in production.

**You cannot mix vectors from two models in one index.** Their spaces are unrelated; cosine
similarity between them is noise. So changing the embedding model means re-embedding everything.

**The migration, properly:**

1. **Store `embedding_model_version` on every chunk row** from day one. Without it you cannot even
   tell what you have.
2. **Build the new index alongside the old** — a new column, table or collection. Never in place.
3. **Dual-write** new content to both while backfilling old content.
4. **Backfill** in batches, with the ability to pause and resume. Cost it first: chunks ×
   tokens/chunk × price.
5. **Evaluate before cutover** on the same golden set. A "better" model per MTEB can be worse on
   your data.
6. **Cut over behind a flag**, keep the old index until confident, then drop it.

**When not to upgrade:** if the backfill cost exceeds the measured quality gain, don't. This is a
legitimate and senior answer.

**Related trap — dimension changes.** New model, different dimension means schema migration too,
not just re-embedding.

---

### Retrieval

**Dense** (embeddings) finds semantic matches. **Lexical** (BM25/FTS) finds exact tokens —
identifiers, error codes, product SKUs, rare proper nouns. **They fail in opposite directions**,
which is why hybrid beats either.

**Hybrid fusion — use RRF, not weighted score addition:**

> BM25 scores are unbounded and corpus-dependent; cosine sits in [-1, 1]. Adding or weighting them
> compares quantities with no common scale, and any weights you pick are fitted to one corpus. RRF
> fuses by *rank*, which is scale-free: `score = Σ weight/(K + rank)`, K=60 conventionally.

And the property that makes it work: a document appearing in both lists outranks one topping
either alone — **agreement between independent retrievers is stronger evidence than excellence in
one.**

**Metadata filtering — pre vs post:**

| | How | Problem |
|---|---|---|
| **Pre-filter** | Restrict the candidate set, then search | The ANN index may not support the filter inside its scan; a highly selective filter can degrade to a scan |
| **Post-filter** | Search, then drop non-matching | **Recall collapse** — if you fetch top-10 and 9 fail the filter, you return 1 |
| **Over-fetch + post-filter** | Fetch k×N, filter, truncate to k | The practical middle ground |

> 🔗 *Yours:* UACE does exactly this and you can say why. sqlite-vec's `vec0` KNN can't apply the
> project filter inside the index scan, so `searchSemantic` over-fetches
> `Math.max(limit * 10, 50)` and post-filters by project — otherwise a multi-project DB starves
> results for the project you asked about. That's the over-fetch pattern, discovered the hard way.

**MMR (maximal marginal relevance)** trades some relevance for diversity — useful when your
top-k is five near-duplicate chunks of the same passage.

---

### Query understanding

The cheapest large win, and frequently skipped.

| Technique | What it does | Cost |
|---|---|---|
| **Query rewriting** | Turn conversational input into a standalone search query. "What about the second one?" is unsearchable | 1 small LLM call |
| **Multi-query** | Generate 3–5 paraphrases, retrieve for each, fuse with RRF | N retrievals |
| **Decomposition** | Split a multi-part question into sub-questions, retrieve per part | N retrievals |
| **HyDE** | Generate a *hypothetical answer*, embed that, search with it — answers look more like documents than questions do | 1 LLM call |
| **Step-back** | Ask a more general question first to retrieve background, then the specific one | 1 LLM call |
| **Routing** | Classify the query and send it to the right index/tool | 1 small call |
| **Skip retrieval** | "Hello", "summarise what you just said" — don't retrieve at all | Free, and often forgotten |

**Conversational RAG needs query rewriting almost always.** Embedding the raw follow-up turn is
the single most common production RAG bug.

---

### Reranking

A **cross-encoder** scores (query, document) jointly, so it sees interactions a bi-encoder can't —
much more accurate, far too slow to run over the corpus. Hence the standard two-stage shape:

```
bi-encoder retrieves top 50-100  →  cross-encoder reranks  →  top 5-10 to the model
```

| | Bi-encoder | Cross-encoder |
|---|---|---|
| Encodes | Query and doc separately | Together |
| Precompute | Yes — that's the point | Impossible |
| Speed | Millions of docs | Tens to hundreds |
| Accuracy | Good | Better |

**A reranker often beats a better embedding model, at lower total cost**, because it fixes ranking
rather than requiring a full re-embed. It is usually the highest-ROI addition to a working RAG
system — and it is the thing your own systems don't have yet.

Cost: added latency (typically 50–300 ms) and per-query spend if hosted. Mitigate by reranking
fewer candidates.

---

### Advanced retrieval architectures

**Graph RAG** — extract entities and relationships into a graph, retrieve by traversal, optionally
pre-compute community summaries for global questions. Genuinely better for "what are the themes
across these documents" and multi-hop questions. Expensive: an extraction pass over the whole
corpus, plus maintenance. **Usually not worth it**; say so, and name the cheaper alternative —
**structural** relationships you already have (imports, foreign keys, links, folder hierarchy)
give you most of the benefit for none of the extraction cost.

> 🔗 *Yours:* repo-intelligence is exactly the cheap version — the graph is built from resolved
> imports, calls, routes and ORM models, not from LLM entity extraction. **And you measured
> whether it helped**, which almost nobody does. The current finding is that search and ranking
> beat grep by more than the graph adds on top. That's an unusually credible thing to be able to
> say about Graph RAG.

**Agentic / iterative retrieval** — retrieve, grade the results, and retrieve again with a better
query if they're insufficient (Self-RAG, CRAG). Better recall on hard questions; multiplies
latency and cost. Bound the loop.

**Seed → expand → rank** — search for entry points, expand along known structural edges, rank the
union. 🔗 *Yours:* repo-intelligence's retrieval core.

---

### Generation, citations and abstention

- **Ground explicitly.** "Answer using only the context below. If the context doesn't contain the
  answer, say you don't know." Then actually reward abstention in your evals, or the model learns
  guessing is free.
- **Citations at claim level, not answer level.** One `[1]` at the end is unverifiable.
- **Verify citations programmatically.** A citation the user trusts and that is wrong is worse
  than no citation, because it looks verified.

  > 🔗 *Yours:* `validate.ts` — re-reads the file from disk, eight failure modes, drops the claim,
  > refuses the whole answer above 30% dropped. This is your strongest single guardrail story.
- **Low temperature** for extraction/grounded answering. Not zero-risk, but it reduces drift.
- **Context ordering matters** — lost-in-the-middle is real. Put the most relevant material at the
  start or the end, not buried at position 15 of 30.

---

### Multi-tenancy and permissions

**Tenant isolation for vectors** — three options, same shape as relational tenancy
([07-specialities.md:349](../interview-qa/07-specialities.md)):

| Model | Isolation | Cost |
|---|---|---|
| Shared index + `tenant_id` filter | Weakest — one missing filter leaks everything | Cheapest, one index |
| Namespace/collection per tenant | Strong, index-enforced | Per-tenant overhead; bad at thousands of tenants |
| Index per tenant | Strongest | Expensive; only for large/regulated tenants |

For the shared model, **enforce at the repository layer or with RLS**, not by remembering to add
`WHERE tenant_id = ?` at each call site. And make the tenant column the leading column of your
composite index.

**🔥 Permission-aware RAG — the recall collapse problem.**

If you retrieve top-k and *then* filter by the user's ACL, a user with access to 5% of the corpus
gets a nearly empty result set. Retrieval found the best documents; the filter deleted them.

Options:

1. **Pre-filter by ACL inside the search** — correct, requires the vector store to support
   filtered ANN efficiently. Best default.
2. **Over-fetch then filter** — k×N candidates. Simple, degrades badly at low access ratios.
3. **Per-principal partitioning** — namespace per group. Fast, doesn't handle complex sharing.
4. **Late binding** — retrieve permissively, filter, and if too few survive, retrieve again with a
   larger budget. Correct and slow.

**Also:** ACLs change. A document re-shared or revoked must take effect immediately, which means
permissions cannot be baked into the embedding — they must be queryable metadata, refreshed from
the source of truth.

**And the security consequence:** a document a user shouldn't see must not influence the answer
*at all*, including indirectly. Summaries, "related documents", and even the fact that a match
exists can leak. See [07-safety-guardrails.md](07-safety-guardrails.md).

---

### Freshness, caching, and when not to RAG

**Freshness** — carry a timestamp, decay old content in ranking, and invalidate on source change.
Stale content produces answers that are faithful and wrong.

**Semantic caching** — cache by embedding similarity rather than exact match. Big cost saver,
**and dangerous**: two semantically similar questions can have different correct answers
("what's my balance" for two users). Never semantic-cache across tenants or users, and set the
threshold high.

**When NOT to RAG:**
- The corpus fits in context and is stable → just include it.
- The task is about *behaviour or format*, not knowledge → prompt or fine-tune.
- The answer needs computation or live data → tools, not retrieval.
- The knowledge is in the model already and stable → skip it.

---

## Part 2 — Drill

**Cover the answers. Say yours out loud first.**

### Pipeline and diagnosis

**1. Explain a RAG pipeline end to end.**
> Two halves. Ingest: load the source, parse it properly, normalise, chunk on meaningful
> boundaries, enrich each chunk with metadata and context, embed, and store vectors alongside
> filterable metadata. Query: understand the query — rewrite it if conversational — retrieve with
> both dense and lexical search, apply tenant and permission filters, fuse the lists with RRF,
> rerank with a cross-encoder, assemble a context that fits the budget with the best material not
> buried in the middle, generate with an explicit grounding instruction, and return claim-level
> citations. And the thing I'd add unprompted: measure retrieval separately from generation,
> because that's where it actually fails.

**2. 🔥 Your RAG system gives wrong answers. Walk me through the diagnosis.**
> In order. First, is the right chunk even being retrieved — recall@k against labelled relevant
> docs. If not, the problem is upstream and the prompt is irrelevant: check chunking (are answers
> being split across boundaries), the embedding model (domain fit, sequence-length truncation,
> query vs passage encoding), and query formulation (is a conversational follow-up being embedded
> raw). If recall is fine, check ranking — is it retrieved but at rank 40. Then context assembly —
> is it in the context but buried in the middle, or truncated out. Only then the prompt — is the
> model answering from prior knowledge instead of the context. Most people start at the prompt
> because it's the easiest thing to change.

**3. When would you not use RAG?**
> When the corpus fits in context and rarely changes — just include it, it's simpler and more
> reliable. When the problem is behaviour or output format rather than knowledge — that's
> prompting or fine-tuning. When the answer requires computation or live state — that's tool
> calling. And when the model already knows it reliably. RAG is for large, changing, or private
> knowledge.

### Chunking

**4. 🔥 How do you chunk documents?**
> Not with a fixed window if I can avoid it. The default I reach for is structural — split on the
> document's own boundaries, headings, sections — falling back to recursive character splitting.
> For code it has to be AST-based on symbol boundaries. And the pattern I'd argue for on most
> systems is small-to-big: embed small chunks so retrieval is precise, return the larger parent so
> generation has context. The core tension is that small chunks retrieve well and answer badly,
> and large chunks do the reverse; small-to-big is how you stop choosing.

**5. Why is fixed-size chunking bad for code specifically?**
> It splits functions in half, so neither half is a coherent unit of meaning. And in my case it
> breaks something structural: my retrieval expands along graph edges from symbols to chunks, so a
> chunk that can't be traced back to a symbol is unreachable by expansion — building the graph
> would have been pointless. Overlap doesn't fix that, it just makes the halves less bad.

**6. What is contextual retrieval?**
> Before embedding each chunk, prepend a short LLM-generated description of where it sits in the
> document — so a chunk saying "this rose 3%" becomes "in the Q3 revenue section of Acme's 2024
> report, this rose 3%". It substantially improves retrieval because chunks stop being
> context-free. Cost is one LLM call per chunk at ingest, which prompt caching makes affordable
> since the document prefix is shared.
>
> ↳ **If pushed — cheaper version?** "Put the metadata you already have into the embedded text.
> I prefix the file path and symbol signature onto each code chunk — `verifyToken`'s body never
> says 'authentication', but `src/auth/token.ts` does. No model call needed."

**7. What metadata do you attach to a chunk?**
> Source id and location, section heading, position within the document, timestamp, tenant and
> ACL, content hash, and the embedding model version. The last two are the ones people skip and
> regret — content hash gives you incremental re-indexing and staleness detection, model version
> is what makes an embedding migration possible at all.

### Embeddings and migration

**8. How do you choose an embedding model?**
> Shortlist from MTEB, then decide on my own eval — MTEB is trained on and my domain isn't in it.
> The axes that matter: domain fit, which is usually the biggest single factor; dimensionality
> against storage and query cost; max sequence length, because a 512-token model silently
> truncates 900-token chunks; whether it's asymmetric and needs a query/passage flag; and local
> versus hosted.
>
> 🔗 *Yours:* "I've picked differently in different projects for defensible reasons — a
> code-specialised model for code retrieval, and local specifically because my eval re-runs
> indexing hundreds of times and a per-call cost would make the measurement that justifies the
> project expensive to take."

**9. 🔥 You need to change the embedding model. What happens?**
> Everything gets re-embedded — you can't mix vectors from two models in one index, their spaces
> are unrelated and similarity between them is noise. So: store a model-version column on every
> chunk from day one, build the new index alongside the old rather than in place, dual-write new
> content to both while backfilling old content in resumable batches, evaluate on the same golden
> set before cutover because "better" per a leaderboard can be worse on my data, cut over behind a
> flag, keep the old index until confident, then drop it. And cost it first — if the backfill cost
> exceeds the measured gain, don't upgrade. That's a legitimate answer.
>
> ↳ **If pushed — dimension change too?** "Then it's a schema migration as well, so the new
> column or collection isn't optional."

**10. What is Matryoshka embedding and why care?**
> The model is trained so that a truncated prefix of the vector is still a valid embedding. So you
> can store 1536 dimensions, run the fast ANN search over the first 256, and rerank the survivors
> at full dimension. It's a large storage and latency saving without a second model.

**11. What's the query/passage distinction?**
> Some embedding models are asymmetric — trained with different instructions for the query side
> and the document side. Using the passage encoding for queries silently degrades recall, and
> nothing errors. It's a quiet, common bug.
>
> 🔗 *Yours:* pSEO passes `input_type: 'passage'` explicitly to NVIDIA's embeddings endpoint.

### Retrieval and ranking

**12. 🔥 Why hybrid search rather than pure vector search?**
> Because they fail in opposite directions. Embeddings are bad at exact tokens — an error code, a
> SKU, an identifier, a rare proper noun — where BM25 is perfect. BM25 is bad at paraphrase, where
> embeddings shine. The canonical example is that BM25 finds the file that literally says
> `verifyToken`, and embeddings find the one that's about sessions without using the word. You
> want both.

**13. How do you combine the two ranked lists?**
> RRF, not weighted score addition. BM25 scores are unbounded and corpus-dependent, cosine sits in
> [-1, 1] — adding or weighting raw numbers compares quantities with no common scale, and the
> weights end up fitted to one corpus. RRF sums `1/(K + rank)` per list, which is scale-free. And
> it has the property I want: a document ranked in both lists outranks one topping either alone,
> because agreement between independent retrievers is stronger evidence than excellence in one.

**14. 🔥 Explain pre-filtering vs post-filtering, and the failure mode.**
> Pre-filter restricts the candidate set before the vector search; post-filter searches then
> discards. Post-filtering has a recall-collapse failure: fetch top-10, discard the 9 that fail the
> filter, return 1. Pre-filtering is correct but needs the index to support filtered ANN
> efficiently, or a selective filter degrades to a scan. The practical middle is over-fetch and
> post-filter.
>
> 🔗 *Yours:* "sqlite-vec's KNN can't apply my project filter inside the index scan, so I
> over-fetch `max(limit × 10, 50)` and filter after — otherwise a multi-project database starves
> results for the project you asked about. I found that by having it happen."

**15. What is reranking and when is it worth it?**
> A second, more accurate stage over the top 50–100 candidates. A bi-encoder embeds query and
> document separately so it can precompute the corpus, which is what makes search possible; a
> cross-encoder feeds both through together so it sees their interaction — much more accurate,
> impossible to precompute. So you retrieve broadly and rerank narrowly. It's usually the highest
> ROI addition to a working RAG system, and often beats upgrading the embedding model at lower
> total cost, because it fixes ranking without a full re-embed.
>
> **Honest gap:** "I haven't shipped one — it's the next thing I'd add to repo-intelligence, and
> I'd measure it with an eval delta."

**16. What's MMR for?**
> Diversity. When your top-5 are five near-identical chunks of the same passage, you've spent your
> whole context budget on one fact. MMR penalises a candidate by its similarity to what's already
> selected, so you trade a little relevance for coverage.

### Query understanding

**17. 🔥 A user asks a follow-up: "what about the second one?" What does your retrieval do?**
> Nothing useful, if I embed it raw — it's the most common production RAG bug. It needs query
> rewriting: a small, cheap LLM call that turns the conversational turn plus recent history into a
> standalone search query. In a chat RAG system that step is effectively mandatory.

**18. What is HyDE?**
> Generate a hypothetical answer to the question, embed *that*, and use it as the search vector.
> It works because answers look more like documents than questions do — you're closing the gap
> between query space and document space. Costs one LLM call and can hurt when the model
> hallucinates a wrong-domain answer.

**19. Multi-query and decomposition — difference?**
> Multi-query generates paraphrases of the same question and fuses the results, to cover
> vocabulary mismatch. Decomposition splits a genuinely multi-part question into sub-questions and
> retrieves per part, because no single chunk answers "compare X and Y on Z". Different problems.

**20. When should you skip retrieval entirely?**
> Greetings, meta questions about the conversation, and anything the model can answer from what's
> already in context. Retrieving for those costs latency and injects irrelevant chunks that
> actively degrade the answer. A cheap router classifying "does this need retrieval" pays for
> itself.

### Advanced architectures

**21. 🔥 What's Graph RAG, and would you use it?**
> Extract entities and relationships into a graph, then retrieve by traversal instead of only by
> similarity — plus community summaries for global "what are the themes" questions that similarity
> search can't answer at all. It's genuinely better for multi-hop and corpus-level questions. I'd
> usually *not* reach for it, because the extraction pass over the corpus and the maintenance are
> expensive, and most questions don't need it.
>
> What I would do — and did — is use **structural** relationships that already exist rather than
> LLM-extracted ones. My code graph comes from resolved imports, calls, routes and ORM models. And
> I measured whether the graph beat plain search: so far search and ranking beat grep by more than
> the graph adds on top. So I have an unusually concrete opinion here — the graph isn't free, and
> most people asserting it helps haven't measured it.

**22. What's agentic retrieval?**
> Retrieve, grade whether the results actually support answering, and if not, reformulate and
> retrieve again — Self-RAG and CRAG are the named variants. Better recall on hard questions, at
> multiplied latency and cost, so the loop needs a hard bound. It's the retrieval equivalent of
> an agent loop, and it has the same failure mode: it can spin.

### Generation, tenancy, safety

**23. How do you reduce hallucination in a RAG system?**
> Ground explicitly and make abstention acceptable — "answer only from the context; if it isn't
> there, say so" — and then actually reward abstention in the eval, or the model learns guessing is
> free. Cite at claim level rather than one reference at the end. Keep temperature low. And where
> possible verify programmatically rather than trusting.
>
> 🔗 *Yours:* "In repo-intelligence every claim carries a `path:line`, and a validator re-reads
> the file from disk and drops any claim whose citation doesn't hold — refusing the whole answer
> above 30% dropped. A fabricated citation is worse than no answer because it looks verified."

**24. Where do you put the most relevant chunk in the context?**
> Not in the middle. Lost-in-the-middle is a real effect — models attend most reliably to the
> start and end of a long context. So the best material goes first or last, and I'd rather send
> five well-ranked chunks than thirty unranked ones.

**25. 🔥 How do you do multi-tenant RAG?**
> Three levels, same trade as relational tenancy. Shared index with a tenant filter is cheapest
> and weakest — one forgotten filter leaks everything, so it must be enforced at the repository
> layer or by RLS, never by remembering at each call site, and tenant_id leads the composite
> index. Namespace-per-tenant is index-enforced isolation with per-tenant overhead. Index-per-
> tenant is strongest and only justified for large or regulated tenants. I'd default to
> namespaces if the store supports them, because the failure mode of the shared model is
> catastrophic rather than degraded.

**26. 🔥 Enterprise RAG over Drive/Confluence — how do you handle permissions?**
> The key insight is that filtering *after* retrieval collapses recall: a user with access to 5%
> of the corpus gets an almost empty result set because retrieval found the best documents and the
> filter deleted them. So ACLs have to be pre-filter — indexed as queryable metadata and applied
> inside the search. They can't be baked into the embedding, because sharing changes and revocation
> has to take effect immediately, so the ACL metadata is refreshed from the source of truth.
> Fallback when the store can't filter efficiently: over-fetch, then late-bind — if too few
> survive the filter, retrieve again with a larger budget.
>
> ↳ **If pushed — what leaks even with correct filtering?** "Anything derived from documents the
> user can't see — cached summaries, 'related documents', even the existence of a match. And the
> corpus becomes an injection surface: a document someone else uploaded can carry instructions."

**27. How do you handle deletion / right to be forgotten?**
> Deletion has to reach the vector index, not just the source database, and the mapping that makes
> that one operation is a `document_id → chunk_ids` record kept at ingest. Two traps: most ANN
> indexes tombstone rather than truly remove until a rebuild, so "deleted" may still be searchable
> depending on the engine; and derived artifacts — caches, summaries, an eval set built from real
> data — hold copies that also have to be purged.
>
> 🔗 *Yours:* UACE hits the mechanical version of this — FTS5 auto-cleans via a delete trigger but
> `vec0` has none, so `deleteMemory` and `deleteProject` explicitly delete from the vector table
> inside a transaction first, or you get orphaned vectors.

**28. Semantic caching — good idea?**
> A real cost saver and a real hazard. Caching on embedding similarity means two questions that
> aren't actually the same can hit the same entry — "what's my balance" is the classic. So: never
> across tenants or users, a high similarity threshold, and only for queries whose answers don't
> depend on caller identity or live state.

**29. How do you keep a RAG index fresh?**
> Incremental ingestion keyed on content hash so unchanged content is skipped and changed
> documents delete-then-reinsert their chunks; timestamps on chunks with recency decay in ranking;
> and invalidation driven by source-change events rather than a periodic full rebuild. Full
> re-index is a fallback, not a strategy.

**30. What breaks first when you go from 10k to 10M chunks?**
> Exhaustive similarity search — you need a real ANN index, and now index build time, memory and
> the recall/latency knobs (`ef_search`, `probes`) become things you tune. Then filtered search:
> pre-filtering that was free at 10k is now the dominant cost. Then ingestion throughput and the
> embedding bill. And re-embedding stops being an afternoon.
>
> 🔗 *Yours (own it):* "pSEO has no vector index at all — every similarity query is a sequential
> scan. That's fine at hundreds of pages per project with a `project_id` filter, and it's the
> first thing that breaks at scale. I know it's there."

---

## Rapid-fire

| Term | One-liner |
|---|---|
| Chunk | The unit of retrieval — what gets embedded and returned |
| Recursive splitting | Split on paragraph → sentence → word in priority order |
| Small-to-big | Embed small for precision, return the parent for context |
| Sentence-window | Embed one sentence, return it plus neighbours |
| Contextual retrieval | Prepend an LLM-written document context to each chunk before embedding |
| Late chunking | Pool chunk vectors from a full-document forward pass |
| Symbol chunking | Split code on AST symbol boundaries |
| MTEB | Embedding benchmark — shortlist tool, not a decision |
| Matryoshka | Truncated prefix of the vector is still valid |
| Asymmetric model | Different encoding for query vs passage |
| Model version column | The thing that makes an embedding migration possible |
| Dual-write + backfill | How you migrate embeddings without downtime |
| BM25 | Lexical ranking — exact tokens, rare terms |
| RRF | Rank-based fusion, `1/(K+rank)`, K=60 |
| Pre-filter | Restrict candidates before search |
| Post-filter | Search then discard — risks recall collapse |
| Over-fetch | Retrieve k×N so post-filtering still leaves k |
| MMR | Trade relevance for diversity in the result set |
| Bi-encoder | Encodes query and doc separately — precomputable |
| Cross-encoder | Encodes them together — accurate, not precomputable |
| HyDE | Embed a hypothetical answer instead of the question |
| Multi-query | Paraphrase, retrieve each, fuse |
| Step-back | Retrieve background with a general question first |
| Query rewriting | Turn a conversational turn into a standalone query |
| Self-RAG / CRAG | Grade retrieved results and retrieve again if weak |
| Graph RAG | Retrieve by traversing an entity/relation graph |
| Lost in the middle | Models attend worst to the centre of a long context |
| Semantic cache | Cache by embedding similarity — never across users |
| Tombstone | ANN "deletes" that persist until index rebuild |

---

## 🔗 Anchors

| Concept | Your project | The sentence to say |
|---|---|---|
| Symbol-boundary chunking | repo-intelligence | "Fixed windows split functions and break the symbol→chunk mapping my graph expansion depends on." |
| Metadata-enriched chunks | repo-intelligence | "`verifyToken`'s body never says 'authentication' — the path does, so the path is in the embedded text." |
| Hybrid + RRF | repo-intelligence | "Rank fusion, because BM25 and cosine have no common scale." |
| Domain-specific embeddings | repo-intelligence | "Code-specialised, because general models score identifiers and prose alike." |
| Graceful degradation | repo-intelligence, UACE | "Vectors are an enhancement, never a dependency — retrieval falls back to BM25 and the embedder returns null rather than throwing." |
| Over-fetch + post-filter | UACE | "vec0 can't filter by project inside the index scan, so I over-fetch 10× and filter after." |
| Orphaned vectors on delete | UACE | "FTS5 has a delete trigger, vec0 doesn't — so deletes hit the vector table explicitly, in a transaction." |
| Near-duplicate detection | pSEO | "pgvector cosine ≥ 0.92 flags a near-duplicate page, and the flag blocks approval without an override." |
| pgvector vs dedicated store | pSEO | "One SQL query does the metadata filter and the similarity together, transactionally — no second system to keep in sync." |
| Filtered vector search | AgentSystem | "Qdrant with a payload filter on memory type and a 0.7 score threshold — below that it's not a memory, it's noise." |
| Citation validation | repo-intelligence | "The validator re-reads the file from disk and refuses the answer above 30% dropped claims." |
| Missing ANN index | pSEO | "Sequential scan today. Correct at hundreds of pages per project, and the first thing I'd fix at scale." |

---

## Gaps — what you cannot claim yet

| Gap | The honest script |
|---|---|
| **Reranking** | "Haven't shipped one. It's the highest-ROI thing I'd add next, and I'd gate it on an eval delta rather than assuming." |
| **Permission-aware RAG** | "Not in production. I understand the recall-collapse failure and I'd pre-filter with ACLs as queryable metadata refreshed from the source of truth." |
| **Contextual retrieval** | "I do the cheap version — metadata in the embedded text. The LLM-generated version I've read about, not shipped." |
| **Large-scale ANN tuning** | "My largest index is thousands of chunks. I know the knobs — `ef_search`, `probes`, recall/latency — but I haven't tuned them under load." |
| **Embedding migration in prod** | "I've designed for it — model version on the row — but I haven't run a dual-write backfill on live data." |
| **PDF / document ingestion at scale** | "Card-selector does OCR on images. I haven't built a document pipeline handling scanned PDFs and tables." |

---

## What's NOT here

| Topic | Doc |
|---|---|
| pgvector operators, HNSW vs IVFFlat, `ef_search`/`probes` | [interview-qa/05-databases.md](../interview-qa/05-databases.md) §vector |
| Measuring any of this | [04-evals.md](04-evals.md) |
| The repo-intelligence retrieval internals in full | [13-deepdive-repo-intelligence.md](13-deepdive-repo-intelligence.md) |
| Context budgeting and prompt caching | [02-prompting-structured-output.md](02-prompting-structured-output.md) |
| Indirect injection through the corpus | [07-safety-guardrails.md](07-safety-guardrails.md) |
| Designing enterprise RAG as an HLD | [11-ai-system-design.md](11-ai-system-design.md) |
| Relational multi-tenancy and RLS | [interview-qa/07-specialities.md](../interview-qa/07-specialities.md) |

---

← Back to [INDEX.md](INDEX.md)
