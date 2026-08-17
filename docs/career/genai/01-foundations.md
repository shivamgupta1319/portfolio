# 01 — Foundations

> Interview-answer depth, deliberately. You do not need to implement attention; you need to be
> unable to be embarrassed by a question about it, and to sound like someone who understands
> *why* the systems above behave the way they do.
>
> The failure mode this file prevents: a strong RAG/agents interview derailed by "so what's
> actually in the KV cache?" and a five-second silence.
>
> Part 1 you read. Part 2 you cover and answer out loud. 🔥 = hard or commonly fumbled.

---

## Part 1 — What you actually need to know

### Tokenization

A **token** is a sub-word unit — roughly 4 characters or ¾ of a word in English. Models never see
characters; they see token IDs.

**BPE (byte-pair encoding)** builds the vocabulary by repeatedly merging the most frequent
adjacent pair, starting from bytes. Consequences that actually matter in production:

- **Non-English text costs more.** The vocabulary is fit mostly to English, so Hindi, Japanese or
  Arabic fragment into many more tokens for the same meaning — sometimes 2–4×. That is a direct
  cost and context-window multiplier, and it's the practical answer to give.
- **Code tokenizes unevenly.** Whitespace runs, long identifiers and rare symbols cost more than
  they look.
- **Character-level tasks are hard for structural reasons.** "How many r's in strawberry" is hard
  because the model never saw the letters — it saw two or three tokens.
- **Tokenizers differ per model family**, so token counts are not portable. Count with the
  tokenizer of the model you're actually calling.

**Token budget arithmetic** you should be able to do out loud: input tokens × input price +
output tokens × output price. Output is typically **3–5× the input price**, which is why
"generate a summary" is cheap and "rewrite this document" is not.

### The transformer, in the amount you need

**Attention** lets every token look at every other token and decide what matters. Mechanically:
each token produces a **query**, a **key** and a **value**. A token's query is compared against
all keys to get weights, and those weights mix the values. "Multi-head" means doing this several
times in parallel with different learned projections, so different heads can track different
relationships (syntax, coreference, position).

Around that: a **feed-forward network** per layer, **residual connections** so gradients survive
depth, and **layer norm**. Stack the block N times. That's it.

**Positional information** has to be injected, because attention itself is order-blind. Modern
models mostly use **RoPE** (rotary embeddings), which encodes relative position by rotating query
and key vectors — and which is why context extension techniques work by interpolating those
rotations.

**Attention is O(n²) in sequence length.** This is the reason long context is expensive, and the
one-line answer to "why does context cost so much".

**Decoder-only vs encoder-only** — worth knowing because it explains your own stack:

| | Attention | Used for |
|---|---|---|
| **Decoder-only** (GPT, Claude, Llama) | Causal — each token sees only earlier tokens | Generation |
| **Encoder-only** (BERT, most embedding models) | Bidirectional — every token sees all tokens | Embeddings, classification, reranking |
| **Encoder-decoder** (T5, Whisper) | Encoder reads, decoder generates | Translation, ASR |

> 🔗 *Yours:* your embedding models — `jina-embeddings-v2-base-code`, MiniLM — are encoders. Your
> generation models are decoders. Whisper, which you have deployed, is an encoder-decoder. Being
> able to say that unprompted is a good signal.

### Prefill, decode, and the KV cache

Generation has **two phases with completely different bottlenecks**, and this distinction explains
almost every latency question.

| Phase | What happens | Bottleneck |
|---|---|---|
| **Prefill** | Process the whole prompt in one parallel pass | **Compute-bound** — it's a big matmul |
| **Decode** | Generate one token at a time, each attending to everything before | **Memory-bandwidth-bound** — you re-read the whole KV cache per token |

**The KV cache** stores the key and value tensors for every token already processed, so generating
token N+1 doesn't recompute tokens 1..N. Without it, generation would be O(n²) per token instead
of O(n).

