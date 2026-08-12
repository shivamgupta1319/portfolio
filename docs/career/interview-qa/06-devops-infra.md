# 06 — Docker, CI/CD, Nx, Nginx & Linux

> Most full-stack candidates are thin here, so it's cheap differentiation. You genuinely
> deploy things — to cloud, to Vercel/Render, and to mini-PC field hardware — so answer from
> operations, not from tutorials. The Kubernetes/AWS gap is handled honestly in
> [08-project-grilling.md](08-project-grilling.md).
>
> 🔥 = genuinely hard / commonly fumbled.

---

## Docker

**Q. What's the difference between a container and a VM?**

> A VM virtualises hardware and runs a full guest OS — heavy, slow to boot, strongly isolated.
> A container is just a process on the host kernel with namespaces restricting what it can see
> (PIDs, network, mounts) and cgroups limiting what it can use (CPU, memory). So containers
> start in milliseconds and cost almost nothing, but they share the host kernel — which is why
> container isolation is weaker than VM isolation, and why you can't run a Linux container on
> a Windows kernel without a VM underneath.

---

**Q. Image vs container vs layer?**

> An image is an immutable, layered filesystem template. A container is a running instance of
> one with a thin writable layer on top. Each Dockerfile instruction produces a layer, and
> layers are content-addressed and shared — ten images from the same base share those layers on
> disk, and only changed layers transfer on a push or pull.

---

**Q. 🔥 How do you make a Docker build fast and the image small?**

> Two separate levers.
>
> **Fast** — layer-cache ordering. Copy the lockfile and install dependencies *before* copying
> source, because source changes on every commit and dependencies don't. Get that backwards and
> every build reinstalls everything. Plus a `.dockerignore` so `node_modules`, `.git` and build
> output never enter the context.
>
> **Small** — multi-stage builds: one stage with the full toolchain to compile, a final stage
> copying only the built artefact and production dependencies onto a slim or distroless base.
> A Node image can go from over a gigabyte to a couple of hundred megabytes. Smaller images pull
> faster, which means faster deploys and faster scale-out, and they carry less CVE surface.

