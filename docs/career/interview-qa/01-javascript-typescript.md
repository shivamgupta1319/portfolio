# 01 — JavaScript & TypeScript

> The warm-up round. These are *filters*, not differentiators: answering them well doesn't
> win the interview, but fumbling one ends it. Target: answer any of these in under 45
> seconds, cleanly, without hedging.
>
> 🔥 = genuinely hard / commonly fumbled.

---

## JavaScript core

**Q. Explain the event loop.**

> JavaScript runs on a single thread with a call stack. Anything async — a timer, an I/O
> callback, a promise — gets handed off and its callback is queued. When the stack empties,
> the event loop pulls from the queues. Critically, there are two tiers: the **microtask
> queue** (promise callbacks, `queueMicrotask`) drains completely before the next macrotask
> (`setTimeout`, I/O). That's why a promise chain always resolves before a `setTimeout(fn, 0)`
> scheduled earlier.

↳ **If pushed:** they'll ask you to predict the output of a `setTimeout` + `Promise.then` +
  sync-log puzzle. Answer: sync logs → all microtasks → then the timer. In Node they may push
  further into loop phases — that's in [03-node-nestjs-apis.md](03-node-nestjs-apis.md).

---

**Q. 🔥 What's the output?**

```js
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
queueMicrotask(() => console.log('4'));
console.log('5');
```

> `1, 5, 3, 4, 2`. Synchronous code first (`1`, `5`), then the microtask queue drains in
> FIFO order (`3`, `4`), and only then the macrotask timer (`2`).

↳ **If pushed:** add `async/await` into the mix — remember `await` suspends and schedules
  the continuation as a microtask, so code after an `await` behaves like a `.then`.

---

**Q. What is a closure, and where have you actually used one?**

> A closure is a function that keeps a reference to the scope it was created in, even after
> that outer function has returned. Practically I use them constantly — every custom hook
> that captures state, every debounce/throttle utility that holds a timer ID, every module
> that keeps a private variable via a factory function.

↳ **If pushed:** the classic `for (var i...)` in a loop with `setTimeout` printing `3,3,3` —
  because `var` is function-scoped so all three closures share one binding. `let` fixes it by
  creating a fresh binding per iteration.

---

**Q. How does `this` get bound?**

> Four rules, in precedence order: `new` binding (`this` is the new object), explicit binding
> (`call`/`apply`/`bind`), implicit binding (the object left of the dot at call time), and
> finally default binding (`undefined` in strict mode, `globalThis` otherwise). Arrow
> functions sidestep all of it — they don't have their own `this`, they close over the
> enclosing lexical scope. That's exactly why arrow functions are the right choice for
> callbacks inside a class method.

↳ **If pushed:** "why does passing `this.handleClick` to `addEventListener` lose `this`?"
  Because the call site becomes the element — fix with `bind` in the constructor or a class
  property arrow function.

---

**Q. Hoisting — and what's the temporal dead zone?**

> `var` declarations and function declarations are hoisted to the top of their scope; `var` is
> initialised to `undefined`, function declarations are fully available. `let` and `const` are
> hoisted too, but *not initialised* — accessing them before the declaration line throws a
> `ReferenceError`. That gap between the top of the scope and the declaration is the temporal
> dead zone. It exists so that using a variable before you declare it is a loud error rather
> than a silent `undefined`.

---

**Q. `==` vs `===`?**

> `===` compares type and value with no coercion. `==` coerces first, following a set of rules
> that are genuinely surprising in the edge cases. I use `===` everywhere. The one idiom I'll
> allow is `x == null`, which is a concise check for "null or undefined" and nothing else.

---

**Q. Explain prototypal inheritance.**

> Every object has an internal link to a prototype object. When you access a property that
> isn't on the object, the engine walks up that prototype chain until it finds it or hits
> `null`. `class` syntax is sugar over exactly this — a class's methods live on
> `Constructor.prototype`, shared by every instance rather than copied per instance.

