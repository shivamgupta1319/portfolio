# 02 — React, Next.js & Frontend

> Your strongest claimed surface, so expect the deepest probing here. The questions that
> separate SDE-1 from SDE-2 are the *why* ones: why does this re-render, why is this cached,
> why did you pick SSR here. Memorised hook definitions won't carry the round.
>
> 🔥 = genuinely hard / commonly fumbled.

---

## React fundamentals

**Q. What is the virtual DOM and how does reconciliation work?**

> React keeps a lightweight in-memory tree describing the UI. On a state change it builds a
> new tree and diffs it against the previous one, then applies the minimal set of real DOM
> mutations. The diff uses two heuristics to stay O(n) rather than O(n³): different element
> types mean tear down and rebuild that subtree, and keys identify which children are stable
> across renders. The point isn't that it's faster than hand-written DOM code — it's that it's
> fast enough while letting you write declaratively.

↳ **If pushed:** React 18's Fiber architecture makes rendering interruptible so high-priority
  updates (typing) can pre-empt low-priority ones — that's what concurrent rendering means.

---

**Q. 🔥 Why do keys matter, and why is index a bad key?**

> Keys tell React which item in a list is which across renders. With an index key, deleting
> the first item shifts every subsequent index, so React thinks each item's *content* changed
> rather than that one was removed — it mutates DOM nodes that should have been left alone.
> Any component state or uncontrolled input value attached to those rows ends up on the wrong
> item. Index is only safe when the list is static and never reordered, inserted into, or
> filtered.

---

**Q. What triggers a re-render?**

> A state update in the component, a context value it consumes changing, or its parent
> re-rendering. That last one catches people out: when a parent re-renders, all its children
> re-render by default regardless of whether their props actually changed. That's fine —
> re-render is not repaint, and React's diff usually makes it cheap. I only reach for `memo`
> when I've measured a real problem.

---

**Q. `useMemo`, `useCallback` and `React.memo` — when do you NOT use them?**

> Most of the time. Each has a cost: an extra allocation, a dependency array to keep correct,
> and a comparison on every render. I use them in three specific cases — an genuinely
> expensive computation, a value or callback going into a `memo`'d child (otherwise `memo` is
> defeated by a fresh reference every render), and a value in a dependency array that would
> otherwise cause an effect to fire on every render. Premature memoisation adds bugs and
> noise for no measurable gain.

↳ **If pushed:** React Compiler (React 19) automates much of this — worth mentioning that
  you know the manual approach is being superseded, but you still understand *why* it exists.

---

**Q. `useState` vs `useReducer`?**

> `useState` for independent, simple values. `useReducer` when several pieces of state change
> together, when the next state depends on the previous in non-trivial ways, or when the same
> transitions are triggered from many places. The tell is when you find yourself calling three
> `setState`s in a row — that's one state transition wearing three hats, and a reducer makes
> it atomic and testable in isolation.

---

**Q. Explain `useEffect` — and why does it run twice in development?**

> `useEffect` runs after render and is for synchronising with something outside React: a
> subscription, a timer, an imperative DOM API. React 18 StrictMode intentionally mounts,
> unmounts and remounts components in dev, so effects fire twice. It's not a bug and it
> doesn't happen in production — it exists to surface effects that aren't cleaned up properly.
> If a double-run breaks something, the effect genuinely has a missing cleanup.

↳ **If pushed:** the cleanup function, and why an `AbortController` is better than an `ignore`
  boolean for cancelling a fetch (it actually cancels the request, not just the state update).

---

**Q. What's the most common `useEffect` mistake you see?**

> Using it to derive state. If a value can be computed from existing props or state, compute
> it during render — don't mirror it into a `useState` and sync it with an effect. That
> introduces an extra render and a window where the two disagree. The other one is a missing
> or dishonest dependency array; I never silence the lint rule, I fix the dependency (usually
> by moving the function inside the effect or wrapping it in `useCallback`).

---

**Q. `useRef` — what are the two uses?**

