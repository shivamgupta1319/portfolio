# 10 — Model side

> Fine-tuning, quantization and serving — at **interview-answer depth**, by your choice. The goal
> is not to make you an ML researcher. It is to make you unembarrassable, and to give you clean
> honest scripts where the gap is real.
>
> This is your **weakest flavour** and that's fine. "I've done classical ML and RL properly, I own
> the serving side of a deployed fine-tuned model, and I haven't fine-tuned an LLM" is a much
> stronger position than a bluff.
>
> Part 1 you read. Part 2 you cover and answer out loud. 🔥 = hard or commonly fumbled.

---

## Part 1 — What you actually need to know

### 🔥 The decision ladder — the most important thing in this file

When someone says "should we fine-tune?", the answer is almost always "not yet". Walk the ladder:

```
1. Better prompt            free, minutes
2. Few-shot examples        cheap, hours
3. RAG                      moderate, days          ← most "we need fine-tuning" problems stop here
4. Tools / function calling moderate, days
5. Fine-tune                expensive, weeks
6. Pretrain                 don't
```

**The distinction that decides it:**

> **RAG changes what the model knows. Fine-tuning changes how it behaves.**

So fine-tuning is right for **format, style, tone, domain vocabulary, a narrow repeated task, and
latency/cost** (a fine-tuned small model beating a prompted large one). It is wrong for **facts** —
if the knowledge changes, or has to be cited, or is user-specific, that's retrieval.

**The other honest reasons not to:** you inherit a model you must host and re-tune on every base
upgrade, you lose the frontier model's general capability, and you now need an eval to know whether
it worked — which most teams asking for a fine-tune don't have.

### The training stages

| Stage | What it does |
|---|---|
| **Pretraining** | Next-token prediction on a huge corpus → the base model |
| **SFT** | Supervised fine-tuning on instruction/response pairs → follows instructions |
| **Preference optimisation** | Aligns to human preference → helpful, harmless, formatted |

**Preference methods**, in the order they arrived: **RLHF/PPO** — train a reward model on human
comparisons, then RL against it; powerful, complex, unstable. **DPO** — skip the reward model and
optimise directly on preference pairs; far simpler, near-equivalent results, now the default. Then
**ORPO**, **KTO**, **GRPO** as variants (KTO needs only good/bad labels rather than pairs).

**The one-liner:** *"DPO replaced RLHF for most practical work because it removes the reward model
and the RL loop — same objective, an order of magnitude less machinery."*

### PEFT and LoRA

Full fine-tuning updates every weight: you need optimiser states and gradients for all of them, so
roughly **12–16 bytes per parameter** of VRAM. A 7B model is ~100 GB. Not a laptop.

**LoRA** freezes the base weights and injects small trainable low-rank matrices into the attention
(and optionally MLP) projections. Instead of a `d × d` update you train `d × r` and `r × d` where
`r` is small — typically 8 to 64. You train **well under 1%** of the parameters.

| Knob | Meaning |
|---|---|
| **`r` (rank)** | Adapter capacity. 8–16 for style, 32–64 for harder tasks |
| **`alpha`** | Scaling. Convention: `alpha = 2r` |
| **target modules** | Which projections get adapters — attention q/v is the common minimum |
| **dropout** | Regularisation on the adapter |

**QLoRA** = LoRA on top of a 4-bit quantized base. The base is frozen so quantizing it costs little
quality, and it's what makes single-consumer-GPU fine-tuning of a 7B model possible.

**Two operational properties worth naming:**
- **Adapters merge** back into the base weights for inference, so there's no latency penalty.
- **Multi-LoRA serving** — one base model in memory, many adapters swapped per request. That's how
  you serve per-customer fine-tunes economically.

### Datasets — where fine-tunes actually fail

**Quality beats quantity, decisively.** A few hundred to a few thousand *excellent, consistent*
examples beats tens of thousands of noisy ones. The most common failure is not too little data —
it's **inconsistent** data, where examples disagree about the format or the desired behaviour, so
the model learns the inconsistency.

Also: match the **chat template** exactly (a template mismatch between training and inference
silently destroys quality); dedupe; **decontaminate** against your eval set; hold out a real test
split; and if you generate data from a stronger model, check the licence.

