# Site design (v5, 2026-11)

The record of the visual direction for shivamgupta.live's site pages (`src/app/(site)`).
Desktop mode (`/desktop`) has its own game-OS look and is not covered here.

## Brief
- **Who:** recruiters, hiring engineers and potential clients, mostly on a laptop and often
  arriving from a link on a phone.
- **Job:** in five seconds, show that Shivam builds products *and runs them himself*.
- **Primary action:** open the apps. Secondary actions: the résumé and getting in touch.
- **Personality:** operational, precise, candid.

## Direction: operator board
The hero is a live board of the apps running on my own domains. Each row is a real domain
with a status dot that the visitor's browser probes on the spot (`src/site/useProbe.ts`), and
the measured response time is shown. This is the one bold element; everything else stays
quiet and disciplined.

## Tokens (`src/app/globals.css`, `:root:has(.site)`)
| Role | Dark (default) | Light |
|---|---|---|
| bg | `#141a23` blue-graphite | `#eef1f6` cool paper |
| surface (bg-2) | `#1b2230` | `#ffffff` |
| text | `#e9edf4` | `#121826` |
| text dim | `#a9b3c4` | `#46516a` |
| text mute | `#8d98ab` | `#5b6680` |
| accent (text-safe) | `#a3b4ff` | `#2b3fd1` |
| accent fill / on | `#5b7cfa` / `#0b1020` | `#2b3fd1` / `#ffffff` |
| status up | `#45d394` | `#0d7a4a` |
| status unreachable | `#f0a43a` | `#9a5b00` |

- **Type:** Archivo (variable, `wdth` 62–125). Headlines use `wdth` 112–118 at weight 700
  with tight tracking; body text uses `wdth` 100. JetBrains Mono is used only for real data
  (hosts, latencies, dates).
- **Radius:** 6px for rows and controls, 10px for media, fully round only for status pills.
- **Motion:** status dots resolve as probes return, and the drawer opens and closes. There
  are no section reveals, and `prefers-reduced-motion` is respected.

## Avoid (reads as templated)
- All-caps eyebrows above headings.
- Numbered markers on anything that isn't a sequence (the app page's "How it works" steps
  are a real sequence).
- Middle-dot meta strings.
- "→" appended to links.
- Identical card grids.
- Gradient decoration.