What follows from that, and is worth saying:
- **TTFT** (time to first token) is dominated by prefill, so it scales with **prompt length**.
- **Inter-token latency** is dominated by memory bandwidth, so it's roughly flat regardless of
  prompt length.
- The KV cache **grows linearly with sequence length and batch size**, and it is usually what
  limits how many concurrent requests a GPU can serve — not the model weights.
- **Prompt caching** is, mechanically, reusing a prefill's KV cache across requests. That's why it
  only helps a **shared prefix**, and why putting your variable content first destroys it.

### Sampling parameters

| Parameter | What it does | Use |
|---|---|---|
| **temperature** | Scales the logits before softmax. 0 → always the top token; higher → flatter distribution | 0–0.3 extraction/classification; 0.7–1.0 creative |
| **top-p (nucleus)** | Sample only from the smallest set of tokens whose cumulative probability ≥ p | The better general knob — adapts to how confident the model is |
| **top-k** | Sample only from the k most likely tokens | Blunter; fixed cut regardless of confidence |
| **frequency penalty** | Penalise tokens by how often they've appeared | Reduce repetition |
| **presence penalty** | Penalise tokens that appeared at all | Encourage topic movement |
| **stop sequences** | Halt generation at a string | Structured output, chat turn boundaries |
| **max_tokens** | Hard cap on output | Cost control, and prevents runaway generation |
| **seed** | Requests reproducibility | Best-effort, **not a guarantee** |
| **logprobs** | Per-token probabilities | Confidence estimation, cheap classification, self-consistency checks |

**Temperature vs top-p:** temperature reshapes the whole distribution; top-p truncates its tail.
Tune one, not both. Top-p is the better default because it adapts — when the model is confident
the nucleus is one token regardless of temperature.

**🔥 Why temperature 0 isn't deterministic.** Batching changes floating-point reduction order,
GPU kernels are non-associative, MoE routing depends on batch composition, and providers silently
update model versions. Temperature 0 is *greedy*, not *reproducible*.

### Context windows

**Advertised ≠ effective.** A model with a 200k window does not use all 200k equally well.

- **Lost in the middle** — retrieval accuracy dips for content in the middle of a long context.
  Put the important material at the start or the end.
- **Needle-in-a-haystack** benchmarks test finding one fact, which is the *easy* case. Reasoning
  over many facts spread across a long context is much harder and degrades earlier.
- **Long context is not free**: quadratic attention cost, larger KV cache, higher TTFT, more money.

**Budget the window explicitly:** system prompt + tool definitions + retrieved context +
conversation history + **reserved output**. The reserved output is the one people forget, and its
absence produces the classic truncated-JSON bug. Detail in
[02-prompting-structured-output.md](02-prompting-structured-output.md).

### Model landscape

`as of 2026-08` — **volatile table, verify before quoting.**

| Axis | The shape of it |
|---|---|
| **Frontier closed** | Claude (Opus/Sonnet/Haiku), GPT, Gemini. Best quality, per-token pricing, no weights |
| **Open weights** | Llama, Mistral, Qwen, DeepSeek, Gemma. Self-hostable, fine-tunable, typically a step behind frontier |
| **Tiers within a family** | Large/small variants at roughly 10–30× price difference. **Routing by task difficulty is the single biggest cost lever** |
| **Reasoning models** | Spend extra "thinking" tokens before answering. Much better at maths/logic/planning; slower and pricier; **you're billed for thinking tokens** |
| **Embedding models** | Separate, far cheaper, encoder-only |
| **Rerankers** | Cross-encoders; priced per document scored |

**Reasoning vs standard — when each:**
- Reasoning: multi-step maths, complex planning, hard debugging, anything where being right matters
  more than being fast.
- Standard: extraction, classification, summarisation, formatting, anything latency-sensitive.
- **Don't chain-of-thought prompt a reasoning model** — it does that internally and telling it to
  "think step by step" can make it worse.

**Open vs closed, the decision:**

