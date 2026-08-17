# 13 — Deep-dive: repo-intelligence

> Your strongest GenAI asset, and it is invisible. Not on shivamgupta.live, not in your resume,
> not in [08-project-grilling.md](../interview-qa/08-project-grilling.md). Its own README still
> says *"Status: Planning — no implementation yet"* while `packages/core/src` carries a complete
> ingest → graph → chunk → index → retrieve → answer → validate pipeline.
>
> **Why this file exists on its own:** almost every candidate claiming GenAI experience has wired
> up a RAG tutorial. Very few have built a labelled eval set, run a controlled ablation against a
> fair baseline, and reported a result that went **against their own hypothesis**. That is the
> rarest thing on your resume and it is the thing you are not saying.
>
> All numbers below tagged `[verify]` — re-read `docs/HANDOFF.md` before an interview, they move.

---

## Part 1 — What the system actually is

### The one-sentence version

> Point it at a repository, ask *"explain authentication"* in natural language, and get back the
> files genuinely involved — the request flow, the tables, the config — with **every claim
> carrying a `path:line` citation that resolves**.

### The bet, stated so it can be disproved

Concern-level questions need a **real code graph** — tree-sitter → symbols → import edges → call
edges → routes → ORM models — because a concern is connected by **edges, not by textual
similarity**. The file that answers "explain authentication" often never contains the word.

Phase 1 was an explicit **stop-or-continue gate** on whether that beats naive grep.

**The bet is not yet proven.** Say that sentence out loud until it feels comfortable, because it
is the single best thing about this project in an interview and instinct will tell you to hide it.

### The pipeline

```
ingest/    clone, walk (respects .gitignore, collects tsconfigs + .prisma schemas)
lang/      typescript/{queries,routes,orm}, prisma/{schema,index-schemas}
graph/     parse → symbols → imports → calls → resolve-calls → traverse → routes → models
chunk/     symbol-chunker
embed/     embedder (interface + FakeEmbedder), local (transformers.js, optional dep)
index/     json-store, bm25
retrieve/  retrieve (seed → expand → rank), fuse (RRF), baseline (the grep control)
answer/    prompt, synthesize, providers, validate     ← validate.ts is the product
render/    mermaid (drawn from resolved edges, never by the model)
```

Plus `packages/eval/src/` (case labels + zod, metrics, run) and `eval/suites/*.json` —
hand-labelled ground truth. `apps/cli` is the `ri` binary.

### The six non-negotiables

From `CLAUDE.md`. Each exists because breaking it cost real debugging time — which is exactly the
framing that makes them interview-worthy rather than platitudes.

1. **No ranking or retrieval change lands without an `ri eval` delta, before and after.** Phase 1
   tuned by eye against three repositories and every change traded one against another — a hub
   penalty that cleaned up a Next.js app simultaneously dropped the most central auth file in a
   Nest app.
2. **Report negative results as findings.** Several of the best commits are "hypothesis formed,
   tested, rejected".
3. **A fabricated citation is worse than no answer**, because it looks verified.
4. **Confidence-scored edges beat missing edges.** Resolve what is provable, score the rest, let
   ranking decide what surfaces. Every edge stores the line it was inferred from.
5. **Chunk on symbol boundaries, never fixed windows.**
6. **The baseline must be fair.** `grepBaseline` gets the same abbreviation bridging the real
   retriever gets. A handicapped baseline is a strawman and beating it proves nothing.

---

### DD1 — Symbol-boundary chunking

`packages/core/src/chunk/symbol-chunker.ts`

Fixed-window chunking is the obvious alternative and it is **actively wrong here**: it splits
functions in half and destroys the symbol→chunk mapping that graph expansion depends on. Once a
chunk cannot be traced back to a symbol, an edge cannot lead to it, and the whole point of
building the graph is lost.

| Parameter | Value | Why |
|---|---|---|
| `DEFAULT_MAX_TOKENS` | 900 | Split a symbol only once it exceeds this |
| `DEFAULT_OVERLAP_LINES` | 4 | Overlap between parts of a split symbol |
| `DEFAULT_MIN_CHARS` | 24 | A one-line re-export carries no retrievable meaning |
| `estimateTokens` | `len / 3.6` | Measured on **source code**, not prose. Real tokenisation would mean shipping a tokeniser and paying for it on every chunk at index time, to feed a budget that is itself a heuristic |

Three decisions worth volunteering:

- **Module symbols are excluded.** They span whole files, so chunking them would duplicate every
  other chunk in the file and swamp retrieval with near-identical matches.
- **Methods are chunked *in addition to* their enclosing class**, which does duplicate text. The
  right trade: a class can be many times the chunk budget, and a question about `login` should
  retrieve `login`, not the whole service it happens to live in.
