import type { ExperienceEntry } from "./types";

export const experience: ExperienceEntry[] = [
  {
    role: "Full-Stack Software Engineer",
    org: "Wisflux Tech Labs",
    location: "Jaipur, India",
    start: "Jun 2022",
    end: "Present",
    kind: "work",
    highlight: true,
    metrics: [
      "40+ users / node",
      "25–30 field systems",
      "2,000+ students",
      "−30% API latency",
      "deploys: hours → 5–10 min",
    ],
    bullets: [
      "Core engineer on X-FACE / LACS, a deployed disaster-response comms platform — multimodal voice/video/text over WebRTC/Mediasoup with FFmpeg recording and playback, serving 40+ concurrent users per node across 25–30 deployed field systems, with on-device ASR/TTS and offline-first edge↔cloud PostgreSQL sync that keeps every node operational with zero internet dependency.",
      "Built the operator-facing React interfaces, GIS mapping with live GPS positions, and Ansible-driven one-touch provisioning of field mini-PCs for repeatable fleet onboarding; showcased at ATR Open House 2025, Kyoto.",
      "Built GIBP, a multi-tenant fintech/accounting platform — NestJS API on the Formance financial ledger (organisations, bills, vendors, reconciliation) with company and super-admin React portals and end-to-end Playwright coverage on money-movement flows.",
      "Contributed to Emmple (Typezap), a live ed-tech platform serving 2,000+ students across web and WhatsApp over ~2 years in production.",
      "Architected modular backend services (JWT auth, RBAC, API versioning) that cut API response latency by up to 30%, reused as the standard auth layer across later products.",
      "Dockerised dev and prod environments and built CI/CD pipelines that cut deploy time from hours to 5–10 minutes and streamlined new-developer onboarding.",
    ],
  },
  {
    role: "Shipped 3 live products solo",
    org: "pSEO Engine · Resite · Stock Safe Bundles",
    location: "Remote",
    start: "2025",
    end: "2026",
    kind: "milestone",
    bullets: [
      "pseo.cloud, resite.live and a Shopify App Store app — designed, built, deployed and billed end-to-end; plus AI Router serving them in production and two npm packages (Stream Verse, uace-mcp).",
    ],
  },
  {
    role: "Represented Wisflux — ATR Open House 2025",
    org: "Advanced Telecommunications Research Institute",
    location: "Kyoto, Japan",
    start: "2025",
    end: "2025",
    kind: "milestone",
    bullets: [
      "Selected to represent the company internationally at ATR Open House, Kyoto.",
    ],
  },
  {
    role: "B.Tech, Computer Science Engineering",
    org: "Anand International College of Engineering",
    location: "Jaipur, India",
    start: "2019",
    end: "2023",
    kind: "education",
    bullets: ["CGPA 8.5 — Batch of 2019–2023."],
  },
];
