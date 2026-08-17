# 09 — Multimodal & voice

> **Your moat.** WebRTC and Mediasoup in production, on-device ASR and TTS shipped in a deployed
> system, a fine-tuned Whisper in a serving path, and a barge-in prototype. Very few GenAI
> candidates have both the real-time media depth and shipped speech — most have used a
> transcription API.
>
> Unlike every other file in this track, the Gaps section here is nearly empty. **Volunteer this
> material; don't wait to be asked.**
>
> Part 1 you read. Part 2 you cover and answer out loud. 🔥 = hard or commonly fumbled.

---

## Part 1 — What you actually need to know

### Vision

**Images become tokens.** A model tiles the image and each tile costs tokens, so cost scales with
resolution — often 1k–2.5k tokens for a full-page screenshot. Two consequences: downscale before
sending unless detail matters, and a "cheap" vision feature over many pages is not cheap.

**VLM vs OCR — the decision:**

| | OCR (Tesseract, PaddleOCR, Surya) | Vision model |
|---|---|---|
| Output | Text + bounding boxes | Interpreted, structured |
| Cost | Very low | 10–100× |
| Layout | Needs a separate layout model | Understands it natively |
| Determinism | Deterministic | Not |
| Coordinates | Exact | Approximate or absent |

**The right architecture is usually hybrid:** OCR for extraction where the output is
text-with-coordinates, and a model only for the interpretation step. Bounding boxes matter more
than people expect — they're what lets you cite a location in the source document.

> 🔗 *Yours:* card-selector is exactly this split — a PaddleOCR + OpenCV microservice does
> extraction, Gemini parses the offer text and makes the recommendation. Photo-AI is the pure
> on-device version: SSD MobileNet detection, 68-point landmarks, expression, age/gender and face
> **embeddings** via TensorFlow.js — the same primitive as text embeddings, different modality.

**Document AI** — the real problems are the boring ones: digital PDFs have a text layer and scanned
ones don't (route on detection, don't assume); multi-column layouts read in the wrong order without
layout analysis; **tables are the hard case**, because linearising destroys the row/column
relationship; and you want page and bounding-box coordinates preserved so citations point at a
location. Full pipeline design in [11-ai-system-design.md](11-ai-system-design.md) §7.

### Speech to text

**The model landscape** `as of 2026-08` — verify before quoting:

| Option | Shape |
|---|---|
| **Whisper** (OpenAI, open weights) | tiny → large. Multilingual, strong, **batch-oriented by design** |
| **faster-whisper / CTranslate2** | Same models, much faster inference, quantizable |
| **whisper.cpp** | C++ port — CPU, edge, quantized GGUF |
| **Groq-hosted Whisper** | Very fast hosted inference |
| **Deepgram / AssemblyAI** | Purpose-built streaming, diarisation, low latency |
| **Realtime APIs** | Speech-to-speech, no separate STT step |

**🔥 Streaming vs batch is the distinction people miss.** Whisper is architecturally a batch model —
it transcribes a 30-second window. "Streaming Whisper" means chunking audio and re-transcribing
overlapping windows, which produces **unstable partials** (earlier words change as more context
arrives) and adds latency. Purpose-built streaming ASR emits stable partials incrementally. For a
realtime voice agent that difference is the whole product.

**VAD and endpointing.** VAD detects speech vs silence; **endpointing** decides the user has
*finished*. Endpointing is usually the **largest and most tunable chunk of your latency budget** —
and it's a genuine tradeoff: shorter silence threshold means faster response and more interruptions
of a thinking user; longer means the opposite. Semantic endpointing (is this utterance
syntactically complete?) beats a fixed threshold.

**Other real concerns:** WER as the metric and its limits — a 5% WER that fails on your product
names is worse than an 8% WER that doesn't; **domain biasing** via an initial prompt or a keyword
list; diarisation for multi-speaker; and code-switching, which is a first-order problem for Indian
users mixing English and Hindi mid-sentence and something you can speak to credibly.

### Text to speech

What matters for an agent: **time to first audio** (you can start playing before synthesis
finishes), streaming synthesis sentence by sentence, and prosody quality. Voice cloning is
technically easy and an ethical and legal question — consent and disclosure — worth naming.

