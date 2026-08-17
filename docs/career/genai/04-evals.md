# 04 — Evals

> **The seniority signal in a GenAI interview.** Anyone can build a RAG pipeline in a weekend.
> The question that separates candidates is *"how do you know it got better?"* — and most people
> answer it with "we tried some queries and it looked good."
>
> You are unusually well positioned here. [repo-intelligence](13-deepdive-repo-intelligence.md)
> has hand-labelled ground truth, a controlled ablation, a fairness-controlled baseline, and a
> reported negative result. **Lead with it.**
>
> Part 1 you read. Part 2 you cover and answer out loud. 🔥 = hard or commonly fumbled.

---

## Part 1 — What you actually need to know

### Why this is the round that sorts people

An LLM feature has a property normal software doesn't: **it can silently get worse.** A refactor
that breaks a function throws; a prompt edit that degrades answer quality by 15% throws nothing,
passes every unit test, and ships. Without evals you have no regression suite for the only
behaviour your users care about.

Second-order consequence, and the one worth saying out loud: **without evals you can't tune
anything honestly.** Every knob trades one case against another, and if you're eyeballing outputs
you'll fix the case you're looking at and break the one you aren't.

> 🔗 *Yours:* exactly this happened. A hub penalty that cleaned up a Next.js app simultaneously
> dropped the most central auth file in a Nest app. That's why "no ranking change lands without
> an `ri eval` delta" is a hard rule in the project.

### The taxonomy

Get this straight before anything else — most confused eval answers are a category error.

| Axis | Split | Why it matters |
|---|---|---|
| **Stage** | Component vs end-to-end | A RAG system that fails usually fails at *retrieval*. Scoring only the final answer tells you it's bad, not where |
| **Target** | Retrieval / generation / trajectory | Different metrics entirely; don't mix them in one number |
| **Timing** | Offline (golden set) vs online (production traffic) | Offline gates changes; online tells you whether the gate was measuring the right thing |
| **Judge** | Deterministic / model-based / human | Cost and reliability run in opposite directions |

**The rule that follows:** evaluate retrieval separately from generation. If retrieval recall is
0.4, no prompt engineering will save you, and every hour spent on the prompt is wasted.

### Retrieval metrics

| Metric | Definition | When it's the one that matters |
|---|---|---|
| **recall@k** | Of the relevant docs, how many appear in the top k | The default headline for RAG. If the right chunk isn't retrieved, nothing downstream can fix it |
| **precision@k** | Of the k returned, how many are relevant | Matters when context is expensive or noise degrades generation |
| **F1** | Harmonic mean | Single number when you must have one |
| **MRR** | Reciprocal rank of the first relevant hit | Position-sensitive. "Right files at ranks 18–24" ≠ "at ranks 1–7", and a set-based score can't tell them apart |
| **NDCG@k** | Rank-discounted gain with graded relevance | When relevance isn't binary — some docs are more relevant than others |
| **Hit rate** | Did *any* relevant doc appear | Crude, but the right metric for "can the system answer this at all" |

Two refinements that read as senior because most people don't do them:

- **Tiered relevance.** Label some documents `core` — missing one is a *failure*, not a shortfall
  — and report `coreRecall` alongside recall. Plain recall averages that distinction away.
- **Labelled distractors.** Wrong-but-plausible documents, explicitly labelled, so you can measure
  **noise** rather than only measuring hits.

> 🔗 *Yours:* both of these are in `packages/eval/src/metrics.ts` — `coreRecall` and
> `distractorsReturned`. Also `returned`/`relevantTotal` raw counts alongside the ratios, "so a
> small denominator is visible rather than hidden."

### Generation metrics

| Metric | Question it answers |
|---|---|
| **Faithfulness / groundedness** | Is every claim supported by the retrieved context? (Not: is it true) |
| **Answer relevance** | Does it actually address the question asked? |
| **Context precision** | Of the retrieved context, how much was actually used/needed? |
| **Context recall** | Did retrieval supply everything the ideal answer needs? |
| **Completeness** | Does it cover all parts of a multi-part question? |
| **Citation accuracy** | Do the citations resolve, and do they support the claim they're attached to? |