| Choose open weights when | Choose an API when |
|---|---|
| Data cannot leave your infrastructure | You want the best quality available |
| You need to fine-tune the actual weights | Traffic is spiky or low |
| Volume is high and steady enough to beat API pricing | You don't want to operate GPUs |
| You need on-device / offline | Time to market matters |
| You need version stability the provider won't guarantee | — |

> 🔗 *Yours:* LACS is the strongest possible answer to "when would you self-host" — a
> disaster-response system that must work with **zero internet dependency** runs on-device ASR
> and TTS because there is no API to call.

### Why models hallucinate — the mechanistic answer

Give the mechanism, not the platitude:

> A language model is trained to produce the most plausible continuation, not the true one. It has
> no separate representation of "I know this" versus "this is a likely-sounding sequence", and the
> training objective rewards a confident, fluent answer over an accurate hedge — because in the
> training data, confident fluent text is what follows a question. So when the parametric
> knowledge is thin, it produces the *shape* of a correct answer with fabricated content, and it
> does so with the same fluency as a correct one. That's why grounding, citations and programmatic
> verification are the fixes — not "asking it to be accurate".

**What actually reduces it:** retrieval grounding, explicit permission to say "I don't know",
citation with verification, low temperature, and structural checks (run the SQL, execute the test,
resolve the reference).

> 🔗 *Yours:* the strongest possible version — repo-intelligence re-reads every cited file from
> disk and refuses the whole answer above 30% dropped claims.

### Classical ML metrics

A GenAI panel will still probe these, especially if your resume mentions ML — and yours does.

| Term | Definition |
|---|---|
| **Precision** | Of what you predicted positive, how much was | TP/(TP+FP) |
| **Recall** | Of what was actually positive, how much you caught | TP/(TP+FN) |
| **F1** | Harmonic mean of the two |
| **Accuracy** | Correct / total — **misleading on imbalanced data** |
| **ROC-AUC** | Ranking quality across all thresholds, using TPR vs FPR |
| **PR-AUC** | Precision vs recall across thresholds |
| **Cross-entropy** | The training loss — `-log(p_correct)` |
| **Softmax** | Turns logits into a probability distribution |

**🔥 PR-AUC vs ROC-AUC on imbalanced data.** ROC-AUC uses the false-positive *rate*, whose
denominator is the (huge) negative class — so a large absolute number of false positives barely
moves it. At 1% positives, a model can look excellent by ROC-AUC and be useless in practice.
PR-AUC's denominator is your predictions, so it degrades honestly. **Use PR-AUC when positives are
rare.**

**Over- vs under-fitting:** overfitting is low training error and high validation error — the
model memorised. Underfitting is high on both. The bias-variance framing: underfit = high bias,
overfit = high variance.

**Train/val/test:** train fits parameters, validation picks hyperparameters, test is touched
**once**. If you tune against your test set it stops being a test set — which is the same argument
as not tuning against your golden eval set in [04-evals.md](04-evals.md).

**Leakage** is the failure that invalidates everything: any information in training that won't
exist at prediction time. In time-series it's the default failure — which is why walk-forward
validation exists.

> 🔗 *Yours:* crypto-ai does **meta-labeling** (a scikit-learn model predicting P(win) as a filter
> on a primary strategy), with **walk-forward** and Monte-Carlo robustness testing precisely to
> avoid leakage and overfitting. drl-trading uses PPO/A2C/SAC on a custom Gymnasium environment
> modelling real NSE costs — STT, GST, slippage, stamp duty — with a risk-adjusted composite reward
> penalising drawdown, concentration and overtrading. Both are genuine ML answers.

---

## Part 2 — Drill

**Cover the answers. Say yours out loud first.**

### Tokens

**1. What's a token?**
> A sub-word unit — roughly four characters or three-quarters of a word in English. The model
> never sees characters; a tokenizer maps text to integer IDs from a fixed vocabulary, usually
> built with byte-pair encoding, which repeatedly merges the most frequent adjacent pair starting
> from raw bytes.