**Catastrophic forgetting** — the model gets better at your task and worse at everything else. LoRA
reduces it (the base is frozen), a lower learning rate reduces it, and mixing in some general data
reduces it. **You only detect it if you evaluate beyond your target task**, which is the point.

### 🔥 Evaluating a fine-tune

The single most-skipped step, and the one that makes the difference between "I ran a Colab
notebook" and "I fine-tuned a model".

**Baseline first: base model + a good prompt + few-shot.** If your fine-tune doesn't beat that,
you've spent weeks for nothing — and this happens constantly. Then a held-out test set the model
never saw, a check for regression on general capability, and the real question: **latency and cost
versus the prompted alternative**, since that's often the actual justification.

### The higher-ROI fine-tune nobody does

**Fine-tuning the embedding model or the reranker usually beats fine-tuning the generator** for a
RAG system. Retrieval is where quality dies, embedding models are small and cheap to train, and you
need only (query, relevant passage) pairs — which your click logs already contain. Contrastive
training with **hard negatives** (plausible-but-wrong passages, which is what makes it work) on a
few thousand pairs can move recall substantially.

Saying this unprompted is a strong signal: it shows you think about where the marginal gain is
rather than reaching for the fashionable lever.

### Quantization

Reducing weight precision to save memory and increase speed.

| Format | Where |
|---|---|
| **FP16 / BF16** | Standard serving precision. BF16 has more range, less mantissa |
| **FP8** | Newer hardware, near-lossless |
| **INT8** | ~2× smaller, small quality cost |
| **INT4** | ~4× smaller, noticeable on hard tasks, fine for many |

| Method | Where |
|---|---|
| **GGUF** | llama.cpp — CPU and edge |
| **AWQ** | Activation-aware, good quality at 4-bit, GPU |
| **GPTQ** | Post-training quantization, GPU |
| **bitsandbytes** | Convenient in Transformers, used by QLoRA |

**Quality loss is task-dependent** — summarisation degrades gracefully, multi-step reasoning and
code degrade first. And **quantization is a change**: run the eval.

> 🔗 *Yours:* repo-intelligence defaults its embedding model to **q8** with the explicit reasoning
> that fp32 was 1.85 s/chunk and 11 minutes for a 60-file repo — "whether q8 costs retrieval
> quality is a question the eval harness can answer, so it is measured rather than assumed." And
> LACS runs quantized ASR on field hardware.

### Serving

| Engine | For |
|---|---|
| **vLLM** | The default for GPU serving. PagedAttention + continuous batching |
| **TGI** | HuggingFace's server |
| **SGLang** | Fast, strong on structured output and prefix caching |
| **TensorRT-LLM** | NVIDIA, fastest, most work to set up |
| **Ollama** | Local dev — llama.cpp with a nice interface |
| **llama.cpp** | CPU and edge, GGUF |

**The two ideas worth understanding:**

- **PagedAttention** — the KV cache is allocated in fixed-size pages like OS virtual memory instead
  of one contiguous block per sequence. That removes the fragmentation and over-allocation that
  otherwise wastes most of your KV memory, so you fit far more concurrent sequences.
- **Continuous batching** — instead of waiting for a whole batch to finish, finished sequences are
  evicted and new requests join mid-flight. Because decode is memory-bandwidth-bound and leaves
  compute idle, this raises throughput enormously at almost no latency cost.

### VRAM math

**Weights:** `params × bytes_per_param`. FP16 = 2 bytes → a 7B model is ~14 GB; 4-bit → ~3.5 GB.

**KV cache**, the part people forget and the part that actually limits concurrency:

```
kv_bytes ≈ 2 × layers × kv_heads × head_dim × bytes × seq_len × batch
```

The `2` is K and V. **GQA/MQA** shrink this by sharing key/value heads across query heads — often
4–8× — which is why modern models use them.

**Worked example**, 7B-ish (32 layers, 8 KV heads, head_dim 128, FP16):
per token ≈ `2 × 32 × 8 × 128 × 2` = **131 KB**. At 4k context that's ~0.5 GB **per sequence**. So
16 concurrent 4k sequences is ~8.5 GB of KV on top of 14 GB of weights — and you can see immediately
why a 24 GB card runs out on concurrency, not on weights.