- **Oversized symbols split with overlap, and every part keeps its parent symbol reference** — so
  graph expansion can still reach it.

**The embedded text is not the chunk text** (`chunkSearchText`). It is prefixed with the path and
signature, because a function body frequently contains none of the words a natural-language
question would use:

> `verifyToken`'s body mentions `jwt` and `secret` but never "authentication". The path
> `src/auth/token.ts` does the work instead.

That line is the whole argument for metadata-enriched chunks in one example. Use it.

---

### DD2 — Local embeddings, and why

`packages/core/src/embed/local.ts`

| Choice | Value | Reasoning as written in the code |
|---|---|---|
| Model | `jinaai/jina-embeddings-v2-base-code` (768-dim) | **Code-specialised.** General-purpose text embeddings score identifiers and prose alike — exactly the failure this project exists to beat |
| Fallback | `Xenova/all-MiniLM-L6-v2` | Far smaller general-purpose model for constrained environments |
| Quantization | `q8` by default | fp32 is transformers.js's Node default and too slow to live with — **1.85 s/chunk, 11 minutes for a 60-file repo**. Whether q8 costs retrieval quality is a question the eval harness can answer, so it is **measured rather than assumed** |
| Batch size | **8** | Measured on 96 real chunks (mean 579 chars): batch 8 → 1192 ms/chunk, batch 16 → 1583 ms, batch 32 → **OOM-killed at 8 GB heap**. Larger batches lose because every sequence is padded to the longest in the batch, so one long chunk is charged to all its neighbours |
| Threads | `availableParallelism() / 4` | Left unset, ONNX takes the physical core count and the machine becomes unusable for hours. A run that finishes later but lets you keep working is worth more |

**Why local at all:** Phase 2 re-runs indexing hundreds of times against the eval set. A per-call
cost there would make *the measurement that justifies the whole project* expensive to take. Local
is free, key-less and deterministic.

That is a genuinely good answer to "why not just use an embeddings API" — it is a **methodology**
argument, not a cost-cutting one.

Also note the dependency decision: `@huggingface/transformers` pulls `onnxruntime-node`, which
unpacks ~513 MB of native CUDA/TensorRT providers the project never uses. So it is **documented
rather than declared** and loaded by a non-literal specifier at runtime — because pnpm
auto-installs peers, even optional ones.

---

### DD3 — Retrieval: seed → expand → rank

`packages/core/src/retrieve/retrieve.ts` · `fuse.ts`

Three stages, **and the middle one is the thesis**: find candidate entry points by search, then
expand along real graph edges, then rank the union. Search alone returns the file with `auth` in
its name; expansion is what reaches the middleware chain, the session store and the config the
question is actually about.

**Fusion — `reciprocalRankFusion`, K = 60.** The justification is the one interviewers want:

> BM25 scores are unbounded and corpus-dependent; cosine similarity sits in [-1, 1]. Any attempt
> to add or weight the raw numbers is comparing quantities with **no common scale**. Fusing by
> *rank* is what makes combining them possible at all.

And the reason it works: a document appearing in both lists scores higher than one topping either
alone — **agreement between two independent retrievers is stronger evidence than excellence in
one.**

**The ranking constants, every one of them measured:**

| Constant | Value | What it encodes |
|---|---|---|
| `DEFAULT_SEED_LIMIT` | 12 | Search hits used as expansion entry points |
| `DEFAULT_MAX_DEPTH` | **2** | *A cost saving, not a quality one.* Depth 2 and 3 score identically (F1 0.536 either way) once `DEPTH_DECAY` applies. On `source-of-income`, **79% of expanded symbols were reachable from exactly the same five seeds** — by depth 3 the walk has effectively enumerated the connected component |
| `HUB_PENALTY` | 0.6 | Demotes a widely-imported symbol reached by expansion. Seeds are **exempt** — a genuine hub like `schema.ts` for a question about tables should still surface when the question matched it directly |
| `DEPTH_DECAY` | 0.5 | Applied to the *total* score, once per hop, so **reachability is unchanged** — a distant symbol still appears, it just has to be worth more to displace a near one. Anything from 0.35–0.55 measured identically, so it sits **mid-plateau rather than on a peak** — a spike would suggest the value was fitted to 11 questions rather than a real effect |
| `REFERENCE_PENALTY` | 0.5 | Sinks a name-reference-only path below a genuine `calls` neighbour without erasing it — the 7% that do belong stay reachable at larger `k` |
| `CONSUMER_PENALTY` | **0.4** | The one that moved the result. See below |

**`CONSUMER_PENALTY` is the best single story in the retrieval layer.** The graph had always
encoded direction and ranking had always discarded it. Measured over the symbols expansion
genuinely adds:

