# Deployment, CI and testing — the evidence across your repos

This file answers one question an interviewer will ask in some form: **"Show me how you ship."**
It walks through every Dockerfile, Compose file, CI workflow and test setup that actually exists
in your repos, explains each line in plain English, and is blunt about what's missing compared
with a "Senior Full-Stack AI Engineer" JD (Kubernetes, CI security gates, cloud).

The short version:

- **Docker + Compose: real and production-grade** in resite, smart-trading-v2 and lacs-infra.
- **CI: one workflow in the whole set** — `smart-trading-v2/.github/workflows/ci.yml`. resite,
  portfolio, lacs-infra and source-of-income have **no** `.github/workflows/`.
- **Security gates (SAST/DAST/SCA/secret scanning): none anywhere.** A grep for trivy, gitleaks,
  semgrep, bandit, pip-audit, dependabot and snyk across all five repos finds nothing.
- **Kubernetes: none.** No `kind: Deployment` manifest in any repo.
- **Tests:** strong Vitest unit suite in resite (178 cases), a Playwright smoke suite, a small
  pytest suite in smart-trading-v2 (one file runs in CI).

Already-written answers that this file must agree with:
[../../interview-qa/06-devops-infra.md](../../interview-qa/06-devops-infra.md) (Docker/CI theory) and the
LACS section of [../../genai/14-deepdive-projects.md](../../genai/14-deepdive-projects.md) (LACS is a **team** project).
Learning modules: [../11-devsecops-docker-k8s-cicd-cloud.md](../11-devsecops-docker-k8s-cicd-cloud.md),
[../09-testing-pytest-jest-rtl.md](../09-testing-pytest-jest-rtl.md).

---

## JD coverage

| JD item | Evidence (file:line) | Rating |
|---|---|---|
| Docker | `resite/apps/api/Dockerfile:5-65`, `smart-trading-v2/apps/engine/Dockerfile:1-30` | **Strong** |
| Multi-stage builds | resite api `Dockerfile:5,12,22,30` (base→deps→build→runtime); smart-trading engine wheels `apps/engine/Dockerfile:1,12` | **Strong** |
| Docker Compose | `resite/infra/docker-compose.yml:13-133`; `smart-trading-v2/infra/docker-compose.yml:7-140`; `lacs-infra/docker/docker-compose.yml` (482 lines) | **Strong** |
| Kubernetes | none in any repo | **Not present** |
| CI/CD pipeline | `smart-trading-v2/.github/workflows/ci.yml:1-48` (build + pytest only, no deploy) | **Partial** |
| SAST / DAST / dependency scanning | none | **Not present** |
| Secrets handling | `.env` excluded from images `resite/.dockerignore:6-7`, `smart-trading-v2/.dockerignore:17-20`; deploy refuses without `.env` `resite/infra/scripts/deploy.sh:13`; **but** TLS key committed in `lacs-infra/docker/config/nginx/user_conf.d/cert/localhost.key` | **Partial** |
| Reverse proxy / TLS | Host routing `resite/infra/nginx/nginx.conf:23-45`; TLS at Cloudflare `nginx.conf:1`; Let's Encrypt via nginx-proxy + acme-companion `lacs-infra/docker/docker-compose.proxy.yml:19-58` | **Strong** |
| Cloud (AWS/Azure) | none; self-hosted on work-pc + Cloudflare Tunnel `resite/infra/docker-compose.yml:119-128`; portfolio on Netlify `portfolio/netlify.toml:5-7` | **Not present** (AWS/Azure) |
| Monitoring | Container healthchecks `resite/infra/docker-compose.yml:69-77`; `/health` with db/redis/sha `resite/apps/api/src/health/health.service.ts:8-12`; post-boot verifier `lacs-infra/scripts/lacs-stack-verify.sh:44-49`; log rotation `lacs-infra/docker/docker-compose.yml:1-9` | **Partial** (no metrics/alerting) |
| PyTest | `smart-trading-v2/apps/engine/test/test_backtest_engine.py:1-40`, run in CI `ci.yml:22-23` | **Partial** |
| Jest / Vitest | resite Vitest `resite/apps/api/vitest.config.ts:3-13` (23 files, 178 `it()`); smart-trading `api-e2e` is the Nx "Hello API" scaffold `smart-trading-v2/apps/api-e2e/src/api/api.spec.ts:3-10` | **Strong** (resite) |
| React Testing Library | none in any repo | **Not present** |
| E2E / Playwright | `resite/apps/web/playwright.config.ts:13-32`, 5 specs incl. mobile viewport | **Partial** (local only, not in CI) |
| Smoke tests | Playwright "no horizontal overflow" check `resite/apps/web/e2e/ats.spec.ts:15-17`; deploy waits for tunnel `resite/infra/scripts/deploy.sh:29-31` | **Partial** |