**The takeaway to say out loud:** *"Weights determine whether the model fits. KV cache determines
how many users you can serve."*

### Self-host vs API

**Break-even math:** API cost = tokens × price. Self-host cost = GPU-hours × rate ÷ utilisation.
The trap is **utilisation** — a GPU at 10% utilisation is 10× its sticker cost per token, so spiky
traffic almost never beats an API.

| Self-host when | API when |
|---|---|
| Data cannot leave your infrastructure | You want frontier quality |
| You need a fine-tuned model served | Traffic is spiky or low |
| High, steady volume with good utilisation | You don't want to operate GPUs |
| On-device / offline is a requirement | Time to market matters |
| Version stability the provider won't guarantee | — |

**Also real, and often decisive:** cold starts (loading a 14 GB model takes tens of seconds, so
scale-to-zero is painful), autoscaling GPUs is slow and scarce, and spot instances are cheap and
can vanish mid-request.

> 🔗 *Yours:* LACS is the clean self-host case — zero internet dependency, so there is no API to
> call.

### Your classical ML and RL

Real, and an applied-ML round will probe it.

**crypto-ai** — 12 long/short strategies through one engine, a scikit-learn **meta-label P(win)
filter**, regime detection, and **walk-forward + Monte-Carlo + out-of-sample** robustness testing.

**Meta-labeling**: a primary rule decides direction, a secondary classifier predicts whether *that*
signal will win. The two problems have different difficulty — predicting direction is hard,
predicting whether a signal is trustworthy is easier — and the second is what improves the
risk-adjusted return.

**Validation is the whole value.** A random split on time-series leaks the future and makes any
strategy look profitable. Walk-forward validates in time order; Monte-Carlo resampling checks the
result isn't one lucky path.

**drl-trading** — PPO / A2C / SAC via Stable-Baselines3 on a **custom Gymnasium environment**
modelling real NSE costs (STT, GST, slippage, stamp duty), with a risk-adjusted composite reward
penalising drawdown, concentration and overtrading.

**RL vocabulary:** state/action/reward/policy/value; on-policy (PPO, A2C) vs off-policy (SAC);
PPO's clipped objective keeps updates small so training doesn't collapse; **reward shaping** is
where the design work is, and modelling real costs is exactly that — an agent trained without
slippage learns to overtrade and looks brilliant in simulation.

### 🔥 The Whisper story — exact claim boundaries

**What is true and defensible:**

A fine-tuned **Whisper-small** (244M params, fp16, multilingual, 12 decoder layers) converted to
**CTranslate2** is deployed in the LACS speech-recognition serving path. The resolver scans a
configured directory for a CT2 model and supports either a single directory or several selectable
ones. Infra documents `WHISPER_NO_FALLBACK` existing **"to stop finetune hallucinations"** — so the
fine-tune was deployed and its failure modes were debugged in production.

**What does not exist anywhere in your workspace:** the training script, the dataset, the
hyperparameters, a WER number, or any record of the method. And CT2 conversion **merges any adapter
into the base weights**, so the artifact itself cannot tell you whether it was a full fine-tune or
LoRA.

**The script — say this and stop:**

> "A fine-tuned Whisper-small is deployed in our ASR serving path. I own the **serving** side of
> it — engine selection between whisper.cpp and faster-whisper, the quantized CTranslate2 export,
> the finetune slot in the model resolver, and the hallucination mitigation we added when the
> fine-tuned model started producing confident wrong transcripts on silence. What I can't give you
> is the training methodology, the dataset composition or a WER number, because that record doesn't
> exist in a form I can defend — and the CT2 conversion merges any adapter into the base weights,
> so the artifact can't tell me either. I'd rather say that than guess at it."

**Never say:** "I fine-tuned Whisper using [method]" · any WER or accuracy number · any dataset
size · "I have LoRA experience" *(and see below)*.

> ⚠️ **`~/workspace/lora` is LoRa radio.** An EBYTE E220-900JP transceiver driver for the LACS
> stack — pyserial, spreading factor, packet fragmentation. No torch, no peft. If you ever say "I
> have a LoRA project" and an interviewer opens it, the round is over. Say **LoRa radio / embedded
> RF**, or don't mention it.

