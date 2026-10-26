# repo-intelligence — how your code actually works

**What it is, in plain English:** you point it at a TypeScript or JavaScript repository and ask a
question about a *concern*, like "explain authentication". It does not just grep for the word.
It parses the code into a map of who imports and calls whom, searches that map for good starting
points, walks outwards along the connections, ranks what it found, and hands the best code to an
LLM. The LLM writes claims, each with a `path:line` citation. Then your code **re-reads every
cited file from disk** and throws away any claim whose citation does not hold up. If too many
fail, it refuses the whole answer. A local web page shows the result next to the cited source.

- **Path:** `~/workspace/repo-intelligence`
- **Stack:** TypeScript 5.9 on Node 24 · pnpm 9 + Turborepo monorepo · `web-tree-sitter` (WASM
  grammars) · a hand-written BM25 index · local embeddings via `@huggingface/transformers`
  (`jinaai/jina-embeddings-v2-base-code`) · JSON files on disk as the store · free-tier LLMs over
  an OpenAI-compatible HTTP API (NVIDIA NIM, OpenRouter, Gemini, or your own AI-ROUTER) · zod ·
  Vitest · Biome · GitHub Actions · a Docker image
- **Honest status:** finished as a research project. `docs/HANDOFF.md` calls it "closing state"
  and the verdict "closed". The README now says **"Status: working"**
  (`repo-intelligence/README.md:7`). The local test run on 2026-10-26: **37 test files, 405 tests,
  all passing** (core 365, eval 23, cli 17). TypeScript/JavaScript only. One user (you).

> **This file is the beginner layer.** The deeper interview drill is
> [genai/13-deepdive-repo-intelligence.md](../../genai/13-deepdive-repo-intelligence.md). Some of
> its numbers are now **out of date**. See "Corrections to genai/13" at the end. Read in order:
> `indexer.ts` (index time) → `retrieve/retrieve.ts` (query time) → `answer/validate.ts` (trust).

---

## JD coverage

| JD requirement | Where | Strength |
|---|---|---|
| RAG pipeline (retrieve, then generate) | `retrieve()` then `synthesize()`, wired in `repo-intelligence/apps/cli/src/server.ts:348-395` | **Strong** |
| Chunking | Chunks follow symbol boundaries, not fixed windows, `repo-intelligence/packages/core/src/chunk/symbol-chunker.ts:43-99` | **Strong** |
| Embeddings | Local code model, q8, batch 8, `repo-intelligence/packages/core/src/embed/local.ts:14,24,60` | **Strong** |
| Keyword search | Hand-written BM25 with camelCase splitting and abbreviation matching, `repo-intelligence/packages/core/src/index/bm25.ts:124-282` | **Strong** |
| Vector search | Brute-force cosine over every chunk, `repo-intelligence/packages/core/src/retrieve/retrieve.ts:186-211` | **Partial**: no vector DB, no ANN index |
| Hybrid search + RRF | `reciprocalRankFusion`, K=60, `repo-intelligence/packages/core/src/retrieve/fuse.ts:12,35-56` | **Strong** |
| Re-ranking | Rule-based re-rank (role bonus, hub/consumer/depth penalties), `repo-intelligence/packages/core/src/retrieve/retrieve.ts:297-398` | **Partial**: no cross-encoder or LLM reranker |
| Citation accuracy | Validator with 7 drop reasons + 30% refusal, `repo-intelligence/packages/core/src/answer/validate.ts:221-450` | **Strong** (the best part) |
| LLM provider integration | One OpenAI-compatible client, ordered fall-through, timeouts, `repo-intelligence/packages/core/src/answer/providers.ts:51-134,171-230` | **Strong** |
| Structured output | JSON schema + tolerant parsing + `normalise`, `repo-intelligence/packages/core/src/answer/prompt.ts:232-278`, `repo-intelligence/packages/core/src/answer/synthesize.ts:238-270` | **Strong** |
| Evals | Labelled suites, 3-arm ablation, P/R/F1/MRR/coreRecall, `repo-intelligence/packages/eval/src/metrics.ts:30-58`, `repo-intelligence/packages/eval/src/run.ts:54-94` | **Strong** |
| TypeScript | Whole repo, strict, zod at the edges | **Strong** |
| React web UI | The UI is **plain HTML + vanilla JS inside a template string**, `repo-intelligence/apps/cli/src/ui.ts:19` | **Not present** (UI yes, React no) |
| Testing | **Vitest** (not Jest), `repo-intelligence/package.json` devDependencies; no RTL | **Strong** for backend logic |
| CI | lint → typecheck → build → test, `repo-intelligence/.github/workflows/ci.yml:25-35` | **Partial**: evals are not in CI |
| Docker | Multi-stage image, `repo-intelligence/apps/cli/Dockerfile` | **Partial**: runs on a home machine behind nginx basic auth (`repo-intelligence/docs/deployment.md:8-13`) |
| Python / FastAPI / LangChain / MCP | none | **Not present** |