↳ **If pushed:** why Alpine isn't automatically the right base — musl instead of glibc breaks
  some native modules and can behave differently under DNS resolution; `-slim` on Debian is
  often the safer small image.

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci                 # cached unless the lockfile changes
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
USER node
CMD ["node", "dist/main.js"]
```

---

**Q. `CMD` vs `ENTRYPOINT`?**

> `ENTRYPOINT` is the executable the container always runs; `CMD` supplies default arguments,
> and anything passed on `docker run` replaces `CMD`. If you only set `CMD`, the whole command
> is overridable. The pattern is `ENTRYPOINT ["node", "dist/main.js"]` with `CMD` for default
> flags. Also prefer the exec form (JSON array) over shell form — shell form wraps the process
> in `/bin/sh`, which means PID 1 is the shell and your app never receives `SIGTERM`, so
> graceful shutdown silently stops working.

---

**Q. `COPY` vs `ADD`?**

> `COPY` copies files. `ADD` also auto-extracts local tarballs and can fetch URLs, which is
> implicit behaviour you rarely want. Use `COPY` unless you specifically need extraction.

---

**Q. Volumes vs bind mounts?**

> A bind mount maps a host path into the container — what I use in development so code changes
> are live. A named volume is Docker-managed storage, better for persistent data like a
> database because it's not tied to a host path and survives container recreation. Container
> filesystems are ephemeral: anything not in a volume disappears when the container is
> replaced, which is exactly what you want for the app and exactly what you don't want for data.

---

**Q. How does container networking work?**

> By default containers join a bridge network with their own IPs, and on a user-defined bridge
> they can resolve each other **by service name** — which is how Compose services talk to each
> other without hardcoded IPs. `host` mode skips the namespace and uses the host's stack
> directly (faster, no isolation, and needed for some real-time media cases). `none` means no
> networking. Publishing a port (`-p 8080:80`) maps a host port to a container port; without it
> the service is only reachable from inside the Docker network.

---

**Q. How do you secure a container?**

> Run as a non-root user (`USER node`) — the default is root, and root in a container is a
> meaningful step toward root on the host if anything else is misconfigured. Pin base image
> versions rather than `latest` so builds are reproducible, and rebuild regularly to pick up
> base-image patches. Scan images in CI (Trivy, Snyk). Never bake secrets into layers — a layer
> is permanent and inspectable even if a later step deletes the file — inject them at runtime.
> Drop capabilities and use a read-only root filesystem where the app allows it.

---

**Q. What does a health check give you?**

> `HEALTHCHECK` lets the runtime know whether the process is actually serving, not just alive.
> That matters because a Node process can be running while the event loop is wedged or the DB
> pool is exhausted. Orchestrators use it to hold traffic back until ready and to restart when
> unhealthy. The distinction to state: **liveness** = restart me if this fails; **readiness** =
> don't route traffic to me yet. Conflating them causes restart loops during a slow dependency
> outage.

---

**Q. What does Docker Compose do, and where does it stop?**

> Declares a multi-container application — services, networks, volumes, env, dependency order —
> in one file, so `docker compose up` gives a whole stack. It's excellent for development and
> fine for single-host production. What it doesn't do is multi-host scheduling, rolling updates,
> self-healing across nodes or autoscaling — that's where an orchestrator comes in.

🔗 *Yours:* LACS field nodes run Docker + systemd on single mini-PCs, which is precisely the
case where Compose is the right ceiling and Kubernetes would be absurd.

---

## CI/CD

**Q. Design a CI/CD pipeline for a typical service.**

> On every push: install with a cached dependency layer → lint and typecheck → unit tests →
> build → integration tests against ephemeral service containers → build and scan the image →
> push to a registry.
>
> On merge to main: deploy to staging automatically, run smoke tests, then production —
> automatically if confidence is high, behind an approval gate if it isn't.
>
> Two principles I'd insist on. **Build once, deploy many**: the exact artefact tested in
> staging is the one promoted to production; rebuilding per environment means you deployed
> something you never tested. And **fail fast**: order stages cheapest-first so a lint error
> doesn't cost a ten-minute test run.

↳ **If pushed:** how config differs per environment if the artefact is identical — the answer
  is that config and secrets are injected at runtime, never baked into the image.

---

**Q. Where do database migrations run in a deploy?**

> As an explicit step before the new code is serving, and written to be backwards-compatible
> with the currently-running version — during a rolling deploy both versions are live at once.
> That forces the expand/contract pattern: add the column, deploy code that writes both, backfill,
> switch reads, then drop the old column in a later release. Never a destructive migration in
> the same deploy as the code that stops using the column, because then a rollback is impossible.

---

**Q. Blue-green vs canary vs rolling?**

> **Rolling** — replace instances a few at a time. Simple, no extra capacity, but both versions
> serve during the roll. **Blue-green** — stand up a full parallel environment, cut traffic over
> at the load balancer, keep the old one warm for instant rollback. Costs double capacity
> briefly, gives the cleanest rollback. **Canary** — route a small percentage to the new version,
> watch error rates and latency, then ramp. Best risk control, needs real observability and
> traffic splitting to be meaningful. I'd pick rolling by default, blue-green when rollback speed
> matters most, canary once there's enough traffic for the metrics to be statistically useful.

---

**Q. How do you handle secrets in CI?**

> Stored in the CI provider's encrypted secret store or a dedicated manager, injected as
> environment variables at runtime, masked in logs, scoped per environment so a staging job
> can't read production credentials. Never in the repo, never in the image, never echoed. I'd
> also add a secret scanner (gitleaks) as a pipeline step, because the realistic failure isn't
> malice — it's someone committing a `.env` while debugging.

---

**Q. What's your rollback strategy?**

> Redeploy the previous known-good image tag — which only works if artefacts are immutable and
> versioned, hence "build once, deploy many". The constraint is the database: code rolls back,
> data doesn't, which is why migrations must be additive and backwards-compatible. For risky
> behaviour changes I prefer a feature flag over a deploy, because turning a flag off is
> seconds and doesn't need a pipeline run.

---

**Q. What do you monitor in production?**

> The four golden signals — latency (p50/p95/p99, not mean), traffic, error rate, saturation
> (CPU, memory, connection pool, queue depth). Structured JSON logs with a correlation ID so a
> request can be traced across services. Alerts only on symptoms users feel, with a clear owner
> — an alert nobody acts on trains everyone to ignore the channel. For Node specifically I'd
> add event-loop lag, since it's the earliest signal that something is blocking.

---

## Nx & monorepos

**Q. Why a monorepo?**

> One atomic commit can change an API and its consumer together, shared types and libraries
> can't drift between packages, and there's one toolchain to maintain instead of five. The cost
> is that naive tooling rebuilds and retests everything on every change, which is why you need
> a build system that understands the dependency graph.

🔗 *Yours:* SmartTrader (React + NestJS + a Python FastAPI engine), CopyTrade and GIBP are all
Nx monorepos.

---

**Q. What does Nx actually give you?**

> A project graph derived from imports, which enables the two things that matter. **`affected`**
> — given a base commit, work out which projects are actually impacted and only build and test
> those, so a change to one library doesn't run the whole suite. And **computation caching** —
> task results are keyed by input hash, so an unchanged project's build or test is restored
> from cache instead of re-run, locally and shared across CI. On top of that, module boundary
> rules that fail the build if a library imports something it shouldn't, which is how you stop
> a monorepo degrading into a tangle.

---

**Q. Nx vs Turborepo?**

> Turborepo is lighter — task orchestration and caching over your existing scripts, minimal
> buy-in. Nx does that plus code generation, executors, module boundary enforcement and richer
> graph tooling; more powerful, more opinionated. For a big multi-language workspace with
> enforced architecture I'd take Nx; for a couple of JS packages that just need caching,
> Turborepo is enough. I've used both — this portfolio's UI kit is Turborepo.

---

## Nginx

**Q. What do you use Nginx for?**

> Reverse proxy in front of app servers, TLS termination, static file serving, load balancing
> across upstreams, gzip/brotli compression, caching, and rate limiting at the edge. The value
> is that it does the connection-handling work an application server is bad at — slow clients,
> TLS, thousands of idle keep-alive connections — so the app only sees clean, fast requests.

---

**Q. Reverse proxy vs load balancer?**

> A reverse proxy sits in front of servers and forwards client requests, adding TLS, caching,
> routing and header manipulation. A load balancer distributes across multiple backends for
> capacity and availability. Nginx does both — `upstream` with several servers makes the same
> proxy a load balancer. Algorithms: round-robin by default, `least_conn` when request
> durations vary a lot, `ip_hash` for sticky sessions (though stateless apps with sessions in
> Redis are better than stickiness).

---

**Q. 🔥 How do you proxy WebSockets through Nginx?**

> You have to explicitly forward the upgrade handshake, because Nginx proxies HTTP/1.1 without
> upgrade headers by default — this is the number one cause of "WebSockets work locally, break
> in production":

```nginx
location /socket.io/ {
    proxy_pass http://app_upstream;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;   # else idle sockets are cut at 60s
}
```

> The timeout matters as much as the headers — the default read timeout silently kills
> long-lived connections.

↳ **If pushed:** load-balancing WebSockets across multiple app instances — a socket is
  stateful, so either use `ip_hash`/sticky routing, or keep the app stateless and fan out
  through a Redis adapter so any instance can deliver to any client.

🔗 *Yours:* LACS and SmartTrader both run real-time sockets behind a proxy; this is a concrete
production detail worth volunteering.

---

**Q. Common causes of a 502 from Nginx?**

> The upstream isn't running or isn't listening on the expected port; it's bound to `127.0.0.1`
> inside a container while Nginx is on a different network namespace (should be `0.0.0.0`); the
> upstream crashed under load; the upstream is slower than `proxy_read_timeout`, which is
> really a 504; or in Docker the service name doesn't resolve. I'd check the Nginx error log
> first — it names the upstream and the reason, which usually ends the investigation
> immediately.

---

**Q. How do you rate limit in Nginx?**

> `limit_req_zone` keyed by `$binary_remote_addr` with a rate, and `limit_req` with a burst
> allowance at the location. Doing it at the edge means abusive traffic is shed before it costs
> an application worker or a database connection. It complements application-level limiting
> rather than replacing it — the app can rate limit per API key or per tenant, which Nginx
> can't do as easily.

---

**Q. How do you set up TLS?**

> Certbot with Let's Encrypt and auto-renewal, TLS 1.2+, a modern cipher suite, HSTS, and
> HTTP redirecting to HTTPS. Terminate at Nginx or the load balancer so the app speaks plain
> HTTP internally. Then the detail people forget: when you're behind a proxy, the app must trust
> `X-Forwarded-Proto` and `X-Forwarded-For` (Express `trust proxy`), or every client IP in your
> logs is the proxy's, and secure-cookie logic thinks the request was insecure.

---

## Linux & edge deployment

**Q. How do you debug a service on a Linux box?**

> A rough order: `systemctl status` for the unit state, `journalctl -u <service> -f` for logs,
> `ss -tlnp` to confirm what's actually listening on which port, `htop` or `top` for CPU and
> memory, `df -h` and `du` for disk (a full disk causes wonderfully confusing failures),
> `lsof -p` for open file descriptors when I suspect a leak, and `dmesg` for the OOM killer,
> which is how a mysterious silent restart usually explains itself.

---

**Q. What's a systemd unit, and why use one?**

> A declarative service definition — what to run, as which user, with which environment,
> restart policy, and dependencies on other units. It gives you supervision (auto-restart with
> backoff), start-on-boot, and centralised logging through journald. On a field device that's
> exactly what you want: unattended recovery without anyone SSH-ing in.

```ini
[Unit]
Description=LACS node service
After=network.target docker.service