**2. 🔥 Why does Hindi cost more than English for the same sentence?**
> The vocabulary is fit largely on English text, so common English words are single tokens while
> Devanagari fragments into many more — often two to four times as many for the same meaning. That
> hits you twice: direct token cost, and effective context window, since the same document
> consumes far more of the budget. It's a real product concern for an India-facing application,
> and it's a reason to check token counts per language rather than per character.

**3. Why can't a model count the letters in a word?**
> Because it never saw the letters. "strawberry" is two or three tokens, and nothing in the
> representation exposes their character composition. It's a structural limitation, not a
> reasoning failure — which is why the fix is a tool call, not a better prompt.

**4. How do you count tokens before making a call?**
> With the tokenizer for the specific model — `tiktoken` for OpenAI, the provider's count-tokens
> endpoint, or the HuggingFace tokenizer for open models. Counts are **not portable across
> families**, so a `len/4` heuristic is fine for a rough budget and wrong for a hard limit.
>
> 🔗 *Yours:* "In repo-intelligence I use `len/3.6`, measured on source code rather than prose,
> because real tokenisation would mean shipping a tokenizer and paying for it on every chunk at
> index time — to feed a budget that's itself a heuristic."

### Transformers

**5. Explain attention in a minute.**
> Every token produces a query, a key and a value. To compute a token's new representation, its
> query is compared against every other token's key to get a set of weights, and those weights mix
> the values. So each token pulls in information from wherever in the sequence is relevant, rather
> than only from its neighbours. Multi-head means doing that several times in parallel with
> different learned projections, so different heads track different kinds of relationship. Around
> it there's a feed-forward layer, residual connections and normalisation, and you stack the block
> N times.

**6. Why is long context expensive?**
> Attention is quadratic in sequence length — every token attends to every other — so doubling the
> prompt roughly quadruples the attention compute in prefill. On top of that the KV cache grows
> linearly with length and batch, and that memory is usually what limits concurrency on a GPU. So
> long context costs compute, memory and money, and it raises time-to-first-token.

**7. What's positional encoding and why is it needed?**
> Attention is order-blind — permute the input and the raw mechanism gives the same result. So
> position has to be injected. Modern models mostly use rotary embeddings, RoPE, which rotates
> query and key vectors by an angle derived from position, encoding *relative* distance. It's also
> why context-extension techniques work by interpolating those rotations.

**8. Encoder-only vs decoder-only?**
> Decoder-only models use causal attention — each token sees only what came before — which is what
> generation requires. Encoder-only models attend bidirectionally, so every token sees the whole
> input, which is better for producing a single representation of a text. That's why generation
> models are decoders and embedding models and rerankers are encoders.
>
> 🔗 *Yours:* "My embedding models are encoders, my generation models are decoders, and Whisper —
> which I have deployed — is an encoder-decoder."

### KV cache and latency

**9. 🔥 What's the KV cache?**
> During generation, each new token attends to every previous token, so it needs their key and
> value tensors. Rather than recomputing those every step, they're cached. It turns per-token
> generation from recomputing the whole prefix into a single step against stored state. The cost
> is memory: it grows linearly with sequence length and batch size, and on a served model it's
> usually the KV cache, not the weights, that limits how many concurrent requests fit on a GPU.

**10. 🔥 Prefill and decode have different bottlenecks. Explain.**
> Prefill processes the entire prompt in one parallel pass — it's a large matrix multiplication, so
> it's compute-bound. Decode generates one token at a time and each step re-reads the whole KV
> cache, so it's memory-bandwidth-bound rather than compute-bound. The practical consequences:
> time-to-first-token scales with prompt length because that's prefill, while inter-token latency
> is roughly flat. And it's why continuous batching helps so much — during decode the GPU has
> compute to spare.

**11. Why does prompt caching only work on a prefix?**
> Because it's caching the prefill KV state, and that state is causal — token N's keys and values
> depend on everything before it. Change anything early and every subsequent cached tensor is
> invalid. So the cacheable unit is a shared *prefix*, and the design rule is to order your prompt
> static-to-dynamic: system prompt and tool definitions first, user content last.