---

## The big picture

```
 INDEX TIME  (no LLM calls, pure parsing)                 `ri index <path|url>`
 ─────────────────────────────────────────
 repo ─► ingest/ walk (.gitignore, tsconfig, .prisma, docs)
      ─► graph/parse      tree-sitter → syntax tree per file
      ─► graph/symbols    functions, classes, methods...      ┐ pass 1
      ─► chunk/           one chunk per symbol (split if big)  ┘ (per file)
      ─► graph/edges      imports, calls, routes, models,      ┐ pass 2
                          containment, each with a confidence  ┘ (whole repo)
      ─► index/bm25       keyword index over chunk text
      ─► index/json-store writes repo.json, symbols.json, edges.json, chunks.json, bm25.json...
      ─► embed-index      vectors (slow, checkpointed) → embeddings.json

 QUERY TIME                                             `ri serve` → POST /api/ask
 ──────────
 question ─► BM25 top 24 ─┐
          ─► cosine top 24┴► RRF fuse ─► 12 seed symbols
                                          │
                                          ▼  traverse(): BFS both directions, depth ≤ 2,
                                          │  score = product of edge confidences
                              rank: + seed score, centrality, role bonus
                                    − reference / consumer / hub penalties
                                    × 0.5 per hop
                                          │
              ┌───────────────────────────┴────────────────────────┐
              ▼                                                    ▼
   render/mermaid (diagrams from edges)        answer/prompt  → numbered code spans
                                               answer/synthesize → LLM (JSON)
                                               answer/validate  → re-read files, drop bad claims
                                                          │
                                                          ▼
                                     apps/cli/src/ui.ts — claim + click citation → highlighted source
```

---

## Follow one question end-to-end: "explain authentication"

The test fixture is a tiny Express app (`repo-intelligence/fixtures/tiny-express-app`). It has
`src/auth/middleware.ts` (a `requireAuth` middleware), `src/auth/token.ts` (`verifyToken`,
`JWT_SECRET`), and `src/routes/auth-routes.ts` (`GET /me` guarded by `requireAuth`). Follow it.

### Index time

**1. Walk and parse.** `indexRepository` (`repo-intelligence/packages/core/src/indexer.ts:84`)
finds the files, then for each one: reads it, parses it with tree-sitter, and hashes it.

```ts
const parsed = await pool.parse(path, source);
if (!parsed) continue;

const contentHash = createHash('sha256').update(source).digest('hex');
```
(`repo-intelligence/packages/core/src/indexer.ts:123-126`)

- `pool.parse` turns the text into a **syntax tree** (explained below). If the file has a syntax
  error, tree-sitter still returns most of a tree, and the code keeps it
  (`repo-intelligence/packages/core/src/graph/parse.ts:54-58`).
- The SHA-256 hash is a fingerprint of the file content. It is stored so that, at answer time,
  the validator can tell if the file changed since indexing.

**2. Pull out symbols and raw facts.** From each tree it extracts symbols (functions, classes,
methods), imports, call sites, routes and ORM models (`indexer.ts:140-155`). For our fixture
that gives symbols like `requireAuth`, `verifyToken`, `JWT_SECRET`, and a route draft for
`GET /me` with `requireAuth` as middleware.

**3. Chunk.** Still in the same loop, the file is cut into chunks, one per symbol
(`indexer.ts:159-166`). `requireAuth` (lines 4-19) becomes one chunk. The tree is then freed
(`indexer.ts:168`) so memory does not grow with repo size.

**4. Pass 2: connect across files.** Only now, with every file's exports known, does it build
edges: imports (`indexer.ts:181-187`), calls (`:189-203`), routes (`:205-213`), and
"containment" edges from a file to its symbols and from a class to its methods (`:247-262`).
`requireAuth → verifyToken` becomes a `calls` edge with confidence 0.9, because `verifyToken`
was resolved through a real import (`repo-intelligence/packages/core/src/graph/edges.ts:24-35`).

**5. Build BM25 and write to disk.** Each chunk's *search text* goes into the BM25 index
(`indexer.ts:271-277`). The search text is the chunk plus a header with the path and signature:

```ts
export function chunkSearchText(chunk: Chunk, symbol: CodeSymbol | undefined): string {
  const header = [chunk.path, symbol?.signature ?? symbol?.name].filter(Boolean).join('\n');
  return `${header}\n${chunk.content}`;
}
```
(`repo-intelligence/packages/core/src/chunk/symbol-chunker.ts:130-133`)