---

## Repo 1 — resite (your own, live at resite.live)

### `apps/api/Dockerfile` — one image, three jobs
| Lines | What it does | Why |
|---|---|---|
| `:5-9` | `FROM node:24-slim AS base`, enable corepack (pnpm) | Debian-slim, not Alpine — Chrome and sharp need glibc |
| `:12-19` | Copy **only** lockfile + every `package.json`, then `pnpm install --frozen-lockfile` with a BuildKit cache mount | Layer caching: this layer is reused until a dependency changes |
| `:22-25` | Copy source, build `@resite/shared` then the API | Shared package must compile first |
| `:27` | `pnpm deploy --prod /prod/api` | Produces a folder with only production deps |
| `:30-34` | Runtime stage, `NODE_ENV=production`, `GIT_SHA` build arg baked in as env | `/health` can report which commit is live |
| `:45-57` | Install poppler (`pdftoppm`), Google Chrome, fonts | PDF rasterising for OCR and Puppeteer PDF export |
| `:61` | Create `/data/uploads` owned by `node` | Fixed a real prod bug: root-owned volume → upload EACCES |
| `:62-65` | Copy the pruned bundle, `USER node`, `CMD ["node","dist/main.js"]` | Non-root, exec-form CMD so SIGTERM reaches Node |

The comment at `:4` says the same image backs `api`, `worker` and `migrate` — Compose just
overrides `command` (`resite/infra/docker-compose.yml:48,84`).

### `apps/web/Dockerfile`
Same deps pattern (`:11-18`). `NEXT_PUBLIC_API_URL` is a **build arg** (`:22-23`) because Next
inlines `NEXT_PUBLIC_*` into the browser bundle at build time — you can't change it at runtime.
The runtime copies Next's **standalone** output (`:36-38`; enabled in `apps/web/next.config.ts:7`),
which traces only the files the server needs. Runs as `node` (`:39`).

### `infra/docker-compose.yml` — the production stack
- `x-app-env` anchor (`:7-11`): a YAML anchor so api/worker/migrate share `DATABASE_URL` pointing at
  the service name `db`, not localhost.
- `db` (`:14-30`): `pgvector/pgvector:pg17`, a named volume for data, an init SQL mounted read-only,
  and a `pg_isready` **healthcheck**.
- `migrate` (`:43-52`): one-shot (`restart: 'no'`), waits for `db` to be **healthy**.
- `api` (`:54-77`): starts only after `migrate` **completed successfully** (`:66-67`) — so code
  never runs against an un-migrated schema. Its healthcheck runs a tiny `fetch('/health')` with Node
  because the slim image has no curl (`:69-77`).
- `worker` (`:79-92`): same image, different `command`, shares the uploads volume.
- `nginx` (`:107-117`): the only service with a published port (8090 → 80).
- `cloudflared` (`:123-128`): outbound-only tunnel to Cloudflare using `TUNNEL_TOKEN` from `.env` —
  no inbound ports open on the home network.

### `infra/nginx/nginx.conf`
- `:1` — "HTTP-only — Cloudflare terminates TLS."
- `:18-21` — a `map` that **keeps** Cloudflare's `X-Forwarded-Proto: https` instead of overwriting it
  with `http`. Paired with `app.set('trust proxy', 1)` (`resite/apps/api/src/main.ts:20`) this fixed
  production Google OAuth (secure cookie was being dropped).