**The engineering point:** synthesise per sentence rather than per response, so audio starts after
the first sentence rather than the last. That single decision moves perceived latency more than
model choice.

### 🔥 Realtime voice architecture

**The latency budget IS the design.** Target under ~800 ms perceived response:

| Stage | Budget | Notes |
|---|---|---|
| Network + jitter buffer | 50–100 ms | WebRTC territory |
| VAD + endpointing | **100–300 ms** | Biggest, most tunable |
| STT (streaming) | 50–150 ms | After endpoint, if partials already streamed |
| LLM TTFT | 200–400 ms | Model tier matters enormously here |
| TTS first audio | 100–200 ms | Streaming synthesis |

**Everything must overlap.** STT streams partials, the LLM starts on the partial transcript, TTS
starts on the first sentence. Run these in series and you're at two seconds and the conversation
feels dead.

**🔥 Cascade vs speech-to-speech:**

| | Cascade (STT → LLM → TTS) | Speech-to-speech |
|---|---|---|
| Latency | Accumulated | Lower |
| Prosody | Lost — the LLM sees text | Preserved (tone, emotion) |
| Transcript | Free, for logging/eval/compliance | Needs separate transcription |
| Tool calling | Mature | Improving |
| Component choice | Swap any stage independently | Locked to one provider |
| Debuggability | Each stage inspectable | Opaque |

**Most production systems still choose cascade**, and the reason is observability and control, not
quality. Say that — it's the senior read.

### 🔥 Barge-in

When the user starts speaking while the agent is talking, you must cancel **three** things:

1. **TTS playback** — stop the audio immediately.
2. **In-flight TTS synthesis** — stop paying for audio nobody will hear.
3. **In-flight LLM generation** — stop paying for tokens nobody will hear.

**And the one everybody forgets: truncate the conversation history to what the user actually
heard,** not what was generated. Otherwise the agent's next turn references something it never
said out loud, and the conversation desynchronises in a way that's very hard to debug.

**Echo cancellation is a precondition** — without AEC the agent detects its own output as
barge-in and interrupts itself in a loop.

Also: **false barge-in** from background noise or a backchannel "mhm" — you generally don't want
"uh-huh" to interrupt.

### Transport

WebRTC for realtime audio: Opus codec, jitter buffer, packet-loss concealment, and NAT traversal
via STUN/TURN. WebSocket audio is simpler and worse under loss and jitter — no adaptive jitter
buffer, no concealment. For telephony you're bridging SIP/PSTN into the same pipeline.

Detail in [interview-qa/07-specialities.md](../interview-qa/07-specialities.md), which you already
have.

### Frameworks

`as of 2026-08`

| Tool | What it is |
|---|---|
| **Pipecat** | Open-source realtime voice pipeline framework |
| **LiveKit Agents** | Agents on LiveKit's WebRTC infrastructure |
| **Vapi / Retell** | Managed voice-agent platforms with telephony |
| **OpenAI Realtime API** | Speech-to-speech over WebRTC/WebSocket |
| **Twilio Media Streams** | Telephony audio into your own pipeline |

### Tool calls in a conversation create dead air

A tool call taking two seconds is fine in chat and unacceptable in voice. Mitigations: emit filler
speech ("let me check that"), start speaking the part of the answer that doesn't depend on the
tool, or pre-fetch likely lookups. Naming this shows you've thought about voice as a product, not
just a pipeline.

---

## Part 2 — Drill

**1. How do images cost tokens?**
> The model tiles the image and each tile costs tokens, so cost scales with resolution — a
> full-page screenshot is often one to two and a half thousand tokens. So I downscale before
> sending unless fine detail matters, and I'm careful about calling a vision feature "cheap" when
> it runs over many pages.

**2. 🔥 OCR or a vision model for document extraction?**
> Usually both, split by job. OCR is cheap, deterministic and gives me **bounding boxes**, which is
> what lets a citation point at a location in the original — a vision model gives approximate
> coordinates at best. So OCR does extraction and a model does interpretation. I'd route to a
> vision model for the cases OCR genuinely can't handle: complex layouts, handwriting, tables where
> structure matters.
>
> 🔗 *Yours:* "That's exactly how I built card-selector — a PaddleOCR and OpenCV microservice
> extracts, and Gemini parses the offer text and makes the recommendation."