That is why "authentication" can find `verifyToken`: its body says `jwt` but its path says
`src/auth/token.ts`. The index is written **before** embedding (`indexer.ts:311-330`), so a
lexical-only index is usable in seconds. Embedding runs after, if an embedder was passed
(`indexer.ts:336-338`), in slices of 128 with a checkpoint file
(`repo-intelligence/packages/core/src/embed-index.ts:18,70-80`).

### Query time

**6. Seed.** `retrieve()` runs BM25 and (if vectors exist and match the model) cosine search,
24 hits each, then fuses them:

```ts
const fused = reciprocalRankFusion({
  lexical: { ids: lexicalIds },
  semantic: { ids: vectorIds },
});
```
(`repo-intelligence/packages/core/src/retrieve/retrieve.ts:213-216`)

Hits are chunks. Several chunks can belong to one symbol, so they are collapsed to at most 12
**seed symbols** (`retrieve.ts:219-231`). The model check at `retrieve.ts:194-197` stops you
comparing vectors from two different models, which would give confident nonsense.

**7. Expand.** `traverse()` walks from the seeds along edges in **both** directions, up to 2 hops
(`retrieve.ts:250-262`). Each hop multiplies the path score by the edge's confidence:

```ts
const score = current.score * step.edge.confidence;
if (score < minScore) continue;
...
const existing = best.get(step.target);
if (existing && existing.score >= score) continue;
```
(`repo-intelligence/packages/core/src/graph/traverse.ts:137-146`)

Plain English: a chain of strong edges survives, a chain of weak guesses fades out below 0.01,
and if two paths reach the same symbol, the stronger one wins. From `requireAuth` the walk
reaches `verifyToken` (forward, a `calls` edge) and the `GET /me` handler (backward, because the
route depends on the middleware).

**8. Rank.** Every candidate gets a score (`retrieve.ts:297-396`):
- seeds get their RRF score × 10 (`:306`), because RRF numbers are tiny;
- centrality inside this result set adds up to 0.3 (`:314-316`);
- route handlers/middleware +0.25, models +0.2, module symbols −0.3 (`:146-153`, `:368-376`);
- reading `process.env` adds 0.15, because config matters and nothing "calls" an env var (`:381-384`);
- reached only by a name reference: −0.5 (`:345-348`); reached by walking an edge backwards:
  −0.4 (`:355-358`); widely imported utility (like a `Button`): up to −0.6 (`:360-366`);
- finally the whole score × 0.5 per hop (`:386`).

So `requireAuth` (seed, middleware) and `verifyToken` (one hop forward) rank high. The guarded
handler is still there, just lower: it *uses* auth, it is not *part of* auth.

**9. Build the prompt.** `buildContextPacket` writes sections in priority order: coverage note,
repository, routes (with their guards), tables, then code. It cuts from the bottom when the
60,000-character budget runs out (`repo-intelligence/packages/core/src/answer/prompt.ts:59,187-196`).
Every code line is prefixed with its real line number:

```ts
function numberLines(text: string, startLine: number): string {
  return text
    .split('\n')
    .map((line, offset) => `${startLine + offset}| ${line}`)
    .join('\n');
}
```
(`prompt.ts:52-57`). The comment above it records why: without numbers the model counted lines
itself, drifted, and 11 of 18 claims were dropped (`prompt.ts:38-47`). If the `Code` section got
cut, `synthesize` refuses to call the model at all (`synthesize.ts:109-114`).

**10. Call the LLM.** `synthesize` tries each provider in order (`synthesize.ts:135-202`). The
client sends `temperature: 0` and asks for a JSON object (`providers.ts:93-105`), with a 90-second
timeout (`providers.ts:18,82-83`). The reply is parsed tolerantly (fences, prose, reasoning traces
removed, `repo-intelligence/packages/core/src/answer/json.ts:91`), then coerced into shape by
`normalise` (`synthesize.ts:238-270`).

**11. Validate citations.** This is the product. For each citation, `checkCitation` runs in order
(`validate.ts:339-450`):

| Check | Fails as | Line |
|---|---|---|
| Path is not an indexed file | `unknown-file` | `validate.ts:348-355` |
| Lines are not integers, or start < 1, or end < start | `invalid-range` | `:357-369` |
| File cannot be read now | `unreadable-file` | `:371-379` |
| End line is past the end of the file | `out-of-bounds` | `:381-388` |
| More than 150 lines | `span-too-broad` | `:390-397` |
| The named `symbol` is not in the span and does not enclose it | `symbol-not-present` | `:402-414` |
| The claim names code identifiers and none are in the span | `claim-terms-absent` | `:425-440` |

