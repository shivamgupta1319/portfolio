# Caylent | BOT Consulting — Software Engineer

Application kit for one role. Everything company-specific lives here; the general prep kit is in
[`../README.md`](../README.md).

| | |
|---|---|
| **Employer** | Caylent, hiring its India team through **BOT Consulting** (Jaipur GCC partner) |
| **Role** | Software Engineer: end-to-end solution development, AI-assisted features, automation assets for client delivery |
| **Location** | Hybrid, work from office in **Jaipur** (you're local, so relocation isn't an issue) |
| **Stated experience band** | 2–4 years. You have 4+, so you're at the top of the band |
| **Process** | Technical interviews → take-home / case study → assessment review or whiteboard with the GCC partners → in-person cultural round |
| **What you've told TA** | Hybrid: yes · Jaipur · Expected ₹14 LPA (negotiable) · 60 days' notice |
| **JD link** | Broken ("posting no longer available"). The JD text is in this conversation and summarised below |
| **Recruiter's steer** | Mainly **Python and AWS** |

## Who they are

**Caylent** — founded 2015, HQ Irvine, California. An **AWS Premier Tier Services Partner** and
AWS Managed Services Provider, describing itself as "AI-first". It claims **500+ AI workloads built
on Amazon Bedrock**, and it was AWS's 2025 GenAI Consulting Partner of the Year among other awards.

- **April 2026:** launched **ACE (Anthropic Consulting & Engineering)**, a dedicated business unit
  built around Claude, as a charter member of Anthropic's Claude Partner Network. It has two
  tracks. **Agentic SDLC** brings Claude Code into client engineering teams through workshops
  called the *Agentic SDLC Catalyst*. **Applied AI** puts forward-deployed engineers inside client
  codebases to build Claude-powered systems and evaluation frameworks.
- **June 2026:** signed a multi-year Strategic Collaboration Agreement with AWS focused on
  **agentic AI, managed services, and customer-experience transformation on Amazon Connect**.
- **Customer story they publicise:** Smarsh, where software delivery with Bedrock and Claude Code
  is reported to save $5–10M a year.

**BOT Consulting** — Jaipur, incorporated 2022, founders Manpreet Singh (CEO, 25+ years in
cloud consulting) and Deepali Puri. It's a **Build-Operate-Transfer** GCC "venture studio": it
**builds** a team for a client in India, **operates** it as an extension of the client under
agreed KPIs, then **transfers** the centre to the client for a predetermined fee. Their pitch is
that Jaipur gives tier-1 talent at 90%+ retention.