```
forward  (concern → symbol)   11/23  = 48%  belong
backward (symbol → concern)   20/82  = 24%  belong
```

Twice as likely either way, and the gap holds within every edge kind separately — `calls` 44% vs
24%, `imports` 67% vs 22%. **78% of everything expansion adds is backward**, which is why one
distinction accounts for so much of the noise.

It is a **penalty rather than a filter**, because backward edges answer real questions — "what
registers this middleware" is a backward question — and a quarter of them do belong.

And the sub-decision that shows real discipline: **inheritance down the path was implemented and
measured, and rejected.** It cleans the diagrams but costs retrieval — F1 0.534 → 0.515 with
vectors, both strata worse. The path-level flag survives as `RetrievedSymbol.viaConsumer`, where
the *diagram filter* uses it and *ranking* does not.

---

### DD4 — The citation validator (this is the product)

`packages/core/src/answer/validate.ts` — 408 lines, the largest file in `answer/`.

> An answer you have to fact-check yourself has **negative value** when you are new to a
> codebase — you cannot tell right from wrong yet — and a fabricated `path:line` is worse than no
> answer at all, **because it looks verified**.

So a citation that does not resolve is a **hard failure that removes its claim**, not a warning
printed beside it. Files are re-read from disk rather than trusted from the index: the index
records what the code said when it was built; the claim has to be true of what the code says now.

**Eight distinct failure modes**, each mapping to a different kind of fabrication or staleness:

| Failure | Catches |
|---|---|
| `unknown-file` | The most common fabrication — a plausible-looking path that was never in the repo |
| `unreadable-file` | File exists in the index, cannot be read now |
| `stale-file` | SHA-256 of the file on disk ≠ `contentHash` in the index → line numbers may point somewhere else entirely |
| `invalid-range` | Non-integer, negative, or inverted line range |
| `out-of-bounds` | Cited past the end of the file |
| `span-too-broad` | > **150 lines**. "A citation covering an entire file is not evidence; it is a gesture in the direction of evidence" |
| `symbol-not-present` | The claim names a symbol that does not appear in the cited span |
| `claim-terms-absent` | The claim names code-shaped identifiers, none of which appear in the span |

**`claim-terms-absent` is the subtle one, and it came from a real failure:**

> A real answer cited `findOne` for a claim about the `Trade` model's fields. The lines exist,
> they mention `stock` and `signal`, and the fields it named live in `schema.prisma`. **Verified,
> and pointing at the wrong file.**

The identifier regex only trusts shapes that occur in code — camelCase, multi-word PascalCase,
snake_case — with a ≥5-character minimum. Single capitalised words are **deliberately excluded**:
a claim about "the Trade record" should not be checked against the word `Trade`, which appears in
prose and as `trade` in code alike, and matching case-insensitively would defeat the purpose.

It requires **one** identifier to match, not all — a claim legitimately spans several files, and
each citation carries its own part of it.

**The refusal threshold — `maxDroppedFraction = 0.3`:**

> An answer half of whose claims failed verification is not a partial answer — it is **evidence
> the model was guessing**, and the remaining half is no more trustworthy.

Above 30% dropped, `claims` returns `[]` and the whole answer is refused with a reason string.

**Narrowing** is a separate, softer mechanism: having located the evidence in order to check it,
point at it. It anchors on the **rarest** terms, not all of them —

> Taking min-to-max over every match spreads the window back to the whole span the moment one
> common word appears throughout. "positive" occurs on a dozen lines of a design document and
> locates nothing. A figure like `0.921` occurs once and locates exactly the sentence the claim
> rests on.

— and it only fires when it removes real reading (`after < before/2 && before - after >= 4`).
Crucially, **narrowing is a display improvement, never a verdict.**

---

### DD5 — Diagrams from resolved edges, never from the model

`render/mermaid`. The model does not draw the diagram; the resolved graph does. This is the same
principle as citation validation applied to a different output channel — anything the user will
trust as fact must come from something checkable, not from generation.

Cost: the diagram can only show what the graph resolved. That is the trade, and it is the right
one for a tool whose entire value proposition is "you can trust this without checking it".

---

### DD6 — The eval harness *(the money section)*

`packages/eval/src/{case,metrics,run}.ts` · `eval/suites/{resite,smart-trading,source-of-income}.json`

**11 hand-labelled questions** across three repositories, k=10, all three carrying vectors.
**345 tests** in the repo; `lint`, `typecheck`, `test`, `build` all green at HEAD. `[verify]`

**The metrics, and why each exists** (`packages/eval/src/metrics.ts`):