> Holding a DOM node so you can call imperative APIs on it (focus, scroll, play), and holding
> a mutable value that should persist across renders *without* triggering one — an interval
> ID, a previous value, a WebSocket instance. The key property is that mutating `.current`
> doesn't re-render, which is exactly why you must never read a ref during render to decide
> what to display.

---

**Q. `useLayoutEffect` vs `useEffect`?**

> `useLayoutEffect` runs synchronously after DOM mutation but before the browser paints, so
> it blocks paint. That's what you want when you need to measure a node and adjust before the
> user sees a flicker — a tooltip that must reposition to stay on screen. Everything else
> should be `useEffect`, because blocking paint hurts perceived performance. It also doesn't
> run during server rendering, so it warns in SSR.

---

**Q. How do you write a custom hook, and what's the rule?**

> Any function starting with `use` that calls other hooks. It's a way to share stateful logic
> — not state itself; each component calling the hook gets its own independent state. The
> rules of hooks apply: call them at the top level, never inside conditions or loops, because
> React tracks hooks by call order.

---

**Q. When does Context become the wrong tool?**

> Context is a dependency-injection mechanism, not a state manager. Every consumer re-renders
> when the value changes, with no selector to subscribe to just one slice. It's excellent for
> low-frequency values — theme, locale, current user, auth session. For high-frequency or
> large shared state I'd split into multiple contexts, memoise the value, or move to a store
> with selector-based subscriptions (Zustand, Redux Toolkit) so components only re-render for
> the slice they read.

---

**Q. Controlled vs uncontrolled components?**

> Controlled: React state is the single source of truth, value flows down and changes flow up
> through `onChange`. Uncontrolled: the DOM keeps the value and you read it via a ref on
> submit. Controlled gives you validation-as-you-type and derived UI; uncontrolled is faster
> for large forms because you're not re-rendering on every keystroke. In practice I use a form
> library that keeps inputs uncontrolled internally and only re-renders on validation events.

---

**Q. What's an error boundary, and what doesn't it catch?**

> A class component with `componentDidCatch`/`getDerivedStateFromError` that catches render-
> phase errors in its subtree and shows a fallback instead of unmounting the whole app. It
> does **not** catch errors in event handlers, async code, `setTimeout` callbacks, or server
> rendering — those need ordinary try/catch. I put a boundary around each major route section
> so one broken widget doesn't blank the page.

---

**Q. Explain Suspense and `React.lazy`.**

> `React.lazy` code-splits a component so its bundle loads on demand; `Suspense` declares the
> fallback UI to show while any suspending child is pending. Beyond lazy loading, Suspense is
> the general mechanism for "this subtree isn't ready" — data-fetching libraries and React
> Server Components both hook into it, which is what enables streaming SSR.

---

**Q. How do you render a huge list?**

> Virtualisation — only render what's in the viewport plus a small overscan buffer, using
> something like TanStack Virtual or react-window. Rendering 10,000 rows means 10,000 DOM
> nodes, which is slow to mount and heavy on memory. Alongside that: stable keys, pagination
> or infinite scroll at the data layer, and `memo` on the row component so scrolling doesn't
> re-render every visible row.

---

**Q. How do you debug a performance problem in React?**

> React DevTools Profiler first — record an interaction and look at which components rendered
> and why (the "why did this render" setting is the fast path). Nine times out of ten it's a
> new object or function identity being passed as a prop each render, or a context value
> recreated inline. Then browser DevTools Performance for anything that isn't React's fault —
> long tasks, layout thrash, oversized images. Measure, then fix; never optimise on a hunch.

---

**Q. What are portals used for?**

> Rendering a child into a different DOM node while keeping it in the React tree — so it still
> receives context and events still bubble through the React hierarchy. Modals, tooltips and
> dropdowns, where rendering in place would get clipped by a parent's `overflow: hidden` or
> trapped in a stacking context.

---

**Q. How do you handle data fetching in React today?**