- `:24-33` — `api.resite.live` → api upstream, `client_max_body_size 15m` for uploads.
- `:36-45` — `default_server` catches apex, www and `*.resite.live` → web (the Next middleware then
  splits tenants).

### Deploy scripts
`infra/scripts/build-and-push.sh:26-42` builds both images for `linux/amd64`, tags with `latest`,
passes `GIT_SHA`, pushes to Docker Hub. `deploy.sh:13-22` (run on work-pc) checks `.env` and
`TUNNEL_TOKEN`, then `docker compose -p resite pull && up -d`, then tails logs until the tunnel
registers (`:29-31`). **This is CD by hand** — you run it, not a pipeline.

### Tests
- **Vitest** (`apps/api/vitest.config.ts:3-13`): Node environment, `src/**/*.spec.ts`, esbuild told
  to emit decorator metadata so Nest classes load. 23 spec files, 178 `it()` cases covering scoring,
  JD extraction, the AI router client (with `fetch` mocked via `vi.spyOn`,
  `apps/api/src/ai/providers/router.client.spec.ts:32`), upload sniffing, Razorpay signatures,
  subdomain validation and DB connect-retry.
- **Playwright** (`apps/web/playwright.config.ts:13-32`): `globalSetup` seeds a user and writes a
  signed-in cookie (`:15,24`), two projects — Desktop Chrome and a 390px Pixel 5 (`:27-31`),
  retries and `forbidOnly` switch on when `CI` is set (`:19-20`) — ready for CI, never wired to it.

---

## Repo 2 — smart-trading-v2 (Nx monorepo: NestJS + Prisma API, FastAPI engine, React/Vite UI)

### `.github/workflows/ci.yml` — your only CI, line by line
```yaml
on:
  push:
    branches: [main, roadmap-v2]     # :3-6 run on pushes to these branches and on every PR
  pull_request:
jobs:
  engine-tests:                       # :9  job 1 — Python
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: apps/engine } }
    steps:
      - uses: actions/checkout@v4     # :16 clone the repo
      - uses: actions/setup-python@v5 # :17-19 Python 3.12
      - run: pip install -r requirements-dev.txt          # :21 = requirements.txt + pytest
      - run: python -m pytest test/test_backtest_engine.py -q   # :23 ONE test file
```
Jobs 2 and 3 (`:25-35`, `:37-48`) install with `npm install --legacy-peer-deps`, run
`prisma generate`, and `nx build api --prod` / `nx build frontend --prod`. The three jobs run **in
parallel** (no `needs:`). What it proves: every push compiles both TypeScript apps and the
backtest engine's core maths is checked. What it lacks: no dependency cache (`setup-node` without
`cache: npm`), `npm install` instead of `npm ci`, no lint/typecheck job, no image build, no deploy.

### Tests
`apps/engine/test/` has 8 files, but only 3 contain `def test_` functions
(`test_backtest_engine.py` 5, `test_roadmap_fixes.py` 12, `test_backtest_report_upsert.py` 1). The
others are benchmark scripts — e.g. `test_process_fastapi.py:6` appends an absolute path to a
**different** repo (`/home/shivam/workspace/smart-trading/...`), so they'd fail on any other machine.
`test_backtest_engine.py:17-33` is a good pattern: a fake strategy that emits one BUY with known
stop-loss/target so the engine's exit logic can be asserted deterministically. `apps/api-e2e` is
the untouched Nx scaffold expecting `{ message: 'Hello API' }` (`api.spec.ts:3-10`) — don't cite it.

### Dockerfiles
- **Engine** (`apps/engine/Dockerfile`): builder stage installs gcc and builds **wheels**
  (`:1-9`); runtime stage installs from those wheels with `--no-index` (`:12-21`) so no compiler
  ends up in the final image. `PYTHONUNBUFFERED=1` (`:27`) so logs appear immediately. Runs uvicorn
  (`:30`). **Runs as root** (no `USER`).