A claim with no citation is dropped too (`:289-292`). If more than 30% of claims are dropped,
`refused` is true and no claims are served (`:318-322`). A changed file (hash mismatch) is
**not** a drop: it is added to `staleFiles` as a warning (`:268-270`). If one provider's answer is
refused, `synthesize` tries the next and keeps the best refused one as a fallback
(`synthesize.ts:175-182,206-223`).

**12. Render.** The server returns symbols, routes, models, two Mermaid diagrams built from edges
(`server.ts:381-384`), and the validated answer (`server.ts:396-418`). If the LLM step fails, you
still get the retrieval results with a `synthesisError` (`server.ts:419-427`). In the browser,
clicking a citation calls `/api/source` and shows the file with the cited lines highlighted
(`repo-intelligence/apps/cli/src/ui.ts:1050-1071`).

---

## Concepts used here, explained from zero

### Syntax tree (AST) and tree-sitter
**From zero:** code is text. A parser turns it into a tree: "this is a function declaration, its
name is `requireAuth`, its body runs from line 4 to 19". An AST (abstract syntax tree) is that
tree. **tree-sitter** is a fast parser library that works for many languages and tolerates
broken code. **Why here:** you need exact symbol names and line ranges, or citations cannot be
checked. Regex cannot find where a function ends. **How:** WASM grammars for `.ts/.tsx/.js`
(`repo-intelligence/packages/core/src/lang/typescript/index.ts:13-24`), one parser per grammar
reused across files (`graph/parse.ts:29-68`), and a list of node types that create symbols
(`lang/typescript/index.ts:35-47`).

### Code graph and graph traversal
**From zero:** a graph is dots (nodes) and arrows (edges). Here nodes are symbols, and edges are
"imports", "calls", "contains", "handles" and others. Traversal means starting at some nodes and
following arrows. **BFS** (breadth-first search) visits everything 1 hop away, then 2 hops, and
so on. **Why here:** the project's bet is that a concern is connected by edges, not by shared
words. **How:** `GraphIndex` keeps outgoing and incoming edges per symbol
(`graph/traverse.ts:4-41`); `traverse` is BFS with confidence decay (`traverse.ts:91-166`). Each
edge's confidence comes from how it was resolved: same scope 1.0, resolved import 0.9, down to
0.2 for an ambiguous name, and an ambiguous name matching 3 symbols gets 3 edges at one third
each (`graph/edges.ts:24-35,67-71`).

### Chunking, and why on symbol boundaries
**From zero:** an LLM and an embedding model can only take so much text, so you cut documents into
**chunks**. The usual way is fixed windows ("every 500 tokens, 50 overlap"). **Why not here:** a
fixed window cuts functions in half, and then a chunk no longer maps to one symbol, so a graph
edge cannot lead to it (`chunk/symbol-chunker.ts:28-42`). **How:** one chunk per non-module
symbol; skip anything under 24 characters; split only above ~900 tokens, with 4 lines of
overlap, and every part keeps its symbol id (`symbol-chunker.ts:24-26,57-95`). Tokens are
estimated as characters ÷ 3.6, measured on code, to avoid shipping a tokenizer (`:11-13`).

### Embeddings and cosine similarity
**From zero:** an embedding model turns text into a list of numbers (a vector), here 768 of them
for Jina's model. Texts with similar meaning land close together. **Cosine similarity** measures
the angle between two vectors: 1 means same direction, 0 means unrelated. Formula:
`dot(a,b) / (|a| × |b|)`. If both vectors are already length 1 ("normalised"), it is just the dot
product. **Why here:** BM25 needs the same words; embeddings can match "session" to code about
cookies. **How:** `cosineSimilarity` (`embed/embedder.ts:42-56`); the model runs locally with
mean pooling and normalisation (`embed/local.ts:229`); texts are sorted by length before
batching so short chunks are not padded to the longest one, measured 3.1× faster
(`local.ts:206-221`). The model is loaded lazily with a dynamic `import()` so commands that never
embed do not pay for it (`local.ts:261-284`).

### BM25 (keyword ranking)
**From zero:** BM25 scores a document for a query by adding up, for each query word:

`score = IDF × tf × (k1 + 1) / (tf + k1 × (1 − b + b × docLength / avgLength))`

The intuition, piece by piece:
- **IDF** (inverse document frequency): rare words count more. `auth` in 5 of 1,000 chunks is
  strong evidence; `user` in 600 is weak.
- **tf** (term frequency): more mentions help, but with **diminishing returns**. `k1 = 1.2`
  controls how fast it saturates. The 10th mention adds little.
- **Length normalisation:** a long chunk mentions everything a bit. `b = 0.75` controls how much
  you discount long chunks.