| Metric | Definition | Why it's there |
|---|---|---|
| `precision` | Of what was returned, how much belonged | — |
| `recall` | Of what belonged, how much was returned | — |
| `f1` | Harmonic mean | The headline |
| **`coreRecall`** | Recall restricted to files labelled `core` | **Missing one of these is a failure, not a shortfall.** Plain recall treats every relevant file as equal; some are load-bearing |
| **`mrr`** | Reciprocal rank of the first relevant file | Scoring is **ranked, not set-based**: "an answer that finds the right files at ranks 18–24 is not the same product as one that finds them at 1–7, even though a set-based score cannot tell them apart" |
| **`distractorsReturned`** | Count of labelled distractors returned | The explicit **noise** measure |
| `returned`, `relevantFound/Total`, `coreFound/Total` | Raw counts | "so a small denominator is **visible rather than hidden**" |

`meanMetrics` is **unweighted**, deliberately: "so a repository with many cases does not quietly
decide the verdict for all of them… a mean that changes meaning as data arrives is a trap."

**The three arms** — `grep` (the control) / `seeds` (BM25 + vectors + ranking, walking no edges) /
`graph` (seed → expand → rank):

| arm | F1 (lexical) | F1 (+vectors) | precision | recall | coreRecall | MRR | distractors |
|---|---|---|---|---|---|---|---|
| `grep` | 0.421 | 0.421 | 0.433 | 0.428 | 0.532 | 0.718 | 0.2 |
| `seeds` | 0.509 | **0.537** | 0.567 | 0.532 | 0.661 | 1.000 | 0.1 |
| `graph` | **0.547** | 0.534 | 0.591 | 0.510 | 0.638 | 1.000 | 0.3 |

`[verify — docs/HANDOFF.md, last updated 2026-08-11]`

**Fairness control:** both retrieval arms get the same seed budget. `seeds` fills its symbol
budget with search hits; `graph` seeds from 12 and fills the rest by walking. **Both return N
symbols, so they differ only in how the set was built.** Both earlier configurations were broken,
in opposite directions — and that was found and fixed rather than shipped.

---

### DD7 — The honest negative result

This is the part to lead with, and the part instinct will tell you to bury.

**What the numbers say:** what beats `grep` is **search and ranking, not the graph**. `seeds` —
BM25 + vectors + ranking rules, walking no edges at all — beats `grep` by **+0.127** with vectors
and is the best arm on the set. Graph expansion then makes it slightly *worse* with vectors
(−0.004) and better without (+0.037, both strata agreeing).

**The honest summary, in the project's own words:**

> The bet is **no longer contradicted, and is not yet proven.** `seeds` remains the stronger arm
> with vectors, and search alone still beats `grep` by more than the graph adds. What changed is
> that the edges now demonstrably pay for themselves in one of the two retrieval modes.

**How to tell this so it reads senior rather than as failure:**

> "I built it on an explicit hypothesis — that concerns are connected by edges, not by text
> similarity — and I made Phase 1 a stop-or-continue gate on whether that beat grep. So far the
> graph hasn't earned its keep with vectors on: search and ranking are doing the work. I know
> that because I labelled ground truth and ran a controlled ablation with a fair baseline,
> instead of eyeballing outputs. The alternative was shipping a graph nobody had measured and
> assuming it helped — which is what I'd been doing before I built the eval, and it's why one
> tuning change fixed a Next.js app and silently broke a Nest one."

Three things that sentence proves at once: you form falsifiable hypotheses, you build measurement
before you build confidence, and you will tell your team an uncomfortable truth. Most candidates
cannot demonstrate any of the three.

> **Do not** open with "it didn't work." Open with the mechanism and the discipline; let the
> negative result arrive as evidence of rigour.

---

## Part 2 — Drill

**Cover the answers. Say yours out loud first.**

### The pitch

**1. 🔥 Tell me about repo-intelligence. (90 seconds)**
> Onboarding onto an unfamiliar codebase, the question you actually have is concern-level —
> "explain authentication", "where does billing happen" — and neither grep nor a chat-over-repo
> tool answers it well. Grep finds the file with `auth` in the name; embeddings find files that
> *sound* related. Neither reaches the middleware chain, the session store and the config.
>
> So I built a cross-cutting-concern tracer. It parses the repo with tree-sitter into a real code
> graph — symbols, import edges, call edges, routes, ORM models — chunks on symbol boundaries,
> indexes with BM25 plus local code-specialised embeddings, and retrieves in three stages: seed
> by search, expand along graph edges, rank the union.
>
> The hard part isn't retrieval, it's trust. Every claim in the answer carries a `path:line`
> citation, and a validator re-reads the files from disk and drops any claim whose citation
> doesn't hold — refusing the whole answer above 30% dropped. A fabricated citation is worse than
> no answer because it looks verified.
>
> And I gated the whole thesis on measurement: 11 hand-labelled questions across three repos,
> three arms including a fair grep baseline, F1/MRR/core-recall. The finding was that search and
> ranking beat grep by a wide margin and the graph, so far, adds less than I expected. That's the
> honest state — and I know it because I measured it instead of assuming.