**What that means for you:** you'd likely start on BOT's payroll inside Caylent's India centre,
with a transfer to Caylent later. Ask how and when (Q5 in
[`interview-qa.md` §14](interview-qa.md#14--questions-to-ask-them)). Don't treat it as a red flag.
It's how many GCCs start, and being early in a new centre is an advantage.

## What the role actually is

Read the JD's first paragraph and its CoE line together: *"build assets and automations that can be
integrated into repeatable client delivery work-streams"* and *"contribute to the internal AI Center
of Excellence by building reusable components, frameworks, and automation scripts."*

So it's **not** one product. It's building **reusable, deployable building blocks on AWS**
(serverless services, AI-assisted features, IaC, CI/CD, scripts) that Caylent's consultants drop
into client engagements, plus POCs and pre-sales demos. Your published packages (StreamVerse,
UACE) and your phase-gated Claude Code workflow are the closest evidence you have for that
instinct. Lean on them.

## Requirement → evidence

| JD requirement | Your evidence | Strength |
|---|---|---|
| Python + one more language | Python: SmartTrader FastAPI services, trading research (scikit-learn, Gymnasium RL), ASR serving. Plus TypeScript/JavaScript at production depth | **Strong** |
| **Core AWS: Lambda, API Gateway, EC2, S3, RDS/DynamoDB, Step Functions** | See the claim boundary below. Design-level knowledge in §5–§6; Docker/Linux deployment is the real bridge | **Gap → partial**, the main risk |
| CI/CD, version control, automated testing | GitHub Actions, Dockerised dev/prod, Playwright E2E on GIBP money flows, 345-test repo-intelligence | **Good** |
| Full lifecycle: build, test, deploy, monitor | Everything you've shipped: LACS deployed to the field, three live products | **Strong** |
| AI-assisted features / integrating AI APIs | pSEO multi-LLM router in production, RAG with evaluation, two published MCP servers | **Strong** |
| LLMs, prompting, embeddings, RAG (a plus) | Same as above, plus Stories 9–15 in the positioning doc | **Strong**, your differentiator |
| Data engineering: ETL, feature stores, vector DBs | Vector DBs: pgvector, Qdrant, sqlite-vec (**strong**). ETL: SmartTrader market-data ingestion (**fair**). Feature stores: concept only (**gap**) | **Mixed** |
| Architecture and code reviews | Multi-tenant designs (GIBP, Resite), edge↔cloud sync design (LACS) | **Good** |
| PoCs / pre-sales demos | 0→1 products shipped solo; ATR Open House 2025 showcase in Kyoto | **Good** |
| Reusable components / CoE | StreamVerse and UACE published to npm; your Claude Code skill workflow | **Strong** |
| Degree in CS | B.Tech CSE, CGPA 8.5 | ✅ |
| 2–4 years | 4+ | ✅ top of band |
| AWS certification (preferred) | None | **Gap** (preferred only) |

## The AWS claim boundary — read this first

This is the one thing that can cost you the round, so decide it **before** 2 PM.

| Source | What it says about your AWS |
|---|---|
| **General résumé** (`public/resume/`), probably the one Caylent has | **No AWS listed at all.** DevOps & Cloud stops at Docker, Compose, GitHub Actions, Nginx, systemd, Netlify, Vercel, Render |
| General Q&A kit (`../interview-qa/08-project-grilling.md`) | "Used AWS S3 for object storage… haven't run production workloads on EC2/ECS/EKS or built out VPCs and IAM" |
| D.Hive tailored résumé (`../dhive/resume-dhive.md`) | Claims LACS ran on **EC2, S3 + CloudFront, Lambda + API Gateway, SQS** |
| LACS infra repo (`~/workspace/lacs-infra`), checked today | Docker Compose stacks for the edge node and a **cloud sync node on a public IP**. The only AWS reference is Amazon SES as the mail host. **No Lambda, SQS or CloudFront config in that repo** (it may live elsewhere) |

**What to do:**
1. **Check which résumé you sent Caylent.** If it's the general one, you've made no AWS claim,
   which is the easier position.
2. **Only say what you personally did.** If you did build Lambda / SQS / CloudFront pieces for
   LACS, have one concrete detail ready for each (what triggered the Lambda, what the queue
   decoupled, what CloudFront served). If not, don't repeat the D.Hive résumé's claims here. One
   follow-up question exposes it, and a caught exaggeration ends the process.
3. **The strong honest framing:** *"My production deployments have been Docker on Linux hosts and
   managed platforms, with CI/CD in GitHub Actions. I understand the core AWS services at the
   design level: invocation models, IAM, S3, DynamoDB modelling, Step Functions. What I haven't
   had is AWS at client scale, which is a big part of why this role appeals."* Then **prove the
   design-level claim** by answering §5–§6 well. For a 2–4-year role, an interviewer who hears an
   accurate answer on Lambda retry semantics or IAM evaluation will believe you can learn the
   console.
4. **Optional, if you have an AWS account and 30–40 minutes before the interview:** deploy one
   Python Lambda behind an API Gateway HTTP API (console or SAM) that writes to DynamoDB. Then
   *"I deployed a Python Lambda behind API Gateway writing to DynamoDB this week while preparing"*
   is true, specific, and shows initiative. Don't do this if it eats your revision time.

## Day-of plan

**If you have ~3 hours before 2 PM**

| Time | Do | Where |
|---|---|---|
| 15 min | Read this README. Decide the AWS claim boundary and check which résumé they have | above |
| 45 min | **AWS out loud**: Lambda invocation models, API Gateway, S3, RDS vs DynamoDB, IAM, SQS/SNS/EventBridge, Step Functions, idempotency | [§5](interview-qa.md#5--aws-core-services), [§6](interview-qa.md#6--serverless-architecture-and-orchestration) |
| 30 min | **Python out loud**: GIL, asyncio vs threads, mutable default, decorators, generators, testing with moto, boto3 patterns, the Lambda handler | [§1](interview-qa.md#1--python-core)–[§3](interview-qa.md#3--python-on-aws-boto3-and-lambda) |
| 30 min | **Code by hand without looking**: drills 5, 7, 9, 10, 11, then check against the file | [§4](interview-qa.md#4--python-coding-drills-tested) |
| 25 min | **Draw design A** (the PDF → Textract → Bedrock pipeline) on paper, talking through it. Skim §9 | [§9](interview-qa.md#9--genai-on-aws-bedrock-and-claude), [§10](interview-qa.md#10--design-prompts-theyre-likely-to-give) |
| 15 min | "Tell me about yourself" out loud twice, timed at 90 s. Pick 3 questions to ask | [§12](interview-qa.md#12--behavioural-and-positioning), [§14](interview-qa.md#14--questions-to-ask-them) |
| 10 min | Logistics (below) | |

**If you only have 1 hour:** §5 Lambda + IAM + RDS/DynamoDB (20 min) → §1 GIL, mutable default,
decorator (10 min) → drills 10 and 11 by hand (10 min) → §12 intro out loud (10 min) → design A
skim (10 min).

**Logistics**
- [ ] The résumé *they* have, open on screen, so your answers match it.
- [ ] A Python environment ready for live coding: a terminal with `python3` and an editor. Practise
      typing a function without autocomplete once.
- [ ] Paper and pen (or Excalidraw) for architecture drawing.
- [ ] Links ready to share: shivamgupta.live, pseo.cloud (live), the UACE npm page, and the
      StreamVerse repo.
- [ ] Camera, mic and network checked 10 minutes early. Join 2 minutes early.

## During the round

- **Clarify before designing.** Two or three questions about scale, latency and constraints make
  you look senior. Jumping straight to boxes makes you look junior.
- **Think out loud in coding.** Brute force first, then improve, then walk an example through the
  code, then give the complexity.
- **"I don't know, but here's how I'd find out / reason about it"** beats a guess every time. In
  consulting, confidently wrong advice is the worst trait they could find.
- **Tie answers to Caylent's world when natural:** client environments, reusable assets,
  Bedrock, Claude. Once or twice. Don't force it into every answer.

## Next stage: the take-home / case study

When it arrives (notes for later):
- Read it twice and **write your assumptions down** at the top of the README before coding.
- Ship a **thin, working, deployed or runnable slice** over a broad, half-finished one.
- Include: a README (how to run it in one command, architecture diagram, key decisions and
  trade-offs, what you'd do next), **tests**, IaC if AWS is involved (SAM or CDK), and a cost
  note.
- It gets reviewed live with the GCC partners, so **be able to defend every choice** and name
  what you deliberately left out.
- Don't gold-plate. Timebox, and say you did.

## Money and paperwork

- You've stated **₹14 LPA expected (negotiable)** in writing. Don't lower it in any round. If the
  process goes well and they ask again at offer stage, aim for the top of their band for your
  4 years, especially if you have other processes running.
- The recruiter form lists **₹10 LPA** as current CTC. Background verification checks this against
  payslips and offer letters, so make sure the documents support it. (My notes from July had
  8.4 LPA. Ignore this if you've had a revision since.)
- **60 days' notice.** If they push on it, "open to discussing an earlier release with my
  current employer" is fine to say, but only if it's true.

## Files here

| File | What it is |
|---|---|
| [`interview-qa.md`](interview-qa.md) | The prep kit: Python, AWS, serverless, data, GenAI on Bedrock, design prompts, projects, behavioural, gaps, questions |
| [`python-drills.py`](python-drills.py) | 14 Python coding drills with tests. `python3 docs/career/caylent/python-drills.py` prints `All 14 drills pass.` They're embedded in `interview-qa.md` §4 |

## Sources

- [Caylent launches dedicated Anthropic practice (ACE)](https://caylent.com/blog/caylent-launches-dedicated-anthropic-practice-to-lead-enterprise-ai-transformation)
- [Caylent multi-year SCA with AWS (PR Newswire)](https://www.prnewswire.com/news-releases/caylent-signs-multi-year-strategic-collaboration-agreement-with-aws-to-accelerate-ai-innovation-customer-experience-transformation-and-agentic-cloud-operations-302796751.html)
- [A view from inside Anthropic's Claude Partner Network — Channel Dive](https://www.channeldive.com/news/inside-anthropic-claude-partner-network-caylent/824748/)
- [Caylent × Anthropic](https://caylent.com/anthropic) · [Caylent home](https://caylent.com/)
- [About BOT Consulting](https://www.botconsulting.io/about-us) · [BOT Consulting home](https://www.botconsulting.io/) · [Careers](https://www.botconsulting.io/careers)
- [BOT Consulting Private Limited — Tracxn](https://tracxn.com/d/legal-entities/india/bot-consulting-private-limited/__a5Y9MKnmWqBvg9t6DNvzLUVm8gSljvGpU_o8eq96U6k)

← Back to the [Career Acceleration Kit](../README.md)