- **API** (`apps/api/Dockerfile`): build on `node:20-alpine`, `npm prune --omit=dev` (`:11`), copy
  `dist` + `node_modules` + Prisma schema (`:15-19`). Copies the whole repo before building (`:6`), so
  any source change re-runs everything after it. Root user.
- **Frontend** (`apps/frontend/Dockerfile`): Vite build then served by `nginx:alpine` (`:27-39`).
  It still declares `ARG VITE_API_KEY` → `ENV` (`:6-7`); anything passed there would be baked into
  public JS. The code comment says the key is **not** baked in and is fetched after a PIN login into
  `sessionStorage` (`apps/frontend/src/config.ts:15-24`) — so the ARG is dead weight worth removing.

### Compose and nginx
`infra/docker-compose.yml` is the real work-pc stack (images `shivam13gupta/smart-trading-v2-*`,
`pull_policy: always`, `:26-29`). The **engine image runs three services** — engine, `scanner`
(`:99-104`) and `scheduler` (`:126-131`) — by overriding `command`. The root
`docker-compose.prod.yml` still has `yourusername` placeholders (`:27`) — an older copy.

`infra/nginx/default.conf`: HTTP Basic Auth gate (`:14-15`); `resolver 127.0.0.11` + a variable in
`proxy_pass` (`:22-26`) so nginx re-resolves the `api` container's IP after a recreate (a real 502
bug, explained in the comment `:17-21`); WebSocket upgrade for `/socket.io/` (`:35-44`); SPA
fallback `try_files … /index.html` (`:46-48`); 1-year cache for static assets (`:50-53`). The
engine's API-key check is opt-in — open if `API_KEY` is unset (`apps/engine/auth.py:3`).

---

## Repo 3 — lacs-infra (TEAM project — infra config for LACS/X-FACE)

> **Attribution:** LACS is a team product; `lacs-infra` is the team's deployment repo. Describe what
> the config does and only claim the commits you personally made. The AI serving story is in
> [../../genai/14-deepdive-projects.md](../../genai/14-deepdive-projects.md).

- **Two variants** (`lacs-infra/README.md:3-9`): L-LACS (edge mini-PC, intermittent network) and
  C-LACS (cloud sync hub), each a compose **overlay**: `docker-compose.yml` + `docker-compose.l-lacs.yml`
  or `+ c-lacs.yml` (`scripts/lacs-stack-verify.sh:21-29`).
- **Hardware overlay:** `docker-compose.asr-vulkan.yml:20-26` passes the iGPU render node `/dev/dri`
  into the ASR container and adds the host's `video`/`render` group IDs, so whisper.cpp can use
  Vulkan. The ASR engine is chosen by image tag (`docker-compose.yml:193-197`).
- **Log rotation everywhere:** a `x-logging` anchor caps json-file logs at 10 MB × 3
  (`docker-compose.yml:1-9`) — the comment records that unbounded logs filled disks on 22 of 22
  services.
- **Healthchecks:** `pg_isready` on both Postgres containers, with `start_period: 60s` on the
  older one (`docker-compose.yml:336-340,348-353`).
- **External network:** all stacks join a pre-created network named by env (`docker-compose.yml:476-479`),
  so the proxy stack can run as a separate project that a stack `down` won't take out
  (`docker-compose.proxy.yml:10`).
- **TLS, two ways:** on C-LACS, `nginx-proxy` reads the Docker socket and routes by
  `VIRTUAL_HOST`; with `--profile acme`, `acme-companion` gets Let's Encrypt certs
  (`docker-compose.proxy.yml:19-58`). On the edge box, nginx listens `443 ssl` with a local cert for
  `xface.local`/`lacs.local` (`docker/config/nginx/user_conf.d/nginx.dev.l-lacs.conf:22-26`).
- **systemd** (`systemd/lacs-stack.service`): starts after Docker and network-online (`:8-10`),
  `Type=oneshot` + `RemainAfterExit=yes` (`:18-19`) runs the boot script once and counts as "active";
  `ExecStartPost` runs the verifier (`:29`) so the unit fails if not every service came up;
  `Restart=on-failure` bounded by `StartLimitBurst=3` per hour — placed in `[Unit]` because systemd
  ignores it under `[Service]` (`:11-15,33-34`). Runs as a dedicated non-root user (`:20-21`).