**2. Give me the ten-minute whiteboard version.**
> Draw the pipeline (ingest → graph → chunk → index → retrieve → answer → validate), then pick
> two deep dives: the retrieval three-stage with RRF, and the validator. Spend the last two
> minutes on the eval harness and the ablation table. Do **not** try to cover all seven layers.

### Retrieval

**3. 🔥 Why not just stuff the whole repo into a long-context model?**
> Three reasons, in order of how much they actually bite. Cost and latency — even at a million
> tokens you're paying to re-read the repo on every question, and most real repos exceed it
> anyway. Quality — lost-in-the-middle is real; retrieval that puts eight right files at the top
> beats a haystack containing them. And verifiability — with retrieval I know which files the
> answer was allowed to draw on, so a citation outside that set is provably fabricated. Long
> context gives me no such handle.
>
> ↳ **If pushed:** "Long context and retrieval aren't opposed — the right design is retrieve
> aggressively, then give the model a generous window of the *right* material."

**4. Why RRF instead of weighting the two scores?**
> Because they have no common scale. BM25 is unbounded and corpus-dependent; cosine sits in
> [-1, 1]. Adding or weighting them compares quantities that aren't comparable, and the weights
> you pick end up fitted to one corpus. RRF fuses by rank, which is scale-free, and it has the
> property I want: a document in both lists outranks one topping either alone, because agreement
> between independent retrievers is stronger evidence than excellence in one.
>
> ↳ **If pushed — why K=60?** "It's the standard damping from the original RRF paper; larger K
> flattens the advantage of top ranks. I didn't tune it, and I'd want an eval delta before I did."

**5. 🔥 Your graph expansion made things slightly worse with vectors on. Why keep it?**
> Because "slightly worse" is −0.004 F1, which is noise on 11 questions, and lexically it's
> +0.037 with both strata agreeing. More importantly the graph does things F1 doesn't measure:
> the sequence diagram is drawn from resolved edges, and that needs real call edges regardless of
> what ranking does with them. What I won't do is claim the graph is proven — it isn't, and the
> next phase is deciding whether it earns its keep or gets cut.

**6. Walk me through `CONSUMER_PENALTY`.**
> The graph encodes edge direction and my ranking was throwing it away. Walking forward from a
> seed finds what the concern is built from; walking backward finds what depends on it. I
> measured over the symbols expansion actually adds: forward 48% belong, backward 24% — and the
> gap holds inside every edge kind separately. 78% of what expansion adds is backward, so one
> discarded distinction was producing most of the noise. I made it a penalty rather than a filter
> because "what registers this middleware" is a legitimate backward question and a quarter of
> them do belong.

**7. You set `DEPTH_DECAY` to 0.5 — how did you pick it?**
> Anything from 0.35 to 0.55 measured identically, so I put it mid-plateau. That's the point: a
> sharp peak would have told me the value was fitted to 11 questions rather than tracking a real
> effect. Picking the flat middle of a plateau is how you avoid overfitting a hyperparameter to a
> small eval set.
>
> ↳ **If pushed:** this is the transferable answer — plateau over peak, on any tuned constant.

**8. Why depth 2 and not 3?**
> A cost saving, not a quality one — they score identically at F1 0.536. On one repo, 79% of
> expanded symbols were reachable from the same five seeds; by depth 3 you've essentially
> enumerated the connected component. That saturation also explained something that had looked
> mysterious: the expanded arm barely responds to how its seeds are ranked, because at that
> radius the seeds hardly determine the reachable set.

### Chunking and embeddings

**9. 🔥 Why symbol-boundary chunking instead of a fixed window with overlap?**
> Fixed windows split functions in half, and here that's not just a quality loss — it breaks the
> symbol→chunk mapping the graph depends on. If a chunk can't be traced back to a symbol, an edge
> can't lead to it, and building the graph was pointless. Overlap doesn't fix that; it just makes
> the halves less bad.
>
> ↳ **If pushed — what about symbols bigger than the budget?** "Split with 4 lines of overlap,
> every part keeping its parent symbol reference so expansion can still reach it."

**10. You chunk methods *and* their enclosing class — isn't that duplicated text?**
> Yes, deliberately. A class can be many times the chunk budget, and a question about `login`
> should retrieve `login`, not the whole service it lives in. I pay duplication to get the right
> granularity. Module-level symbols I *do* exclude, for the opposite reason — they span whole
> files, so chunking them would duplicate every other chunk and swamp retrieval with
> near-identical matches.