**How here:** `K1`, `B` at `index/bm25.ts:10-11`, the formula at `:265-272`. Two code-specific
additions: identifiers are split on camelCase/snake_case and both whole and parts are kept, so
"verify token" matches `verifyToken` (`:124-146`); and prefix matching is **additive** at half
weight, so "authentication" also matches `auth` (`:229-251`). Making it additive fixed a bug
where core recall on one repo was 0 (`:236-241`). Code keywords and question words like
`explain` are stopwords (`:19-104`). One detail to know: the comment at `bm25.ts:263-264` says
IDF can go negative, but the formula uses `log(1 + …)`, which is always positive. Harmless, but
if someone reads the code with you, know it.

### Reciprocal Rank Fusion (RRF)
**From zero:** you have two ranked lists and want one. Their raw scores are not comparable (BM25
might be 14.2, cosine 0.81). RRF ignores the scores and uses only positions:
`score(doc) = Σ 1 / (K + rank)`, with K = 60 and rank starting at 1.

**Worked example.** Lexical list: `[A, B, C]`. Semantic list: `[B, D, A]`.
- A: 1/61 + 1/63 = 0.01639 + 0.01587 = **0.03227**
- B: 1/62 + 1/61 = 0.01613 + 0.01639 = **0.03252**
- D: 1/62 = **0.01613**
- C: 1/63 = **0.01587**

Final order: **B, A, D, C**. B wins because both retrievers liked it. D (2nd in one list) beats
C (3rd in one list). **How here:** `contribution = weight / (K + rank + 1)` where the code's
`rank` starts at 0 (`retrieve/fuse.ts:41`); ties break by id so results are deterministic
(`fuse.ts:54`). More in [05-rag-and-vector-databases.md](../05-rag-and-vector-databases.md).

### Re-ranking (what this project does, and does not do)
**From zero:** first-stage search is fast and rough. A **re-ranker** reorders the top results
with something smarter. Usually that is a **cross-encoder**: a model that reads the question and
one candidate together and outputs a relevance score. **Here:** the re-rank is hand-written
rules over graph facts (`retrieve.ts:297-398`), each one measured on the eval set. That is a
real re-rank stage, but it is not a learned model. Say "rule-based re-ranking", never
"cross-encoder".

### Citation validation
**From zero:** an LLM can write `src/auth/session.ts:40` for a file that does not exist. That
looks verified and is worse than no answer. Validation means checking every citation against the
real file *after* generation. **How here:** the 7 checks in the table above. The two clever ones:
`symbol-not-present` accepts a name that *encloses* the span, because the name of a function sits
on its first line, not inside lines 8-11 (`validate.ts:247-254`); `claim-terms-absent` only trusts
code-shaped words (camelCase, PascalCase with 2+ words, snake_case, SCREAMING_SNAKE) of 5+ letters
(`validate.ts:87-88,166`), and needs just one to appear. After passing, a citation can be
**narrowed** to the lines that hold the evidence, which is a display fix, never a verdict
(`validate.ts:120-162,307-309`).

### Eval metrics
**From zero:** you need numbers that tell you if a change helped. For a ranked list of files
against hand-labelled correct files, using the top **k = 10** (`eval/src/run.ts:47`):
- **Precision:** of what you returned, the share that was right.
- **Recall:** of the right files, the share you returned. "Recall@10" means recall in the top 10.
- **F1:** `2PR / (P + R)`, one number that punishes being bad at either.
- **coreRecall:** recall over files labelled `core` only. Missing the middleware is a failure.
- **MRR** (mean reciprocal rank): for each question, 1 / (position of the first right file), then
  averaged. First hit at rank 1 → 1.0, at rank 4 → 0.25.
- **distractorsReturned:** how many labelled "looks relevant but isn't" files leaked in.

**How here:** `score()` at `repo-intelligence/packages/eval/src/metrics.ts:30-58` (MRR at `:50`).
Labels are zod-validated, require a `why`, and have a `core`/`supporting` tier
(`repo-intelligence/packages/eval/src/case.ts:16-34`). Three **arms**: `grep` (the control),
`seeds` (same search, `maxDepth: 0`, no graph walk), `graph` (full pipeline)
(`run.ts:14,61-92`). That middle arm is an **ablation**: switch off one part and measure what it
was worth. More in [10-observability-and-evals.md](../10-observability-and-evals.md).

### Test doubles: FakeEmbedder and stubProvider
**From zero:** a test double is a fake object that stands in for a slow, paid or random
dependency. **Why here:** CI cannot download a 500 MB model or call a paid LLM, and real
embeddings are not stable enough for exact assertions. **How:** `FakeEmbedder` counts 8 fixed
words (`auth`, `token`, `user`...) per text and normalises the counts into a vector
(`embed/embedder.ts:65-115`). Its `name` includes its vocabulary, so a test can check that
vectors from a different model are ignored (`retrieve/retrieve.test.ts:94-97`). On the LLM side,
`stubProvider` returns canned JSON or throws on purpose (`answer/synthesize.test.ts:30-40`), so
fall-through, refusal and JSON repair are all tested offline. CI says so in a comment
(`.github/workflows/ci.yml:33-35`). See [09-testing-pytest-jest-rtl.md](../09-testing-pytest-jest-rtl.md).