**Faithfulness vs correctness is the distinction people fumble.** Faithfulness asks whether the
answer follows from the context. An answer can be perfectly faithful to a retrieved document that
is itself outdated — faithful and wrong. Groundedness is a property of the *generation step*;
correctness is a property of the *whole system including your corpus*.

**The strongest form of citation checking isn't a metric — it's a runtime guardrail.**

> 🔗 *Yours:* `validate.ts` re-reads files from disk and drops claims whose citations don't hold,
> refusing the whole answer above 30% dropped. Eight distinct failure modes including
> `claim-terms-absent`, which exists because a real answer cited a file that resolved perfectly
> and pointed at the wrong place. Detail in
> [13-deepdive-repo-intelligence.md](13-deepdive-repo-intelligence.md#dd4--the-citation-validator-this-is-the-product).

### LLM-as-judge

The workhorse when there's no single right answer. Also the place people get sloppy.

**How to do it properly:**
- **A rubric, not a vibe.** "Score 1–5 on whether every factual claim is supported by the
  context" — with the criteria for each level written out.
- **Pairwise beats pointwise** for comparing two systems. Models are much better at "which is
  better" than at "score this out of 10" on an absolute scale.
- **Calibrate against human labels.** Score 50 examples yourself, then check the judge agrees.
  A judge you haven't calibrated is an unvalidated measuring instrument.
- **Use a different (usually stronger) model than the one being judged**, or you inherit its
  blind spots.

**The biases you must be able to name:**

| Bias | What it does |
|---|---|
| **Position** | Prefers whichever answer came first (or last). Mitigate by swapping order and averaging |
| **Verbosity** | Prefers longer answers regardless of quality. Mitigate by scoring against a rubric that doesn't reward length |
| **Self-preference** | Models rate their own outputs higher. Mitigate with a different judge model |
| **Formatting** | Prefers confident, well-structured prose over hedged accurate prose |

**Cost is real.** A judge call per example per run, across a golden set, on every PR, adds up.
Cheap deterministic checks first, judge only what needs judgement.

### The checking ladder — cheapest first

1. **Deterministic** — does it parse, does it validate against the schema, are required fields
   present, do the citations resolve, is it under the length cap. Free, fast, catches a
   surprising amount.
2. **Heuristic** — keyword presence, numeric tolerance, regex, string overlap with a reference.
3. **Model-based** — LLM-as-judge with a rubric.
4. **Human** — a sampled subset, and the calibration source for level 3.

Most teams start at 3 and skip 1. Start at 1.

### Golden sets

**Size:** enough to detect the effect size you care about. A few dozen catches large regressions;
a few hundred resolves small ones. Be honest about which you have.

**Sourcing, best to worst:** real production queries (sampled, stratified by type) > queries from
your own use > synthetic queries from a model. Synthetic sets are fine for coverage of rare cases
and dangerous as the *whole* set — they inherit the generating model's idea of what a question
looks like.

**Stratify.** Group by question type, difficulty, tenant, language. A single mean hides that you
improved easy questions and broke hard ones — the strata split is what catches it.

**Hygiene.** Don't tune on your test set. If you tune hard against a fixed set you eventually fit
it, which is why a hyperparameter that shows a **sharp peak** should worry you and a **plateau**
should reassure you.

> 🔗 *Yours:* `DEPTH_DECAY` — "anything from 0.35 to 0.55 measured identically, so this sits
> mid-plateau rather than on a peak — a spike would have suggested the value was fitted to 11
> questions rather than to a real effect."

**Labelling is the bottleneck, and saying so is honest rather than weak.** Ground truth means
someone reading the source and deciding what genuinely belongs.

### Baselines and ablations

Two rules, and they are the difference between a measurement and a marketing number.

**1. The baseline must be fair.** Give the control every advantage the system gets. Beating a
handicapped baseline proves nothing.

> 🔗 *Yours:* `grepBaseline` gets the same abbreviation bridging the real retriever gets. And
> your ablation was wrong twice — in opposite directions — before it was right; one configuration
> handicapped the comparator so it answered with two thirds of a result set, which flattered the
> graph and erased part of an "improvement" on re-measurement.

**2. Ablate one thing at a time.** Arms should differ in exactly one dimension. If arm A also
returns fewer results than arm B, you're measuring two things.

> 🔗 *Yours:* "Both retrieval arms get the same seed budget… both return N symbols, so they differ
> only in how the set was built."

### Evals in CI

The thing almost nobody has, so having a plan for it is differentiating.

**Gate on deltas, not absolutes.** "F1 must exceed 0.55" breaks the moment you add hard cases to
the set. "F1 must not drop more than 0.02 versus main" survives a growing set.

**Handle nondeterminism.** Temperature 0 is not fully deterministic across provider-side changes.
Options: run N times and compare distributions; use a tolerance band; pin model versions so the
provider can't change under you.

**Budget the run.** A full judge-based eval on every PR gets expensive. Common shape: cheap
deterministic checks on every PR, full eval on merge to main and nightly, judge-based eval only
on changes touching prompts/retrieval.

**Version everything as a deploy artifact.** Prompts, models, indexes and retrieval config each
get a version, and each can be canaried and rolled back independently.

### Online eval

Offline tells you whether to ship. Online tells you whether offline was measuring the right thing.

- **Implicit signals** — copy, retry, follow-up question, abandonment, thumbs-down. Cheap and
  plentiful; noisy individually, meaningful in aggregate.
- **Guardrail metrics** — refusal rate, error rate, p95 latency, cost per request. These catch
  "quality went up, cost tripled."
- **A/B on LLM changes** — harder than normal A/B because variance is high; you need more traffic
  or a paired design.
- **Shadow mode** — run the new config on real traffic, serve the old one, compare offline. The
  safest way to evaluate a risky change.
- **Feedback → dataset.** Every thumbs-down is a candidate golden-set entry. This is the loop that
  makes the eval set better over time without a labelling team.

**Offline↔online divergence is normal.** When it happens, your golden set doesn't represent real
traffic — resample from production rather than trusting the offline number.

### Agent trajectory eval

Scoring only the final answer of an agent throws away most of the signal.

| Dimension | What you measure |
|---|---|
| Task success | Did it achieve the goal (the only thing users care about) |
| Tool-selection accuracy | Did it call the right tool at each step |
| Trajectory efficiency | Steps taken vs minimum; redundant or repeated calls |
| Cost per task | Tokens and dollars, not just success rate |
| Recovery | When a tool failed, did it adapt or loop |

A 95%-success agent that averages 30 steps is worse than a 90% one that averages 6.

### Tooling — one line each

| Tool | What it's for |
|---|---|
| **RAGAS** | Standard RAG metric definitions (faithfulness, context precision/recall). Use it for the vocabulary even if you compute your own |
| **DeepEval** | Pytest-style LLM assertions — natural fit for CI |
| **promptfoo** | Config-driven prompt/model comparison matrix. Lowest-friction starting point |
| **LangSmith** | Tracing + datasets + eval, tied to the LangChain ecosystem |
| **Langfuse** | Open-source tracing + eval; self-hostable |
| **Braintrust / W&B Weave** | Experiment tracking for prompts and models |

> **Don't over-index on tools in an interview.** "I'd start with promptfoo for the matrix and a
> hand-rolled scorer for our domain metrics" is a better answer than reciting six product names.

`as of 2026-08` — this list moves fast; verify before quoting specifics.

### Reporting a negative result

The senior move, and rare enough that it's worth deliberately preparing.

The shape: **hypothesis → how I made it falsifiable → what I measured → what it showed → what I'm
doing about it.** Not defensive, not spun.

> 🔗 *Yours:* "I built it on the hypothesis that concerns are connected by edges rather than text
> similarity, and made Phase 1 a stop-or-continue gate on whether that beat grep. So far the
> graph hasn't earned its keep with vectors on — search and ranking are doing the work. The bet
> is no longer contradicted and is not yet proven. Next phase decides whether it earns its place
> or gets cut."

---

## Part 2 — Drill

**Cover the answers. Say yours out loud first.**

**1. 🔥 How do you evaluate an LLM feature?**
> Start by splitting it: retrieval and generation get evaluated separately, because a RAG system
> that's failing is usually failing at retrieval and no prompt work will fix that. Then build a
> golden set — real queries where possible, stratified by type and difficulty — and run a ladder
> of checks: deterministic first (schema valid, citations resolve, length caps), then heuristics,
> then LLM-as-judge with a written rubric for the things that need judgement, then a human sample
> to calibrate the judge. Run it on every prompt or model change and gate on the delta against
> main, not an absolute threshold. Then close the loop from production — thumbs-down and retries
> feed the golden set.
>
> ↳ **If pushed — where do you start with nothing?** "Twenty real queries, hand-labelled, and
> deterministic checks. That's an afternoon and it already catches regressions. Perfect is the
> enemy of having any regression suite at all."

**2. Your RAG answers are bad. How do you find out why?**
> Measure retrieval first, in isolation. Take the golden questions, look at recall@k against the
> labelled relevant documents. If recall is low the problem is upstream — chunking, embedding
> model, query formulation — and the prompt is irrelevant. If recall is high but the answer is
> still wrong, it's generation: check faithfulness, whether the right chunk was buried at rank 40
> in a long context, or whether the prompt lets the model answer from prior knowledge instead of
> the context.
>
> ↳ **If pushed:** "The diagnostic order is retrieval → ranking → context assembly → prompt.
> People start at the prompt because it's the easiest thing to change."

**3. 🔥 What's the difference between faithfulness and correctness?**
> Faithfulness asks whether the answer follows from the retrieved context. Correctness asks
> whether it's true. An answer can be perfectly faithful to a document that's out of date —
> faithful and wrong. Faithfulness is a property of the generation step and it's the one you can
> measure automatically; correctness depends on your corpus being right, which is a data problem,
> not a model problem.

**4. Define context precision and context recall.**
> Context recall: did retrieval supply everything the ideal answer needs. Context precision: of
> what it supplied, how much was actually needed. Low recall means you can't answer. Low
> precision means you're paying for tokens and adding noise that degrades generation.

**5. Why report `coreRecall` separately from recall?**
> Because relevant documents aren't equally relevant. If a question about authentication returns
> five related files but misses the middleware, the answer is wrong even at 70% recall. Tiering
> the labels and reporting recall over the `core` tier separately makes that visible instead of
> averaging it away.
>
> 🔗 *Yours:* it's in `packages/eval/src/metrics.ts` — "missing one of these is a failure, not a
> shortfall."

**6. Why is MRR worth tracking alongside recall?**
> Position. Finding the right documents at ranks 18–24 isn't the same product as finding them at
> 1–7, and a set-based metric can't distinguish them. MRR is the metric closest to what the user
> feels, especially with a small k or an expensive context.

**7. When do you need NDCG rather than recall@k?**
> When relevance is graded rather than binary — some documents are more relevant than others and
> you want rank-discounted credit for ordering them well. For most RAG work binary relevance plus
> MRR is enough, and NDCG's extra labelling cost isn't repaid.

**8. 🔥 How big does a golden set need to be?**
> Big enough to resolve the effect size you care about, and you should say which you have. A few
> dozen catches large regressions and cannot resolve a 1% change. A few hundred starts resolving
> small ones. The honest framing is: "eleven questions catches a change that trades one repo
> against another, which is what was silently happening before; it can't tell me whether a 0.005
> F1 delta is real, so I treat anything that small as noise."

**9. Where do golden-set examples come from?**
> Best is sampled production queries, stratified so you're not just testing the common easy case.
> Next is real queries from your own use. Last is synthetic — useful for covering rare cases,
> dangerous as the whole set, because it inherits the generating model's idea of what a question
> looks like and systematically misses the weird things real users type.

**10. How do you stop overfitting to the golden set?**
> Hold some of it out, watch for the shape of your tuning results, and resample from production
> periodically. The tell is a hyperparameter with a sharp peak — that's fitting the set, not the
> effect. A plateau is reassuring.
>
> 🔗 *Yours:* "0.35 to 0.55 measured identically so I sat mid-plateau; a spike would have
> suggested the value was fitted to 11 questions."

**11. 🔥 Walk me through LLM-as-judge and its failure modes.**
> A model scores outputs against a written rubric. It works when there's no single right answer.
> Failure modes I design around: position bias — it prefers whichever came first, so I swap order
> and average; verbosity bias — it prefers longer answers, so the rubric must not reward length;
> self-preference — models rate their own output higher, so the judge is a different model; and
> formatting bias — confident structured prose beats hedged accurate prose. And I calibrate: score
> 50 examples by hand and check the judge agrees. An uncalibrated judge is an unvalidated
> instrument.

**12. Pairwise or pointwise judging?**
> Pairwise when comparing two systems — models are much better at "which is better" than at
> absolute scores, and absolute scores drift between runs. Pointwise when you need a standalone
> quality number over time, accepting it's noisier. Pairwise with order-swapping is the more
> reliable default.

**13. Judging is expensive. How do you keep the cost sane?**
> The ladder. Deterministic checks are free and catch a lot — schema validity, citations
> resolving, required fields, length. Heuristics next. Judge only what genuinely needs judgement,
> on a sampled subset, with a cheaper model where the task allows. And gate the full run to merges
> and nightly rather than every push.

**14. 🔥 How do you put evals in CI without them being flaky?**
> Gate on **delta versus main**, not an absolute threshold — absolutes break the moment you add
> hard cases. Pin model versions so the provider can't change under you. For nondeterminism,
> either run N times and compare distributions or set a tolerance band wider than observed
> run-to-run variance. And split the tiers: deterministic on every PR, full eval on merge, judge
> eval only when prompts or retrieval changed.

**15. What do you version, and why?**
> Prompts, model IDs, retrieval config and the index — each as a separate deploy artifact with
> its own version, so each can be canaried and rolled back independently. Otherwise when quality
> drops you can't tell which of four simultaneous changes did it.
>
> **Honest gap:** none of your projects version prompts. Say so — it's build task 3 in
> [00-curriculum.md](00-curriculum.md).

**16. 🔥 Your metrics improved offline but users complain. What happened?**
> The golden set doesn't represent real traffic. Most likely I stratified wrong or sampled from
> my own usage rather than production, so I optimised the questions I imagined instead of the
> ones people ask. The fix is to resample from production logs, especially from sessions with
> thumbs-down or retries, and re-stratify. It's also worth checking the guardrail metrics — the
> change may have improved quality and tripled latency, which users experience as "worse".

**17. How do you evaluate an agent rather than a single call?**
> Trajectory, not just outcome. Task success is the headline, but I also measure tool-selection
> accuracy per step, steps taken versus the minimum, redundant or repeated calls, cost per task,
> and recovery behaviour when a tool fails. A 95%-success agent averaging 30 steps is worse than a
> 90% one averaging 6, and outcome-only scoring can't see that.

**18. What are guardrail metrics?**
> Metrics you don't optimise but must not regress — latency p95, cost per request, error rate,
> refusal rate. They catch the change that improved your headline quality number by tripling the
> spend or doubling TTFT.

**19. What's shadow mode and when do you use it?**
> Run the new configuration on real production traffic without serving its output, log both, and
> compare offline. It's how you evaluate a risky change against real inputs with zero user risk.
> The cost is that you pay for inference twice.

**20. 🔥 Why does a baseline need to be "fair", and what does an unfair one look like?**
> Because beating a handicapped control proves nothing about your system. An unfair baseline is
> one denied a preprocessing step, a query expansion or a result budget that your system gets.
>
> 🔗 *Yours:* "My grep control gets the same abbreviation bridging the real retriever gets." And
> I've been burned by the inverse — an ablation that handicapped the comparator so it answered
> with two thirds of a result set, which flattered my own arm and erased part of an improvement
> when I re-measured it fairly.

**21. Tell me about a time your measurement said you were wrong.**
> Use the DD7 script from
> [13-deepdive-repo-intelligence.md](13-deepdive-repo-intelligence.md#dd7--the-honest-negative-result).
> Hypothesis, falsifiable gate, controlled ablation, uncomfortable finding, what changes next.

**22. Your team wants to ship a prompt change today. There are no evals. What do you say?**
> Ship it — with the smallest possible safety net, then build the net properly. Twenty real
> queries and a deterministic check is an afternoon, and it turns "we think it's better" into
> "these twenty didn't regress". Blocking a release on a golden set that doesn't exist yet is how
> evals get a reputation as bureaucracy. The rule I'd want is: the first time a prompt change
> causes a silent regression, that regression becomes eval case one.

---

## Rapid-fire

| Term | One-liner |
|---|---|
| Golden set | Hand-labelled examples you run every change against |
| recall@k | Of the relevant docs, how many made the top k |
| MRR | 1/rank of the first relevant hit — position-sensitive |
| NDCG | Rank-discounted gain, for graded relevance |
| coreRecall | Recall over the docs whose absence makes the answer wrong |
| Faithfulness | Every claim supported by the retrieved context |
| Groundedness | Same idea, generation-side |
| Context precision | How much of what you retrieved was actually needed |
| Context recall | Did retrieval supply everything the answer needs |
| LLM-as-judge | A model scoring outputs against a written rubric |
| Position bias | Judge prefers whichever answer came first |
| Verbosity bias | Judge prefers the longer answer |
| Self-preference bias | Judge prefers its own model's output |
| Pairwise judging | "Which is better" — more reliable than absolute scores |
| Guardrail metric | Must-not-regress: latency, cost, error rate, refusal rate |
| Shadow mode | Run new config on real traffic, serve the old, compare offline |
| Trajectory eval | Scoring an agent's steps, not just its final answer |
| Ablation | Change exactly one thing between arms |
| Fair baseline | The control gets every advantage the system gets |
| Delta gating | Gate CI on change-vs-main, not an absolute threshold |

---

## 🔗 Anchors

| Concept | Your project | The sentence to say |
|---|---|---|
| Labelled ground truth | repo-intelligence | "11 hand-labelled questions across three repos, with tiered relevance and explicit distractors." |
| Eval-gated changes | repo-intelligence | "No ranking change lands without an `ri eval` delta — because one tuning change fixed a Next.js repo and silently broke a Nest one." |
| Fair baselines | repo-intelligence | "The grep control gets every advantage my retriever gets; I've had an unfair ablation flatter my own arm and I re-measured it." |
| Negative results | repo-intelligence | "The bet is no longer contradicted and is not yet proven." |
| Avoiding overfit | repo-intelligence | "Mid-plateau, not peak — a spike means you fitted the hyperparameter to your eval set." |
| Runtime grounding check | repo-intelligence | "The validator re-reads files from disk and refuses the answer above 30% dropped claims." |
| Domain eval without labels | trading-agent | "Backtesting is the eval — the agent's strategy recommendations get validated against historical win-rate and expectancy." |
| LLM-as-judge in production | AgentSystem | "An evaluator agent scores each tool result and its `fix` feeds the next retry attempt." |
| Manual verification scripts | pSEO | "15 phase-verification scripts against live models — useful, but manual and not CI-gated. That's a gap, not a design." |

---

## Gaps — what you cannot claim yet

| Gap | The honest script |
|---|---|
| **Evals in CI** | "It's a hard project rule enforced by discipline, not a pipeline. Wiring it into CI is the obvious next step and I know exactly what it'd look like — delta gating against main, deterministic checks per PR, full run on merge." |
| **LLM-as-judge in an eval harness** | "I've used an evaluator model inside an agent retry loop, but I haven't built a calibrated judge for offline scoring. I know the bias set I'd have to control for." |
| **RAGAS / promptfoo / LangSmith hands-on** | "I've built the metrics myself rather than adopting a framework. I'd reach for promptfoo first for the comparison matrix." |
| **Online eval / A-B on LLM changes** | "No production traffic at that scale yet. I've shipped guardrail-style metrics — per-run cost accounting in pSEO — but not an A/B." |
| **Large golden sets** | "Eleven questions. Labelling is the bottleneck and I'd rather have eleven honest ones than two hundred synthetic." |

**Don't overclaim here.** Your credibility on this topic comes from rigour on a small set, not
from scale you don't have. An interviewer who hears "eleven hand-labelled questions, tiered, with
distractors and a fair baseline" respects it more than "we had a big eval suite" with no detail.

---

## What's NOT here

| Topic | Doc |
|---|---|
| Retrieval techniques being evaluated | [03-rag.md](03-rag.md) |
| Agent patterns whose trajectories you'd score | [05-agents.md](05-agents.md) |
| The full repo-intelligence eval harness + ablation table | [13-deepdive-repo-intelligence.md](13-deepdive-repo-intelligence.md#dd6--the-eval-harness-the-money-section) |
| Cost/latency guardrails in production | [08-llmops.md](08-llmops.md) |
| Designing an eval platform as an HLD | [11-ai-system-design.md](11-ai-system-design.md) |
| Classical-ML metrics (PR-AUC, cross-entropy) | [01-foundations.md](01-foundations.md) |

---

← Back to [INDEX.md](INDEX.md)