---

## Part 2 — Drill

**1. 🔥 Should we fine-tune?**
> Almost certainly not yet, and I'd walk the ladder before agreeing. Better prompt, few-shot, RAG,
> tools, and only then fine-tuning. The distinction that decides it is that **RAG changes what the
> model knows and fine-tuning changes how it behaves** — so if the requirement is facts, especially
> facts that change or need citing, it's retrieval. If it's format, tone, domain vocabulary, a
> narrow repeated task, or getting a small model to do a large model's job cheaply, then
> fine-tuning is the right tool. And I'd want to know whether they have an eval, because without
> one you can't tell whether the fine-tune helped.

**2. What can't fine-tuning do?**
> Reliably teach facts. It shifts the distribution, so the model gets better at *sounding* like
> your domain without acquiring a retrievable, citable, updatable knowledge base — and it will
> confidently produce plausible wrong specifics. Anything that changes, needs attribution, or is
> user-specific belongs in retrieval.

**3. Walk me through the training stages.**
> Pretraining is next-token prediction on a huge corpus, producing a base model that completes text
> but doesn't follow instructions. Supervised fine-tuning on instruction/response pairs makes it
> follow instructions. Then preference optimisation aligns it to human preference — historically
> RLHF, where you train a reward model on human comparisons and do RL against it, and now mostly
> DPO, which optimises directly on preference pairs and skips the reward model and the RL loop
> entirely. Same objective, an order of magnitude less machinery.

**4. 🔥 Explain LoRA.**
> Full fine-tuning updates every weight and needs optimiser states and gradients for all of them —
> roughly twelve to sixteen bytes per parameter, so a 7B model is about 100 GB of VRAM. LoRA
> freezes the base and injects small trainable low-rank matrices into the attention projections:
> instead of a `d × d` update you train `d × r` and `r × d` with `r` typically 8 to 64, so you're
> training well under 1% of the parameters. Two operational properties matter — the adapters
> **merge** into the base for inference so there's no latency penalty, and you can serve one base
> model with many adapters swapped per request, which is how per-customer fine-tunes become
> economic.

**5. What's QLoRA?**
> LoRA on top of a 4-bit quantized base. The base is frozen, so quantizing it costs little quality,
> and it's what brings fine-tuning a 7B model onto a single consumer GPU.

**6. What do `r` and `alpha` do?**
> `r` is the rank — the adapter's capacity. Low, 8 to 16, for style and format; higher, 32 to 64,
> for harder task adaptation. Too high and you're closer to full fine-tuning with its overfitting
> risk on a small dataset. `alpha` scales the adapter's contribution, conventionally set to twice
> `r`. And which modules you target matters — attention query and value projections are the common
> minimum, adding the MLP projections increases capacity and cost.

**7. RLHF vs DPO?**
> RLHF trains a separate reward model on human comparisons and then does reinforcement learning —
> usually PPO — against it. Powerful, and complex and unstable: you're training two models and RL
> is fiddly. DPO reformulates it so you optimise the policy directly on preference pairs with a
> simple loss, no reward model and no RL loop, and gets comparable results. That's why it became
> the default for practical work.

**8. 🔥 How much data do you need?**
> Less than people expect, and better than people manage. A few hundred to a few thousand excellent
> consistent examples beats tens of thousands of noisy ones. The most common failure I'd look for
> isn't too little data — it's **inconsistent** data, where examples disagree about format or
> desired behaviour, and the model faithfully learns the inconsistency. I'd also check the chat
> template matches inference exactly, because a template mismatch silently destroys quality, and
> decontaminate against the eval set.

**9. What is catastrophic forgetting?**
> The model gets better at your task and worse at everything else, because you've shifted the
> weights toward a narrow distribution. LoRA reduces it since the base is frozen, as do a lower
> learning rate and mixing in general data. The important part is that **you only detect it if you
> evaluate beyond your target task** — if your eval is only the fine-tuned task, it looks like a
> pure win.

**10. 🔥 How do you know a fine-tune worked?**
> Against the right baseline, which is the step people skip: base model plus a good prompt plus
> few-shot examples. If the fine-tune doesn't beat *that*, weeks were spent for nothing, and it
> happens constantly. Then a held-out test set the model never saw, a general-capability check for
> forgetting, and the comparison that's usually the real justification — latency and cost against
> the prompted alternative.