---

## Why it was built this way

- **No LLM at index time.** Indexing is pure parsing, so it is cheap to re-run for evals
  (`indexer.ts:81-82`). The only paid-shaped step is synthesis.
- **Local embeddings.** Free, offline, deterministic, so re-indexing many times for evals costs
  nothing. q8 instead of fp32 because fp32 was 1.85 s per chunk (`local.ts:20-24`).
- **Vectors are optional.** `embed()` returns `null` instead of throwing, and retrieval falls back
  to BM25 + graph (`embed/embedder.ts:4-11`).
- **Confidence-scored edges instead of missing edges.** TypeScript cannot be resolved perfectly
  (barrels, DI, decorators), so it keeps uncertain edges at low confidence and lets ranking decide
  (`graph/edges.ts:15-23`).
- **Fuse by rank, not score.** BM25 and cosine have no common scale (`retrieve/fuse.ts:1-9`).
- **Penalties, not filters.** Backward edges are 24% relevant against 48% forward, so they are
  charged 0.4, not deleted, because some do belong (`retrieve.ts:110-143`). Depth decay 0.5 was
  chosen in the middle of a flat range (0.35-0.55 all scored the same) to avoid overfitting
  (`retrieve.ts:90-93`).
- **Diagrams from edges, never from the model** (`repo-intelligence/packages/core/src/render/mermaid.ts:6-11`).
- **One OpenAI-compatible client for all providers.** No Anthropic key, so free tiers; the
  decision is recorded in `repo-intelligence/docs/decisions/0002-synthesis-provider.md`. When
  `AI_ROUTER_URL` is set, the router is used alone (`providers.ts:180-181`).
- **JSON on disk, one file per entity,** shaped like future Postgres tables
  (`repo-intelligence/packages/core/src/index/json-store.ts:14-20`). Cheapest thing that let the
  experiment run.

### The negative result (lead with this, calmly)

The bet was: concern questions *need* a code graph. Current numbers, 13 labelled questions, code
and docs indexed (`repo-intelligence/docs/HANDOFF.md:19-33`):

| arm | F1 lexical | F1 + vectors | held-out F1 lexical | held-out F1 + vectors |
|---|---|---|---|---|
| `grep` | 0.274 | 0.274 | 0.416 | 0.416 |
| `seeds` (no graph walk) | **0.393** | 0.341 | 0.464 | 0.513 |
| `graph` | 0.351 | **0.377** | **0.533** | **0.666** |

The verdict in HANDOFF: **search and ranking do most of the work**; the graph adds "a real but
unstable increment", positive in 3 of 4 measurements, and the original "needs a graph" claim is
not supported (`HANDOFF.md:45-60`). Two cautions for you: the held-out set is only 2 questions
(`eval/holdout/smart-trading-v2.json`), and the eval suites hold 11 questions across 3 repos plus
those 2, so small differences are noise. The ablation itself was wrong twice and fixed
(`eval/src/run.ts:74-87`). Saying that is a strength.

---

## What's missing / what you must not claim

| Don't say | The truth | Say instead |
|---|---|---|
| "I used a vector database" | Vectors are `number[][]` in `embeddings.json` (`json-store.ts:37,49`), searched by a full scan (`retrieve.ts:201-209`) | "Brute-force cosine over a JSON store; the store interface was shaped for pgvector, which I didn't build" |
| "Cross-encoder reranker" | Rule-based re-rank only | "A measured rule-based re-rank; a cross-encoder is the next thing I'd add" |
| "Built in React/Next.js" | Vanilla JS page in a string (`ui.ts:1-19`), served by `node:http` (`server.ts:3,629`) | "A dependency-free local UI; my React work is elsewhere" |
| "Jest / RTL tests" | Vitest, backend only, no UI tests | "405 Vitest tests on the pipeline" |
| "Evals run in CI" | CI runs lint, typecheck, build, test only (`ci.yml:25-35`) | "Eval is a manual gate by project rule" |
| "Uses Claude / Anthropic" | No Anthropic client exists; `provider.ts:4-5` still mentions it as preferred | "Free-tier OpenAI-compatible providers with fall-through" |
| "Python / FastAPI / LangChain / LangGraph / MCP" | None in this repo | Use the translation section below |
| "Production, scales to big monorepos" | Single user, home machine behind nginx basic auth over SSH tunnel (`docs/deployment.md:1-13`); whole index loaded in memory per query (`server.ts:341`) | "Research-grade, deployed privately" |
| "Multi-language" | TS/JS (+ Prisma schemas, Markdown docs) only (`HANDOFF.md:102`) | "Language layer is a pluggable pack" (`lang/language-pack.ts`) |
| "Proved graphs beat search" | Not supported | The negative-result paragraph |

