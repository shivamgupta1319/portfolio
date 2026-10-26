# 11: DevSecOps (Docker, Kubernetes, CI/CD, Security Gates, Cloud)

> **JD lines covered:** "Handle end-to-end deployment, CI/CD pipelines, Docker, cloud
> infrastructure, and production releases" · "Own the CI/CD pipeline … automated, scalable
> (Kubernetes/Docker), and secure against modern vulnerabilities (SAST/DAST)" · "Production
> experience with AWS/Azure … 'security-first' mindset (CVE Analysis, CI/CD Security Gates)" ·
> "secure coding and deployment practices".
>
> **Your position (from [projects/09](projects/09-deployment-ci-testing-evidence.md)):** strong
> Docker/Compose (multi-stage, non-root, healthchecks, migrate-then-start, nginx, TLS via
> Cloudflare Tunnel / Let's Encrypt). **Weak or missing:** CI (only one workflow across your repos),
> any SAST/DAST/SCA/secret scanning, Kubernetes and managed cloud. This module is the plan to close
> all of it. Ops Q&A: [interview-qa/06](../interview-qa/06-devops-infra.md).

---

## 🟢 Level 1: Basics

### 1.1 Docker concepts

| Term | Meaning |
|---|---|
| **Image** | Read-only template: filesystem layers + metadata (built from a Dockerfile) |
| **Container** | A running instance of an image (isolated process with its own fs/network) |
| **Layer** | Each instruction creates a cached layer. **Order from least to most frequently changing** |
| **Registry** | Image storage: Docker Hub, GHCR, ECR, ACR |
| **Volume** | Persistent data outside the container lifecycle |
| **Network** | Containers on the same compose network reach each other by service name |

### 1.2 Production Dockerfile for FastAPI (multi-stage, uv, non-root)

```dockerfile
# syntax=docker/dockerfile:1.7
FROM python:3.12-slim AS builder
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev --no-install-project
COPY app ./app
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev

FROM python:3.12-slim AS runtime
RUN useradd --create-home --uid 10001 appuser
WORKDIR /app
COPY --from=builder --chown=appuser:appuser /app /app
ENV PATH="/app/.venv/bin:$PATH" PYTHONUNBUFFERED=1
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request;urllib.request.urlopen('http://localhost:8000/health')"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

Why each choice: dependencies are installed before the code is copied (layer cache), the build tools
stay in the builder (smaller image, smaller attack surface), the container runs as a non-root user,
`--frozen` gives reproducible installs, and there's a healthcheck.

Next.js: use `output: "standalone"` and copy `.next/standalone` + `.next/static` + `public` into a
`node:22-slim` runtime as non-root.

### 1.3 docker-compose for local dev

```yaml
services:
  api:
    build: ./backend
    env_file: .env
    depends_on:
      db: { condition: service_healthy }
      migrate: { condition: service_completed_successfully }
    ports: ["8000:8000"]
  migrate:
    build: ./backend
    command: ["alembic", "upgrade", "head"]
    env_file: .env
    depends_on: { db: { condition: service_healthy } }
  web:
    build: ./frontend
    environment: { AGENT_API_URL: http://api:8000 }
    ports: ["3000:3000"]
  db:
    image: pgvector/pgvector:pg16
    environment: { POSTGRES_PASSWORD: dev, POSTGRES_DB: app }
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck: { test: ["CMD-SHELL", "pg_isready -U postgres"], interval: 5s, retries: 10 }
    # no `ports:` in prod. Don't publish Postgres on the host
  redis:
    image: redis:7-alpine
  phoenix:
    image: arizephoenix/phoenix:latest
    ports: ["6006:6006"]
volumes: { pgdata: {} }
```

The one-shot `migrate` service is the same pattern your pSEO and Resite compose files use.

---

## 🟡 Level 2: Kubernetes and CI/CD

### 2.1 Kubernetes in one table

| Object | What it is | Analogy |
|---|---|---|
| **Pod** | 1+ containers scheduled together | a running container |
| **Deployment** | Desired replicas of a pod template; rolling updates; rollbacks | compose service with `replicas` |
| **Service** | Stable virtual IP/DNS that load-balances to pods | compose service name |
| **Ingress** (+ controller) | HTTP routing / TLS from outside to Services | nginx in front |
| **ConfigMap / Secret** | Config / sensitive config injected as env or files | `.env` |
| **HPA** | Autoscale replicas on CPU/memory/custom metrics | — |
| **Job / CronJob** | Run-to-completion / scheduled tasks | migrate service / cron |
| **Namespace** | Isolation boundary (dev/staging/prod, teams) | separate compose projects |
| **PVC** | Persistent storage claim | volume |

### 2.2 Manifests for the agent API

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: agent-api, labels: { app: agent-api } }
spec:
  replicas: 3
  selector: { matchLabels: { app: agent-api } }
  strategy: { rollingUpdate: { maxUnavailable: 0, maxSurge: 1 } }
  template:
    metadata: { labels: { app: agent-api } }
    spec:
      securityContext: { runAsNonRoot: true, runAsUser: 10001 }
      containers:
        - name: api
          image: ghcr.io/you/agent-api:1.4.2        # immutable tag (or digest), never :latest
          ports: [{ containerPort: 8000 }]
          envFrom:
            - configMapRef: { name: agent-api-config }
            - secretRef: { name: agent-api-secrets }
          resources:
            requests: { cpu: "250m", memory: "512Mi" }
            limits:   { memory: "1Gi" }
          readinessProbe: { httpGet: { path: /health/ready, port: 8000 }, periodSeconds: 5 }
          livenessProbe:  { httpGet: { path: /health/live,  port: 8000 }, periodSeconds: 10, failureThreshold: 3 }
          securityContext: { allowPrivilegeEscalation: false, readOnlyRootFilesystem: true,
                             capabilities: { drop: ["ALL"] } }
---
apiVersion: v1
kind: Service
metadata: { name: agent-api }
spec: { selector: { app: agent-api }, ports: [{ port: 80, targetPort: 8000 }] }
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: agent-api
  annotations:
    nginx.ingress.kubernetes.io/proxy-buffering: "off"        # SSE streaming!
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"     # long agent runs
spec:
  ingressClassName: nginx
  tls: [{ hosts: [api.example.com], secretName: api-tls }]
  rules:
    - host: api.example.com
      http: { paths: [{ path: /, pathType: Prefix, backend: { service: { name: agent-api, port: { number: 80 } } } }] }
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: agent-api }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: agent-api }
  minReplicas: 2
  maxReplicas: 10
  metrics: [{ type: Resource, resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } } }]
```

AI-specific notes:
- **Readiness ≠ liveness.** Readiness checks the DB/vector DB. Liveness checks only "is the
  process alive". Don't fail liveness because the LLM provider is down, or K8s will restart every pod
  in a loop.
- CPU-based HPA is misleading for I/O-bound LLM services. Scale on in-flight requests or queue depth
  (KEDA) instead.
- Long SSE streams need proxy buffering off, long timeouts and graceful shutdown
  (`terminationGracePeriodSeconds`, uvicorn finishing in-flight streams on SIGTERM).
- Package manifests with **Helm** or **Kustomize**. Deploy with **GitOps** (Argo CD / Flux) at scale.
- Practice locally with **kind** or **minikube**: `kind create cluster && kubectl apply -f k8s/`.

### 2.3 CI/CD: the pipeline both JDs want

```
PR opened ─▶ lint + typecheck ─▶ unit tests ─▶ integration tests (testcontainers)
          ─▶ SAST (Semgrep/Bandit/CodeQL) ─▶ SCA (pip-audit/npm audit) ─▶ secrets (gitleaks)
          ─▶ build image ─▶ image scan (Trivy) ─▶ evals (if prompts/graph changed)
          ─▶ ✅ required checks → merge
main ─▶ build + push immutable tag (git SHA) + SBOM + sign
     ─▶ deploy to staging ─▶ migrations ─▶ smoke tests ─▶ DAST (ZAP baseline) on staging
     ─▶ manual approval / automatic ─▶ deploy prod (rolling/canary) ─▶ smoke ─▶ auto-rollback on failure
```

### 2.4 GitHub Actions: complete example

```yaml
name: ci
on:
  pull_request:
  push: { branches: [main] }
permissions: { contents: read }               # least privilege by default
concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }

jobs:
  backend:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: backend } }
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v5
        with: { enable-cache: true }
      - run: uv sync --frozen
      - run: uv run ruff check . && uv run ruff format --check .
      - run: uv run mypy app
      - run: uv run pytest -m "not llm" --cov=app --cov-fail-under=75
      - run: uv run bandit -r app -ll                    # Python SAST
      - run: uv run pip-audit                             # known-CVE dependencies (SCA)

  frontend:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: frontend } }
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm, cache-dependency-path: frontend/pnpm-lock.yaml }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint && pnpm typecheck && pnpm test -- --ci
      - run: pnpm audit --audit-level=high

  security:
    runs-on: ubuntu-latest
    permissions: { contents: read, security-events: write }
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2                 # committed secrets
        env: { GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
      - uses: returntocorp/semgrep-action@v1              # multi-language SAST
        with: { config: p/default p/python p/typescript p/owasp-top-ten }
      - uses: aquasecurity/trivy-action@0.28.0            # filesystem: deps + IaC + secrets
        with: { scan-type: fs, severity: HIGH,CRITICAL, exit-code: "1", ignore-unfixed: true }

  image:
    needs: [backend, frontend, security]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions: { contents: read, packages: write, id-token: write }
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with: { registry: ghcr.io, username: ${{ github.actor }}, password: ${{ secrets.GITHUB_TOKEN }} }
      - uses: docker/build-push-action@v6
        with:
          context: backend
          push: true
          tags: ghcr.io/${{ github.repository }}/agent-api:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          sbom: true
          provenance: true
      - uses: aquasecurity/trivy-action@0.28.0            # image CVE gate
        with: { image-ref: "ghcr.io/${{ github.repository }}/agent-api:${{ github.sha }}",
                severity: HIGH,CRITICAL, exit-code: "1", ignore-unfixed: true }
```

Plus **branch protection**: required checks, required review, no direct pushes to main, and
**Dependabot/Renovate** for automated dependency PRs. (Action versions in this snippet are examples.
Pin to current releases, ideally by commit SHA.)

---

## 🔴 Level 3: Advanced (security-first)

### 3.1 The security testing alphabet

| Acronym | What it scans | When | Tools |
|---|---|---|---|
| **SAST** (static application security testing) | Your **source code** for insecure patterns (injection, unsafe deserialization, hardcoded secrets) | Every PR | Semgrep, Bandit (Python), CodeQL, SonarQube, ESLint security plugins |
| **SCA** (software composition analysis) | Your **dependencies** for known CVEs and license issues | Every PR + daily | pip-audit, npm/pnpm audit, Dependabot, Snyk, Trivy fs, OSV-Scanner |
| **Secret scanning** | Commits for keys/tokens | Pre-commit + PR | gitleaks, trufflehog, GitHub secret scanning |
| **Container scanning** | OS packages + libs inside the image | After build | Trivy, Grype, Docker Scout |
| **IaC scanning** | Terraform/K8s/Helm misconfigurations | PR | Checkov, tfsec/Trivy config, kube-linter |
| **DAST** (dynamic) | The **running app** from the outside (headers, XSS, auth flaws, exposed endpoints) | Against staging | OWASP ZAP (baseline/API scan), Burp, Nuclei |
| **SBOM + signing** | What's inside the artifact, and proof of who built it | Build | Syft/BuildKit SBOM, Cosign, SLSA provenance |

ZAP baseline against staging:
```yaml
  dast:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - uses: zaproxy/action-baseline@v0.14.0
        with: { target: "https://staging.example.com", fail_action: true, rules_file_name: .zap/rules.tsv }
```

### 3.2 CVE analysis: what to do when a scanner screams

1. **Read the advisory:** CVE ID, affected versions, **CVSS** severity (0–10), attack vector.
2. **Exploitability:** check **EPSS** (probability of exploitation in the next 30 days) and **CISA KEV**
   (known exploited in the wild). A critical CVSS with EPSS ~0.01 that isn't in KEV is less urgent than a 7.5 that's in KEV.
3. **Reachability:** is the vulnerable function actually used, and reachable from untrusted input? Is it
   a dev-only dependency? Is it in a base-image package you never execute?
4. **Fix:** upgrade (direct or transitive via overrides), patch, swap the base image (slim/distroless),
   or mitigate (WAF rule, config).
5. **If you accept the risk:** document it in `.trivyignore`/VEX with an **expiry date** and the reason.
6. **Policy:** block merge on fixable HIGH/CRITICAL, SLA to fix (critical 7 days, high 30), weekly
   review.

That's what "CVE analysis" in JD-2 means. Being able to *triage* rather than "upgrade everything" is the
senior signal.

### 3.3 Secure coding for AI apps (OWASP Top 10 for LLM apps, condensed)

| Risk | Mitigation |
|---|---|
| Prompt injection (direct & indirect via RAG, email, web) | Separate instructions from data, treat tool outputs as untrusted, least-privilege tools, HITL for irreversible actions, output validation |
| Sensitive data disclosure | Tenant-scoped retrieval, PII redaction in logs/traces, no secrets in prompts |
| Insecure output handling | Never `eval`/execute model output. Sanitize markdown/HTML (XSS). Parameterize SQL |
| Excessive agency | Narrow tools, read-only by default, budgets, approval gates |
| Unbounded consumption (cost-DoS) | Per-user rate limits, token budgets, `max_tokens`, step limits, timeouts |
| Supply chain | Pin dependencies, scan, verify model/MCP server sources |
| SSRF via "fetch this URL" tools | Block private IP ranges, re-validate redirects, allow-list (your pSEO SSRF guard is a strong example) |

Classic web basics still apply: authN/authZ on every endpoint, CSRF for cookie sessions, CORS
allow-lists, security headers (CSP, HSTS), parameterized queries, secrets in a vault (not in images or git).

### 3.4 Secrets management

Locally, `.env` (git-ignored) plus an `.env.example`. In CI, GitHub encrypted secrets, or better, **OIDC
federation** to the cloud (no long-lived keys). In prod, AWS Secrets Manager / Azure Key Vault /
External Secrets Operator in K8s. Rotate on leak. **If a key or private key was ever committed,
assume it's compromised: rotate it, then purge it from history.** Deleting the file isn't enough.

### 3.5 Cloud: AWS and Azure reference architectures

| Need | AWS | Azure |
|---|---|---|
| Run containers (simple) | **ECS Fargate** / App Runner | **Container Apps** / App Service |
| Run containers (K8s) | EKS | AKS |
| Registry | ECR | ACR |
| Postgres + pgvector | RDS / Aurora PostgreSQL | Azure Database for PostgreSQL Flexible Server |
| Redis | ElastiCache | Azure Cache for Redis |
| Files | S3 | Blob Storage |
| Secrets | Secrets Manager / SSM | Key Vault |
| Load balancer + TLS | ALB + ACM | Application Gateway / Front Door |
| Queue | SQS | Service Bus |
| Managed LLMs | **Bedrock** (Claude, Llama, …) | **Azure OpenAI / AI Foundry** (GPT, Claude, …) |
| Monitoring | CloudWatch + X-Ray | Azure Monitor + App Insights |
| IaC | Terraform / CDK | Terraform / Bicep |

A minimal production AWS layout: Route53 → CloudFront (Next.js static) + ALB → ECS Fargate (web,
api, worker) in private subnets → RDS Postgres (pgvector) + ElastiCache, with Secrets Manager, Bedrock
or direct provider APIs over a NAT, and CloudWatch alarms. Deployed with Terraform from GitHub Actions
via OIDC.

### 3.6 Releases, rollbacks and off-hours ownership

- **Strategies:** rolling (default), **blue/green** (instant switch and instant rollback), **canary**
  (5% → 50% → 100% with metric checks), **feature flags** (ship dark, enable per tenant). For AI,
  canary new prompts/models on a slice of traffic and compare online eval scores.
- **Migrations:** expand/contract ([08 §2.4](08-databases-and-data-modelling.md)), so app version N-1
  still works during rollout. Rollback = redeploy the previous image tag (which is why tags must be immutable).
- **On-call readiness** (the JD's "off-hours support"): runbooks per alert, dashboards linked from
  alerts, a provider-outage fallback (secondary model or degraded mode), a status page, and blameless
  postmortems. See [interview-qa/06](../interview-qa/06-devops-infra.md).

---

## 🔧 Integration recipe: close your gaps in 3 afternoons

| Afternoon | Do | Proof |
|---|---|---|
| 1 | Add the `backend` + `frontend` + `security` jobs above to **Resite** (your live flagship, currently no CI) | Green CI badge + a PR blocked by a planted test secret |
| 2 | Add the `image` job with a Trivy gate + push to GHCR with SHA tags. Stop deploying `latest` | Deploy by tag; demonstrate a rollback |
| 3 | `kind` cluster: deploy the capstone API with the manifests above + ZAP baseline against it | `kubectl get pods` screenshot + ZAP report in the README |

Exact per-repo gap list and ready-to-paste YAML: [projects/09](projects/09-deployment-ci-testing-evidence.md).

---

## 🔗 You already did this

| Concept | Where | Walkthrough |
|---|---|---|
| Multi-stage non-root images, compose healthchecks, migrate-then-start, nginx host routing | Resite | [projects/08](projects/08-resite.md), [projects/09](projects/09-deployment-ci-testing-evidence.md) |
| Compose + one-shot migrate service + nginx, Cloudflare Tunnel | pSEO | [projects/07](projects/07-pseo-engine.md) |
| Edge + cloud Compose deployment, systemd with post-start verification, Let's Encrypt via acme-companion (team project) | LACS | [projects/09](projects/09-deployment-ci-testing-evidence.md) |
| Tag-triggered npm release with OIDC trusted publishing | UACE | [projects/06](projects/06-uace-mcp-server.md) |
| The one CI workflow (pytest + Nx builds) | smart-trading-v2 | [projects/09](projects/09-deployment-ci-testing-evidence.md) |
| SSRF guard | pSEO | [projects/07](projects/07-pseo-engine.md) |

## ✅ Self-check

1. Why order Dockerfile instructions from least to most frequently changing?
2. Write a multi-stage Dockerfile for FastAPI. Name four hardening choices.
3. Deployment vs Service vs Ingress. Readiness vs liveness for an LLM service.
4. What breaks SSE streaming behind an ingress, and how do you fix it?
5. Draw the full CI/CD pipeline with every security gate.
6. SAST vs SCA vs DAST: what does each find that the others can't?
7. Trivy flags a CRITICAL CVE in a base-image library. Walk through your triage.
8. Design an AWS (or Azure) deployment for the capstone.
9. How do you roll out a new prompt or model safely?

## ⚠️ Traps

- `:latest` tags in production (no rollback, no reproducibility).
- Liveness probes that depend on external services.
- Long-lived cloud keys in CI secrets when OIDC is available.
- "We have security scanning" when nothing blocks the merge.
- Deleting a committed secret without rotating it.