**11. We fine-tuned and it got worse. What happened?**
> Most likely the data. Inconsistent examples, a chat template mismatch between training and
> inference, or a dataset that doesn't represent the real input distribution. Then overfitting — a
> small dataset with too high a rank or too many epochs, which memorises. Then catastrophic
> forgetting, if it's worse on things adjacent to the task. And sometimes the baseline was just
> good: the prompted frontier model was already better and nobody measured it first.

**12. 🔥 What would you fine-tune first in a RAG system?**
> The embedding model or the reranker, not the generator — and that's the answer most people don't
> give. Retrieval is where RAG quality actually dies, embedding models are small and cheap to
> train, and the training data is (query, relevant passage) pairs, which click logs already contain.
> Contrastive training with **hard negatives** — plausible-but-wrong passages, which is what makes
> it work — on a few thousand pairs can move recall meaningfully for a fraction of the cost of
> fine-tuning a generator.

**13. What is distillation?**
> Training a smaller model on a larger one's outputs — the outputs are richer supervision than raw
> labels. It pays when you have a large model that works and can't afford to serve it, and you're
> trading a little quality for a lot of cost and latency. Watch the licence on the teacher's
> outputs.

**14. Explain quantization and its cost.**
> Reducing weight precision to cut memory and increase speed. FP16 or BF16 is standard serving
> precision; INT8 roughly halves it at small quality cost; INT4 quarters it with a noticeable cost
> that's fine for many tasks. Method depends on target — GGUF for llama.cpp on CPU and edge, AWQ or
> GPTQ for GPU. The important nuance is that quality loss is **task-dependent**: summarisation
> degrades gracefully, multi-step reasoning and code degrade first. So quantization is a change
> like any other and it gets an eval.
>
> 🔗 *Yours:* "I default my embedding model to q8 for exactly this reason — fp32 was 1.85 seconds
> per chunk, eleven minutes for a sixty-file repo, which made the measurement that justifies the
> project too expensive to take. Whether q8 costs retrieval quality is a question my eval harness
> can answer, so I measured it rather than assuming."

**15. 🔥 What does vLLM do?**
> Two things that matter. **PagedAttention** allocates the KV cache in fixed-size pages like OS
> virtual memory rather than one contiguous block per sequence, which removes the fragmentation and
> over-allocation that otherwise wastes most of your KV memory — so you fit far more concurrent
> sequences on the same card. And **continuous batching**: instead of waiting for a whole batch to
> finish, finished sequences are evicted and new requests join mid-flight. Since decode is
> memory-bandwidth-bound and leaves compute idle, that raises throughput enormously at almost no
> latency cost.

**16. 🔥 Can I run a 7B model on a 24 GB card?**
> The weights, easily — 7 billion parameters at FP16 is about 14 GB, and 4-bit is about 3.5. The
> real question is concurrency, because the **KV cache** is what fills the rest. Roughly, KV bytes
> are 2 — for K and V — times layers, times KV heads, times head dimension, times bytes, times
> sequence length, times batch. For a typical 7B that's about 131 KB per token, so a 4k-context
> sequence is around half a gigabyte **each**. Sixteen concurrent 4k sequences is another 8.5 GB on
> top of the weights. So: weights determine whether the model fits, KV cache determines how many
> users you can serve.
>
> ↳ **If pushed — how do you get more?** "GQA or MQA if the model has it, which shrinks KV four to
> eight times by sharing key/value heads. Quantize the weights to free room for KV. Cap the context
> length. Or accept lower concurrency."

**17. 🔥 Self-host or use an API?**
> API by default, and the maths usually agrees. API cost is tokens times price; self-host cost is
> GPU-hours divided by **utilisation** — and utilisation is the trap, because a GPU at 10% is ten
> times its sticker cost per token, so spiky traffic almost never beats an API. Self-host when a
> constraint forces it: data that can't leave your infrastructure, serving a fine-tuned model,
> on-device or offline operation, version stability the provider won't guarantee, or genuinely
> high steady volume. And I'd factor in the operational cost people leave out — cold starts of tens
> of seconds when loading a large model, slow and scarce GPU autoscaling, and spot instances that
> can vanish mid-request.
>
> 🔗 *Yours:* "LACS is the clean case — a disaster-response system that has to work with zero
> internet dependency. There is no API to call when the network is what failed."