### Sampling

**12. Temperature vs top-p vs top-k?**
> Temperature scales the logits before the softmax — lower sharpens toward the top token, higher
> flattens the distribution. Top-p samples only from the smallest set of tokens whose cumulative
> probability reaches p, so it adapts: when the model is confident, the nucleus is one token. Top-k
> takes a fixed number regardless of confidence, which is blunter. I'd tune top-p and leave
> temperature low for anything structured, and I wouldn't aggressively tune both at once.

**13. 🔥 You set temperature to 0 and still get different outputs. Why?**
> Because temperature 0 means greedy decoding, not determinism. Floating-point reductions on GPU
> aren't associative, so batch composition changes the arithmetic; mixture-of-experts routing can
> depend on what else is in the batch; and providers update model versions behind a stable alias
> without telling you. Seed parameters are best-effort. So for evals I pin model versions and
> either accept a tolerance band or compare distributions across runs rather than expecting
> byte-identical output.

**14. What are logprobs good for?**
> Confidence. You get per-token probabilities, so you can flag low-confidence outputs for review,
> do cheap classification by comparing the probabilities of a few candidate labels rather than
> generating free text, and detect when the model is guessing. It's underused — a lot of teams
> reach for a second LLM call where a logprob threshold would do.

**15. When do you use frequency vs presence penalty?**
> Frequency penalty scales with how many times a token has already appeared, so it fights literal
> repetition. Presence penalty applies once a token has appeared at all, so it pushes the model
> toward new topics. Repetitive text: frequency. Stuck on one subject: presence. Both are blunt
> and I'd usually fix the prompt first.

### Context

**16. 🔥 Is a bigger context window always better?**
> No. Effective context is shorter than advertised — models attend most reliably to the beginning
> and end, and accuracy dips for material in the middle. Needle-in-a-haystack tests measure finding
> one fact, which is the easy case; reasoning over many facts spread through a long context
> degrades much earlier. And it isn't free: quadratic attention, a bigger KV cache, higher TTFT,
> more money. So I'd rather retrieve well and send five good chunks than stuff thirty and hope.

**17. How do you manage the context window in a long conversation?**
> With an explicit budget: system prompt plus tool definitions plus retrieved context plus history,
> and critically a **reserved allocation for the output** — the missing reserve is what produces
> truncated JSON. Then keep recent turns verbatim and summarise older ones, dropping lowest-value
> content first with a marker so it's visible that something was dropped.
>
> 🔗 *Yours:* "UACE assembles its context packet against a 6000-character budget, appending groups
> in priority order and dropping the lowest priority first with a `…trimmed` marker, plus
> normalised dedupe so the same fact doesn't appear twice."

### Model choice

**18. How do you choose a model for a feature?**
> Start from the requirement: how hard is the reasoning, how tight is the latency budget, what's
> the acceptable cost per request, and does the data have residency or training constraints. Then
> route rather than standardising — classification and extraction go to a small cheap model,
> genuinely hard reasoning goes to a large one. Routing by difficulty is the single biggest cost
> lever available. And I'd validate the choice against an eval rather than a leaderboard.

**19. When would you use a reasoning model?**
> Multi-step maths, complex planning, hard debugging — anywhere being right matters more than being
> fast, and where you can absorb both the latency and the thinking-token bill. Not for extraction,
> classification, formatting or anything latency-sensitive. And I wouldn't chain-of-thought prompt
> one — it reasons internally and telling it to think step by step can degrade it.

**20. 🔥 Open weights or a hosted API?**
> API by default — better quality, no GPUs to operate, and it scales with spiky traffic. Open
> weights when a constraint forces it: data that can't leave your infrastructure, fine-tuning the
> actual weights, on-device or offline operation, version stability the provider won't guarantee,
> or volume high and steady enough that GPU amortisation beats per-token pricing.
>
> 🔗 *Yours:* "LACS is the clean case — a disaster-response system that has to keep working with
> zero internet dependency, so ASR and TTS run on-device. There's no API to call when the network
> is the thing that failed."

