# 00 — Curriculum

> **Schedule only. No teaching content.** This file tells you what to study, in what order, and
> what each tier unlocks you to claim. The explanations live in files 01–15.
>
> Same split as [dsa-6-month-plan.md](../dsa-6-month-plan.md) (schedule) vs
> [interview-qa/09–10](../interview-qa/09-coding-arrays-strings.md) (content). If you find
> yourself explaining a concept in this file, it belongs in another one.

---

## Start here — self-assessment

Score each statement 0 (no) / 1 (roughly) / 2 (could explain it to an interviewer for 5 minutes).

**Ground**
1. I can explain what a token is and why Hindi costs more tokens than English.
2. I can explain the difference between temperature, top-p and top-k.
3. I can explain what the KV cache is and why prefill and decode have different bottlenecks.
4. I can explain precision, recall and F1, and when PR-AUC beats ROC-AUC.
5. I can explain mechanically why an LLM hallucinates.

**Product**
6. I can name three ways to get structured output and say when each fails.
7. I can compute the cost saving from prompt caching on a given prompt.
8. I can explain chunking strategies beyond fixed-size windows.
9. I can explain what happens to a RAG system when the embedding model changes.
10. I can explain why a permission filter applied after retrieval collapses recall.

**Systems**
11. I can name five agent patterns and say when a workflow beats an agent.
12. I can explain how an agent resumes after the process crashes mid-run.
13. I can explain how I'd sandbox a tool that runs shell commands.
14. I can define faithfulness, context precision and MRR without looking them up.
15. I can describe how I'd gate a prompt change on an eval in CI.

**Platform**
16. I can explain phase-specific timeouts and why one total timeout is wrong for streaming.
17. I can attribute LLM cost per tenant and per feature.
18. I can explain indirect prompt injection through a RAG corpus.
19. I can compute KV-cache memory and VRAM for a given model and batch size.
20. I can state the break-even point between self-hosting and an API.

**Scoring**

| Total | Start at |
|---|---|
| 0–14 | Tier 0 |
| 15–24 | Tier 1 |
| 25–32 | Tier 2 |
| 33+ | Tier 3, and go straight to the build tasks |

Re-score at the end of every tier. If a tier doesn't move its own questions to 2, repeat it
rather than advancing — this curriculum is short enough to afford that.

---

## The tier ladder

Twelve weeks at ~6 hrs/week. Compresses to 6 weeks at ~12 hrs/week if you have a live process.

### Tier 0 — Ground · Weeks 1–2

| Read | Then |
|---|---|
| [01-foundations.md](01-foundations.md) Part 1 | Drill Part 1's questions aloud |
| [02-prompting-structured-output.md](02-prompting-structured-output.md) Part 1, §output contracts | — |