**3. What's hard about PDFs?**
> That "PDF" isn't one format. Digital PDFs have a text layer and scanned ones don't, so you detect
> and route rather than assume — a parser that works on one fails silently on the other. Multi-
> column layouts read in the wrong order without layout analysis. And tables are the genuinely hard
> case, because linearising them destroys the row/column relationship that carries the meaning.
> Plus you want page and bounding-box coordinates preserved throughout, or you can't cite.

**4. 🔥 Is Whisper suitable for a realtime voice agent?**
> Not directly, and this is the distinction people miss. Whisper is architecturally a batch model —
> it transcribes a thirty-second window. "Streaming Whisper" means chunking audio and
> re-transcribing overlapping windows, which gives you **unstable partials** where earlier words
> change as more context arrives, plus added latency. For a voice agent I'd use purpose-built
> streaming ASR that emits stable partials incrementally. Whisper is excellent for batch
> transcription and for on-device where you control the tradeoff.
>
> 🔗 *Yours:* "In LACS Whisper is the right choice, because it's on-device and the requirement is
> accuracy offline rather than sub-second turn-taking. In jarvis I used Groq-hosted Whisper for
> speed, which is a different way of solving the same problem."

**5. VAD versus endpointing?**
> VAD tells me whether there's speech in this audio frame. Endpointing decides the user has
> *finished their turn*, which is a much harder judgement and usually the **largest tunable chunk
> of my latency budget**. It's a real tradeoff: a shorter silence threshold responds faster and
> interrupts people who are thinking; longer feels laggy. Semantic endpointing — is this utterance
> syntactically complete — beats a fixed silence threshold, because "I want to book a…" and "I want
> to book a flight" have the same pause and different meanings.

**6. What's wrong with WER as a metric?**
> It weights every word equally and your product doesn't. A five percent WER that consistently
> mangles your product names or the digits in an order number is worse than an eight percent WER
> that doesn't. So I'd measure WER on the entities that matter — a keyword or slot-level accuracy —
> alongside the overall number, and use domain biasing through an initial prompt or keyword list to
> fix the specific failures.

**7. 🔥 Design a voice agent. What's the latency budget?**
> Under about 800 milliseconds perceived, or the conversation feels dead. Roughly: 50 to 100 for
> network and jitter buffer, 100 to 300 for VAD and endpointing which is the biggest and most
> tunable piece, 50 to 150 for streaming STT after the endpoint, 200 to 400 for LLM time-to-first-
> token, and 100 to 200 for first audio out of TTS. The critical insight is that these **must
> overlap** — STT streams partials, the LLM starts on the partial transcript, TTS starts on the
> first sentence rather than the full response. Run them in series and you're at two seconds.

**8. 🔥 Cascade or speech-to-speech?**
> Cascade, for most production systems, and the reason is observability rather than quality.
> Cascade gives me a text transcript for free — logging, evals, compliance, tool calls — and lets
> me swap any stage independently. Speech-to-speech is lower latency and preserves prosody, which
> genuinely matters for naturalness, at the cost of a transcript I have to generate separately,
> weaker tool support and being locked to one provider. If the product is emotional or
> conversational I'd revisit it; if it takes actions and gets audited, cascade.

**9. 🔥 The user interrupts the agent. What has to happen?**
> Three cancellations and one thing everybody forgets. Stop TTS playback immediately. Cancel the
> in-flight TTS synthesis, so I'm not paying for audio nobody will hear. Cancel the in-flight LLM
> generation, same reason. And then **truncate the conversation history to what the user actually
> heard**, not what was generated — otherwise the agent's next turn references something it never
> said out loud, and the conversation desynchronises in a way that's genuinely hard to debug from
> logs.
>
> ↳ **If pushed — what makes barge-in possible at all?** "Echo cancellation. Without AEC the agent
> hears its own output, detects it as barge-in, and interrupts itself in a loop."

