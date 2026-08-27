# Resume — D.Hive, Full-Stack Software Engineer (Cloud Platform)

> Tailored copy for the **D.Hive / Redrob by McKinley Rice** role. The general-purpose resume in
> `public/resume/` is untouched — this is a separate document for one application.
>
> **Source of truth is [`resume-dhive.html`](resume-dhive.html).** This markdown mirrors it for
> reading and review; edit the HTML, then regenerate (commands at the bottom).

**Artifacts:** `public/dhive/Shivam_Gupta_Resume_DHive.pdf` · `public/dhive/Shivam_Gupta_Resume_DHive.docx`

---

## What changed vs. the general resume, and why

| Change | Reason |
|---|---|
| Title → *Real-Time Applications & Cloud Platforms* | Signals the real-time + cloud domain without narrowing you to video in the header. The video specifics land immediately below, in the first line of the summary and the first skills line. |
| Summary rewritten to open on multi-source video | The old summary led with "finance, AI and real-time communication"; the streaming work was a sub-clause. |
| New skills line: **Real-Time Video & Streaming** (first) | Puts WebRTC / Mediasoup / RTSP / RTMP / FFmpeg above the fold for both the recruiter and the ATS. |
| New skills line: **Cloud & DevOps** with AWS named service-by-service | The old resume listed zero AWS; the JD requires it. |
| New skills line: **AI & Computer Vision** with YOLO + face recognition | The JD's core use case is AI recognition on video feeds. |
| LACS split into four bullets covering video, FFmpeg, AWS, GIS/GPS + device provisioning | Was one dense bullet. Each JD responsibility now maps to a line an interviewer can point at. |
| **Home Guard** added as the lead project | Closest thing you have to their product: camera feed → detect → recognise → record → retrieve. |
| **StreamVerse** promoted to a full project entry | It was buried as an experience bullet; it's direct evidence of SFU-level streaming work. |
| Projects reordered: Home Guard, StreamVerse, Echo, then the rest | Video-first ordering. Glacier Dev and StockSafe dropped for space (StockSafe stays in Achievements). |
| Kept **4+ years**, added "progressive growth inside a single team" | The JD twice states a preference for 2–4+ years of expanding responsibility at one company. Four years at Wisflux *is* the thing they're asking for. |

### Deliberately NOT on this resume
`MQTT` · `DynamoDB` · `HLS/DASH` · `LiDAR` · `ROS / robotics` · `PHP / Laravel` · `C++` · `Kubernetes`

Every one of these appears in the JD and none of them is yours. They are handled as spoken
honest-gap answers in [`interview-qa.md`](interview-qa.md) instead. Claiming them on paper is how you
lose the round you would otherwise have won.

---

## The resume

**Shivam Gupta** — Full-Stack Software Engineer · Real-Time Applications & Cloud Platforms
profile.shivam@gmail.com • +91-7014217098 • Jaipur, India
linkedin.com/in/myselfshivam • github.com/shivamgupta1319 • shivamgupta.live

### Professional Summary

Full-Stack Software Engineer with 4+ years building and shipping production-grade real-time video and
cloud systems. Core engineer on a deployed disaster-response platform that handles multi-source live
video — WebRTC / Mediasoup Selective Forwarding Unit (SFU) sessions alongside Real-Time Streaming
Protocol (RTSP) and Real-Time Messaging Protocol (RTMP) camera feeds — with FFmpeg recording,
playback and later retrieval, offline-first edge-to-cloud PostgreSQL synchronisation, and Geographic
Information System (GIS) mapping with Global Positioning System (GPS) telemetry replay, running on
Amazon Web Services (AWS) and Docker. Also build Vision Artificial Intelligence (AI) pipelines in
Python — YOLO object detection and face recognition over live camera feeds. Four years of progressive
growth inside a single team, expanding from front-end into backend, real-time media, cloud
infrastructure and edge deployment. Represented the company at ATR Open House 2025, Kyoto, Japan.

### Technical Skills