- **Verifier** (`scripts/lacs-stack-verify.sh:44-49`): asks Compose for the expected service list and
  compares with what's running; it reports and deliberately never restarts (`:11-13`).

---

## Repo 4 — portfolio (this site)

Static export: `output: "export"`, `trailingSlash`, unoptimised images (`portfolio/next.config.ts:5-8`).
Netlify builds `npm run build` and publishes `out/` on Node 22 (`portfolio/netlify.toml:5-10`), with
immutable caching on `/_next/static/*` (`:21-24`). `prebuild` fetches GitHub repo data
(`portfolio/package.json:7`), using `GITHUB_TOKEN` or the `gh` CLI token and keeping the committed
JSON on failure (`scripts/fetch-github.mjs:17-28`). CD = Netlify's Git integration on `main`; there
is no test or lint step in the deploy. **source-of-income** has the same four-stage Node 24 Dockerfile
shape as resite (`source-of-income/Dockerfile:4,11,16,26`) and no CI either.

---

## Concepts explained from zero

- **Image vs container.** An image is a frozen, read-only filesystem plus a start command. A
  container is a running process created from it, with a thin writable layer that is thrown away.
- **Layers & caching.** Each Dockerfile instruction makes a layer. If the inputs to a step haven't
  changed, Docker reuses the cached layer. That's why resite copies `package.json` files before
  source (`apps/api/Dockerfile:13-19`), and why smart-trading's API `COPY . .` before building
  (`apps/api/Dockerfile:6`) is slower.
- **Multi-stage build.** Several `FROM`s in one file; later stages `COPY --from=` only the outputs.
  Compilers and dev deps never reach the final image → smaller, fewer CVEs.
- **Compose networks.** Services on the same Compose network reach each other by service name
  (`db:5432`, `http://engine:8000`). Only `ports:` are reachable from the host.
- **Volumes.** Named volumes (`resite-pgdata`) survive container recreation; bind mounts
  (`./nginx/nginx.conf:…:ro`) map a host file in.
- **Healthchecks & `depends_on` conditions.** A healthcheck is a command Docker runs periodically;
  `condition: service_healthy` waits for it, `service_completed_successfully` waits for a one-shot to
  exit 0. Note: these only order `compose up`, not a host reboot — which is why resite added a DB
  connect-retry loop (`resite/apps/api/src/database/connect-retry.ts:1-5`).
- **Env vs secrets.** Env vars configure; secrets are env vars you must never commit or bake into
  layers. `.dockerignore` keeps `.env` out of the build context. Compose reads `.env` at deploy time.
  Build args like `NEXT_PUBLIC_*`/`VITE_*` end up in public JS — never put a secret there.
- **Reverse proxy.** One entry server (nginx) that receives every request and forwards it to the
  right backend by `Host` or path. **TLS termination** = where HTTPS is decrypted (Cloudflare for
  resite, nginx-proxy for C-LACS). `X-Forwarded-Proto` tells the app the original scheme.
- **systemd unit.** Linux's service manager config: when to start (`After=`, `WantedBy=`), what to
  run (`ExecStart=`), and restart policy.
- **CI jobs/steps.** A workflow has jobs (separate VMs, parallel by default, ordered with `needs:`)
  made of steps (shell commands or reusable `uses:` actions). **Caching** saves `~/.npm` or pip
  wheels between runs. A **matrix** runs one job over several versions (Node 20/22).
- **SAST** (static application security testing): scans source for risky patterns — Semgrep, Bandit,
  CodeQL. **SCA** (software composition analysis): checks dependencies against CVE databases —
  `npm audit`, `pip-audit`, Trivy. **DAST** (dynamic): attacks a *running* app over HTTP — OWASP ZAP.
  **Secret scanning**: finds committed keys — gitleaks. A **security gate** is CI failing the build
  when one of these finds something above a severity threshold.
