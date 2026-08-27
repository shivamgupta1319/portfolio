# D.Hive — Full-Stack Software Engineer (Cloud Platform)

Application kit for one role. Everything company-specific lives here; the general prep kit is in
[`../README.md`](../README.md).

| | |
|---|---|
| **Employer** | D.Hive (hiring via **Redrob by McKinley Rice**) |
| **Role** | Full-Stack Software Engineer, Cloud Platform |
| **Location** | Hybrid — Noida or Pune, 5 days |
| **Stated experience band** | 5–10 years (you have 4+ — see *The years gap* below) |
| **Process** | HR screen (virtual) → 2 technical rounds (virtual) → offer |
| **JD** | `JD_D. Hive-Full-Stack Software Engineer (Cloud Platform) (1).pdf` at the repo root |

## What they actually do

D.Hive sells **ROBOPILOT**, a site-specific autonomous-driving SaaS platform for robots and drones —
quadruped robots, wheeled robots and drones deployed on customer sites. The commercial pilot is with
**Hyundai Construction**: safety monitoring on construction sites, verifying things like helmet and
safety-harness compliance from drone and quadruped-robot camera feeds.

**The project you'd be hired onto**, in their words: a robot/drone control service for multiple
clients, with client-specific, region-specific and robot-specific control, AI-based real-time
recognition and recording of video feeds from robots, and stored data retrievable by client, site or
robot for later review.

Read that twice. It is: **multi-source video ingest → AI recognition → recording → scoped retrieval,
multi-tenant, on AWS.** That is the shape of your LACS work plus Home Guard, and it is why the resume
was rewritten in that order.

McKinley Rice is the umbrella; Redrob (their sales-intelligence product, $14M Series A from Korean and
US VCs) is a sibling, not this job. Don't prep Redrob — but do know it exists, because the recruiter
screen will come from a McKinley Rice person and half the JD is about them.

## Requirement → evidence

The JD's hard requirements, and what answers each one.

| JD requirement | Your evidence | Strength |
|---|---|---|
| Video streaming, **mandatory**, multi-source (CCTV / robotics / drones / video chat) | LACS multi-source layer: Mediasoup SFU sessions + RTSP/RTMP camera ingest; StreamVerse SDK; Echo P2P | **Strong** |
| RTMP and WebRTC in practice | RTSP/RTMP ingest in LACS; WebRTC/Mediasoup across LACS, StreamVerse, Echo | **Strong** |
| React.js front-end | 4 years; LACS operator UI, GIBP admin portals, every project | **Strong** |
| Python + ML / Vision AI on video or images | Home Guard (YOLO + face recognition on a live feed); PaddleOCR/OpenCV | **Good** |
| Databases — DynamoDB **or** PostgreSQL | PostgreSQL everywhere, incl. multi-tenant and edge↔cloud sync. No DynamoDB | **Good** (Postgres side) |
| Real-time messaging — MQTT **or** Socket.IO | Socket.IO / WebSockets throughout. **No MQTT** | **Partial** |
| AWS | LACS: EC2, S3/CloudFront, Lambda/API Gateway, SQS | **Good** |
| Docker / containers | Dockerised dev + prod, Compose, CI/CD, edge deployment | **Strong** |
| Full-stack across FE / BE / cloud / DB / real-time | The entire résumé is this | **Strong** |
| 2–4+ years of progressive growth in one team | 4 years at Wisflux, front-end → backend → media → cloud → edge | **Strong** — they ask for this explicitly, twice |
| Cloud full-stack architecture (preferred) | LACS edge↔cloud architecture; GIBP multi-tenancy; SmartTrader polyglot split | **Good** |
| Real-time sensor data — video, GPS, LiDAR (preferred) | Video + GPS/GIS replay in LACS. **No LiDAR** | **Partial** |
| Fleet / device management (preferred) | One-touch provisioning of field mini-PCs, edge fleet | **Good** |
| LLM exposure (preferred) | pSEO multi-LLM router, UACE MCP server, Glacier Dev agents | **Strong** |
| UI/UX collaboration, Figma (preferred) | Design-to-implementation work across products; portfolio site | **Fair** |
| FastAPI (preferred) | SmartTrader Python services | **Good** |
| PHP / Laravel, C++ (preferred) | None | **Gap** |
| Robotics / autonomous systems / ROS | None | **Gap** |

## The gaps, and what to say

Full scripts are in [`interview-qa.md`](interview-qa.md) §5, §6, §8 and §12. Short version:

| Gap | The one-liner |
|---|---|
| **MQTT** | "I haven't shipped MQTT. I've shipped the same problem over Socket.IO and WebRTC data channels — pub/sub topics, delivery guarantees, presence, reconnect. I know MQTT's model — topics, QoS 0/1/2, retained messages, last will — and for constrained robot links it's the better default than a socket server. It's a week, not a quarter." |
| **DynamoDB** | "PostgreSQL is where my depth is, including multi-tenant scoping. I understand DynamoDB's single-table model well enough to design against it — access patterns first, `PK` on the tenant, `SK` on site/robot/timestamp — and I'd expect to be slow for the first sprint." |
| **LiDAR** | "No LiDAR. I have done time-series sensor replay — GPS tracks synced to recorded video on a map — and I've built 3D rendering with three.js, so point-cloud visualisation isn't foreign territory. The domain knowledge is the gap, not the plumbing." |
| **Robotics / ROS** | "I've never worked on the robot side. My value is the cloud platform around it — ingest, recognition, storage, retrieval, multi-tenant control — which is what the role describes." |
| **The years gap** | Don't raise it. If they do: "Four years, all at one company, where I moved from front-end into backend, real-time media, cloud and edge deployment. Your JD says you value exactly that progression. Judge the scope of what I've shipped rather than the number." |

## Before you send it

- [ ] Read [`interview-qa.md`](interview-qa.md) §1–§4 end to end. Video streaming is the mandatory
      requirement and the whole screen turns on it.
- [ ] Be able to draw the LACS video path on a whiteboard from memory — source, transport, SFU,
      recorder, storage, playback.
- [ ] Be able to draw Home Guard the same way, and know its honest limits (single camera, home scale)
      before an interviewer finds them.
- [ ] Push Home Guard to GitHub if it isn't there. It is the single most relevant thing you own for
      this JD and right now there's no link to it.
- [ ] Attach `public/dhive/Shivam_Gupta_Resume_DHive.pdf`. Send the DOCX only if a portal demands it.
- [ ] Decide your Noida/Pune answer before the HR screen. It's a hybrid role and you're in Jaipur —
      "willing to relocate, and here's my timeline" beats hesitating.
- [ ] Salary: per [`../README.md`](../README.md), never anchor on current CTC. Anchor on market rate
      for a full-stack engineer with real-time video depth.

## Files here

| File | What it is |
|---|---|
| [`resume-dhive.md`](resume-dhive.md) | The tailored resume, plus a change log vs. the general one and the regeneration commands |
| [`resume-dhive.html`](resume-dhive.html) | Source of truth — edit this, then regenerate |
| [`html-to-docx.py`](html-to-docx.py) | HTML → OOXML converter used to build the `.docx` |
| [`interview-qa.md`](interview-qa.md) | The prep kit for the two technical rounds |

Artifacts land in `public/dhive/`. The original resume in `public/resume/` is untouched.
