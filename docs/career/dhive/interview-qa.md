# Interview Q&A — D.Hive, Full-Stack Software Engineer (Cloud Platform)

> Two virtual technical rounds after an HR screen. The JD calls video streaming **mandatory**, so
> assume §1–§4 is where the round is actually scored, and everything else is confirmation.
>
> Same conventions as [`../interview-qa/INDEX.md`](../interview-qa/INDEX.md):
> **↳ If pushed** is the follow-up that's coming · 🔗 *Yours* anchors the concept to real work of
> yours · 🔥 marks the ones you'll get asked.
>
> **Never read the answer first.** Cover it, say it out loud, then compare. Mark ✅ / ⚠️ / ❌ in the
> tracker at the bottom and only re-drill ⚠️ and ❌.

**Contents:** [1 Streaming fundamentals](#1--video-streaming-fundamentals) ·
[2 Multi-source ingest](#2--multi-source-ingest-architecture) ·
[3 Recording & retrieval](#3--recording-storage-and-retrieval) ·
[4 AI video recognition](#4--ai-video-recognition) ·
[5 Real-time messaging & MQTT](#5--real-time-messaging-and-mqtt) ·
[6 AWS & data modelling](#6--aws-and-data-modelling) ·
[7 React monitoring UI](#7--react-front-end-for-monitoring) ·
[8 GPS & LiDAR](#8--sensor-data-gps-and-lidar) ·
[9 Multi-tenancy & fleet](#9--multi-tenancy-device-fleet-and-security) ·
[10 Project grilling](#10--project-grilling) ·
[11 Behavioural & positioning](#11--behavioural-and-positioning) ·
[12 Honest gaps](#12--honest-gaps) ·
[13 Questions to ask them](#13--questions-to-ask-them)

---

## 1 · Video streaming fundamentals

**Q. 🔥 Walk me through RTMP, RTSP, WebRTC and HLS. When do you reach for each?**

> Four protocols, three jobs. **RTSP** is a control protocol for pulling from a device — every IP
> camera and NVR speaks it, so it's how you get a fixed camera into your system. **RTMP** is a
> TCP-based ingest protocol — a device or encoder pushes a stream to your server. It's old, it's
> effectively frozen, but every encoder on earth still speaks it, so it's the default uplink for
> "push a stream up to the cloud." **WebRTC** is the only one built for conversational latency —
> sub-second, UDP, with congestion control, jitter buffering and loss recovery built in; it's what
> you use when a human is in the control loop, like driving a robot. **HLS** is not really streaming,
> it's segmented files over HTTP — high latency, but it scales to any audience over a plain CDN and
> plays everywhere.
>
> The rough rule I use: **RTSP or RTMP in, WebRTC for live control, HLS for everyone else and for
> replay.** For a robot control platform you'd likely want all three paths, because the operator
> driving the robot has a completely different latency requirement from the safety manager reviewing
> yesterday's footage.

↳ **If pushed — quantify the latency:** WebRTC is 100–500 ms glass to glass. RTMP ingest is roughly
1–3 seconds. HLS with default 6-second segments and a 3-segment buffer is 15–30 seconds; low-latency
HLS with partial segments gets you to 2–5 seconds. That spread is the whole reason you don't pick one
protocol for everything.

🔗 *Yours:* LACS runs Mediasoup for the live conversational path and pulls RTSP from fixed cameras —
the two coexist because they're solving different problems.

---

**Q. 🔥 P2P vs SFU vs MCU. Which would you pick for a monitoring platform with 20 robots and 5 operators?**

> **P2P** is a mesh — every participant sends to every other participant. Upload cost is O(n) per
> sender, so it collapses past three or four people. **MCU** decodes everything server-side, composes
> one mixed stream and sends a single stream out — cheapest for the client, brutally expensive on the
> server because you're transcoding. **SFU** doesn't decode: it takes each incoming stream and
> selectively forwards packets to the people who want them. One upload per sender, server cost is
> mostly bandwidth rather than CPU.
>
> For 20 robots and 5 operators it's an SFU, and it isn't close. The robots each publish once, and the
> SFU fans out only what each operator has actually subscribed to — if an operator is looking at a
> 4-up grid, they consume four streams, not twenty. That subscription model is the whole point: your
> cost tracks what people are watching, not what's being produced.

↳ **If pushed — how do you keep the operator's bandwidth sane?** Simulcast. Each robot publishes two
or three encodings of the same video — say 1080p, 480p and 180p — and the SFU picks a layer per
consumer. Grid view gets the low layer, the operator clicks one tile to fullscreen and the SFU
switches that consumer to the high layer. No re-encoding anywhere, and the switch is a packet
selection decision, not a pipeline change.

🔗 *Yours:* This is exactly the Mediasoup model — producers, consumers and transports — which is what
StreamVerse wraps.

---

**Q. What actually happens when you `getUserMedia` and end up with video on the far side? Name the steps.**

> Capture, then signalling, then connectivity, then media. You get a `MediaStream` from
> `getUserMedia`. You create an `RTCPeerConnection`, add the tracks, and generate an SDP offer that
> describes the codecs, resolutions and extensions you support. That offer goes over **your own**
> signalling channel — WebRTC deliberately doesn't specify one, so in practice it's a WebSocket. The
> far side answers with its own SDP. Meanwhile both sides gather ICE candidates — host addresses,
> server-reflexive addresses from STUN, and relay addresses from TURN — exchange them, and run
> connectivity checks to find a working path. Once a candidate pair succeeds, DTLS handshakes to
> derive keys, and media flows as SRTP.
>
> The part people forget is that signalling is your problem, not WebRTC's. Every reconnect,
> renegotiation and permission decision runs through code you wrote.

↳ **If pushed — why does TURN exist and what does it cost you?** Symmetric NAT and restrictive
corporate firewalls mean the two peers genuinely cannot reach each other directly. TURN relays the
media through a server, which works everywhere but means you're paying for and forwarding the full
media bitrate. On a construction site behind a customer's firewall, plan for a meaningful share of
sessions to relay — that's a budget line, not an edge case.

---

**Q. 🔥 A live feed from a robot on LTE is stuttering. How do you debug it?**

> I'd find out where it's dying before touching anything, and `getStats()` on the peer connection
> tells you that. I look at four numbers. **Packets lost** and **jitter** on the inbound stream tell
> me the network is hurting. **`framesDropped` vs `framesDecoded`** tells me the receiver can't keep
> up — that's CPU, not network. **Available outgoing bitrate** and the encoder's
> `qualityLimitationReason` tell me whether the sender is throttling itself, and whether it's blaming
> bandwidth, CPU or resolution. And I'd check the **jitter buffer delay**, because a growing buffer is
> the receiver trading latency for smoothness.
>
> If it's the uplink — which on LTE it usually is — the fix isn't "send more", it's degrade
> gracefully: drop to a lower simulcast layer, lower the framerate before the resolution because
> motion blur reads worse than a smaller picture, and make sure the encoder is actually allowed to
> adapt rather than pinned to a fixed bitrate.

↳ **If pushed — what if it's only one robot?** Then it's that device or that link, and I'd compare its
stats against a healthy one on the same site before assuming the platform is at fault. Same feed, same
server, different outcome, means the variable is local.

🔗 *Yours:* The LACS field systems run on constrained links by definition — that's the whole premise of
a disaster-response deployment — so degradation behaviour was a design input, not an afterthought.

---

**Q. NACK, PLI, FEC — what are they and when does each one help?**

> They're three different answers to packet loss. **NACK** is "I didn't get packet 4021, send it
> again" — cheap and precise, but only useful if the round trip is short enough that the
> retransmission arrives before the frame is due. **PLI** — picture loss indication — is the receiver
> saying "I'm lost, send me a keyframe." It fixes the picture immediately but a keyframe is large, so
> a storm of PLIs on a bad link makes congestion worse. **FEC** sends redundant data proactively, so
> the receiver can reconstruct without asking — it costs bandwidth on every packet including the ones
> that would have arrived fine, but it's the only one that works when the round trip is too long for
> retransmission.
>
> Short RTT and light loss: NACK. Long RTT or bursty loss: FEC. PLI is the recovery of last resort.

---

**Q. Why does keyframe interval decide how well your recordings seek?**

> Because you can only start decoding at a keyframe. A GOP — group of pictures — starts with an
> I-frame that stands alone, followed by P- and B-frames that only describe changes. If your keyframe
> interval is 2 seconds, then every seek lands on a 2-second boundary, or the player has to fetch the
> previous keyframe and decode forward to get there. If you segment recordings for HLS, the segment
> boundary has to *be* a keyframe, so the keyframe interval sets your minimum segment length, which
> sets your minimum latency.
>
> So it's a three-way trade: short GOPs give you fine-grained seeking and low-latency segments, but
> keyframes are expensive, so you pay in bitrate. On a bandwidth-starved robot uplink that's a real
> decision, not a default.

↳ **If pushed — what would you pick for their product?** For live monitoring over a constrained
uplink, longer GOPs to save bitrate. For the recorded-review path, I'd rather re-segment server-side
than force the robot to spend uplink on keyframes it doesn't need.

---

**Q. H.264, VP8, VP9, AV1 — how do you choose?**

> Mostly by what the hardware can do. **H.264** is the safe answer: hardware encode and decode on
> essentially every camera, phone and SBC, and it's what IP cameras emit natively, so it's the only
> codec where you can hope to avoid transcoding an RTSP feed. **VP8** is the WebRTC baseline and
> royalty-free but weaker. **VP9** and especially **AV1** give substantially better quality per bit —
> AV1 is genuinely attractive on a starved uplink — but encoding is expensive and hardware support on
> embedded devices is spotty.
>
> For a robot platform I'd default to H.264 end to end specifically so recording is a remux rather
> than a transcode, and revisit AV1 only if uplink cost becomes the binding constraint and the device
> has hardware support.

---

## 2 · Multi-source ingest architecture

**Q. 🔥 Design it. Robots, drones and site CCTV all send video to your cloud. Multiple clients. Operators watch live and review recordings later. Go.**

> I'd split it into five stages and be explicit that live and recorded are different paths.
>
> **1 — Edge.** Each site gets a gateway. Cameras are pulled over RTSP locally; robots and drones push
> over the uplink. Doing this at the edge matters because site CCTV usually isn't reachable from the
> internet, and because if the uplink drops I want the gateway to keep recording locally and
> backfill later rather than losing the footage.
>
> **2 — Ingest.** One ingest tier that accepts RTMP push and WebRTC, normalises everything to H.264,
> and authenticates the device — device identity per robot, not a shared key.
>
> **3 — Fan-out.** An SFU for the live path, so operators subscribe to the streams they're actually
> watching, with simulcast so a grid view is cheap. Separately, an HLS path for anyone who just wants
> to watch and doesn't need sub-second latency.
>
> **4 — Recorder and inference.** The recorder segments to object storage. Inference is a separate
> consumer of the same stream — decoupled deliberately, so a model that falls over doesn't take live
> monitoring down with it. Detections go to the database as events with timestamps and a reference
> back into the recording.
>
> **5 — Control plane.** The API and database: clients, sites, robots, users, permissions, event
> history. Everything is scoped by tenant, and the storage key layout mirrors the query pattern —
> client, then site, then robot, then time.
>
> The thing I'd emphasise: **recording, live view and inference all consume the same ingest
> independently.** They fail independently and scale independently, and that's worth the extra moving
> parts.

↳ **If pushed — what's the hardest part?** Not the happy path. It's that the sources are
heterogeneous and unreliable in different ways. A drone's link drops when it goes behind a building. A
CCTV camera reboots and comes back with a different SPS/PPS. A robot's clock drifts. Every one of
those breaks a naive "one pipeline for all sources" design, which is why the gateway normalises before
anything downstream sees it.

↳ **If pushed — where does it break at scale?** Inference cost, long before bandwidth. Running
detection on every frame of every camera is the line item that doesn't fit, which is §4.

---

**Q. How do you keep video and telemetry in sync when they arrive on different paths?**

> You don't trust arrival time — you timestamp at the source and reconcile at the edge. Every frame
> and every sensor sample carries a device timestamp, and the gateway keeps a clock offset per device
> so it can map device time to a common timeline. Then storage is keyed by that common timeline, not
> by when the packet showed up.
>
> The failure everyone hits is assuming device clocks are right. They drift, they jump when NTP
> corrects them, and a robot that's been offline for an hour comes back with a clock that's simply
> wrong. So the offset has to be maintained continuously and applied at read time, and I'd store the
> raw device timestamp alongside the corrected one so a bad correction is recoverable rather than
> baked in.

🔗 *Yours:* This is the same class of problem as the offline-first edge↔cloud sync in LACS — the edge
keeps writing while disconnected, and reconciliation on reconnect has to be deterministic, not
last-write-wins.

---

**Q. 🔥 The uplink drops mid-recording. What happens?**

> Three things, and they're decided in advance, not at failure time. **The recording continues at the
> edge** — the gateway writes segments locally regardless of connectivity, so the footage exists even
> though the cloud can't see it yet. **The live view degrades honestly** — the operator sees a clear
> "link lost at 14:32" state, not a frozen last frame pretending to be live, because on a safety
> product a stale frame that looks live is dangerous. **On reconnect, backfill is a queue** — the
> gateway uploads the missing segments in order, with the recording marked incomplete until the
> backfill closes the gap, so a reviewer can tell the difference between "nothing happened" and "we
> didn't have the data yet."
>
> The design principle is that the gap is a first-class state you can query, not an absence.

↳ **If pushed — how much local buffer?** Whatever the expected worst-case outage is, times the
bitrate, with a ring buffer that overwrites oldest-first and an alert when it starts overwriting.
Silently losing the oldest footage without telling anyone is worse than running out of disk.

---

**Q. How do you handle backpressure when a consumer is slower than the producer?**

> Decide what you're willing to lose, per path. For **live video you drop, never queue** — a buffered
> live frame is worthless by the time it's delivered, so if a consumer can't keep up, the SFU drops
> to a lower layer or drops frames. For **recording you must not drop**, so that path buffers to disk
> and backpressures the uploader instead. For **detection events you queue** — they're small, they
> matter, and a few seconds of delay is fine, so they go into a proper queue with retries and a dead
> letter.
>
> The mistake is applying one policy everywhere. Queueing live video adds latency until the thing is
> useless; dropping recordings loses evidence.

🔗 *Yours:* Same reasoning as the job queues in Resite and pSEO — BullMQ and pg-boss with retry and
DLQ semantics, because "the work must eventually happen" is a different guarantee from "show me what's
happening now."

---
## 3 · Recording, storage and retrieval

**Q. 🔥 Their requirement is "stored data retrievable by client, site or robot for later review." Design the storage.**

> Two stores, because video and metadata want opposite things. **Object storage holds the media** —
> segments, a few seconds each, with a key that mirrors the query: `client/site/robot/date/hour/`
> then the segment. That prefix layout means "everything from robot 7 on Tuesday afternoon" is a
> prefix listing rather than a scan, and it means lifecycle rules can expire a whole client or a whole
> month cleanly. **A relational store holds the index** — one row per segment with the tenant, site,
> robot, start and end timestamp and the object key, plus a separate events table for detections
> pointing at the same timeline.
>
> Retrieval then never touches the video store to answer a question. "Show me every harness violation
> at site B last week" is a query on the events table; the result gives you object keys, and the
> client fetches those through signed URLs. The video store is dumb and cheap; the index is smart and
> small.

↳ **If pushed — why not just store one file per session?** Because sessions are open-ended and seeking
into a multi-hour file over HTTP is miserable. Segments give you range access for free, they make
partial upload after an outage natural, and they let lifecycle policies work at a sane granularity.

↳ **If pushed — how do you keep storage costs from exploding?** Tiering by age and by interest.
Recent footage stays hot. Older footage moves to infrequent-access and then archive. But footage that
has a detection event attached to it is the footage someone will actually come back for, so it gets a
longer hot life than the 99% where nothing happened. Retention is per client, because it's usually a
contractual number.

---

**Q. How do you build a scrubbable timeline when the recording has gaps?**

> The timeline is rendered from the index, not from the video. I fetch the segment rows for the
> requested window and get back a list of intervals; the gaps between them are exactly the periods
> with no data, and they render as a distinct state — not black video, visibly "no data." Detection
> events overlay as markers on the same axis.
>
> Seeking is then a lookup: the timestamp maps to a segment row, and the player loads that segment and
> offsets into it. Because segments start on keyframes, the seek is accurate to the segment boundary
> without decoding from the start of anything.

↳ **If pushed — a week of footage across 20 robots is a lot of rows to draw.** You don't draw rows,
you draw buckets. Aggregate coverage server-side at the zoom level being displayed — per-hour buckets
for a week view, per-second only when zoomed in — so the payload is bounded by pixels, not by data.

---

**Q. Walk me through what FFmpeg is actually doing in your recording pipeline.**

> Demux, then decide whether to transcode, then mux. It reads the incoming stream and splits it into
> elementary streams. If the incoming codec is already what I want to store — H.264 — then I copy the
> streams rather than decode them, which is a remux: near-zero CPU, no quality loss. If the source is
> something I can't store or serve directly, then it decodes, re-encodes and pays for it.
>
> Then it muxes into segments — a segmenter that cuts on keyframe boundaries at a target duration and
> writes a playlist alongside. The reason I care about copy-versus-transcode so much is that it's the
> difference between one server handling dozens of streams and one server handling three.

↳ **If pushed — when are you forced to transcode?** When the source codec isn't playable by your
clients, when you need multiple renditions for different bandwidths and the device can't simulcast, or
when you're burning detection overlays into the stored video — though I'd rather store overlays as
data and draw them at playback than bake them in, because baked-in is unrecoverable.

---

**Q. How would you record a WebRTC stream? It's not a file.**

> You need something that joins the session as a consumer and writes what it receives. With Mediasoup
> that's a plain RTP consumer piped to a recorder process — the SFU forwards to a local port, FFmpeg
> or GStreamer reads RTP from that port and muxes to disk. It's the same fan-out the SFU already does
> for humans; the recorder is just a subscriber that doesn't have a face.
>
> The awkward parts are that you're recording RTP, so you have to handle loss and reordering yourself
> rather than getting a clean file, and that the recorder now scales with the number of recorded
> streams — it's a real capacity concern, not a background task.

🔗 *Yours:* Mediasoup's producer/consumer model in StreamVerse is what makes this natural — a recorder
is structurally identical to any other consumer.

---

## 4 · AI video recognition

**Q. 🔥 Helmet and harness detection on drone feeds across dozens of sites. How do you build it without the GPU bill eating the company?**

> By not running the model on every frame. Three levers, in order of impact.
>
> **Sample, don't stream.** A person doesn't put a helmet on between frames. Running detection at 1–2
> frames per second instead of 30 is a 15–30× cost reduction and loses essentially nothing for a
> compliance use case. If something needs finer granularity — a fall, say — that's a different, cheaper
> trigger.
>
> **Gate on motion.** Most frames from a fixed camera contain nothing new. A cheap motion or
> background-subtraction check before the model means you only pay for frames where something
> happened.
>
> **Track instead of re-detecting.** Detect to find a person, then track them across frames with
> something like ByteTrack or SORT. Now you're running the expensive model occasionally and the cheap
> tracker continuously — and you get identity for free, which matters because otherwise the same
> worker generates a violation event on every single frame.
>
> Then batch what's left. GPUs are throughput devices; feeding them one frame at a time wastes most of
> the card. Collect frames across cameras into a batch and you get several times the throughput from
> the same hardware.

↳ **If pushed — edge or cloud?** Both, split by cost. The cheap gate runs at the edge — motion
detection and maybe a small detector on the site gateway — so you only ship interesting frames over
the uplink at all. The expensive model runs in the cloud where you can batch across sites and use one
GPU well rather than twenty badly. The uplink is usually the real constraint on a construction site,
so anything that reduces what you send is worth more than anything that reduces what you compute.

↳ **If pushed — how do you avoid alert spam?** Debounce on the tracked identity, not the frame.
A violation opens when a tracked person has been non-compliant for N consecutive detections, and
closes when they've been compliant for M. That turns 900 frame-level detections into one event with a
start and an end, which is also the right shape for the database.

🔗 *Yours:* Home Guard does exactly this shape at small scale — detect the person, recognise the face,
and write one entry/exit event rather than a row per frame.

---

**Q. How does Home Guard actually work, technically?**

> Frames come off the camera feed, a YOLO detector finds people in the frame, and for each person
> detection I crop the face region and run recognition against a gallery of enrolled faces —
> embeddings for family members with their details attached. A match above threshold resolves to a
> known person; below threshold it's an unknown.
>
> The state machine on top is where the actual product is. A known person appearing starts an
> "inside" interval; their disappearance for long enough closes it with an exit time. Unknowns get
> queued with their captured face so I can enrol them from the dashboard with details, or dismiss
> them if it was a one-off delivery. So the log answers "who was here and when", not "here are 40,000
> detections."

↳ **If pushed — what's wrong with it?** It's single-camera and home-scale, so I never had to solve
re-identification across cameras, and the recognition threshold is tuned by hand rather than
evaluated against a labelled set. If I were extending it to a site with many cameras, cross-camera
identity and a proper precision/recall evaluation would be the first two things to fix.

↳ **If pushed — why YOLO?** Single-shot detectors give you the whole frame in one forward pass, which
is what you need for anything approaching real time, and the ecosystem means I could start from
pretrained person detection rather than collecting data. For helmet and harness specifically you'd
fine-tune on site imagery, because that's not a class any general model has.

---

**Q. How do you serve a Python model to a Node backend without them becoming one fragile thing?**

> Keep them separate processes with a queue between them, not a synchronous call. The Node API owns
> requests, tenancy and the database; the Python service owns the model. Frames or job references go
> onto a queue, the inference workers consume, and results come back as events the API persists.
>
> That buys three things: the model can be restarted or scaled independently, a slow batch backs up in
> a queue instead of timing out an HTTP request, and the GPU workers can be a completely different
> instance type from the API. If the model dies, live monitoring keeps working and detections resume
> when it comes back.

🔗 *Yours:* That's the SmartTrader split — NestJS for the platform, Python FastAPI for the analytical
work, Docker Compose holding the boundary — and the queue-based worker pattern from Resite and pSEO.

---

**Q. How do you know the model is actually any good, and stays good?**

> A held-out labelled set and a metric that matches the cost of being wrong. For safety compliance,
> a false negative — missing an unhelmeted worker — is expensive in a way a false positive isn't, so
> I'd tune the threshold for recall and accept that a human reviews some clean frames. That's a
> business decision, and I'd want it stated explicitly rather than left in a config file.
>
> Staying good is drift. The model was validated on some sites in some weather; new sites, new
> lighting, winter clothing, a different helmet colour all shift the distribution. So I'd sample
> production detections for periodic human review, track the confidence distribution over time, and
> treat a shift in it as an alert — you usually see the distribution move before anyone notices the
> accuracy has.

↳ **If pushed:** And I'd version the model alongside the events. When someone disputes a violation
from three months ago, you need to know which model produced it.

---

## 5 · Real-time messaging and MQTT

**Q. 🔥 Have you used MQTT?**

> Not in production — I'll be straight about that. What I've shipped is the same set of problems over
> Socket.IO and WebRTC data channels: pub/sub topics, presence, delivery guarantees, reconnect with
> state recovery, and fan-out to many subscribers.
>
> I know the model. MQTT is a broker-mediated pub/sub over a deliberately tiny wire format, built for
> devices that are power-constrained and links that are unreliable. Topics are hierarchical with
> wildcards, which maps directly onto `client/site/robot/telemetry`. Three QoS levels: 0 is fire and
> forget, 1 guarantees at-least-once so you must handle duplicates, 2 is exactly-once at the cost of a
> four-way handshake. Retained messages mean a new subscriber immediately gets the last known value on
> a topic rather than waiting for the next publish. And last-will-and-testament is the one I'd
> actually reach for on a robot fleet — the broker publishes a message on your behalf if you drop
> without saying goodbye, so device-offline detection is built in rather than a heartbeat you wrote.
>
> For robot telemetry over a flaky link I'd choose MQTT over a socket server, and I'd expect to be
> productive in it inside a week.

↳ **If pushed — MQTT vs Socket.IO, honestly:** Socket.IO is a great fit when the clients are browsers
— it handles transport fallback, rooms and reconnection, and it speaks the same language as your web
app. It's a poor fit for a thousand constrained devices: the framing is heavier, there's no QoS
concept, and there's no equivalent of retained messages or a will. Different tools. I'd expect a robot
platform to run MQTT device-side and WebSockets browser-side, with the API bridging.

↳ **If pushed — which QoS for robot telemetry?** QoS 0 for high-frequency position updates, because a
dropped one is superseded a second later and the overhead isn't worth it. QoS 1 for commands and
state changes, with idempotent handlers so the duplicate doesn't matter. I'd avoid QoS 2 unless
something genuinely can't tolerate a duplicate, because the handshake cost on a bad link is real.

---

**Q. How do you make a command to a robot safe when the network is unreliable?**

> Idempotency and expiry. Every command carries a client-generated id, and the robot deduplicates on
> it, so a retry after a timeout doesn't execute twice — which matters enormously when the command is
> "move." And commands carry a validity window, because a "go to point B" that arrives ninety seconds
> late is not a stale request, it's a hazard. Expired commands get rejected and reported, not
> executed.
>
> Then acknowledgements are separate from delivery. The broker delivering the message isn't the robot
> having done it, so the UI shows sent, acknowledged and completed as distinct states rather than
> optimistically pretending it worked.

🔗 *Yours:* Idempotency keys and API versioning were part of the backend work at Wisflux for exactly
this reason on the payments side — the failure mode is different, the discipline is identical.

---

## 6 · AWS and data modelling

**Q. 🔥 What have you actually used on AWS?**

> On LACS: EC2 running containerised services, S3 for recorded media with CloudFront in
> front of it for delivery, and Lambda with API Gateway plus SQS for asynchronous work. Docker
> throughout, so services are portable rather than pinned to one runtime.
>
> Where I'd be honest about my limits: I've run containers on EC2 rather than on ECS or EKS, I
> haven't run a large multi-region estate, and I haven't used the AWS media services — Kinesis Video Streams,
> IVS, MediaLive — in anger. I know what they do and roughly when they'd beat rolling your own, but
> I'd be learning them on the job.

↳ **If pushed — when would you use Kinesis Video Streams instead of your own recorder?** When you want
ingest, time-indexed storage and playback as a managed service and you're happy with its retention and
retrieval model — it removes a lot of the pipeline in §3. I'd push back on it if the workload needs
custom inference in the middle of the pipeline or if the cost at your ingest volume beats running
FFmpeg on your own instances, which past a certain scale it usually does. It's a
build-versus-buy decision I'd want to make with real numbers, not a preference.

---

**Q. Design the DynamoDB table for "video and events retrievable by client, site or robot."**

> Caveat first — my depth is PostgreSQL, not DynamoDB. But the modelling approach I'd take is access
> patterns first, because unlike Postgres you can't add a query later for free.
>
> The patterns are: everything for a client; everything at a site in a time range; everything from a
> robot in a time range; and recent events across a client. So a single table with a composite key —
> partition key `CLIENT#<id>#SITE#<id>`, sort key `ROBOT#<id>#TS#<iso>`. That makes the site-and-time
> query a range query on the sort key, and robot-scoped queries a prefix on it. Partitioning by client
> and site rather than by client alone keeps a big customer from creating a hot partition. For
> "recent events across a client regardless of site" I'd add a global secondary index keyed on the
> client with the timestamp as the sort key.
>
> The media itself never goes in the table — S3 keys do.

↳ **If pushed — where does that design hurt?** Anything ad hoc. The moment someone wants "all
violations of type X across all clients last quarter" you're either adding another index or scanning,
and that's the trade you accept for the predictable latency. In Postgres I'd have just written the
query. If their access patterns are genuinely stable, Dynamo is the right call; if analysts are going
to ask arbitrary questions, I'd want the events in something relational too.

---

**Q. Your PostgreSQL work — what's the hardest thing you've done with it?**

> Offline-first bidirectional sync between edge nodes and cloud in LACS. Field systems keep writing
> while disconnected and reconcile when the link comes back, which means you cannot rely on
> auto-increment ids or on last-write-wins without losing data someone cared about. You need
> conflict-resolvable identifiers, a change log rather than a state diff, and a resolution policy
> decided per table rather than globally — some things are genuinely last-write-wins, some things must
> merge, and some things need a human.
>
> The lesson that transfers directly here: in a disconnected system, the sync policy is a product
> decision, not a database setting.

↳ **If pushed — indexing for time-series event queries?** A composite index leading with the tenant
scope and then the timestamp, so the tenant predicate and the range are one index scan. And once the
events table gets big, partitioning by time — because then retention is dropping a partition instead
of a `DELETE` that fights vacuum.

---

## 7 · React front-end for monitoring

**Q. 🔥 Build me a 16-camera live wall in React. What breaks first?**

> The browser, and specifically video decoding. Sixteen simultaneous decodes will melt a laptop, so
> the wall can't just be sixteen `<video>` elements at full resolution. What you do instead: subscribe
> every tile to the **lowest simulcast layer**, because a tile is a few hundred pixels wide and
> sending it 1080p is wasted decode. Only the focused tile gets the high layer. Tiles that aren't
> visible — scrolled off, another tab — get unsubscribed entirely, not just hidden, because a hidden
> `<video>` still decodes.
>
> On the React side, the mistake is putting stream state in component state. Every frame-rate-ish
> update re-renders the tree. Media elements should be attached imperatively via refs and left alone;
> React renders the chrome around the video, not the video. Stats and status updates get throttled to
> something human — once a second — rather than pushed at whatever rate they arrive.

↳ **If pushed — how do you draw detection boxes over a playing video?** A canvas positioned over the
video element, with coordinates in normalised space so they survive resizing, and drawn from
`requestAnimationFrame` rather than React state. Boxes are timestamped, so on a recording you
interpolate against `currentTime`; on a live stream you accept that detection lags the frame slightly
and either buffer the video briefly to match or make the lag visible. Silently drawing a box on the
wrong frame is the thing to avoid.

---

**Q. The device list has 2,000 robots and the UI is sluggish. Fix it.**

> Virtualise the list so the DOM only holds what's on screen — that's the big one and it's usually
> enough. Then look at what's re-rendering: if a status update for one robot re-renders all 2,000
> rows, memoise the row and make sure the props are stable, because an inline object or callback
> defeats memoisation silently.
>
> Then look at the data. 2,000 rows shouldn't be one payload — paginate or filter server-side, and
> push status changes as deltas over the socket rather than refetching the collection. And batch those
> deltas: 2,000 devices reporting once a second is 2,000 state updates a second, so I'd coalesce into
> a single update per animation frame.

---

**Q. How do you replay a robot's GPS track in sync with its recorded video?**

> One clock, one source of truth. The video element's `currentTime` drives everything — I map it to
> the absolute timeline using the segment's start timestamp, then look up the position samples that
> bracket that moment and interpolate between them for the marker on the map. Playback rate,
> scrubbing and pause all come along for free because the video is driving.
>
> The alternative — running your own timer alongside the video — drifts within a minute, and it's the
> classic bug in this kind of UI. Don't run two clocks.

↳ **If pushed — what about gaps in the GPS?** Show them as gaps. If the sample either side of a
moment is more than a few seconds away, the marker goes to a "position unknown" state rather than
interpolating across a minute-long hole and drawing a confident straight line through a building.

🔗 *Yours:* GIS mapping with GPS telemetry replay in LACS is exactly this — map, timeline, and
recorded position over a common clock.

---

## 8 · Sensor data: GPS and LiDAR

**Q. How would you store and query high-frequency position data from a fleet?**

> Time-series shaped, tenant-scoped, and downsampled for reads. Raw samples go into a table
> partitioned by time with a composite index leading on the robot and then the timestamp, so "robot 7,
> Tuesday 2pm to 4pm" is one index range scan against one partition. Retention is a partition drop.
>
> But you almost never want raw samples on a read. Drawing a path on a map at city zoom doesn't need
> 10 Hz — so I'd keep pre-aggregated tracks at a few resolutions and serve the one that matches the
> requested zoom, with raw only when someone drills into a short window. Same principle as the
> timeline in §3: the payload should be bounded by what's displayable.

---

**Q. 🔥 Have you worked with LiDAR?**

> No — that's a genuine gap and I'd rather say so than bluff.
>
> What's adjacent: I've done time-series sensor replay synced to video and maps, which is the same
> ingestion, storage and playback problem with a different payload. And I've built 3D rendering with
> three.js and React Three Fiber, so rendering a point cloud in the browser — buffer geometry, a
> points material, decimating for frame rate, colouring by intensity or height — is territory I can
> reason about rather than territory I've never entered.
>
> What I don't have is the domain layer: registration, SLAM, segmentation, the formats. If that's core
> to the role on day one, you should know that upfront. If it's a component of a platform I'm building
> around, I'd be useful immediately on the platform and learning the sensor side alongside.

↳ **If pushed — what's actually hard about point clouds in a browser?** Volume. A single scan is
millions of points and you cannot ship that per frame, so it's level-of-detail and spatial indexing —
octree-style, load coarse, refine what's near the camera. The rendering isn't the hard part; the
streaming strategy is.

---

## 9 · Multi-tenancy, device fleet and security

**Q. 🔥 "Client-specific, region-specific and robot-specific control." How do you enforce that so it can't leak?**

> Scope at the lowest layer you can, so a forgotten `WHERE` clause isn't a data breach. The tenant
> comes from the authenticated principal, never from a request parameter — the moment a client id is
> something the caller sends, someone will send a different one. Then either row-level security in
> Postgres with the tenant set per connection, or a repository layer that no query can bypass. RLS is
> stronger because it's enforced by the database rather than by developer discipline.
>
> On top of that, resource-level permissions: a user belongs to a client, has access to some subset of
> sites, and roles determine whether they can view, control or administer. Control actions —
> commanding a robot — get checked separately from view actions, because "can watch site B" and "can
> drive the robot at site B" are very different grants.
>
> And it gets tested. A test that authenticates as tenant A and asserts it cannot read tenant B's data
> for every endpoint is worth more than any amount of review.

🔗 *Yours:* GIBP is multi-tenant fintech — organisations, bills, vendors — where cross-tenant leakage
is the unacceptable failure, so this was the design centre rather than a feature.

---

**Q. How do you handle device identity and onboarding for a robot fleet?**

> Per-device credentials, provisioned at onboarding, revocable individually. A shared key across the
> fleet means one compromised robot compromises everything and you can't revoke without touching every
> device. So each device gets its own identity and certificate, and the platform can disable one
> without a fleet-wide rotation.
>
> Onboarding itself needs to be a repeatable script rather than a person following a wiki, because
> the whole point of fleet management is that adding the fiftieth device costs what the second one
> did. Provision, register, verify connectivity, verify the video path, and record the device's
> software version — that last one matters because a fleet always ends up running mixed versions and
> you need to know which.

🔗 *Yours:* One-touch provisioning of field mini-PCs in LACS was this problem exactly — deploying to
sites where nobody on site is an engineer, so the provisioning has to be idempotent and unattended.

---

**Q. What are the security concerns specific to a video platform?**

> Three that aren't generic. **Media URLs must expire** — a recording URL that works forever is a leak
> waiting to be pasted somewhere, so signed URLs with short expiry, issued per request after an
> authorisation check. **Streams need authorisation at subscribe time, not just at page load** — an
> SFU that lets any authenticated user consume any producer is a cross-tenant video leak, and it's an
> easy one to ship by accident. And **footage is personal data** — you're recording identifiable
> people at work. Retention limits, access logging and a defensible answer to "who watched this and
> when" aren't nice-to-haves on a construction-site product with a workforce and a works council.

---
## 10 · Project grilling

> Same 90-second shape as [`../interview-qa/08-project-grilling.md`](../interview-qa/08-project-grilling.md):
> **problem → what I built → the hard part → a decision and its trade-off → outcome, then a hook.**
> ⚠️ Every number you say has to be one you can defend. If you don't have it, describe the scale
> qualitatively instead of inventing a figure.

### X-FACE / LACS — the one that gets you this job

> LACS is a disaster-response communication platform — the scenario is that normal infrastructure is
> down and responders still need to coordinate. I was a core engineer on it, and the part closest to
> your product is the video layer: it handles multiple sources at once, WebRTC through a Mediasoup SFU
> for the live multi-party sessions, and RTSP/RTMP ingest for fixed cameras, with FFmpeg doing the
> recording and transcoding so anything can be reviewed later.
>
> The hard part was that it has to work when the network doesn't. Field systems run on mini-PCs that
> we provision one-touch and deploy to sites, and they keep operating fully offline — capturing,
> recording, running speech on-device — then reconcile with the cloud when a link comes back. That
> shaped everything: the sync is a change log with per-table conflict policy rather than
> last-write-wins, and the UI is explicit about what's live versus what's stale, because on a
> life-safety product a frozen frame that looks live is dangerous.
>
> The cloud side runs on AWS — EC2 for the services, S3 and CloudFront for recorded media,
> Lambda and SQS for asynchronous work — and there's a GIS layer with live GPS telemetry that can be
> replayed against the recordings on a map.
>
> It's deployed, and we showed it at ATR Open House in Kyoto last year.
>
> *Hook:* the offline-to-cloud reconciliation is the interesting design if you want to go into it —
> and I suspect it's a problem you have too, with robots on sites that lose connectivity.

**Depth probes to be ready for:**

| They ask | Go to |
|---|---|
| "Why Mediasoup rather than LiveKit or Janus?" | Control. Mediasoup is a library, not a server — you write the signalling and the room logic, which is more work upfront and exactly what you want when the session model isn't a standard conference. |
| "How many concurrent streams?" | Describe the deployment shape honestly. Do **not** invent a number. |
| "How did you record WebRTC?" | §3, the RTP-consumer-to-FFmpeg answer. |
| "What would you do differently?" | Separate recording from the live path sooner — they were more coupled than they should have been, and that coupling is what makes a recorder failure visible to operators. |

### Home Guard — your closest analogue to their product

> Home Guard is a security-camera system I built for my own house, and it's the closest thing I've
> built to what you're describing. It takes the camera feed, detects people crossing the frame with
> YOLO, and matches faces against an enrolled gallery — my family, with their details — so it knows
> who's a resident and who isn't. It writes entry and exit times per person into a log, and anyone it
> doesn't recognise goes into an unknown list with their captured face, where I can enrol them from a
> dashboard or dismiss them if it was a one-off visitor.
>
> The interesting part wasn't the model, it was turning detections into events. A naive version
> writes a row every frame and the log is useless. So there's a state machine on tracked identity —
> a person appearing opens an interval, sustained absence closes it — which is what makes the output
> "who was here and when" instead of forty thousand rows.
>
> It's home-scale and single-camera, so it's a POC, not a product. But it's the same loop you need:
> ingest a feed, recognise, record, and make it retrievable afterwards.
>
> *Hook:* the piece I'd have to solve to make it site-scale is identity across multiple cameras — happy
> to talk about how I'd approach that.

### StreamVerse — proof the streaming depth is real

> StreamVerse is an open-source npm package I published for WebRTC audio, video and screen sharing
> over a Mediasoup SFU. The motivation was that adding multi-party streaming to an app means learning
> transports, producers, consumers and the whole signalling dance before you can show a single frame,
> and that's a lot of surface area for something most teams want to treat as a feature.
>
> So it wraps the lifecycle — transport setup, producing and consuming tracks, signalling, reconnect —
> behind a small API. The design tension was how much to hide: hide too little and you haven't helped,
> hide too much and the moment someone needs simulcast layer control or custom codec preferences
> they're stuck. I settled on a simple default path with the underlying objects still reachable.
>
> *Hook:* it's public, so it's the fastest way to see how I actually write real-time code rather than
> take my word for it.

### Echo — the constrained-network instinct

> Echo is an end-to-end encrypted messaging PWA — libsodium for encryption, peer-to-peer WebRTC for
> voice and video, QR pairing, no accounts and no server holding your messages. The design choice
> that's relevant to you is that it prefers local-network connections: if two peers are on the same
> network, the media should never leave it.
>
> That's the same instinct as an edge gateway — keep traffic local when local works, and only involve
> the cloud when you have to. On a site with a bad uplink, that's the difference between working and
> not.
>
> *Hook:* it's also where I learned how much of WebRTC in practice is ICE and NAT rather than media.

---

## 11 · Behavioural and positioning

**Q. 🔥 Tell me about yourself.** *(Ninety seconds. This is the whole first impression.)*

> I'm a full-stack engineer, four years, all at Wisflux Tech Labs in Jaipur — and I've spent most of
> that on real-time systems. The work I'd point at first is LACS, a disaster-response communication
> platform that's deployed and that we showed at ATR Open House in Kyoto: multi-source live video
> through a Mediasoup SFU alongside camera feeds, FFmpeg recording and playback, offline-first
> edge-to-cloud sync, GIS with GPS replay, on AWS and Docker.
>
> Alongside that I've shipped multi-tenant products — a fintech platform on a ledger integration, a
> couple of live SaaS products — and built vision work in Python, including a camera system that
> detects and recognises people and keeps a visitor log.
>
> What draws me to this role is that it's the same shape as the thing I'm best at — many video
> sources, recognition on top, recorded and retrievable per client — with a robotics domain I'd be
> learning. That's the trade I want right now.

---

**Q. 🔥 You have four years, we asked for five to ten.**

> Four years, all in one team, and the JD says twice that you value progressive growth within a
> single company — that's what I have. I joined doing front-end and ended up owning real-time media,
> the cloud deployment and the edge provisioning for a deployed platform. Nobody handed me the video
> layer on day one.
>
> I'd rather be judged on the scope of what I've shipped than the number. If after two technical
> rounds the depth isn't there, that's a fair conclusion — but I don't think the number is going to be
> the thing that decides it.

*(Say it once, calmly, and stop. Don't over-argue it. The JD's own preference paragraph is doing the
work for you.)*

---

**Q. Why are you leaving?**

> I've got a lot out of four years at one company — it's where I learned to own things end to end.
> What I want next is a bigger system and a team where I'm not the most senior person in the room on
> real-time infrastructure. This role is a platform being built rather than maintained, in a domain I
> don't know yet, which is the combination I'm looking for.

*(No criticism of the current employer. Ever. It costs you nothing to be gracious and it costs a lot
not to be.)*

---

**Q. Tell me about a time something you built failed.**

> Use a real one from [`../story-bank.md`](../story-bank.md) — pick the one where the failure was
> yours, the fix was yours, and you can say what you changed structurally afterwards so it couldn't
> recur. Interviewers can tell the difference between a failure story and a disguised humblebrag, and
> the disguised one costs you more than admitting a real mistake.

---

**Q. This is hybrid in Noida or Pune. You're in Jaipur.**

> Decide this before the HR screen and answer it in one sentence without hedging. Whichever it is —
> relocating, and here's my notice period and timeline — say it cleanly. Hesitation here reads as a
> candidate who'll drop out at offer stage, and recruiters de-prioritise accordingly.

---

**Q. What are your salary expectations?**

> Per [`../README.md`](../README.md): don't anchor on your current number, and don't name the first
> figure if you can avoid it. "I'm looking at the market rate for a full-stack engineer with
> real-time video and cloud depth — what range has this role been budgeted at?" If they insist, give a
> researched range for the band, not a point, and keep your current CTC face-down.

---

**The Korea/Japan angle — use it once, lightly**

D.Hive is Korean, McKinley Rice is Korean/US-backed, and their commercial pilot is with Hyundai
Construction. You represented your company at a technology showcase in Kyoto. That's a genuine signal
that you can operate with an international team and a non-Indian working culture, and it's on your
resume already. Mention it once, in context — not as a credential you keep returning to.

---

## 12 · Honest gaps

The rule: name the gap first, then the nearest real thing you've done, then the time to close it.
Never claim it, never apologise for it, never volunteer more gaps than you were asked about.

| Gap | Say this |
|---|---|
| **MQTT** | "Not in production. I've shipped the same problems over Socket.IO and WebRTC data channels — pub/sub, presence, delivery guarantees, reconnect. I know the model: hierarchical topics, QoS 0/1/2, retained messages, last-will for device-offline detection. For a robot fleet on flaky links I'd pick it over a socket server. It's a week to be useful." |
| **DynamoDB** | "PostgreSQL is my depth, including multi-tenant and offline sync. I can model against Dynamo — access patterns first, single table, tenant on the partition key, site/robot/timestamp on the sort key — but I'd be slow for the first sprint and I'd want review on the key design." |
| **LiDAR / point clouds** | "No LiDAR. I've done time-series sensor replay synced to video on a map, and 3D rendering with three.js, so the platform side transfers. The sensor domain — registration, SLAM, formats — I don't have." |
| **Robotics / ROS / autonomous systems** | "I've never worked robot-side. What I bring is the cloud platform around it — ingest, recognition, storage, retrieval, multi-tenant control — which is what this role describes." |
| **PHP / Laravel** | "No. My backend is Node/NestJS and Python/FastAPI. If there's a Laravel service to maintain I'd pick it up, but I wouldn't claim it." |
| **C++** | "No production C++. If the edge agent is C++ I'd be reading rather than writing for a while." |
| **Kubernetes** | "Docker and Compose on EC2. I understand what Kubernetes solves and I've read enough to be dangerous, but I haven't operated a cluster in production — and I haven't used ECS or EKS either." |
| **HLS / DASH** | "My live work is WebRTC and my ingest is RTSP/RTMP; I haven't shipped an HLS delivery path. I understand the segmenting model and why the keyframe interval bounds latency — see §1 — but I'd be building it for the first time." |
| **AWS media services (KVS / IVS / MediaLive)** | "Haven't used them. I've built the equivalent with FFmpeg and S3, so I know what they'd be replacing and I'd want to compare cost at your ingest volume before assuming either way." |

---

## 13 · Questions to ask them

Ask three or four. The good ones are the ones where the answer changes how you'd do the job.

**About the work**
1. The JD describes a POC. What does success look like at the end of it, and what's the timeline?
2. How many robots and sites are you planning for at the pilot, and where do you expect that to be in a year? *(This is really "is this a prototype or a platform", and it changes every architectural answer.)*
3. Where does inference run today — on the robot, on a site gateway, or in the cloud? *(§4. Their answer tells you a lot about how far along they actually are.)*
4. Have you committed to a streaming stack yet, or is that still open? *(If it's open, this is where you're most useful, and saying so is a strong close.)*
5. How do robots talk to the platform today — MQTT, something custom? *(Also the graceful way to surface your MQTT gap on your own terms.)*

**About the team**
6. Who else is on the cloud side, and how does the split between the robotics team and the platform team work in practice?
7. How much of the front-end would be mine? The JD covers React monitoring UIs and backend and cloud — I'd like to know where the centre of gravity is.
8. You mentioned valuing people who broaden their responsibilities over a few years. What has that looked like for someone already on the team?

**About the arrangement**
9. Noida or Pune for this role, and how many days on site?
10. What does the interaction with the Korean team look like — timezone overlap, working language?

---

## Weak-spot tracker

Mark after saying each section out loud. Only re-drill ⚠️ and ❌.

| § | Topic | Pass 1 | Pass 2 | Still weak |
|---|---|---|---|---|
| 1 | Streaming fundamentals | | | |
| 2 | Multi-source ingest | | | |
| 3 | Recording & retrieval | | | |
| 4 | AI video recognition | | | |
| 5 | Real-time messaging / MQTT | | | |
| 6 | AWS & data modelling | | | |
| 7 | React monitoring UI | | | |
| 8 | GPS & LiDAR | | | |
| 9 | Multi-tenancy & fleet | | | |
| 10 | Project grilling | | | |
| 11 | Behavioural & positioning | | | |
| 12 | Honest gaps | | | |

---

## What's not here

| Looking for | Go to |
|---|---|
| Core JS/TS, React, Node, Python, database and DevOps Q&A | [`../interview-qa/INDEX.md`](../interview-qa/INDEX.md) |
| WebRTC signalling, ICE/STUN/TURN and SFU depth in general | [`../interview-qa/07-specialities.md`](../interview-qa/07-specialities.md) |
| General project grilling scripts | [`../interview-qa/08-project-grilling.md`](../interview-qa/08-project-grilling.md) |
| Coding round practice | [`../interview-qa/09-coding-arrays-strings.md`](../interview-qa/09-coding-arrays-strings.md) · [`10-coding-structures-dp.md`](../interview-qa/10-coding-structures-dp.md) |
| System-design structure | [`../system-design-prep.md`](../system-design-prep.md) |
| STAR behavioural stories | [`../story-bank.md`](../story-bank.md) |
| The role, the fit matrix and the application checklist | [`README.md`](README.md) |

← Back to the [D.Hive kit](README.md) · [Career Acceleration Kit](../README.md)