**11. Why prefix chunks with the path and signature before embedding?**
> Because a function body often contains none of the words the question uses. `verifyToken`'s
> body mentions `jwt` and `secret` but never "authentication" — the path `src/auth/token.ts` does
> that work. It's the cheapest form of contextual enrichment available: no extra model call, just
> put the metadata in the embedded text.

**12. Why a code-specialised embedding model?**
> General-purpose text embeddings score identifiers and prose alike, which is exactly the failure
> the project exists to beat. Jina's code model is trained on the identifier/docstring
> relationship. I also ship a MiniLM fallback for constrained environments — and because vectors
> are an enhancement, never a dependency.

**13. 🔥 You quantized to q8. How do you know it didn't cost retrieval quality?**
> I don't assume — that's what the eval harness is for. fp32 was 1.85 s/chunk, 11 minutes for a
> 60-file repo, which made the measurement that justifies the project too expensive to take
> repeatedly. So q8 is the default and "does it cost quality" is a measurable question I can
> answer with an arm rather than an opinion.

**14. Your batch size is 8. That seems small.**
> It is, and it's measured. On 96 real chunks: batch 8 → 1192 ms/chunk, batch 16 → 1583, batch 32
> → OOM at an 8 GB heap. Bigger loses because every sequence in a batch is padded to the longest
> one, so a single long chunk is charged to all its neighbours — and the padded tensor is what
> exhausts memory. I've since added length-sorted batches, which removes exactly that waste, so
> it's worth re-measuring — but I won't raise it without measuring, I've made that mistake here
> once already.

**15. Why local embeddings rather than an API?**
> A methodology argument, not a cost one. The next phase re-runs indexing hundreds of times
> against the eval set. A per-call cost there makes the measurement that justifies the whole
> project expensive to take, which is precisely the wrong incentive. Local is free, key-less and
> deterministic. There's also a product reason — it runs offline on a private codebase with
> nothing leaving the machine.

### The validator

**16. 🔥 Walk me through the citation validator.**
> The model returns claims, each with citations. For every citation I re-read the file **from
> disk** — not from the index, because the index records what the code said when it was built and
> the claim has to be true of what it says now — and run eight checks: is the path real, is the
> range well-formed and in bounds, is the file unchanged since indexing, is the span under 150
> lines, does the named symbol actually appear in those lines, and do the claim's code-shaped
> identifiers appear there. Any failure drops the claim. Above 30% dropped, I refuse the whole
> answer.

**17. Why refuse the whole answer instead of serving what survived?**
> Because an answer half of whose claims failed verification isn't a partial answer — it's
> evidence the model was guessing, and the surviving half is no more trustworthy. The dropped
> fraction is a signal about the *generation*, not just about those claims.
>
> ↳ **If pushed — why 30%?** "Judgement, not measurement — and I'd say so. It's a knob I'd tune
> against user-reported wrong answers if I had that data."

**18. 🔥 `claim-terms-absent` — why is that check necessary if the citation is in bounds?**
> Because in-bounds and correct aren't the same thing. A real answer cited `findOne` for a claim
> about the `Trade` model's fields. The lines existed, they mentioned `stock` and `signal`, and
> the fields it named actually live in `schema.prisma`. Verified, and pointing at the wrong file.
> So if a claim names identifiers that only occur in code, at least one has to appear in the span.

**19. Why only camelCase/PascalCase/snake_case identifiers, and why length ≥ 5?**
> Because their absence has to mean something. A claim about "the Trade record" shouldn't be
> checked against the word `Trade` — it appears in prose and as `trade` in code alike, and
> matching case-insensitively defeats the purpose. Single capitalised words and short tokens
> generate false drops, and a false drop deletes a true claim. I require one identifier to match,
> not all, because a claim legitimately spans several files.

**20. What's `span-too-broad` protecting against?**
> A citation covering an entire file isn't evidence, it's a gesture in the direction of evidence —
> no reader can check it in reasonable time. I lowered it from 400 to 150 lines. Still generous
> deliberately: a real answer cited 118 lines for "creates a LiveSignal and a Trade in a
> transaction" and was *correct*, so a limit tight enough to catch that would drop true claims.

**21. How do you detect staleness?**
> SHA-256 of the file on disk against the `contentHash` recorded at index time. A changed file
> means the line numbers in the index — and therefore in any citation built from it — may point
> somewhere else entirely. Better to say so than to guess.

**22. What is "narrowing" and why isn't it a verdict?**
> Having located the evidence in order to check it, I point at it — tighten the citation onto the
> lines carrying the claim, plus two lines of context. It anchors on the *rarest* terms, because
> min-to-max over every match spreads back to the whole span the moment one common word appears
> throughout. A figure like `0.921` occurs once and locates exactly the sentence; "positive"
> occurs a dozen times and locates nothing. It's a display improvement — the citation already
> passed on the range the model gave, so narrowing can never drop a claim.