- **Real-Time Video & Streaming:** WebRTC, Mediasoup SFU, simulcast, STUN / TURN, RTSP and RTMP ingest, FFmpeg (recording, transcoding, segmenting), Socket.IO, WebSockets
- **Cloud & DevOps:** AWS (EC2, S3, CloudFront, Lambda, API Gateway, SQS), Docker, Docker Compose, Nginx, GitHub Actions (CI/CD), systemd / edge deployment, Netlify, Vercel, Render
- **AI & Computer Vision:** YOLO object detection, face recognition, OpenCV, PaddleOCR (Optical Character Recognition), Automatic Speech Recognition (ASR) / Text-to-Speech (TTS), Large Language Model (LLM) orchestration, Model Context Protocol (MCP)
- **Frontend:** React, Next.js, TypeScript, JavaScript, Tailwind CSS, three.js / React Three Fiber, D3.js / Recharts, React Query, React Native (Expo)
- **Backend:** Node.js, NestJS, Express, Fastify, Python, FastAPI, REST APIs, GraphQL, BullMQ, pg-boss
- **Databases:** PostgreSQL, MySQL, Redis, SQLite, Prisma / TypeORM / Drizzle, pgvector / Qdrant (vector databases)
- **Practices:** Multi-tenant architecture, microservices, monorepos (Nx / Turborepo), OAuth / JSON Web Tokens (JWT) / Role-Based Access Control (RBAC), AES-256 encryption, GIS / OpenStreetMap, Agile / Scrum

### Professional Experience

**Full-Stack Software Engineer — Wisflux Tech Labs, Jaipur, India** · Jun 2022 – Present

- Core engineer on **X-FACE / LACS**, a deployed disaster-response communication platform — built the multi-source live-video layer combining WebRTC / Mediasoup SFU sessions for multi-party voice and video with RTSP / RTMP ingest from fixed camera feeds, so a single operator view spans several video sources at once.
- Implemented FFmpeg-based recording, transcoding and segmenting of live streams into stored media, with playback and retrieval so any past incident can be reviewed after the fact.
- Built the cloud side on **AWS** — EC2 for containerised services, S3 and CloudFront for recorded media delivery, and Lambda / API Gateway with SQS for asynchronous processing — paired with offline-first edge-to-cloud PostgreSQL synchronisation so field systems keep operating without connectivity and reconcile when the link returns.
- Delivered GIS mapping with live GPS telemetry and time-series replay of field-device position and status, plus one-touch provisioning of field mini-PCs, giving the team repeatable device onboarding and fleet management across deployed systems; showcased at ATR Open House 2025, Kyoto, Japan.
- Built the operator-facing React interfaces for live multi-source monitoring, map visualisation, device status and recorded-session playback, kept in sync over WebSockets / Socket.IO.
- Built **GIBP**, a multi-tenant fintech and accounting platform on a NestJS Application Programming Interface (API) integrated with the Formance ledger (organisations, bills, vendors, reconciliation), with React admin portals and end-to-end test coverage.
- Architected modular backend services with JWT authentication, RBAC and API versioning, reducing API response latency by up to 30%; Dockerised development and production environments and streamlined CI/CD pipelines, improving release stability and developer onboarding.
- Published **StreamVerse**, an open-source npm package for WebRTC audio, video and screen sharing with Mediasoup SFU integration; also contributed to **Emmple**, a live ed-tech learning platform serving students across web and WhatsApp over roughly two years.

### Key Projects

**Home Guard — AI Camera Monitoring & Visitor Log**
*Python · YOLO · OpenCV · face recognition · React dashboard*

- Built a security-camera system that ingests a live camera feed, detects people crossing the frame with YOLO object detection, and matches each detected face against an enrolled identity database to separate known residents from unrecognised visitors.
- Records per-person entry and exit events into a searchable log; unrecognised faces queue into an unknown-visitor list that can be enrolled with details or purged from a dashboard — the same recognise → record → retrieve loop a multi-site monitoring platform needs.

**StreamVerse — WebRTC Streaming SDK** · Open source · npm
*TypeScript · WebRTC · Mediasoup SFU · Socket.IO*