[Service]
ExecStart=/usr/bin/docker compose up
Restart=always
RestartSec=5
User=lacs

[Install]
WantedBy=multi-user.target
```

🔗 *Yours:* LACS field mini-PCs — Docker for packaging, systemd for supervision and boot, which
is the standard pattern for edge hardware with no operator present.

---

**Q. What do the signals mean?**

> `SIGTERM` (15) — polite "please shut down", catchable, and the one Docker and systemd send
> first. `SIGKILL` (9) — uncatchable, immediate termination, sent after the grace period
> expires. `SIGINT` (2) — Ctrl-C. `SIGHUP` (1) — conventionally "reload config", which is how
> Nginx reloads without dropping connections. The practical point: handle `SIGTERM` for
> graceful shutdown, and know that if you don't finish within the grace period you get
> `SIGKILL` and lose in-flight work.

↳ **If pushed:** why your handler never fires in Docker — PID 1 doesn't get default signal
  handling, and shell-form `CMD` puts `/bin/sh` at PID 1 instead of your app. Use exec form,
  or `--init`.

---

**Q. Explain Linux file permissions.**

> Three triads — owner, group, others — each with read/write/execute, which is what `755` and
> `644` encode in octal. `755` for directories and executables, `644` for ordinary files.
> Ownership via `chown`, mode via `chmod`. The one that bites in deployment: a private key must
> be `600` or SSH refuses to use it, and a directory needs the execute bit to be traversable at
> all, which is why a `644` directory produces a baffling permission denied.

---

**Q. Cron vs systemd timers?**

> Cron is universal and simple. Systemd timers integrate with the same unit system — they log
> to journald, can depend on other units, support `Persistent=true` so a missed run while the
> machine was off still executes, and support randomised delays to avoid a thundering herd. On
> a systemd host I'd use timers; cron is fine when it's already there and the job is trivial.
> For anything application-level I'd rather use a repeatable job in the queue, so it's
> observable and retryable like everything else.

---

**Q. What do you do about logs and disk on a constrained device?**

> Rotate aggressively — `logrotate` or journald's `SystemMaxUse` — with a hard size cap, plus
> Docker log driver limits (`max-size`, `max-file`), because unbounded container logs are the
> classic way to fill a small disk and take down a device that had been running fine for
> months. On field hardware I'd also cap memory and CPU per container so one misbehaving
> service can't starve the others, and monitor free disk as a first-class metric.

---

## Rapid-fire

| Question | One-liner |
|---|---|
| `docker exec` vs `attach` | New process in a running container vs connect to its main process. |
| Dangling image | Untagged layer left by a rebuild — `docker image prune`. |
| Registry | Where images are stored and pulled from (Docker Hub, GHCR, ECR). |
| Image tag `latest` | A mutable tag, not a version — never rely on it in production. |
| Orchestrator | Schedules containers across hosts, handles scaling and self-healing. |
| IaC | Infrastructure defined in version-controlled code (Terraform, Pulumi). |
| Immutable infrastructure | Replace servers rather than patch them in place. |
| Horizontal vs vertical scaling | More instances vs a bigger instance. |
| Sticky session | Route a user to the same instance — a smell; prefer shared session state. |
| CDN | Cache static assets at the edge, near the user. |
| Zero-downtime deploy | New instances healthy before old ones drain and stop. |
| `.dockerignore` | Keeps `node_modules`/`.git` out of the build context — faster and safer builds. |
| Reverse proxy timeout | `proxy_read_timeout` — the usual culprit behind dropped long connections. |
| `curl -I` | Fetch headers only — fastest way to check a redirect, cache header or status. |

---

## Back to [INDEX.md](INDEX.md)