### Evals — the section that wins the round

**23. 🔥 How do you know a retrieval change made things better?**
> `ri eval`, before and after. It's a hard rule in the project: no ranking or retrieval change
> lands without a delta. That rule exists because Phase 1 tuned by eye against three repos and
> every change traded one against another — a hub penalty that cleaned up a Next.js app
> simultaneously dropped the most central auth file in a Nest app. Eyeballing outputs isn't
> engineering, it's superstition.

**24. 🔥 Eleven questions is a tiny eval set. Why should I believe any of this?**
> You should believe it exactly as far as it goes, and I'd say the same in a design review.
> Eleven hand-labelled questions across three repos catches large effects and cannot resolve
> small ones — which is why I report deltas with the strata split and treat anything under ~0.01
> F1 as noise, and why I chose `DEPTH_DECAY` mid-plateau rather than at its apparent peak.
> Labelling is the bottleneck: ground truth means reading the repo and deciding which files
> genuinely belong, tiered core vs relevant, plus explicit distractors. Growing it is the highest
> priority in the next phase. What eleven questions *does* buy me is the ability to detect that a
> change traded one repo against another — which is what was silently happening before.

**25. 🔥 grep as a baseline is a strawman. Isn't beating it trivial?**
> That's why it isn't handicapped. `grepBaseline` gets the same abbreviation bridging the real
> retriever gets, because beating a crippled control proves nothing. And grep is the honest
> comparator — it's what developers actually do. It also isn't as weak as it sounds here: MRR
> 0.718 and core-recall 0.532. The `seeds` arm beats it by +0.127 F1, and the graph adds less
> than that on top, which is precisely the uncomfortable finding I'm reporting.

**26. Why `coreRecall` on top of recall?**
> Because not every relevant file is equal. Missing a `core` file is a failure, not a shortfall —
> if you ask about authentication and I return five related files but not the middleware, the
> answer is wrong even at decent recall. Plain recall averages that distinction away.

**27. Why MRR rather than a set-based score?**
> Position matters. An answer that finds the right files at ranks 18–24 is not the same product
> as one that finds them at 1–7, and a set-based score can't tell them apart. Both retrieval arms
> hit MRR 1.000 against grep's 0.718 — the top hit is right every time — which is the metric
> closest to what a user feels.

**28. Why is `meanMetrics` unweighted?**
> So a repo with many cases doesn't quietly decide the verdict for all of them. With three suites
> of one case each that's currently the same thing, but it stops being so the moment the set
> grows — and a mean that changes meaning as data arrives is a trap.

**29. Your ablation was wrong twice. Tell me about that.**
> Both earlier configurations were broken, in opposite directions — one handicapped the `seeds`
> arm so it answered with two thirds of a result set, which flattered the graph; correcting it
> erased part of an improvement I'd already written down. That's why the fairness rule is a
> non-negotiable now: both arms get the same seed budget and return N symbols, so they differ
> only in *how* the set was built. It's also why I re-measured `DEPTH_DECAY` afterwards rather
> than trusting the original tuning — it held, at F1 0.520 → 0.536, and that part was real.

**30. 🔥 What would three more months buy?**
> In order: grow the labelled set past a few dozen questions so small effects are resolvable;
> then decide the graph's fate on that evidence — earn its keep or get cut, and I'd genuinely cut
> it; then a cross-encoder rerank stage, which on this shape of problem is usually worth more
> than a better embedder. Then multi-language beyond TypeScript/Prisma, which is where the real
> product ceiling is.

### Scale and design

**31. Scale this to a 500k-file monorepo.**
> Today it wouldn't: the index is a JSON store and embedding is single-machine CPU, so indexing
> is hours and the store stops fitting comfortably in memory. What I'd change, in order —
> incremental indexing keyed on content hash so only changed files re-embed (the hashes are
> already there for staleness detection); a real vector index with ANN rather than exhaustive
> similarity; move the store to SQLite or Postgres with the graph as edge rows; shard indexing by
> package and parallelise. The retrieval algorithm itself doesn't change — seed, expand, rank is
> the same at any size; the expansion budget just matters more.

**32. Why JSON store rather than SQLite from the start?**
> Phase 1 was a stop-or-continue gate on a hypothesis, not a product. The storage layer was the
> part least likely to teach me whether the bet held, so it got the cheapest thing that worked.
> If the graph earns its place, the store is a contained swap behind one interface.