> I don't hand-roll `useEffect` + `useState` + loading + error for server data any more. That
> pattern re-implements caching, deduplication, retries and revalidation badly every time.
> TanStack Query (or RTK Query) handles all of it, and in Next.js App Router a lot of it moves
> to the server component entirely. The mental model that matters: server state and client
> state are different problems and shouldn't share a tool.

---

## Next.js

**Q. App Router vs Pages Router?**

> Pages Router is file-based routing with `getServerSideProps`/`getStaticProps` — everything is
> a client component, data fetching happens in a special exported function. App Router is
> built on React Server Components: components are server-rendered by default, you fetch data
> directly inside them with `async`/`await`, and layouts nest and persist across navigation.
> App Router also gives streaming, server actions, and much more granular caching. New work
> goes in App Router; Pages Router is stable but not where the features are landing.

---

**Q. 🔥 Explain React Server Components.**

> Server Components run only on the server. Their code never ships to the browser, they can
> talk directly to a database or read secrets, and they send a serialised description of the
> rendered output rather than JavaScript. Client Components — marked `'use client'` — are the
> traditional model with hooks, state, and event handlers. The win is bundle size and data
> locality: a heavy markdown or date library used in a server component adds zero kilobytes to
> the client. The constraint is that you can't pass functions or class instances across the
> boundary, only serialisable props, and you can't use hooks or browser APIs in a server
> component.

↳ **If pushed:** the composition pattern — a server component can pass a server-rendered
  subtree to a client component as `children`, so a client wrapper doesn't force everything
  beneath it to be a client component.

---

**Q. SSR vs SSG vs ISR vs CSR — how do you choose?**

| Strategy | Renders | Use when |
|---|---|---|
| **SSG** | Build time | Content is the same for everyone and changes rarely — marketing, docs. Fastest and cheapest. |
| **ISR** | Build time, revalidated in background | Mostly static but needs to refresh without a redeploy — blog, product pages, generated landing pages. |
| **SSR** | Every request | Content is per-user or must be fresh to the second — dashboards, authed pages. |
| **CSR** | In the browser | Highly interactive, behind auth, SEO irrelevant — an editor or admin panel. |

> The decision is really two questions: does this need to be indexable, and how stale can it
> be? I default to the most static option that satisfies both and only move up the cost curve
> when the content demands it.

🔗 *Yours:* pSEO generates static/ISR landing pages precisely because SEO indexability and
TTFB are the product; Resite's résumé builder is client-heavy because it's an authed editor.

---

**Q. Explain Next.js caching.**

> There are several layers and conflating them is the usual source of "why is my data stale".
> The **request memoisation** layer dedupes identical fetches within a single render pass. The
> **Data Cache** persists fetch results across requests and deploys until revalidated. The
> **Full Route Cache** stores the rendered HTML/RSC payload for static routes. And the
> **Router Cache** holds visited route segments client-side for instant back-navigation.
> I control the first two with `revalidate` and `cache` options on `fetch`, and invalidate on
> demand with `revalidatePath` / `revalidateTag` after a mutation. Caching defaults changed
> between Next 14 and 15 — 15 is much less aggressive by default — so I always state which
> version I'm on.

---

**Q. What are Server Actions?**

> Async functions marked `'use server'` that you can call directly from a component or form
> — Next.js creates the endpoint and the client-side call for you. They remove a whole layer
> of hand-written API routes for mutations, and they progressively enhance: a form with a
> server action works before hydration. Two things I'm careful about: they're publicly
> reachable HTTP endpoints, so every one needs its own authorisation check — being called from
> an authed page proves nothing — and inputs still need validating server-side.

---

**Q. Route handlers vs server actions vs API routes?**

> Route handlers (`route.ts`) are the App Router replacement for API routes — use them for a
> real HTTP API consumed by other clients, webhooks, or anything needing custom headers or
> streaming responses. Server actions are for mutations originating from your own UI. If a
> mobile app or third party needs to call it, it's a route handler.

---

**Q. What runs in Next.js middleware, and what shouldn't?**

