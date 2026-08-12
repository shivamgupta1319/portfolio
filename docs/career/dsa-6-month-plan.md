# DSA — 6-Month, ~120-Problem Plan (moderate track)

> **Philosophy:** You are NOT trying to become a competitive programmer. You need to clear
> the DSA *gate* at unicorns/GCCs (which is real but not FAANG-brutal) so your system
> design + products can do the winning. **Patterns > problem count.** 120 well-chosen,
> deeply-understood problems beat 500 skimmed ones.
>
> **Cadence:** 1–1.5 hrs/day, 5 days/week. ~5 problems/week. Weekend = review + 1 mock.
>
> **Rule:** If a problem takes >40 min, read the solution, understand it cold, then
> **re-solve it from scratch 2 days later.** Spaced repetition is the whole game.

> **Worked solutions:** every problem below is solved in JavaScript, with the recognition cue
> and complexity, in [interview-qa/09-coding-arrays-strings.md](interview-qa/09-coding-arrays-strings.md)
> and [interview-qa/10-coding-structures-dp.md](interview-qa/10-coding-structures-dp.md).
> Use those to *check* yourself after attempting — or to read through when you're short on time.

**Recommended source (pick ONE, don't mix):**
- **Striver's A2Z / SDE Sheet** (takeuforward) — best structured for Indian product-company interviews. **Recommended.**
- NeetCode 150 — great video explanations, pattern-grouped.
- Keep a spreadsheet or use the checkboxes below.

Language: **use TypeScript or Python** (whichever you're fastest in for interviews — TS is fine, most Indian companies accept any language).

---

## Month 1 — Fundamentals (~25 problems)

### Week 1 — Arrays & Hashing
- [ ] Two Sum
- [ ] Best Time to Buy/Sell Stock
- [ ] Contains Duplicate
- [ ] Product of Array Except Self
- [ ] Maximum Subarray (Kadane's)
- [ ] Group Anagrams

### Week 2 — Two Pointers & Sliding Window
- [ ] Valid Palindrome
- [ ] 3Sum
- [ ] Container With Most Water
- [ ] Longest Substring Without Repeating Characters
- [ ] Longest Repeating Character Replacement
- [ ] Minimum Window Substring (hard — attempt, then study)

### Week 3 — Binary Search
- [ ] Binary Search (template)
- [ ] Search in Rotated Sorted Array
- [ ] Find Minimum in Rotated Sorted Array
- [ ] Koko Eating Bananas (search on answer)
- [ ] Median of Two Sorted Arrays (hard — study the approach)

### Week 4 — Stacks & Queues
- [ ] Valid Parentheses
- [ ] Min Stack
- [ ] Daily Temperatures (monotonic stack)
- [ ] Largest Rectangle in Histogram (hard — study)
- [ ] Implement Queue using Stacks

**Month 1 checkpoint:** you should recognize array/hashing, two-pointer, sliding-window,
binary-search, and monotonic-stack patterns on sight.

---

## Month 2 — Trees, Heaps, Recursion (~25 problems)

### Week 5 — Linked Lists
- [ ] Reverse Linked List
- [ ] Merge Two Sorted Lists
- [ ] Linked List Cycle (Floyd's)
- [ ] Remove Nth Node From End
- [ ] Reorder List

### Week 6 — Trees (traversal + BST)
- [ ] Invert Binary Tree
- [ ] Maximum Depth of Binary Tree
- [ ] Same Tree / Subtree of Another Tree
- [ ] Level Order Traversal (BFS)
- [ ] Validate BST
- [ ] Lowest Common Ancestor (BST)

### Week 7 — Heaps / Priority Queue
- [ ] Kth Largest Element in Array
- [ ] Top K Frequent Elements
- [ ] Find Median from Data Stream (two-heap)
- [ ] Merge K Sorted Lists
- [ ] Task Scheduler

### Week 8 — Recursion & Backtracking
- [ ] Subsets
- [ ] Combination Sum
- [ ] Permutations
- [ ] Word Search
- [ ] Generate Parentheses

> Month 2 slack: if you're ahead, spend 1 weekend earning a **Kubernetes or AWS** keyword
> honestly (deploy one of your projects to EKS / ECS) — closes a common ATS gap.

---

## Month 3 — Graphs, Intervals, DP basics (~25 problems)

### Week 9 — Graphs (BFS/DFS)
- [ ] Number of Islands
- [ ] Clone Graph
- [ ] Pacific Atlantic Water Flow
- [ ] Course Schedule (topo sort / cycle detect)
- [ ] Rotting Oranges (multi-source BFS)

### Week 10 — Advanced Graphs (lighter touch)
- [ ] Graph Valid Tree (union-find)
- [ ] Number of Connected Components (union-find)
- [ ] Word Ladder (BFS)
- [ ] (Optional) Dijkstra — Network Delay Time

### Week 11 — Intervals & Greedy
- [ ] Merge Intervals
- [ ] Insert Interval
- [ ] Non-overlapping Intervals
- [ ] Meeting Rooms / Meeting Rooms II
- [ ] Jump Game

### Week 12 — Dynamic Programming (1D)
- [ ] Climbing Stairs
- [ ] House Robber / House Robber II
- [ ] Coin Change
- [ ] Longest Increasing Subsequence
- [ ] Word Break

**Month 3 checkpoint (~75 solved):** you can now handle the majority of unicorn/GCC coding
rounds. DP is the weakest area for most people — that's fine, aim for competence not mastery.

---

## Month 4 — Consolidation + weak-spot targeting (~25 problems → ~100)

- Redo any problem that took >40 min the first time (spaced repetition).
- Add **2D DP** lightly: Unique Paths, Longest Common Subsequence, Edit Distance.
- Add **tries** (1–2): Implement Trie, Word Search II.
- Add **bit manipulation** basics (1–2): Number of 1 Bits, Counting Bits.
- Do **timed sets**: 2 problems in 45 min, 2×/week — this trains interview pace.

---

## Months 5–6 — Maintenance mode (~20 problems → ~120)

- You're interviewing now. DSA switches from "learn" to "don't get rusty."
- 2–3 problems/week, mixed random (blind-pick from all patterns).
- Before each real coding round: 3–4 warm-up problems that morning.
- Redo the company-specific tagged problems (LeetCode filters by company) 2 days before.

---

## Progress tracker

| Month | Target cumulative | Actual | Notes |
|-------|-------------------|--------|-------|
| 1 | ~25 | | |
| 2 | ~50 | | |
| 3 | ~75 | | |
| 4 | ~100 | | |
| 5–6 | ~120 | | |

## Interview-day coding tips
- **Talk while you code.** Silent solving reads as "got lucky." Narrate the approach first,
  get a nod, *then* code.
- State brute force → optimize. Interviewers reward the progression.
- Always state time/space complexity unprompted.
- Test your code on 1 example + 1 edge case before saying "done."