---

## Translate it to the JD stack

"I built this in TypeScript. In your stack it would look like this." A sketch, not code from the
repo:

```python
# FastAPI + Qdrant (or pgvector) + BM25 + RRF + cross-encoder + LangGraph
from fastapi import FastAPI
from pydantic import BaseModel
from langgraph.graph import StateGraph, START, END
from sentence_transformers import CrossEncoder
from typing import TypedDict

reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

class State(TypedDict, total=False):
    question: str
    candidates: list[dict]   # {id, path, start, end, text}
    answer: dict             # {summary, claims:[{text, citations:[...]}]}
    report: dict

def rrf(*lists: list[str], k: int = 60) -> list[str]:
    scores: dict[str, float] = {}
    for ids in lists:
        for rank, doc_id in enumerate(ids, start=1):
            scores[doc_id] = scores.get(doc_id, 0.0) + 1 / (k + rank)
    return sorted(scores, key=scores.get, reverse=True)

def retrieve(s: State) -> State:
    lexical = bm25_search(s["question"], 24)          # e.g. Postgres tsvector, or rank_bm25
    semantic = vector_search(s["question"], 24)       # Qdrant query / pgvector ORDER BY <=>
    seeds = rrf(lexical, semantic)[:12]
    expanded = expand_graph(seeds, max_depth=2)       # same BFS + confidence decay, edges in SQL
    return {"candidates": expanded}

def rerank(s: State) -> State:
    pairs = [(s["question"], c["text"]) for c in s["candidates"]]
    scores = reranker.predict(pairs)                  # cross-encoder: reads both together
    ranked = [c for _, c in sorted(zip(scores, s["candidates"]), key=lambda t: -t[0])]
    return {"candidates": ranked[:20]}

def generate(s: State) -> State:
    return {"answer": llm_structured(s["question"], numbered_spans(s["candidates"]))}

def validate(s: State) -> State:
    return {"report": validate_claims(s["answer"], max_dropped=0.3, max_span=150)}

g = StateGraph(State)
for name, fn in [("retrieve", retrieve), ("rerank", rerank),
                 ("generate", generate), ("validate", validate)]:
    g.add_node(name, fn)
g.add_edge(START, "retrieve"); g.add_edge("retrieve", "rerank")
g.add_edge("rerank", "generate"); g.add_edge("generate", "validate")
g.add_edge("validate", END)
pipeline = g.compile()

app = FastAPI()
class Ask(BaseModel):
    question: str

@app.post("/api/ask")
async def ask(body: Ask):
    return (await pipeline.ainvoke({"question": body.question}))["report"]
```

What maps one-to-one: `Bm25Index` → Postgres full-text or `rank_bm25`; `embeddings.json` →
a Qdrant collection or a pgvector column with an HNSW index; `edges.json` → an `edges` table
(src, dst, kind, confidence) queried per hop; `discoverProviders` fall-through → a LangChain
model with `.with_fallbacks([...])` or a conditional edge in LangGraph; `validate.ts` → a plain
Python function, because it is just file reads and string checks. A conditional edge from
`validate` back to `generate` when `refused` is true would replace the provider fall-through
loop in `synthesize.ts:135-202`. Tests: `FakeEmbedder` → a pytest fixture; `stubProvider` → a
fake chat model. The React side is in [03-react-nextjs-typescript-for-ai-ui.md](../03-react-nextjs-typescript-for-ai-ui.md).

---

## Say it in an interview

**60-second pitch.**
> "Onboarding onto a codebase, the real questions are about concerns: 'how does authentication
> work here'. Grep finds the file named `auth`; chat-over-repo gives fluent answers you can't
> check. I built a tool that parses a TypeScript repo with tree-sitter into a code graph, chunks
> on symbol boundaries, and retrieves with hybrid search: BM25 plus local code embeddings, fused
> with reciprocal rank fusion, then expanded two hops along confidence-scored edges and re-ranked
> with measured rules. The LLM must cite `path:line` for every claim, and a validator re-reads
> every cited file and drops any claim that doesn't hold; above 30% dropped it refuses the
> answer. I tested my own thesis with a labelled eval set and a three-arm ablation against a fair
> grep baseline. Search and ranking did most of the work; the graph adds a smaller, unstable gain.
> I report that, because I measured it."