**10. What's false barge-in?**
> Background noise or a backchannel — someone saying "mhm" or "right" while listening — triggering
> an interrupt. You generally don't want an agreement noise to stop the agent mid-sentence, so it
> needs an energy and duration threshold, and ideally a classifier that distinguishes a
> backchannel from a genuine interruption.

**11. WebRTC or WebSocket for audio?**
> WebRTC, for anything realtime. It gives me an adaptive jitter buffer, packet-loss concealment,
> Opus, and NAT traversal — all of which matter over a real network. WebSocket audio is simpler and
> degrades badly under loss and jitter because none of that machinery exists. For telephony I'd
> bridge SIP or PSTN into the same pipeline.
>
> 🔗 *Yours:* "This is home ground — I've run Mediasoup in production for multimodal comms in a
> deployed system, and published a WebRTC SDK to npm."

**12. A tool call takes two seconds. What does the user hear?**
> Silence, unless I've designed for it — and dead air in voice reads as a broken call, not as
> thinking. So: filler speech, "let me look that up", which is what a human does; or start speaking
> the part of the answer that doesn't depend on the tool result; or pre-fetch likely lookups during
> the user's turn. It's the difference between treating voice as a pipeline and treating it as a
> conversation.

**13. 🔥 Why does LACS run speech on-device?**
> Because it's a disaster-response system and it has to work with **zero internet dependency** —
> you cannot call a speech API when the network is the thing that failed. So the models run locally
> on field mini-PCs, quantized to fit the hardware, with engine selection at deploy time. That
> constraint drives everything: model size, quantization level, engine choice, and how you ship an
> update to a machine you can't reliably reach.

**14. How do you serve ASR on constrained hardware?**
> Quantized models through an optimised runtime — whisper.cpp for CPU with GGUF quantization, or
> CTranslate2 with faster-whisper. You pick the model size against the accuracy you actually need
> rather than the best available, because a large model that can't keep up in real time is worse
> than a small one that can.
>
> 🔗 *Yours:* "LACS supports multiple engines resolved at runtime — whisper.cpp and faster-whisper —
> with a model resolver that scans a configured directory for a CTranslate2 model, supporting
> either a single directory or several selectable ones. That indirection exists so a field unit can
> run a different model without a code change."

**15. What's code-switching and why does it matter to you?**
> Users mixing languages within a sentence — for Indian users, English and Hindi constantly. Most
> ASR models are configured per-language and degrade badly on it, and it's not an edge case here,
> it's the normal case. It's also a tokenisation cost issue on the LLM side, since Devanagari
> fragments into far more tokens than the equivalent English.

**16. Have you fine-tuned a speech model?**
> A fine-tuned Whisper-small is deployed in our ASR serving path, converted to CTranslate2 for
> faster-whisper, and I own the serving side of that — engine selection, the quantized export, the
> finetune slot in the resolver, and the hallucination mitigation we had to add when the fine-tuned
> model started producing confident wrong transcripts on silence. What I can't give you is the
> training methodology, the dataset composition or a WER number — that record doesn't exist in a
> form I can defend, and the CT2 conversion merges any adapter into the base weights so the
> artifact can't tell me either. I'd rather say that than guess.

**17. What's the multimodal thing you'd build next?**
> A voice interface over retrieval, because it sits exactly on top of what I already have — WebRTC
> transport, on-device speech, and a retrieval system I've measured. The interesting problem there
> isn't the pipeline, it's that voice can't show citations. So the grounding has to be spoken —
> "according to the deployment runbook" — and abstention matters far more, because a user can't
> skim a spoken answer for the hedge.

---

## Rapid-fire