- **CVE.** A public ID for a known vulnerability (e.g. CVE-2024-xxxx) with a CVSS severity score.
  "CVE analysis" = deciding whether a flagged CVE is reachable in your code and how urgently to patch.

---

## What's missing vs the JD — and an afternoon recipe for each

### 1. No CI on resite (your flagship)
Add `resite/.github/workflows/ci.yml`:
```yaml
name: ci
on: { pull_request: {}, push: { branches: [main] } }
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9.12.0 }
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build:shared
      - run: pnpm typecheck
      - run: pnpm --filter @resite/api test
```

### 2. No security gates anywhere
Add a `security` job (works for resite; swap paths for smart-trading):
```yaml
  security:
    runs-on: ubuntu-latest
    permissions: { contents: read, security-events: write }
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2          # secret scanning over history
        env: { GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}" }
      - uses: returntocorp/semgrep-action@v1        # SAST
        with: { config: p/typescript p/nodejsscan }
      - run: pnpm audit --prod --audit-level high   # SCA (needs pnpm setup steps above)
      - run: docker build -f apps/api/Dockerfile -t resite-api:ci .
      - uses: aquasecurity/trivy-action@0.28.0      # image CVE scan
        with: { image-ref: resite-api:ci, severity: CRITICAL,HIGH, exit-code: '1', ignore-unfixed: true }
```
Expect Trivy to flag things in the Chrome layer — triaging those is exactly "CVE analysis".

### 3. Python CI is thin (smart-trading-v2)
Replace the `engine-tests` job:
```yaml
  engine:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: apps/engine } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12', cache: pip, cache-dependency-path: apps/engine/requirements*.txt }
      - run: pip install -r requirements-dev.txt ruff bandit pip-audit
      - run: ruff check .
      - run: bandit -r . -x ./test -ll          # SAST, medium+ severity
      - run: pip-audit -r requirements.txt     # SCA
      - run: python -m pytest test/test_backtest_engine.py test/test_roadmap_fixes.py test/test_backtest_report_upsert.py -q
```
Also: move the benchmark scripts out of `test/` (or rename them so pytest skips them), and pin
`requirements.txt` versions — it's currently unpinned (`apps/engine/requirements.txt:1-12`).

### 4. No DAST
A ZAP baseline scan against a running stack (nightly is enough):
```yaml
  dast:
    runs-on: ubuntu-latest
    steps:
      - uses: zaproxy/action-baseline@v0.12.0
        with: { target: 'https://resite.live', fail_action: false }
```
Baseline is passive (no attacks), safe to run against prod; look for missing security headers —
resite's nginx sets none (no `add_header` in `resite/infra/nginx/nginx.conf`).

### 5. No Kubernetes
A minimal manifest for resite's API (`k8s/api.yaml`), runnable on `kind` or `k3d` locally:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: resite-api }
spec:
  replicas: 2
  selector: { matchLabels: { app: resite-api } }
  template:
    metadata: { labels: { app: resite-api } }
    spec:
      securityContext: { runAsNonRoot: true }
      containers:
        - name: api
          image: shivam13gupta/resite-api:<git-sha>
          ports: [{ containerPort: 3001 }]
          envFrom: [{ secretRef: { name: resite-env } }]
          readinessProbe: { httpGet: { path: /health, port: 3001 }, periodSeconds: 10 }
          livenessProbe:  { httpGet: { path: /health, port: 3001 }, initialDelaySeconds: 20 }
          resources: { requests: { cpu: 100m, memory: 256Mi }, limits: { memory: 1Gi } }
---
apiVersion: v1
kind: Service
metadata: { name: resite-api }
spec: { selector: { app: resite-api }, ports: [{ port: 80, targetPort: 3001 }] }
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata: { name: resite }
spec:
  rules:
    - host: api.resite.live
      http: { paths: [{ path: /, pathType: Prefix, backend: { service: { name: resite-api, port: { number: 80 } } } }] }