**Build task:** take the [trading-agent](14-deepdive-projects.md#trading-agent) system prompt and
count its tokens with a real tokenizer. Then compute what one conversation costs, cached and
uncached.

**Unlocks:** you can survive a foundations screen and talk about cost without hand-waving.

---

### Tier 1 — Product · Weeks 3–5

The tier that matters most for the roles you should be targeting.

| Read | Then |
|---|---|
| [02-prompting-structured-output.md](02-prompting-structured-output.md) in full | Drill |
| [03-rag.md](03-rag.md) in full — this is the biggest file, give it two weeks | Drill |
| [04-evals.md](04-evals.md) in full | Drill |
| [13-deepdive-repo-intelligence.md](13-deepdive-repo-intelligence.md) | Say the 3-minute pitch aloud, timed |

**Build tasks**
- [ ] Add a **reranker** to `repo-intelligence` retrieval and run `ri eval` before and after.
      Whatever the delta, you now have a second measured result to talk about.
- [ ] Add **prompt versioning** to pSEO — a `version` column on `template`, pinned per run.
      This closes the single most embarrassing gap in your portfolio (nothing you own versions
      its prompts).

**Unlocks:** *"I gate retrieval changes on an eval delta"* — and now you can say it about two
changes, not one. Plus you can stop saying "no" to "do you version your prompts?"

---

### Tier 2 — Systems · Weeks 6–8

| Read | Then |
|---|---|
| [05-agents.md](05-agents.md) in full | Drill |
| [07-safety-guardrails.md](07-safety-guardrails.md) | Drill |
| [08-llmops.md](08-llmops.md) | Drill |
| [14-deepdive-projects.md](14-deepdive-projects.md) | Say four project pitches aloud, 90s each |

**Build tasks**
- [ ] Fix the **zero-vector bug** in AgentSystem (`packages/memory/src/embeddings.ts` returns a
      1536-dim zero array on embedding failure, silently poisoning Qdrant). Fixing a bug you
      found yourself is a better story than never having had it.
- [ ] Add an **approval gate** to one destructive tool in AgentSystem, modelled on the
      confirm-gated `send_reply` you already built in Inbox Agent. You then have HITL in two
      projects instead of one.
- [ ] Add a **step + token budget** with a loop-breaker to the AgentSystem executor.
- [ ] **Rebuild one existing agent loop in LangGraph** — the trading agent is the right size.
      Typed state, a tool node, a conditional edge back to the agent, a checkpointer, and
      `interrupt_before` on one tool. One day. This is the only honest way to stop saying "I
      haven't used LangChain", and it closes the durable-resume and HITL gaps in the same sitting.
- [ ] **Delete the unused `langchain` dependencies from `jarvis/package.json`.** They're declared
      and never imported. Ten minutes, and it removes a padding signal from a public repo.

**Unlocks:** HITL gates, budget enforcement, an owned-and-fixed bug story, and a defensible
LangGraph claim. Removes four "never shipped this" gaps from the ledger in
[INDEX.md](INDEX.md#honest-capability-ledger).

**→ Fork here.** After Tier 2 you are interview-ready for AI product and agentic roles. Pick a
lane rather than continuing as a generalist:

- **Chasing product/agentic roles?** Go to Tiers R (rounds) and stop. Tiers 3–4 are optional.
- **Chasing platform/infra roles?** Tier 3 next.
- **Chasing model-side roles?** Tier 4 next, and accept it's a longer game.

---

### Tier R — Rounds · any time after Tier 2

Not a knowledge tier — a format tier. Do these against a timer.

| Read | Then |
|---|---|
| [11-ai-system-design.md](11-ai-system-design.md) | One design per week, whiteboarded in 40 min, cold |
| [12-ai-machine-coding.md](12-ai-machine-coding.md) | One drill per week, 90-min timer, tests passing |
| [06-streaming-api-mechanics.md](06-streaming-api-mechanics.md) | Drill |
| [15-positioning-stories.md](15-positioning-stories.md) | Record yourself telling three stories |

**Priority order for the designs:** LLM gateway → AI coding assistant → agent platform →
enterprise RAG with permissions. The first two are near-transcriptions of systems you built.

**Priority order for the drills:** agent loop → resilient LLM client → hybrid retrieval with RRF
→ TPM limiter. Same reasoning.

---

### Tier 3 — Platform · Weeks 9–10

| Read | Then |
|---|---|
| [08-llmops.md](08-llmops.md) again, now as design input | — |
| [10-model-side.md](10-model-side.md) §serving, quantization, VRAM math | Drill |

**Build tasks**
- [ ] Add **per-tenant token and cost attribution** to pSEO. It already tracks cost per run;
      make it per user and enforce a monthly token budget, not just a page quota.
- [ ] Run a quantized model locally with **Ollama or llama.cpp** and measure tokens/sec at two
      quantization levels. One afternoon. Converts "never" to "measured" on the ledger.

**Unlocks:** you can answer the self-host break-even question with a number you took yourself.

---

### Tier 4 — Model side · Weeks 11–12

The weakest area, kept last deliberately — highest study cost, lowest near-term interview yield.

| Read | Then |
|---|---|
| [10-model-side.md](10-model-side.md) in full | Drill |
| [01-foundations.md](01-foundations.md) §classical ML, again | — |

**Build task (the one that actually closes the gap):** fine-tune a small model with **LoRA** on a
task you already have data for, and **evaluate it against a base+prompt baseline**. The
evaluation is the point, not the fine-tune — plenty of candidates have run a Colab notebook;
very few can say whether it beat the baseline and by how much.

**Unlocks:** the only honest path from "I have never fine-tuned an LLM" to a claim.

> **Also do this in Tier 4:** write down what you actually remember about the Whisper-small
> fine-tune — the data source, the sample count, the method, whether anyone measured WER. The
> artifact is deployed but the training record is gone from your workspace. Anything you can
> reconstruct and defend widens what you can claim in
> [10-model-side.md](10-model-side.md#the-whisper-story).

---

### Parallel lane — Voice · any time

[09-multimodal-voice.md](09-multimodal-voice.md) sits outside the ladder because it is the one
area where you are **ahead of the market**, not behind it. WebRTC depth plus shipped on-device
ASR/TTS plus a deployed fine-tuned Whisper is a combination most GenAI candidates do not have.

Read it early if you are targeting voice/realtime AI companies. Read it late otherwise. Either
way, read it before any onsite — it is a differentiator you can volunteer.

---

## Build-task ledger

Every build task above, in one table, with what it buys you.

| # | Task | Tier | Effort | Unlocks the claim |
|---|---|---|---|---|
| 1 | Token-count + cost a real prompt | 0 | 1 hr | Cost fluency |
| 2 | Reranker in repo-intelligence, eval'd | 1 | 1 day | "Two measured retrieval changes" |
| 3 | Prompt versioning in pSEO | 1 | half day | "My prompts are versioned artifacts" |
| 4 | Fix AgentSystem zero-vector bug | 2 | 2 hrs | An owned-bug story |
| 5 | Approval gate on a destructive tool | 2 | half day | "I ship HITL gates" |
| 6 | Step + token budget with loop-breaker | 2 | 2 hrs | "I bound agent cost and runaway loops" |
| 6b | **Rebuild the trading agent in LangGraph** | 2 | 1 day | **"I've used LangGraph — checkpointers and interrupts"** |
| 6c | Delete unused `langchain` deps from jarvis | 2 | 10 min | Removes a padding signal |
| 7 | Per-tenant cost attribution in pSEO | 3 | 1 day | "Per-tenant LLM cost accounting" |
| 8 | Local quantized model, measured | 3 | half day | "Measured quantized inference throughput" |
| 9 | LoRA fine-tune vs base+prompt baseline | 4 | 2 days | "I fine-tuned and evaluated a model" |

**If you only do three:** 2, 3 and 5. They close the three gaps most likely to be probed in an
AI product or agentic loop.

---

## How this fits with the DSA plan

Real conflict, so name it rather than pretending both fit.

[dsa-6-month-plan.md](../dsa-6-month-plan.md) wants ~120 problems over 6 months. This wants ~12
weeks. Running both at full intensity is ~12 hrs/week and you have a full-time job.

**The split that works:**

| | Weekdays | Weekend |
|---|---|---|
| **Weeks 1–8** | 1 DSA problem/day (~45 min) | This curriculum, one tier segment |
| **Weeks 9+** | 2 DSA problems/day | Tier R — designs and drills against a timer |

**And ignore one instruction in the DSA plan.** It says to spend the Month-2 slack week
*"earning a Kubernetes or AWS keyword"* ([dsa-6-month-plan.md:95](../dsa-6-month-plan.md)). That
is correct advice for a generic SDE-2 target and **wrong for a GenAI target**. Spend that week on
build tasks 2, 3 and 5 instead. A reranker you evaluated is worth more in a GenAI loop than an
EKS deployment you did once.

DSA is still the entry gate — do not drop it. It is just no longer where your marginal hour has
the highest return.

---

## Progress tracker

| Tier | Started | Finished | Self-assessment score | Build tasks done |
|---|---|---|---|---|
| 0 — Ground | | | | |
| 1 — Product | | | | |
| 2 — Systems | | | | |
| R — Rounds | | | | |
| 3 — Platform | | | | |
| 4 — Model side | | | | |
| Voice (parallel) | | | | |

---

## Resources — capped at 12 on purpose

You will not read forty links. These are the ones worth the time.

**Primary — read these**
1. Anthropic, *Building effective agents* — the patterns vocabulary interviewers use.
2. Anthropic, *Contextual Retrieval* — the single highest-ROI RAG technique to be able to explain.
3. OpenAI, *A practical guide to building agents*.
4. Your provider's docs on structured outputs, tool use and prompt caching — read the actual API
   reference, not a blog summary. Mechanics get asked; blog takes don't.
5. Lilian Weng, *LLM Powered Autonomous Agents* — the canonical survey.

**Reference — dip into**
6. RAGAS docs — metric definitions, so you use them the way the field does.
7. Pinecone / Weaviate learning centres — hybrid search and reranking explainers.
8. vLLM docs — PagedAttention and continuous batching, enough to explain them.
9. Hugging Face PEFT docs — LoRA config in practice.
10. OWASP Top 10 for LLM Applications — the shared vocabulary in any safety round.

**Practice**
11. Your own repos. `repo-intelligence`, pSEO and AgentSystem will teach you more per hour than
    any course, because you can change them and measure the result.
12. One eval-tool tutorial end to end — promptfoo or RAGAS. Doing it once beats reading about
    five of them.

> Everything else — courses, paper lists, YouTube series — is optional and mostly a way of
> feeling productive without becoming more hireable.

---

← Back to [INDEX.md](INDEX.md)