- Open-source SDK for audio, video and screen sharing over a Mediasoup SFU — transport, producer and consumer lifecycle, signalling and reconnection handled behind a small API so an application can add multi-party streaming without touching WebRTC internals.

**Echo — End-to-End Encrypted Messaging PWA**
*React · TypeScript · WebRTC · libsodium · IndexedDB · Docker*

- Offline-first, self-hosted messaging Progressive Web App (PWA) with peer-to-peer WebRTC voice and video that prioritises local-network connections; libsodium end-to-end encryption, QR pairing, no accounts.

**Resite — AI Resume Platform** · Live: resite.live
*NestJS · PostgreSQL / TypeORM · BullMQ + Redis · Puppeteer · Google OAuth*

- Platform to create and tailor ATS-optimised resumes, score any resume against a job description, and publish a portfolio to a custom subdomain — NestJS API with queue-based PDF/DOCX parsing and Puppeteer rendering over multi-tenant PostgreSQL.

**SmartTrader — Algorithmic Trading Platform**
*Nx monorepo · NestJS · React + Vite · Python FastAPI · PostgreSQL · Socket.IO · Docker*

- Polyglot platform for the Indian stock market backtesting 28 strategies, with a live market scanner and real-time WebSocket and Telegram alerts — a Node.js and Python service split orchestrated with Docker Compose behind a React dashboard.

**pSEO Engine — Programmatic-SEO SaaS** · Live: pseo.cloud
*Next.js · Drizzle · PostgreSQL / pgvector · pg-boss · multi-LLM router · Lemon Squeezy*

- Generates and quality-gates penalty-resistant SEO landing pages (semantic deduplication via pgvector, thin-content guardrails) and publishes them into a customer repository; resilient multi-provider LLM router with automatic failover.

**UACE — Universal AI Context Engine** · npm: uace-mcp
*TypeScript · Model Context Protocol · SQLite + sqlite-vec · local embeddings · VS Code extension*

- Local-first MCP server giving any AI coding assistant one shared project memory with offline semantic search, git-history ingestion and live file-watch; published to npm with a companion VS Code extension.

### Education

**Bachelor of Technology (B.Tech), Computer Science Engineering** · 2019 – 2023
Anand International College of Engineering, Jaipur • CGPA: 8.5 / 10.0

### Achievements & Recognition

- Represented Wisflux Tech Labs at **ATR Open House 2025, Kyoto, Japan** — an international technology showcase and collaboration event.
- Published npm packages: **StreamVerse** (WebRTC SDK over Mediasoup SFU) and **UACE** (uace-mcp, MCP server).
- Shipped three live products: pSEO Engine (pseo.cloud), Resite (resite.live) and StockSafe Bundles (Shopify App Store).
- Maintain 65+ repositories spanning real-time media, full-stack web, AI agents and algorithmic trading.

---

## Regenerating the artifacts

Edit `resume-dhive.html`, then from the repo root:

```bash
# PDF — Chrome headless honours the print CSS exactly
google-chrome --headless --disable-gpu --no-sandbox --no-pdf-header-footer \
  --print-to-pdf=public/dhive/Shivam_Gupta_Resume_DHive.pdf \
  docs/career/dhive/resume-dhive.html

# DOCX — writes the OOXML directly (LibreOffice's HTML filter produced a
# 3-page file with substituted fonts and collapsed right-aligned tabs)
python3 docs/career/dhive/html-to-docx.py \
  docs/career/dhive/resume-dhive.html \
  public/dhive/Shivam_Gupta_Resume_DHive.docx
```

Then sanity-check what an ATS will see:

```bash
pdftotext -layout public/dhive/Shivam_Gupta_Resume_DHive.pdf - | less
pdfinfo public/dhive/Shivam_Gupta_Resume_DHive.pdf | grep Pages   # expect 2
```

> **Note:** `public/` is served by the site. These files are not linked from any page and are not in
> the sitemap, but they are reachable at `shivamgupta.live/dhive/…` once deployed. Move them under
> `docs/career/dhive/` if you'd rather they weren't.