```
Map it to what you know: Deployment ≈ the `api` compose service with `replicas`, Service ≈ the
Compose DNS name, Ingress ≈ your nginx `server_name` block, `migrate` becomes a Kubernetes `Job`.
Careful: `/health` returns `degraded` when Redis is down — for liveness you'd want a cheaper probe,
or a liveness failure would restart pods during a Redis outage (the trap in
[../../interview-qa/06-devops-infra.md](../../interview-qa/06-devops-infra.md)).

### 6. Smaller hardening items
- Tag images with the git SHA, not only `latest` (`resite/infra/scripts/build-and-push.sh:11`) — so
  rollback = redeploy the previous tag.
- Add `USER` to smart-trading's engine and API Dockerfiles.
- Stop publishing Postgres to the host (`resite/infra/docker-compose.yml:21-22`,
  `smart-trading-v2/infra/docker-compose.yml:16-17`) unless you need it.
- Remove `ARG VITE_API_KEY` from `smart-trading-v2/apps/frontend/Dockerfile:6-7`.
- Raise with the LACS team that a TLS private key is git-tracked under
  `lacs-infra/docker/config/nginx/user_conf.d/cert/` (self-signed for `.local` hosts, but still).
- Add RTL component tests to resite web, and run Playwright in CI against `docker compose up`.

---

## Say it in an interview

**Q1. Walk me through how you deploy Resite.**
"Two multi-stage images built from the monorepo root — one API image that runs as api, worker and
a one-shot migrate container, and a Next standalone image. Compose orders them: DB healthy →
migrations complete → API. nginx routes by host, and a Cloudflare Tunnel exposes it with no
inbound ports. Today the build-and-push is a script on my machine; the next step is moving that
into GitHub Actions with SHA tags."

**Q2. What does your CI do?**
"In smart-trading-v2, three parallel GitHub Actions jobs: pytest on the backtest engine, and Nx
production builds of the NestJS API and React frontend on every push and PR. It's a build gate,
not a full pipeline — no lint job, no security scanning, no deploy. I can describe exactly what
I'd add." (Then recipe 2 and 3.)

**Q3. How do you handle secrets?**
"`.env` files live only on the host, are excluded from every build context with `.dockerignore`,
and are injected by Compose at runtime. The deploy script refuses to run without them. I'd add
gitleaks in CI, because the realistic risk is someone committing one."

**Q4. Have you used Kubernetes?**
"Not in production. My deployments are single-host Compose, where Kubernetes would be overkill —
LACS field nodes are mini-PCs, my own services run on one server. I know the mapping: services to
Deployments plus Services, nginx to an Ingress, healthchecks to readiness and liveness probes,
the migrate container to a Job — and I've written that manifest for Resite's API."

**Q5. What's the difference between SAST, SCA and DAST, and where would each run?**
"SAST reads source — Semgrep or Bandit on every PR. SCA checks dependencies against CVE feeds —
pip-audit, npm audit, Trivy on the image — on PRs and on a schedule, because new CVEs appear for
old code. DAST probes the running app — a ZAP baseline against staging nightly. I haven't wired
these into my repos yet; I'd add them as one CI job and fail on high severity."

**Q6. Tell me about a production bug infra caused.**
"Resite's Google login worked locally and 401'd in prod. Cloudflare terminates TLS, so nginx saw
http and overwrote `X-Forwarded-Proto`; Express thought the request wasn't secure and dropped the
secure OAuth state cookie. Fix was an nginx `map` that preserves the header plus
`trust proxy` in Express." (`resite/infra/nginx/nginx.conf:18-21`, `resite/apps/api/src/main.ts:20`)

**Q7. How do you know a deploy actually worked?**
"Compose healthchecks, a `/health` endpoint that reports DB, Redis and the git SHA, and the deploy
script waits for the tunnel to register. On the LACS boxes the team's systemd unit runs a verifier
that compares expected and running services, so a boot with 17 of 22 services marks the unit failed."

**Q8. What's your testing strategy?**
"Pure logic gets unit tests — Resite's ATS scoring, JD extraction and AI client have 178 Vitest
cases with the network mocked. User journeys get a small Playwright suite on desktop and a 390px
phone, including a no-horizontal-scroll check. On Python, pytest with synthetic data so engine
results are deterministic. The gap is that only the Python tests run in CI today."