**Q1. Walk me through what happens when I ask a question.**
BM25 and cosine each give 24 chunk hits; RRF fuses them; chunks collapse to 12 seed symbols;
BFS walks 2 hops with confidence decay; rules re-rank; top symbols go into a numbered-line
prompt; JSON answer; validator. (`retrieve.ts:178-398`, `synthesize.ts:84-228`)

**Q2. Why RRF and not a weighted sum?**
No common scale between BM25 and cosine. RRF uses rank only, and a doc both retrievers like
beats one that tops just one list. K=60 is the standard value; I didn't tune it. (`fuse.ts:1-12`)

**Q3. How do you stop hallucinated citations?**
Line-numbered spans in the prompt so the model doesn't count, then 7 checks per citation
against the file on disk, then a 30% refusal rule. Give the `findOne` story: a citation that was
in bounds but pointed at the wrong file, which is why `claim-terms-absent` exists
(`validate.ts:416-424`).

**Q4. Why not a vector DB?**
It was an experiment gate. The store was the part least likely to answer "does the graph help",
so it got JSON files shaped like future tables. Full-scan cosine is fine at this size. At scale:
pgvector or Qdrant with HNSW, incremental re-index by content hash (hashes already exist).

**Q5. Do you re-rank?**
Yes, rule-based: role bonuses, hub, reference and consumer penalties, depth decay, each with an
eval delta in the code comments. No cross-encoder; that's the next step I'd measure.

**Q6. How do you evaluate?**
Hand-labelled files per question with core/supporting tiers and distractors; P/R/F1, coreRecall,
MRR at k=10; three arms so the graph's contribution is isolated; results split by who labelled.
Not in CI yet.

**Q7. What happens when the LLM provider is down?**
Providers are tried in order with a 90s timeout each. A JSON parse failure or a refused answer
also falls through; the best refused answer is kept in case all later providers fail. If
synthesis fails completely, the UI still shows retrieval. (`synthesize.ts:164-223`, `server.ts:419-427`)

**Q8. How did you test it without paying for models?**
`FakeEmbedder` (deterministic word counts) and `stubProvider` (canned JSON), 405 Vitest tests,
CI needs no keys and no model download.

---

## Make it yours — exercises

1. **Add a "stale" policy.** Start in `packages/core/src/answer/validate.ts:268-270`. Add an
   option `dropStale` that turns a hash mismatch into a `stale-file` failure (the type already
   exists at `:11`). Done = a new test in `validate.test.ts` next to the one at `:213`, passing
   with the option on and off.
2. **Make RRF's K configurable and measure it.** Start in `packages/core/src/retrieve/fuse.ts:12`.
   Pass `k` through `RetrievalOptions`. Done = a `fuse.test.ts` case with a hand-computed answer
   (use the worked example above) and an `ri eval` run at K = 10, 60, 120 written down.
3. **Add a cross-encoder re-rank behind an interface.** Start in `retrieve.ts:398`. Define a
   `Reranker` interface like `Embedder`, with a fake for tests. Done = the fake reorders results in
   a test, and the eval shows before/after for `graph` with the reranker on.
4. **Put the eval in CI as a smoke check.** Start in `.github/workflows/ci.yml` and
   `packages/eval/src/run.ts`. Run one suite lexical-only (no model) against the fixture and fail
   if F1 drops below a stored value. Done = a red CI run when you break the tokenizer on purpose.
5. **Port `score()` to Python.** Rewrite `packages/eval/src/metrics.ts:30-58` as a pytest-tested
   function. Done = the same numbers as the TS version on one suite's ranked output.

---

## Corrections to genai/13 (checked against the code on 2026-10-26)

- **README is fixed.** genai/13 says it reads "Planning — no implementation yet"; it now says
  "Status: working" (`README.md:7`).
- **Numbers moved.** genai/13 quotes 11 questions, 3 repos, `seeds` 0.537 / `graph` 0.534. HANDOFF
  (2026-08-26) re-measured with documentation indexed: see the table above. Old and new numbers
  are not comparable (`HANDOFF.md:35-38`).
- **Test count.** genai/13 says 345 tests; today it is 405 tests in 37 files.
- **Stale files don't drop claims.** genai/13 lists `stale-file` among eight drop reasons; the code
  declares it but never returns it, so a changed file only produces a warning
  (`validate.ts:11,268-270`; `apps/cli/src/index.ts:628-631`).
- **validate.ts is 457 lines**, not 408. Docs (Markdown) and AI-ROUTER support are new since then
  (`indexer.ts:226-233`, `answer/router.ts`).
- **It is deployed**, privately: Docker + nginx basic auth, reachable over an SSH tunnel
  (`docs/deployment.md`). Still not public, still one user.