| Term | One-liner |
|---|---|
| Image tokens | Images are tiled; cost scales with resolution |
| VLM | Vision-language model — interprets, doesn't give exact coordinates |
| OCR | Cheap, deterministic, gives bounding boxes |
| Bounding box | What lets you cite a location in the source |
| Text layer | What a digital PDF has and a scanned one doesn't |
| Whisper | Open-weight ASR, batch-oriented by architecture |
| faster-whisper / CT2 | Same models, faster inference, quantizable |
| whisper.cpp | CPU/edge port with GGUF quantization |
| Streaming ASR | Emits stable partials incrementally — not Whisper's design |
| Unstable partials | Earlier words change as more audio arrives |
| VAD | Is there speech in this frame |
| Endpointing | Has the user finished — the biggest latency lever |
| Semantic endpointing | Is the utterance syntactically complete |
| WER | Word error rate — weights all words equally, which yours aren't |
| Domain biasing | Prompt or keyword list to fix specific ASR failures |
| Diarisation | Who spoke when |
| Code-switching | Mixing languages mid-sentence — the normal case in India |
| Time to first audio | The TTS equivalent of TTFT |
| Sentence-wise synthesis | Start speaking after sentence one, not the last |
| Cascade | STT → LLM → TTS |
| Speech-to-speech | One model, lower latency, no free transcript |
| Barge-in | User interrupts — cancel playback, synthesis **and** generation |
| History truncation | Trim to what the user *heard*, not what was generated |
| AEC | Echo cancellation — without it the agent interrupts itself |
| False barge-in | Noise or a backchannel triggering an interrupt |
| Dead air | Silence during a tool call — reads as a broken call |
| Opus | The realtime audio codec |
| Jitter buffer | Absorbs network variance; WebSocket audio has none |

---

## 🔗 Anchors

| Concept | Your project | The sentence to say |
|---|---|---|
| **On-device speech under constraint** | LACS | "Zero internet dependency — you can't call a speech API when the network is what failed." |
| Multi-engine ASR serving | LACS | "whisper.cpp and faster-whisper resolved at runtime, with a finetune slot the resolver scans for." |
| Deployed fine-tuned ASR | LACS | "A fine-tuned Whisper-small in the serving path — I own the serving, not the training record." |
| Debugging a fine-tune in prod | LACS | "We added a no-fallback flag specifically to stop finetune hallucinations on silence." |
| Realtime transport | LACS, StreamVerse | "Mediasoup in production, and a published WebRTC SDK on npm." |
| Barge-in prototype | jarvis | "A Tauri shell over Groq Whisper and a streaming LLM, built to feel out the latency budget." |
| Hybrid CV + model | card-selector | "PaddleOCR and OpenCV extract; Gemini interprets. Deterministic where a rule works." |
| On-device CV | Photo-AI | "face-api and TensorFlow.js — detection, landmarks, and face embeddings, all local." |
| Multimodal embeddings | Photo-AI | "Face embeddings are the same primitive as text embeddings, different modality." |

---

## Gaps — deliberately short

| Gap | The honest script |
|---|---|
| **Production voice agent at scale** | "I've shipped the components — WebRTC transport, on-device ASR/TTS, a barge-in prototype — not a customer-facing voice agent under load." |
| **Purpose-built streaming ASR** | "Whisper and Groq-hosted Whisper. I haven't run Deepgram or AssemblyAI, and I know why you'd want them for turn-taking." |
| **Pipecat / LiveKit Agents** | "Haven't used the voice-agent frameworks. I've built the layer underneath them, which is an unusual place to be." |
| **Image generation** | "Not something I've worked on and not something I'd claim." |

**Everything else in this file you can claim.** This is the one topic where you are ahead of the
market rather than catching up — so raise it yourself rather than waiting to be asked.

---

## What's NOT here

| Topic | Doc |
|---|---|
| WebRTC signalling, ICE/STUN/TURN, SFU vs MCU, simulcast | [interview-qa/07-specialities.md](../interview-qa/07-specialities.md) |
| The Whisper fine-tune claim boundary in full | [10-model-side.md](10-model-side.md) |
| Quantization and edge serving generally | [10-model-side.md](10-model-side.md) |
| SSE, cancellation, streaming plumbing | [06-streaming-api-mechanics.md](06-streaming-api-mechanics.md) |
| Designing a voice agent or ingestion pipeline as an HLD | [11-ai-system-design.md](11-ai-system-design.md) §6, §7 |
| LACS sync and deployment | [interview-qa/08-project-grilling.md](../interview-qa/08-project-grilling.md) |

---

← Back to [INDEX.md](INDEX.md)