**18. Precision, recall, and which matters?**
> Precision is what fraction of positive predictions were right; recall is what fraction of actual
> positives you caught. Which you optimise depends entirely on cost asymmetry — recall for fraud
> screening or triage where a miss is expensive, precision for anything auto-published where a
> false positive is user-visible.

**19. Explain meta-labeling.**
> A primary model or rule decides direction, and a secondary classifier predicts whether that
> particular signal will win — so the second model filters the first rather than replacing it. It
> works because the two problems have different difficulty: predicting direction is hard,
> predicting whether a given signal is trustworthy is easier, and filtering out the bad signals is
> what improves the risk-adjusted return.
>
> 🔗 *Yours:* it's the scikit-learn P(win) filter in crypto-ai.

**20. 🔥 Why walk-forward validation?**
> Because a random train/test split on time series leaks the future into training, and a strategy
> validated that way looks profitable and isn't — it's reading answers. Walk-forward trains on a
> window and tests on the next period in time order, rolling forward, which is what deployment
> actually looks like. On top of that I use Monte-Carlo resampling to check the result isn't a
> single lucky path, and an out-of-sample holdout.

**21. What did you learn from the RL work?**
> That the reward function is where the design is. An agent trained without real costs — slippage,
> taxes, stamp duty — learns to overtrade and looks brilliant in simulation, so I modelled those
> explicitly in the Gymnasium environment and used a risk-adjusted composite reward penalising
> drawdown, concentration and overtrading. On algorithms: PPO and A2C are on-policy, SAC is
> off-policy and more sample-efficient; PPO's clipped objective keeps updates small so training
> doesn't collapse, which is why it's the default. And the honest caveat — it's paper-traded and
> backtested, not live-capital-validated at scale, and the reward is hand-designed judgement rather
> than a principled objective.

**22. 🔥 Have you fine-tuned a model?**
> Use the script above, verbatim. Serving side yes, training methodology no, and say why the record
> doesn't exist rather than guessing.

**23. Have you served a model on GPUs?**
> No, and I'd say so plainly. I've served quantized ASR models on constrained edge hardware, which
> is the same set of tradeoffs at a different scale — model size against accuracy, quantization
> level, engine choice, keeping up in real time. I understand the GPU serving stack — vLLM,
> PagedAttention, continuous batching, KV cache sizing — and I haven't operated a fleet. Running a
> quantized model locally and measuring throughput at two quantization levels is an afternoon, and
> it's on my list precisely so I can stop answering this with theory.

**24. What would you build to close this gap?**
> A LoRA fine-tune on a task I already have data for, **evaluated against a base-plus-prompt
> baseline** — and the evaluation is the point, not the fine-tune. Plenty of people have run a Colab
> notebook; very few can tell you whether it beat the baseline and by how much. Then serve a
> quantized model locally and measure tokens per second at two quantization levels. Between them
> that's about three days and it converts "never" into "measured" on the two claims I currently
> can't make.

---

## Rapid-fire