> Middleware runs before a request is matched to a route, on the Edge runtime. Good uses:
> redirects, rewrites, locale detection, an auth-cookie presence check, setting headers.
> Bad uses: database queries, heavy computation, or anything requiring Node APIs — the Edge
> runtime doesn't have them and middleware sits on the critical path of every matched request.
> An auth check in middleware is a fast gate, not a substitute for authorisation at the data
> layer.

🔗 *Yours:* Resite's subdomain portfolio routing is exactly a middleware rewrite — read the
host header, map the subdomain to a tenant, rewrite the path.

---

**Q. How does `next/image` help?**

> Automatic format negotiation (AVIF/WebP), responsive `srcset` generation, lazy loading
> below the fold, and — the one that actually matters for Core Web Vitals — reserving layout
> space from the width/height so images don't cause cumulative layout shift. For the LCP image
> I set `priority` so it isn't lazy-loaded.

---

**Q. How do you handle SEO in Next.js?**

> The Metadata API — a static `metadata` export or `generateMetadata` for dynamic routes,
> which covers title, description, canonical, and Open Graph. Beyond tags: JSON-LD structured
> data in a script tag for rich results, a generated `sitemap.ts` and `robots.ts`, semantic
> HTML, and server-rendering the content that matters so crawlers see it without executing JS.

🔗 *Yours:* this portfolio does all of it — `src/app/sitemap.ts`, `src/seo/JsonLd.tsx` with a
Person schema, and metadata in the root layout.

---

**Q. What is streaming SSR and why does it matter?**

> Instead of waiting for the entire page to render on the server before sending anything, the
> server streams HTML as it becomes ready and fills in slower sections as their data resolves,
> using Suspense boundaries as the split points. The user sees the shell and the fast content
> immediately, so time-to-first-byte and perceived load improve substantially even though
> total time is similar. `loading.tsx` in the App Router is a Suspense boundary for a route
> segment.

---

**Q. How do you do auth in a Next.js app?**

> Session cookie, `httpOnly` + `secure` + `sameSite`, never a token in `localStorage` where
> any XSS can read it. Middleware does a cheap presence check to redirect unauthenticated
> users, but the real authorisation happens at the data-access layer — every server component
> query, route handler, and server action verifies the session and the user's permission for
> that specific resource. The rule I'd state is: never trust the caller's context, only the
> session you verify server-side.

---

## Tailwind CSS

**Q. Why utility-first CSS? Isn't it just inline styles?**

> No — utilities are constrained to a design system, so you get spacing, colour and typography
> from a fixed scale rather than arbitrary values, and you get variants (hover, focus, dark,
> responsive) that inline styles can't express. The practical wins are that you stop inventing
> class names, dead CSS can't accumulate because unused utilities are never generated, and
> deleting a component deletes its styles. The cost is verbose markup, which I manage by
> extracting components — not by extracting CSS classes.

---

**Q. When do you use `@apply`?**

> Rarely. It's tempting as a way to get back to semantic class names, but it recreates the
> exact problem utilities solve — a layer of indirection that grows and can't be safely
> deleted. I use it only for genuinely global primitives, and otherwise extract a React
> component so the styles live with the markup they belong to.

---

**Q. How does Tailwind keep the bundle small?**

> It scans your source files for class strings at build time and generates only what it finds.
> The consequence to know is that dynamically constructed class names don't work —
> `` `text-${color}-500` `` never appears as a literal string, so it's never generated. The fix
> is to map to complete class strings, which is also better for readability.

---

**Q. How do you handle theming / dark mode?**

> CSS custom properties for the palette, with Tailwind colours referencing those variables.
> Dark mode redefines the variables rather than duplicating every utility. Three states matter:
> explicit light, explicit dark, and system preference — so you need both a `prefers-color-scheme`
> media query and a class or data attribute the toggle sets, and the toggle must win over the
> media query in both directions.

---

## React Native & Expo

**Q. How does React Native differ from React for web?**