**21. What's a token cost model you'd build for a feature?**
> Input tokens times input price plus output tokens times output price, per request, times expected
> volume — and remember output is typically three to five times input price, so generation-heavy
> features cost far more than their prompt length suggests. Then the levers: cache the shared
> prefix, route easy calls to a smaller model, cap `max_tokens`, and trim the prompt.
>
> 🔗 *Yours:* "pSEO computes this per call from the provider's real usage fields and accumulates
> it onto the run in cents, surfaced to the user in dollars."

### Hallucination and ML basics

**22. 🔥 Why do LLMs hallucinate? Mechanistically.**
> Because the objective is plausible continuation, not truth. There's no separate internal signal
> for "I know this" versus "this is a likely-sounding sequence", and the training data rewards
> confident fluent answers — so when parametric knowledge is thin, the model produces the *shape*
> of a correct answer with fabricated content, at the same fluency as a correct one. That's why
> the fixes are structural rather than exhortative: ground in retrieved context, make abstention
> acceptable and reward it in the eval, cite and then verify the citation, and check
> programmatically where you can — run the SQL, resolve the reference, re-read the file.

**23. Precision and recall — and which do you optimise?**
> Precision is what fraction of your positive predictions were right; recall is what fraction of
> actual positives you caught. Which to favour depends entirely on the cost asymmetry — for fraud
> screening or medical triage you want recall, because a miss is expensive; for auto-publishing
> content you want precision, because a false positive is user-visible. F1 when they matter
> roughly equally.

**24. 🔥 Your classes are 1% positive. Why is ROC-AUC misleading?**
> Because the false-positive rate divides by the negative class, which is enormous. A model can
> produce a large absolute number of false positives and barely move FPR, so ROC-AUC stays high
> while the model is useless in practice — for every true positive you surface, you might surface
> fifty false ones. PR-AUC divides by your predictions instead, so it degrades honestly. On rare
> positives, use PR-AUC.

**25. How do you know a model is overfitting, and what do you do?**
> Training error keeps falling while validation error rises. Fixes in order of what I'd try:
> more or better data, regularisation, reducing model capacity, early stopping, and cross-
> validation so the estimate is stable. And for time-series specifically, check for leakage first,
> because it usually looks like great performance rather than like overfitting.
>
> 🔗 *Yours:* "In crypto-ai I use walk-forward validation and Monte-Carlo robustness testing
> precisely because a naive random split leaks future information into training, and a strategy
> that looks profitable under a random split is usually just reading the future."

**26. What is meta-labeling?**
> A two-stage setup: a primary model or rule decides direction, and a secondary classifier predicts
> whether *that* signal will win — so the second model is a filter on the first rather than a
> replacement for it. It's useful because the two problems have different difficulty: predicting
> direction is hard, predicting whether a given signal is trustworthy is easier and it's what
> improves the risk-adjusted return.
>
> 🔗 *Yours:* it's the scikit-learn P(win) filter in crypto-ai.

---

## Rapid-fire