↳ **If pushed:** difference between `__proto__` (the actual link on an instance) and
  `prototype` (the property on a constructor function that becomes the instance's `__proto__`).

---

**Q. `Promise.all` vs `allSettled` vs `race` vs `any`?**

> `all` — resolves with an array when every promise resolves; rejects immediately on the first
> rejection. `allSettled` — always resolves, giving you a status/value or status/reason for
> each. `race` — settles with the first promise to settle, resolved *or* rejected.
> `any` — resolves with the first *fulfilled* one, rejects only if all reject.
>
> Rule of thumb: `all` when partial success is useless, `allSettled` when you want to report
> what worked and what didn't.

🔗 *Yours:* the pSEO multi-LLM router — provider fan-out needs `allSettled` so one dead
provider doesn't kill the whole batch.

---

**Q. How do you handle errors in async code?**

> `try/catch` around `await` for anything I want to handle locally, and a single unhandled-
> rejection handler at the process boundary as a backstop. Two things I'm careful about:
> a `.catch` that swallows and returns `undefined` is worse than a crash, and `forEach` with
> an async callback doesn't await anything — you need `for...of` with `await`, or `Promise.all`
> over a `map`.

↳ **If pushed:** why an unhandled promise rejection terminates the process in modern Node,
  and how to add `process.on('unhandledRejection')` for logging before exit.

---

**Q. `map` vs `forEach` vs `reduce`?**

> `map` transforms and returns a new array of the same length. `forEach` is for side effects
> and returns `undefined` — if you're not causing a side effect, you want something else.
> `reduce` folds a collection into a single value; I reach for it for grouping and summing,
> but if a `reduce` needs more than a few lines I'll write a plain loop, because readability
> beats cleverness in review.

---

**Q. Shallow vs deep copy — how do you deep-clone an object?**

> Spread and `Object.assign` are shallow: nested objects are still shared references.
> For a true deep clone the modern answer is `structuredClone()` — built in, handles Dates,
> Maps, Sets, and cyclic references. The old `JSON.parse(JSON.stringify(x))` trick silently
> destroys `undefined`, functions, `Date` (becomes a string), and throws on cycles.

---

**Q. Debounce vs throttle — implement debounce.**

> Debounce waits for a quiet period: it fires once, after the calls stop. Throttle fires at
> most once per interval regardless of how many calls come in. Search-as-you-type is debounce;
> scroll or resize handlers are throttle.

```js
function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
```

↳ **If pushed:** add a `leading: true` option, or `cancel()`/`flush()` methods.

---

**Q. What causes memory leaks in JavaScript?**

> Four common ones: event listeners added and never removed (very common in SPA components),
> timers/intervals never cleared, closures holding a reference to something large long after
> it's needed, and unbounded caches or arrays that only ever grow. In the browser I'd confirm
> with a heap snapshot in DevTools — take two, do the suspect action in between, and compare
> retained objects. In Node it's `--inspect` plus heap snapshots, same comparison technique.

---

**Q. What are generators, and when would you use one?**

> A generator function (`function*`) can pause at each `yield` and resume later, producing
> values lazily. I use them where materialising the whole sequence is wasteful — paginating a
> large API, or streaming rows — and they're the mechanism behind async iteration with
> `for await...of`.

---

**Q. Explain `var` vs `let` vs `const`.**

> `var` is function-scoped and hoisted-initialised, which makes it leak out of blocks. `let`
> and `const` are block-scoped with a TDZ. `const` prevents *reassignment* of the binding, not
> mutation of the value — a `const` array can still be pushed to. I default to `const` and
> reach for `let` only when I genuinely reassign. `var` never.

---

**Q. Event delegation — what and why?**

> Instead of attaching a listener to every child, attach one to a common ancestor and use
> `event.target` to work out which child was hit. It relies on bubbling. Two payoffs: far
> fewer listeners (memory, setup cost) and it works for elements added to the DOM later
> without rebinding.

---

**Q. `null` vs `undefined`?**

> `undefined` means "no value has been assigned" — the engine's default. `null` means
> "explicitly nothing" — a deliberate assignment by me. In APIs I try to be consistent:
> `null` for a field that exists but is empty, absent for a field that doesn't apply. Mixing
> them arbitrarily makes client code defensive.

---

**Q. What are Map and Set, and when do you use them over objects/arrays?**

> `Map` allows any key type (including objects), preserves insertion order, has a real `size`,
> and is faster for frequent insert/delete. Plain objects only take string/symbol keys and
> carry prototype-pollution risk from keys like `__proto__`. `Set` gives O(1) uniqueness
> checks — I use it constantly for dedup and "have I seen this" lookups instead of
> `array.includes` in a loop, which is O(n²).

---

## TypeScript

**Q. `type` vs `interface` — which do you use?**

> Both describe object shapes and both support `extends`. `interface` supports declaration
> merging and is the convention for public API contracts. `type` can do things interfaces
> can't — unions, intersections, tuples, mapped and conditional types. My rule: `interface`
> for object contracts I might extend, `type` for everything else. Consistency in a codebase
> matters more than the choice itself.

↳ **If pushed:** declaration merging is the real functional difference — and it's why library
  augmentation (`declare module`) uses interfaces.

---

**Q. `any` vs `unknown` vs `never`?**

> `any` disables type checking — it's an escape hatch that silently spreads through your
> codebase. `unknown` is the type-safe version: you can hold anything but must narrow before
> you use it. `never` is the empty type — a function that never returns, or the type you get
> when narrowing has eliminated every possibility. I use `unknown` at trust boundaries (parsed
> JSON, third-party payloads) and `never` in exhaustiveness checks on discriminated unions.

---

**Q. 🔥 What are discriminated unions and why do they matter?**

> A union of object types that share a literal "tag" field. TypeScript narrows the whole
> object once you check the tag, so each branch is fully typed. They're how I model anything
> with distinct states — a job that's queued vs running vs failed. Paired with a `never`
> default case, adding a new variant becomes a compile error everywhere it's unhandled, which
> is exactly the safety you want.

```ts
type Result =
  | { status: 'ok'; data: string }
  | { status: 'error'; message: string };

function handle(r: Result) {
  switch (r.status) {
    case 'ok': return r.data;        // narrowed
    case 'error': return r.message;  // narrowed
    default: {
      const _exhaustive: never = r;  // compile error if a variant is added
      return _exhaustive;
    }
  }
}
```

---

**Q. Which utility types do you use most?**

> `Partial` for update DTOs, `Pick`/`Omit` for deriving a view of an entity so it can't drift
> from the source type, `Record` for keyed maps, `Required`, `Readonly`, and `ReturnType`/
> `Awaited` for inferring from existing functions rather than re-declaring. The principle is
> that types should be *derived*, not duplicated — one source of truth per concept.

---

**Q. Explain generics with a constraint.**

> A generic parameterises a type so a function works over many types without losing type
> information. A constraint restricts what can be passed in.

```ts
function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map(item => item[key]);
}
```

> Here `K extends keyof T` means the key must actually exist on `T`, and the return type is
> inferred as the array of that property's type. Typo a key name and it's a compile error.

---

**Q. What is a type guard?**

> A function that narrows a type, using the `x is T` return signature. TypeScript trusts the
> annotation, so the guard is a place where you can accidentally lie — I keep them small and
> obvious. For anything crossing a trust boundary I'd rather validate with a schema library
> (Zod, or Pydantic on the Python side) and get the type *and* the runtime check from one
> source.

```ts
function isUser(x: unknown): x is User {
  return typeof x === 'object' && x !== null && 'id' in x;
}
```

---

**Q. What does `satisfies` do?**

> It checks that a value conforms to a type *without widening the value to that type*. With a
> plain annotation you lose the literal detail; with `satisfies` you keep the narrow inferred
> type and still get the conformance check. It's the right tool for config objects where you
> want both validation and precise key inference.

---

**Q. What do you turn on in `tsconfig`?**

> `strict: true` first — that bundles `strictNullChecks`, `noImplicitAny`, and the rest, and
> it's where most of the value is. On top of that `noUncheckedIndexedAccess` (array access
> returns `T | undefined`, which is the truth), `noUnusedLocals`, and `noFallthroughCasesInSwitch`.
> Strictness costs a little upfront and saves a lot of null-related debugging.