> Same React model — components, hooks, reconciliation — but the host is native views instead
> of the DOM. You compose `View`/`Text`/`Image` rather than divs, styling is a JS subset of
> flexbox with no cascade, and platform APIs come through native modules. The old architecture
> passed serialised JSON over an async bridge, which was the source of most performance
> complaints; the new architecture (JSI + Fabric + TurboModules) lets JS hold direct references
> to native objects and call them synchronously.

---

**Q. What does Expo give you, and when would you eject?**

> Expo removes the native toolchain from day-to-day work: managed builds through EAS,
> over-the-air updates, a large library of vetted native modules, and no need to open Xcode
> or Android Studio for most apps. You move to a development build (the modern replacement for
> "ejecting") when you need a native module Expo doesn't wrap, or custom native code — and the
> config-plugin system means you can usually do that without giving up the managed workflow.

🔗 *Yours:* the LACS mobile client and All-In-One both ship as Expo/EAS builds.

---

**Q. How do you store data offline in a mobile app?**

> AsyncStorage for small key-value config. SQLite (expo-sqlite or op-sqlite) for anything
> relational or large — it's queryable and doesn't need the whole dataset in memory. Secrets
> go in expo-secure-store, which is backed by Keychain on iOS and Keystore on Android, never
> AsyncStorage. Then the real work is sync: a local write queue, conflict resolution, and
> reconciliation when connectivity returns.

🔗 *Yours:* this is the core of LACS — offline-first edge nodes with bidirectional sync — and
All-In-One's AES-encrypted vault with hardware-backed keys.

---

## Data visualisation

**Q. D3 vs Recharts — how do you choose?**

> Recharts is React components wrapping common chart types; you get a chart in ten lines and
> React owns the DOM. Raw D3 is a set of primitives — scales, shapes, axes, layouts — and
> total control. I default to Recharts and reach for D3 when the visualisation genuinely isn't
> a standard chart type, or when I need a layout algorithm (force, hierarchy, treemap) that no
> chart library provides. The hybrid I actually use most: D3 for the maths (`d3-scale`,
> `d3-shape`) and React for rendering the SVG, so React stays in charge of the DOM and D3
> doesn't fight it.

---

**Q. How do you make a chart performant with a lot of points?**

> Downsample before rendering — nobody can see 50,000 points on 800 pixels, so aggregate to
> the pixel resolution. Beyond a few thousand marks, switch from SVG to canvas, since SVG
> creates a DOM node per element. And avoid re-computing scales and derived series on every
> render — memoise them against the data.

---

**Q. What makes a chart readable?**

> Start bar-chart axes at zero, don't use dual y-axes to imply correlation, label units, and
> pick colours that survive greyscale printing and the common colour-vision deficiencies —
> never encode meaning in hue alone. The chart type should follow the question: comparison →
> bars, trend over time → line, part-to-whole → stacked or a single number, distribution →
> histogram or box plot.

---

## Rapid-fire

| Question | One-liner |
|---|---|
| Props vs state | Props come from the parent and are read-only; state is owned and mutable by the component. |
| Why can't you mutate state? | React compares by reference — a mutated object looks identical, so no re-render. |
| Fragment | Group children without adding a DOM node (`<>...</>`). |
| Lifting state up | Move shared state to the closest common ancestor. |
| Prop drilling fix | Composition first, then context, then a store. |
| `key` on a component | Changing it remounts the component and resets its state — a legitimate reset trick. |
| Hydration | Attaching React event handlers to server-rendered HTML. |
| Hydration mismatch | Server and client rendered different HTML — usually `Date`, `Math.random`, or `window` used during render. |
| CLS / LCP / INP | Layout shift / largest paint / interaction responsiveness — the Core Web Vitals. |
| Code splitting | Ship less JS upfront via dynamic `import()` and route-level chunks. |
| CSR SEO problem | Crawlers may not execute JS reliably — SSR/SSG the content that must rank. |
| `next/dynamic` with `ssr: false` | Skip server rendering for a browser-only component (charts, editors, map widgets). |

---

## Back to [INDEX.md](INDEX.md)