| Term | One-liner |
|---|---|
| RAG vs fine-tuning | What it knows vs how it behaves |
| SFT | Supervised fine-tuning on instruction/response pairs |
| RLHF | Reward model + RL against it |
| DPO | Direct preference optimisation — no reward model, no RL loop |
| ORPO / KTO / GRPO | DPO-family variants; KTO needs good/bad, not pairs |
| PEFT | Parameter-efficient fine-tuning — the family |
| LoRA | Frozen base + trainable low-rank adapters |
| `r` / rank | Adapter capacity — 8–16 style, 32–64 harder tasks |
| `alpha` | Adapter scaling; convention `2r` |
| QLoRA | LoRA on a 4-bit quantized base |
| Adapter merging | Fold into base weights — no inference penalty |
| Multi-LoRA serving | One base, many adapters swapped per request |
| Chat template mismatch | Silent quality destroyer |
| Decontamination | Removing eval data from training data |
| Catastrophic forgetting | Better at your task, worse at everything else |
| Base + prompt baseline | The comparison that decides if the fine-tune was worth it |
| Hard negatives | Plausible-but-wrong passages — what makes embedding training work |
| Distillation | Small model trained on a large model's outputs |
| FP16 / BF16 | Standard serving precision |
| INT8 / INT4 | 2× / 4× smaller; reasoning and code degrade first |
| GGUF | llama.cpp format — CPU and edge |
| AWQ / GPTQ | GPU 4-bit quantization methods |
| vLLM | The default GPU serving engine |
| PagedAttention | KV cache in pages — kills fragmentation |
| Continuous batching | Requests join and leave mid-flight |
| GQA / MQA | Shared KV heads — 4–8× smaller KV cache |
| KV cache sizing | What limits concurrency, not weights |
| Utilisation | The number that decides self-host vs API |
| Cold start | Tens of seconds to load a large model |
| Meta-labeling | Classifier filtering a primary signal |
| Walk-forward | Time-ordered validation that doesn't leak |
| PPO / A2C / SAC | On-policy, on-policy, off-policy |
| Reward shaping | Where the RL design work actually is |

---

## 🔗 Anchors

| Concept | Your project | The sentence to say |
|---|---|---|
| Quantization decided by measurement | repo-intelligence | "q8 by default; fp32 was 1.85 s/chunk and made the measurement that justifies the project too expensive to take." |
| Edge serving | LACS | "Quantized ASR on field mini-PCs — whisper.cpp and faster-whisper resolved at runtime." |
| Deployed fine-tune (serving side) | LACS | "I own the serving: engine selection, the CT2 export, the finetune slot, and the hallucination mitigation." |
| Self-host because you must | LACS | "Zero internet dependency. There's no API to call when the network is what failed." |
| Applied ML done properly | crypto-ai | "Meta-labeling with walk-forward and Monte-Carlo, because a random split on time-series leaks the future." |
| RL with real constraints | drl-trading | "PPO/A2C/SAC on a custom Gymnasium env modelling STT, GST, slippage and stamp duty — an agent trained without costs learns to overtrade." |
| Local inference | UACE, Photo-AI | "CPU embeddings via transformers.js, and on-device CV with TensorFlow.js — no API, no key, no data leaving." |

---

## Gaps — the honest inventory

| Gap | The script |
|---|---|
| **LLM fine-tuning** | "I haven't fine-tuned an LLM and I won't claim I have. I've done supervised ML and RL properly, and I own the serving side of a deployed fine-tuned ASR model. The thing I'd do to close it is a LoRA run evaluated against a base-plus-prompt baseline — where the evaluation is the point." |
| **The Whisper training record** | The full script above. Serving yes, methodology no, and say why. |
| **GPU serving in production** | "No GPU fleet. I've served quantized models on constrained edge hardware, which is the same tradeoffs at a different scale. I understand vLLM, PagedAttention, continuous batching and KV sizing — as theory, and I'd say so." |
| **RLHF / DPO hands-on** | "I can explain why DPO displaced RLHF. I've run PPO and SAC in a trading environment, not preference optimisation on a language model." |
| **Training a transformer** | "Never, and I wouldn't claim to. I understand the architecture well enough to reason about cost, latency and failure modes, which is what my work requires." |
| **`~/workspace/lora`** | **It is LoRa radio.** Never present it as ML. |

**This is the flavour where you say "I don't know" most often — and that is the correct play.** One
honest gap costs almost nothing. One bluff caught costs the round, and this is the topic where a
specialist interviewer will catch it in two follow-ups.

---

## What's NOT here

| Topic | Doc |
|---|---|
| Attention, KV cache, sampling, classical-ML metrics | [01-foundations.md](01-foundations.md) |
| When to reach for RAG instead | [03-rag.md](03-rag.md) |
| Evaluating anything, including a fine-tune | [04-evals.md](04-evals.md) |
| ASR/TTS, voice latency, the LACS speech stack | [09-multimodal-voice.md](09-multimodal-voice.md) |
| Inference cost and routing in production | [08-llmops.md](08-llmops.md) |
| The crypto-ai / drl-trading project write-ups | [14-deepdive-projects.md](14-deepdive-projects.md) |

---

← Back to [INDEX.md](INDEX.md)