**33. What's the biggest weakness?**
> The eval set size, and I'd name it before you did. After that: TypeScript and Prisma only, so
> the graph is thin on anything else; call resolution is confidence-scored rather than exact,
> which is the right trade but means the graph has some wrong edges by construction; and the
> whole thing runs locally, so indexing a large repo is a wait, not a request.

---

## Rapid-fire

| Term | One-liner |
|---|---|
| RRF | Fuse ranked lists by reciprocal rank, `1/(K+rank)`, K=60 — scale-free where raw scores aren't |
| coreRecall | Recall over the files whose absence makes the answer wrong |
| Distractors returned | Labelled wrong-but-plausible files that leaked in — the noise measure |
| Seed → expand → rank | Search for entry points, walk real edges, score the union |
| Hub penalty | Demote widely-imported symbols reached by expansion; seeds exempt |
| Consumer penalty | Demote symbols reached by walking an edge backwards — 24% belong vs 48% forward |
| Depth decay | Multiply the total score per hop, so reachability is unchanged and ordering is restored |
| Span-too-broad | A 150-line cap; wider is a gesture at evidence, not evidence |
| Claim-terms-absent | Code-shaped identifiers in the claim must appear in the cited span |
| Refusal threshold | >30% claims dropped → refuse the whole answer |
| Symbol chunking | Cut on symbol boundaries so chunks stay reachable from graph edges |
| Chunk search text | Path + signature prefixed onto the body before embedding |
| Fair baseline | The control gets every advantage the system gets, or beating it proves nothing |

---

## 🔗 Anchors — concept → the sentence to say

| Concept | The sentence |
|---|---|
| Hybrid search | "I fuse BM25 and vectors with RRF because their scores have no common scale — rank is the only thing comparable." |
| Chunking strategy | "I chunk on symbol boundaries; fixed windows split functions and break the symbol→chunk mapping my graph traversal depends on." |
| Contextual enrichment | "I prefix path and signature into the embedded text — `verifyToken`'s body never says 'authentication', but its path does." |
| Embedding selection | "Code-specialised, because general text embeddings score identifiers and prose alike." |
| Quantization | "q8 by default; fp32 was 1.85 s/chunk and made the measurement that justifies the project too expensive to take." |
| Hallucination guardrails | "Every claim carries a citation, the validator re-reads the file from disk, and above 30% dropped I refuse the answer — a fabricated `path:line` is worse than none because it looks verified." |
| Grounding failure modes | "In-bounds isn't correct — I've had a citation that resolved perfectly and pointed at the wrong file." |
| Evals | "No ranking change lands without an eval delta. That rule exists because one tuning change fixed a Next.js repo and silently broke a Nest one." |
| Overfitting a hyperparameter | "0.35 to 0.55 measured identically so I sat mid-plateau — a sharp peak would mean I'd fitted it to 11 questions." |
| Intellectual honesty | "The bet is no longer contradicted and is not yet proven." |
| Baseline discipline | "The grep control gets the same abbreviation bridging my retriever gets — a handicapped baseline is a strawman." |

---

## Gaps — what you cannot claim from this project

| Don't say | Because | Say instead |
|---|---|---|
| "Production RAG system" | It is a local CLI with no users | "A research-grade retrieval system I measured rigorously" |
| "I use a reranker" | There is no rerank stage | "Rerank is the next thing I'd add — it usually beats a better embedder on this shape of problem" |
| "It scales to large monorepos" | JSON store, single-machine CPU embedding | Answer Q31 — the honest scaling plan |
| "Multi-language code intelligence" | TypeScript + Prisma only | "TypeScript and Prisma today; the language layer is pluggable" |
| "Proven that graphs beat search" | The numbers say the opposite so far | The DD7 script |
| "I have evals in CI" | The rule is enforced by discipline, not by a pipeline | "It's a hard project rule; wiring it into CI is the obvious next step" |

**Before you cite this project anywhere: fix the README.** It says "Status: Planning — no
implementation yet." An interviewer who opens the repo reads that first and concludes you are
padding. That is a 5-minute fix with the highest return of anything in this kit.

---

## What's NOT here

| Topic | Doc |
|---|---|
| Chunking strategies in general | [03-rag.md](03-rag.md) |
| Eval metrics, judges, CI gating in general | [04-evals.md](04-evals.md) |
| pgvector/HNSW/IVFFlat, DB-layer hybrid search | [interview-qa/05-databases.md](../interview-qa/05-databases.md) |
| Designing an AI coding assistant as an HLD | [11-ai-system-design.md](11-ai-system-design.md) |
| Your other AI projects | [14-deepdive-projects.md](14-deepdive-projects.md) |
| The STAR stories built from this project | [15-positioning-stories.md](15-positioning-stories.md) |

---

← Back to [INDEX.md](INDEX.md)