| Term | One-liner |
|---|---|
| Token | Sub-word unit; ~4 chars of English |
| BPE | Vocabulary built by merging frequent adjacent pairs from bytes |
| Logits | Raw pre-softmax scores over the vocabulary |
| Softmax | Turns logits into probabilities |
| Temperature | Scales logits — 0 is greedy, higher is flatter |
| Top-p | Sample from the smallest set summing to p |
| Top-k | Sample from the k most likely |
| Greedy ≠ deterministic | FP non-associativity, batching, silent version updates |
| Attention | Query × keys → weights → mix values |
| Multi-head | Several attention projections in parallel |
| RoPE | Rotary positional encoding — relative position by rotation |
| O(n²) | Attention cost in sequence length |
| Decoder-only | Causal attention — generation |
| Encoder-only | Bidirectional — embeddings, reranking |
| Prefill | Parallel pass over the prompt; compute-bound |
| Decode | One token at a time; memory-bandwidth-bound |
| KV cache | Stored keys/values so decode doesn't recompute the prefix |
| TTFT | Time to first token — dominated by prefill |
| Lost in the middle | Attention degrades for mid-context content |
| Effective context | Usable window, shorter than advertised |
| Reasoning model | Spends billed thinking tokens before answering |
| Open weights | Downloadable — self-hostable and fine-tunable |
| Precision | TP/(TP+FP) |
| Recall | TP/(TP+FN) |
| F1 | Harmonic mean of precision and recall |
| PR-AUC | Preferred over ROC-AUC when positives are rare |
| Cross-entropy | `-log(p_correct)` — the training loss |
| Overfitting | Low train error, high validation error |
| Leakage | Training information unavailable at prediction time |
| Walk-forward | Time-ordered validation that doesn't leak the future |
| Meta-labeling | A classifier that filters a primary signal |

---

## 🔗 Anchors

| Concept | Your project | The sentence to say |
|---|---|---|
| Token estimation tradeoff | repo-intelligence | "`len/3.6`, measured on code not prose — real tokenisation would cost more than the heuristic budget it feeds is worth." |
| Encoders vs decoders | repo-intelligence, LACS | "My embedding models are encoders, my generation models decoders, and Whisper is an encoder-decoder." |
| Context budgeting | UACE | "6000-char packet, priority-ordered, lowest dropped first with a trim marker." |
| Cost arithmetic in production | pSEO | "Per-call cents from the provider's real usage fields, accumulated onto the run and shown to the user." |
| Routing by difficulty | pSEO, Glacier Dev | "Task-keyed model chains — reasoning, coding and formatting each get a different ordered list." |
| Self-host because you must | LACS | "Zero internet dependency, so ASR and TTS run on-device. There's no API to call when the network is what failed." |
| Hallucination mitigation | repo-intelligence | "Cite, then verify the citation against the file on disk, and refuse above 30% dropped." |
| Precision/recall in practice | crypto-ai | "Meta-labeling — a P(win) classifier filtering the primary strategy." |
| Leakage & validation | crypto-ai | "Walk-forward and Monte-Carlo, because a random split on time-series leaks the future." |
| RL fundamentals | drl-trading | "PPO, A2C and SAC on a custom Gymnasium env modelling real NSE costs, with a risk-adjusted composite reward." |

---

## Gaps — what you cannot claim yet

| Gap | The honest script |
|---|---|
| **Training or pretraining a transformer** | "I've never trained one and wouldn't claim to. I understand the architecture well enough to reason about cost, latency and failure modes, which is what my work actually requires." |
| **Attention internals at research depth** | "I can explain the mechanism and its consequences. If you want kernel-level detail on FlashAttention I'd be guessing, and I'd rather say so." |
| **Tokenizer training** | "I've used tokenizers, not built one." |
| **Deep learning theory** | "My hands-on ML is applied — gradient-boosted trees, meta-labeling, and RL with Stable-Baselines3. Not architecture research." |

**Say these cleanly and move on.** One honest gap costs almost nothing; a bluff caught costs the
round. The scripts in
[08-project-grilling.md](../interview-qa/08-project-grilling.md#honest-gaps--kubernetes-aws-kafka)
show the shape.

---

## What's NOT here

| Topic | Doc |
|---|---|
| Prompt caching mechanics and cost math | [02-prompting-structured-output.md](02-prompting-structured-output.md) |
| Quantization, VRAM math, serving engines | [10-model-side.md](10-model-side.md) |
| Fine-tuning, LoRA, DPO | [10-model-side.md](10-model-side.md) |
| Eval metrics for LLM systems | [04-evals.md](04-evals.md) |
| TTFT as an SLO, latency in production | [08-llmops.md](08-llmops.md) |
| Streaming mechanics | [06-streaming-api-mechanics.md](06-streaming-api-mechanics.md) |

---

← Back to [INDEX.md](INDEX.md)