---

**Q. Why do people avoid `enum`?**

> TS `enum` emits real JavaScript, so it isn't purely a type-level construct, and numeric
> enums allow assigning arbitrary numbers, which defeats the point. A `const` object plus a
> derived union type gives the same ergonomics, zero runtime cost, and stricter checking:

```ts
const Status = { Active: 'active', Archived: 'archived' } as const;
type Status = typeof Status[keyof typeof Status];  // 'active' | 'archived'
```

---

**Q. How do you type a third-party library with no types?**

> First check DefinitelyTyped (`@types/x`). If it's not there, I write a local `.d.ts` with
> `declare module 'lib'` and type only the surface I actually use, rather than trying to model
> the whole library. That keeps `any` out of my code without a large maintenance burden.

---

**Q. What's the difference between structural and nominal typing?**

> TypeScript is structural: if two types have the same shape they're interchangeable, names
> irrelevant. That's usually convenient, but it means a `UserId` string and an `OrderId`
> string are freely swappable. When that matters I use a branded type — intersect with a
> unique symbol tag — to get nominal behaviour without runtime cost.

---

## Rapid-fire (know these cold)

| Question | One-liner |
|---|---|
| `slice` vs `splice` | `slice` returns a copy, non-mutating; `splice` mutates in place. |
| `for...in` vs `for...of` | `in` iterates keys (incl. inherited); `of` iterates values of an iterable. |
| Spread vs rest | Same `...` syntax — spread expands, rest collects. |
| Optional chaining `?.` | Short-circuits to `undefined` instead of throwing on a null/undefined access. |
| Nullish coalescing `??` | Falls back only on `null`/`undefined`, unlike `\|\|` which also catches `0` and `''`. |
| `Object.freeze` | Shallow immutability — nested objects stay mutable. |
| Pure function | Same input → same output, no side effects. |
| Currying | Transforming `f(a, b)` into `f(a)(b)`. |
| IIFE | Immediately-invoked function expression — pre-module scope isolation. |
| Event bubbling vs capturing | Bubbling goes child→ancestor (default); capturing is ancestor→child. |
| CommonJS vs ESM | `require` is sync/dynamic; `import` is static and tree-shakeable. |
| `Symbol` | Unique, non-colliding property key; used for well-known protocol hooks like `Symbol.iterator`. |

---

## Back to [INDEX.md](INDEX.md)
