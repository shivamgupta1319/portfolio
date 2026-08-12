# 10 — Coding Problems II: Linked Lists, Trees, Heaps, Backtracking, Graphs, Intervals, DP, Trie

> Part two of the read-through set. Same format: **recognition cue**, working JavaScript,
> complexity. Part one (arrays, strings, windows, binary search, stack, bits) is in
> [09-coding-arrays-strings.md](09-coding-arrays-strings.md).

**Contents:** [Linked lists](#1-linked-lists) · [Trees](#2-binary-trees) ·
[BST](#3-binary-search-trees) · [Heaps & top-K](#4-heaps--top-k) ·
[Backtracking](#5-backtracking) · [Graphs](#6-graphs) · [Union-find](#7-union-find) ·
[Intervals & greedy](#8-intervals--greedy) · [DP](#9-dynamic-programming) ·
[Trie](#10-trie) · [Design](#11-design-problems) · [Complexity table](#complexity-reference)

---

## Setup

```js
class ListNode { constructor(val = 0, next = null) { this.val = val; this.next = next; } }
class TreeNode { constructor(val = 0, left = null, right = null) {
  this.val = val; this.left = left; this.right = right; } }
```

---

## 1. Linked lists

> **Cue:** "reverse", "detect a cycle", "find the middle", "merge". Two techniques cover almost
> everything: **a dummy head node** (removes all the "what if it's the first node" edge cases)
> and **fast/slow pointers**.

### Reverse a Linked List
```js
function reverseList(head) {
  let prev = null, cur = head;
  while (cur) {
    const next = cur.next;   // save before you clobber it
    cur.next = prev;
    prev = cur;
    cur = next;
  }
  return prev;               // prev is the new head
}
```
**O(n) / O(1).** Draw three nodes and step through it once — that's all it takes to never forget it.

### Merge Two Sorted Lists
```js
function mergeTwoLists(a, b) {
  const dummy = new ListNode();
  let tail = dummy;
  while (a && b) {
    if (a.val <= b.val) { tail.next = a; a = a.next; }
    else { tail.next = b; b = b.next; }
    tail = tail.next;
  }
  tail.next = a || b;        // attach whatever remains
  return dummy.next;
}
```
**O(n+m) / O(1).** The dummy head is why there's no special case for the first node.

### Linked List Cycle — Floyd's tortoise and hare
```js
function hasCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;    // they can only meet inside a loop
  }
  return false;
}
```
**O(n) / O(1).**

### Find the Cycle Start
```js
function detectCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next; fast = fast.next.next;
    if (slow === fast) {               // phase 2: reset one pointer to head
      let p = head;
      while (p !== slow) { p = p.next; slow = slow.next; }
      return p;                        // they meet at the cycle entrance
    }
  }
  return null;
}
```
**O(n) / O(1).** The two-phase trick comes from the distance maths — quote the result, don't derive it live.

### Middle of the Linked List
```js
function middleNode(head) {
  let slow = head, fast = head;
  while (fast && fast.next) { slow = slow.next; fast = fast.next.next; }
  return slow;                          // fast moves 2× → slow lands on the middle
}
```
**O(n) / O(1).**

### Remove Nth Node From End
```js
function removeNthFromEnd(head, n) {
  const dummy = new ListNode(0, head);
  let fast = dummy, slow = dummy;
  for (let i = 0; i <= n; i++) fast = fast.next;   // open an n+1 gap
  while (fast) { fast = fast.next; slow = slow.next; }
  slow.next = slow.next.next;
  return dummy.next;
}
```
**O(n) / O(1), one pass.** The dummy handles "remove the head" without a branch.

### Reorder List (L0 → Ln → L1 → Ln-1 …)
```js
function reorderList(head) {
  if (!head || !head.next) return head;
  let slow = head, fast = head;                       // 1. find middle
  while (fast.next && fast.next.next) { slow = slow.next; fast = fast.next.next; }

  let second = slow.next; slow.next = null;           // 2. reverse second half
  let prev = null;
  while (second) { const nx = second.next; second.next = prev; prev = second; second = nx; }

  let first = head; second = prev;                    // 3. interleave
  while (second) {
    const n1 = first.next, n2 = second.next;
    first.next = second; second.next = n1;
    first = n1; second = n2;
  }
  return head;
}
```
**O(n) / O(1).** Three sub-problems you already know, composed — that's the point of the question.

### Add Two Numbers (digits reversed)
```js
function addTwoNumbers(l1, l2) {
  const dummy = new ListNode(); let cur = dummy, carry = 0;
  while (l1 || l2 || carry) {
    const sum = (l1?.val ?? 0) + (l2?.val ?? 0) + carry;
    carry = Math.floor(sum / 10);
    cur.next = new ListNode(sum % 10); cur = cur.next;
    l1 = l1?.next; l2 = l2?.next;
  }
  return dummy.next;
}
```
**O(max(n,m)) / O(1) extra.** `|| carry` in the condition handles the final `1`.

---

## 2. Binary trees

> **Cue:** DFS (recursion) for anything about paths, depth or subtree properties; BFS (a queue)
> for anything level-related or "shortest". Almost every tree answer is four lines of recursion —
> the skill is choosing what to return upward.

### Max Depth
```js
const maxDepth = root => root ? 1 + Math.max(maxDepth(root.left), maxDepth(root.right)) : 0;
```
**O(n) / O(h)** where h is height (recursion stack).

### Invert Binary Tree
```js
function invertTree(root) {
  if (!root) return null;
  [root.left, root.right] = [invertTree(root.right), invertTree(root.left)];
  return root;
}
```
**O(n) / O(h).**

### Same Tree
```js
const isSameTree = (p, q) =>
  (!p && !q) ? true :
  (!p || !q || p.val !== q.val) ? false :
  isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
```
**O(n) / O(h).**

### Subtree of Another Tree
```js
function isSubtree(root, sub) {
  if (!sub) return true;
  if (!root) return false;
  return isSameTree(root, sub) || isSubtree(root.left, sub) || isSubtree(root.right, sub);
}
```
**O(n·m) / O(h).**

### Level Order Traversal (BFS)
```js
function levelOrder(root) {
  if (!root) return [];
  const res = [], queue = [root];
  while (queue.length) {
    const size = queue.length, level = [];     // snapshot size = this level's node count
    for (let i = 0; i < size; i++) {
      const node = queue.shift();
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    res.push(level);
  }
  return res;
}
```
**O(n) / O(width).** Capturing `size` before the inner loop is what separates levels — the core trick.
(`shift()` is O(n) on a JS array; for large inputs use an index pointer instead.)

### Right Side View
```js
function rightSideView(root) {
  if (!root) return [];
  const res = [], queue = [root];
  while (queue.length) {
    const size = queue.length;
    for (let i = 0; i < size; i++) {
      const node = queue.shift();
      if (i === size - 1) res.push(node.val);   // last node of each level
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
  }
  return res;
}
```
**O(n) / O(width).** Same skeleton as level order — recognise the reuse.

### Diameter of a Binary Tree
```js
function diameterOfBinaryTree(root) {
  let best = 0;
  const depth = node => {
    if (!node) return 0;
    const l = depth(node.left), r = depth(node.right);
    best = Math.max(best, l + r);        // path THROUGH this node
    return 1 + Math.max(l, r);           // depth returned UPWARD
  };
  depth(root);
  return best;
}
```
**O(n) / O(h).** The pattern to internalise: **return one thing upward, record another in a closure.**
Max path sum, balanced-tree and "longest univalue path" are all this shape.

### Balanced Binary Tree
```js
function isBalanced(root) {
  const check = node => {
    if (!node) return 0;
    const l = check(node.left); if (l === -1) return -1;
    const r = check(node.right); if (r === -1) return -1;
    return Math.abs(l - r) > 1 ? -1 : 1 + Math.max(l, r);   // -1 = sentinel for "unbalanced"
  };
  return check(root) !== -1;
}
```
**O(n) / O(h).** The sentinel makes it one pass instead of O(n log n).

### Lowest Common Ancestor (general binary tree)
```js
function lowestCommonAncestor(root, p, q) {
  if (!root || root === p || root === q) return root;
  const left = lowestCommonAncestor(root.left, p, q);
  const right = lowestCommonAncestor(root.right, p, q);
  return (left && right) ? root : (left || right);   // found on both sides → this is the LCA
}
```
**O(n) / O(h).**

### Path Sum II (all root-to-leaf paths equal to target)
```js
function pathSum(root, target) {
  const res = [], path = [];
  const dfs = (node, remaining) => {
    if (!node) return;
    path.push(node.val);
    if (!node.left && !node.right && remaining === node.val) res.push([...path]);
    else { dfs(node.left, remaining - node.val); dfs(node.right, remaining - node.val); }
    path.pop();                                     // backtrack
  };
  dfs(root, target);
  return res;
}
```
**O(n²) worst / O(h).** Push a **copy** (`[...path]`) — pushing `path` stores a reference that later mutates.

### Traversals
```js
const inorder = (n, out = []) => (n && (inorder(n.left, out), out.push(n.val), inorder(n.right, out)), out);
const preorder = (n, out = []) => (n && (out.push(n.val), preorder(n.left, out), preorder(n.right, out)), out);
const postorder = (n, out = []) => (n && (postorder(n.left, out), postorder(n.right, out), out.push(n.val)), out);

// Iterative inorder — worth knowing when they ask for "no recursion"
function inorderIterative(root) {
  const out = [], stack = [];
  let cur = root;
  while (cur || stack.length) {
    while (cur) { stack.push(cur); cur = cur.left; }   // go as far left as possible
    cur = stack.pop();
    out.push(cur.val);
    cur = cur.right;
  }
  return out;
}
```
**Inorder on a BST yields sorted order** — that single fact solves a whole family of BST problems.

---

## 3. Binary search trees

### Validate BST
```js
function isValidBST(root, min = -Infinity, max = Infinity) {
  if (!root) return true;
  if (root.val <= min || root.val >= max) return false;
  return isValidBST(root.left, min, root.val) && isValidBST(root.right, root.val, max);
}
```
**O(n) / O(h).** The classic wrong answer only compares a node to its direct children — you must
carry the **range** down, because a node deep in the left subtree still must be less than the root.

### Kth Smallest Element in a BST
```js
function kthSmallest(root, k) {
  const stack = [];
  let cur = root;
  while (cur || stack.length) {
    while (cur) { stack.push(cur); cur = cur.left; }
    cur = stack.pop();
    if (--k === 0) return cur.val;      // inorder = ascending, so stop at the k-th
    cur = cur.right;
  }
  return -1;
}
```
**O(h + k) / O(h).**

### LCA in a BST
```js
function lcaBST(root, p, q) {
  while (root) {
    if (p.val < root.val && q.val < root.val) root = root.left;
    else if (p.val > root.val && q.val > root.val) root = root.right;
    else return root;                   // they diverge here → LCA
  }
  return null;
}
```
**O(h) / O(1).** Exploits ordering — much better than the general-tree version.

---

## 4. Heaps & top-K

> **Cue:** "k-th largest/smallest", "top k", "merge k sorted", or a running median.
> **JavaScript has no built-in heap** — say that out loud, then either write a compact one or
> justify a sort/bucket alternative. Interviewers accept both if you name the tradeoff.

```js
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.h = []; this.cmp = cmp; }
  size() { return this.h.length; }
  peek() { return this.h[0]; }
  push(v) {
    this.h.push(v);
    let i = this.h.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.cmp(this.h[i], this.h[p]) >= 0) break;
      [this.h[i], this.h[p]] = [this.h[p], this.h[i]]; i = p;
    }
  }
  pop() {
    const top = this.h[0], last = this.h.pop();
    if (this.h.length) {
      this.h[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let small = i;
        if (l < this.h.length && this.cmp(this.h[l], this.h[small]) < 0) small = l;
        if (r < this.h.length && this.cmp(this.h[r], this.h[small]) < 0) small = r;
        if (small === i) break;
        [this.h[i], this.h[small]] = [this.h[small], this.h[i]]; i = small;
      }
    }
    return top;
  }
}
```
**push/pop O(log n), peek O(1).**

### Kth Largest Element in an Array
```js
function findKthLargest(nums, k) {
  const heap = new MinHeap();                  // min-heap of size k
  for (const n of nums) {
    heap.push(n);
    if (heap.size() > k) heap.pop();           // evict the smallest
  }
  return heap.peek();
}
```
**O(n log k) / O(k).** Sorting is O(n log n) and fine to mention; quickselect is O(n) average.

### Merge K Sorted Lists
```js
function mergeKLists(lists) {
  const heap = new MinHeap((a, b) => a.val - b.val);
  for (const l of lists) if (l) heap.push(l);
  const dummy = new ListNode(); let tail = dummy;
  while (heap.size()) {
    const node = heap.pop();
    tail.next = node; tail = node;
    if (node.next) heap.push(node.next);       // pull the next from that list
  }
  return dummy.next;
}
```
**O(N log k) / O(k)** for N total nodes across k lists.

### Find Median from Data Stream — two heaps
```js
class MedianFinder {
  constructor() {
    this.low = new MinHeap((a, b) => b - a);   // max-heap: smaller half
    this.high = new MinHeap((a, b) => a - b);  // min-heap: larger half
  }
  addNum(num) {
    this.low.push(num);
    this.high.push(this.low.pop());            // funnel through to keep them ordered
    if (this.high.size() > this.low.size()) this.low.push(this.high.pop());
  }
  findMedian() {
    return this.low.size() > this.high.size()
      ? this.low.peek()
      : (this.low.peek() + this.high.peek()) / 2;
  }
}
```
**add O(log n), find O(1).** Keep the halves balanced within one element; the median is at the tops.

---

## 5. Backtracking

> **Cue:** "all combinations / permutations / subsets", "generate every valid…", or an N-Queens-
> style constraint search. Always the same skeleton:
> **choose → recurse → un-choose.** Complexity is exponential — say so and move on.

### Subsets
```js
function subsets(nums) {
  const res = [], path = [];
  const backtrack = start => {
    res.push([...path]);                      // every node is a valid subset
    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]);
      backtrack(i + 1);
      path.pop();                             // un-choose
    }
  };
  backtrack(0);
  return res;
}
```
**O(n·2ⁿ) / O(n).**

### Permutations
```js
function permute(nums) {
  const res = [], path = [], used = new Array(nums.length).fill(false);
  const backtrack = () => {
    if (path.length === nums.length) { res.push([...path]); return; }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      used[i] = true; path.push(nums[i]);
      backtrack();
      path.pop(); used[i] = false;
    }
  };
  backtrack();
  return res;
}
```
**O(n·n!) / O(n).** Permutations restart from index 0 with a `used` array; combinations advance `start`.
That's the only structural difference between the two.

### Combination Sum (reuse allowed)
```js
function combinationSum(candidates, target) {
  const res = [], path = [];
  const backtrack = (start, remaining) => {
    if (remaining === 0) { res.push([...path]); return; }
    if (remaining < 0) return;
    for (let i = start; i < candidates.length; i++) {
      path.push(candidates[i]);
      backtrack(i, remaining - candidates[i]);   // `i`, not `i+1` → reuse allowed
      path.pop();
    }
  };
  backtrack(0, target);
  return res;
}
```
**O(n^(target/min)) / O(target/min).**

### Generate Parentheses
```js
function generateParenthesis(n) {
  const res = [];
  const backtrack = (str, open, close) => {
    if (str.length === 2 * n) { res.push(str); return; }
    if (open < n) backtrack(str + '(', open + 1, close);
    if (close < open) backtrack(str + ')', open, close + 1);   // only close what's open
  };
  backtrack('', 0, 0);
  return res;
}
```
**O(4ⁿ/√n) / O(n).** The two conditions make every generated string valid by construction — no filtering.

### Word Search (grid)
```js
function exist(board, word) {
  const rows = board.length, cols = board[0].length;
  const dfs = (r, c, i) => {
    if (i === word.length) return true;
    if (r < 0 || c < 0 || r >= rows || c >= cols || board[r][c] !== word[i]) return false;
    const tmp = board[r][c];
    board[r][c] = '#';                                  // mark visited in place
    const found = dfs(r + 1, c, i + 1) || dfs(r - 1, c, i + 1)
               || dfs(r, c + 1, i + 1) || dfs(r, c - 1, i + 1);
    board[r][c] = tmp;                                  // restore
    return found;
  };
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (dfs(r, c, 0)) return true;
  return false;
}
```
**O(m·n·4^L) / O(L).**

### Palindrome Partitioning
```js
function partition(s) {
  const res = [], path = [];
  const isPal = (l, r) => { while (l < r) if (s[l++] !== s[r--]) return false; return true; };
  const backtrack = start => {
    if (start === s.length) { res.push([...path]); return; }
    for (let end = start; end < s.length; end++) {
      if (!isPal(start, end)) continue;
      path.push(s.slice(start, end + 1));
      backtrack(end + 1);
      path.pop();
    }
  };
  backtrack(0);
  return res;
}
```
**O(n·2ⁿ) / O(n).**

---

## 6. Graphs

> **Cue:** grids ("islands", "regions"), dependencies ("prerequisites", "build order"),
> or "shortest path". **BFS is the answer for shortest path on unweighted graphs** — that's the
> most commonly missed mapping.

### Number of Islands
```js
function numIslands(grid) {
  if (!grid.length) return 0;
  const rows = grid.length, cols = grid[0].length;
  let count = 0;
  const sink = (r, c) => {
    if (r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] !== '1') return;
    grid[r][c] = '0';                                    // mark visited
    sink(r + 1, c); sink(r - 1, c); sink(r, c + 1); sink(r, c - 1);
  };
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (grid[r][c] === '1') { count++; sink(r, c); }
  return count;
}
```
**O(m·n) / O(m·n) worst-case stack.** Mention BFS if the grid could be large enough to blow the stack.

### Rotting Oranges — multi-source BFS
```js
function orangesRotting(grid) {
  const rows = grid.length, cols = grid[0].length;
  const queue = [];
  let fresh = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 2) queue.push([r, c]);      // ALL rotten start at time 0
      else if (grid[r][c] === 1) fresh++;
    }

  let minutes = 0;
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  while (queue.length && fresh > 0) {
    const size = queue.length;
    for (let i = 0; i < size; i++) {
      const [r, c] = queue.shift();
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] !== 1) continue;
        grid[nr][nc] = 2; fresh--; queue.push([nr, nc]);
      }
    }
    minutes++;
  }
  return fresh === 0 ? minutes : -1;
}
```
**O(m·n) / O(m·n).** Seeding the queue with *every* source is the multi-source BFS pattern —
it computes all shortest distances simultaneously.

### Course Schedule — cycle detection via topological sort
```js
function canFinish(numCourses, prerequisites) {
  const graph = Array.from({ length: numCourses }, () => []);
  const indegree = new Array(numCourses).fill(0);
  for (const [course, prereq] of prerequisites) {
    graph[prereq].push(course);
    indegree[course]++;
  }

  const queue = [];
  for (let i = 0; i < numCourses; i++) if (indegree[i] === 0) queue.push(i);

  let done = 0;
  while (queue.length) {
    const node = queue.shift();
    done++;
    for (const next of graph[node]) if (--indegree[next] === 0) queue.push(next);
  }
  return done === numCourses;      // fewer processed → a cycle exists
}
```
**O(V+E) / O(V+E).** Kahn's algorithm. Collect the popped nodes in order and you have the
build order (Course Schedule II) for free.

### Clone Graph
```js
function cloneGraph(node, seen = new Map()) {
  if (!node) return null;
  if (seen.has(node)) return seen.get(node);      // handles cycles
  const copy = { val: node.val, neighbors: [] };
  seen.set(node, copy);                           // register BEFORE recursing
  for (const n of node.neighbors) copy.neighbors.push(cloneGraph(n, seen));
  return copy;
}
```
**O(V+E) / O(V).** Registering before recursion is what prevents infinite recursion on a cycle.

### Word Ladder — BFS for shortest transformation
```js
function ladderLength(beginWord, endWord, wordList) {
  const words = new Set(wordList);
  if (!words.has(endWord)) return 0;
  let queue = [beginWord], steps = 1;
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';

  while (queue.length) {
    const next = [];
    for (const word of queue) {
      if (word === endWord) return steps;
      for (let i = 0; i < word.length; i++)
        for (const ch of alphabet) {
          const candidate = word.slice(0, i) + ch + word.slice(i + 1);
          if (words.has(candidate)) { words.delete(candidate); next.push(candidate); }
        }
    }
    queue = next; steps++;
  }
  return 0;
}
```
**O(N·L·26) / O(N·L).** Deleting from the set as you enqueue is the visited-marking — without it
you revisit and it blows up.

---

## 7. Union-find

> **Cue:** "connected components", "are these two in the same group", "redundant connection",
> or merging sets incrementally. Nearly O(1) per operation with both optimisations.

```js
class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
    this.count = n;                                  // number of components
  }
  find(x) {
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);  // path compression
    return this.parent[x];
  }
  union(a, b) {
    const ra = this.find(a), rb = this.find(b);
    if (ra === rb) return false;                     // already connected → a cycle edge
    if (this.rank[ra] < this.rank[rb]) this.parent[ra] = rb;   // union by rank
    else if (this.rank[ra] > this.rank[rb]) this.parent[rb] = ra;
    else { this.parent[rb] = ra; this.rank[ra]++; }
    this.count--;
    return true;
  }
}

// Number of Connected Components
function countComponents(n, edges) {
  const uf = new UnionFind(n);
  for (const [a, b] of edges) uf.union(a, b);
  return uf.count;
}

// Graph Valid Tree: connected AND acyclic
function validTree(n, edges) {
  if (edges.length !== n - 1) return false;          // a tree has exactly n-1 edges
  const uf = new UnionFind(n);
  for (const [a, b] of edges) if (!uf.union(a, b)) return false;  // union failed = cycle
  return true;
}
```
**Near O(α(n)) ≈ O(1) amortised per operation.**

---

## 8. Intervals & greedy

> **Cue:** the input is a list of `[start, end]` pairs. **Sort first** — by start for merging,
> by *end* for "maximum non-overlapping count". Choosing the wrong sort key is the usual failure.

### Merge Intervals
```js
function mergeIntervals(intervals) {   // LeetCode calls it merge(); renamed to avoid the clash
  intervals.sort((a, b) => a[0] - b[0]);
  const res = [intervals[0]];
  for (const [start, end] of intervals.slice(1)) {
    const last = res.at(-1);
    if (start <= last[1]) last[1] = Math.max(last[1], end);   // overlap → extend
    else res.push([start, end]);
  }
  return res;
}
```
**O(n log n) / O(n).**

### Insert Interval (input already sorted)
```js
function insert(intervals, newInterval) {
  const res = [];
  let i = 0, [start, end] = newInterval;
  while (i < intervals.length && intervals[i][1] < start) res.push(intervals[i++]);   // before
  while (i < intervals.length && intervals[i][0] <= end) {                            // overlapping
    start = Math.min(start, intervals[i][0]);
    end = Math.max(end, intervals[i][1]);
    i++;
  }
  res.push([start, end]);
  while (i < intervals.length) res.push(intervals[i++]);                              // after
  return res;
}
```
**O(n) / O(n).** Three phases: before, merge, after.

### Non-overlapping Intervals (min removals)
```js
function eraseOverlapIntervals(intervals) {
  intervals.sort((a, b) => a[1] - b[1]);        // sort by END — the greedy key
  let prevEnd = -Infinity, keep = 0;
  for (const [start, end] of intervals)
    if (start >= prevEnd) { keep++; prevEnd = end; }
  return intervals.length - keep;
}
```
**O(n log n) / O(1).** Greedy proof in one line: always keeping the interval that finishes
earliest leaves the most room for everything after it.

### Meeting Rooms II (minimum rooms)
```js
function minMeetingRooms(intervals) {
  const starts = intervals.map(i => i[0]).sort((a, b) => a - b);
  const ends = intervals.map(i => i[1]).sort((a, b) => a - b);
  let rooms = 0, maxRooms = 0, s = 0, e = 0;
  while (s < starts.length) {
    if (starts[s] < ends[e]) { rooms++; s++; maxRooms = Math.max(maxRooms, rooms); }
    else { rooms--; e++; }
  }
  return maxRooms;
}
```
**O(n log n) / O(n).** Sweep line: sort starts and ends independently and walk both.

### Jump Game
```js
function canJump(nums) {
  let reach = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i > reach) return false;                    // unreachable gap
    reach = Math.max(reach, i + nums[i]);
  }
  return true;
}
```
**O(n) / O(1).**

---

## 9. Dynamic programming

> **Cue:** "number of ways", "minimum/maximum cost", or a recursion that recomputes the same
> subproblem. The method: **define the state in one sentence**, write the recurrence, decide
> base cases, then either memoise top-down or build a table bottom-up. Say the state definition
> out loud before writing code — it's most of the marks.

### Climbing Stairs
```js
function climbStairs(n) {
  let a = 1, b = 1;
  for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
  return b;
}
```
**O(n) / O(1).** *State:* `dp[i]` = ways to reach step i. It's Fibonacci.

### House Robber
```js
function rob(nums) {
  let prev = 0, cur = 0;
  for (const n of nums) [prev, cur] = [cur, Math.max(cur, prev + n)];   // skip vs take
  return cur;
}
```
**O(n) / O(1).** *State:* `dp[i]` = max loot from the first i houses.

### House Robber II (houses in a circle)
```js
function robCircular(nums) {
  if (nums.length === 1) return nums[0];
  const linear = arr => {
    let prev = 0, cur = 0;
    for (const n of arr) [prev, cur] = [cur, Math.max(cur, prev + n)];
    return cur;
  };
  return Math.max(linear(nums.slice(1)), linear(nums.slice(0, -1)));   // drop first OR last
}
```
**O(n) / O(1).** First and last are adjacent, so one of them must be excluded.

### Coin Change (fewest coins)
```js
function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++)
    for (const c of coins)
      if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
  return dp[amount] === Infinity ? -1 : dp[amount];
}
```
**O(amount·coins) / O(amount).** *State:* `dp[a]` = fewest coins making amount a. Greedy fails
here (coins `[1,3,4]`, amount 6) — a good thing to volunteer.

### Coin Change II (number of combinations)
```js
function change(amount, coins) {
  const dp = new Array(amount + 1).fill(0);
  dp[0] = 1;
  for (const c of coins)                       // coin loop OUTSIDE → combinations
    for (let a = c; a <= amount; a++) dp[a] += dp[a - c];
  return dp[amount];
}
```
**O(amount·coins) / O(amount).** Swap the loop order and you count *permutations* instead —
this loop-order distinction is a favourite follow-up.

### Longest Increasing Subsequence
```js
function lengthOfLIS(nums) {
  const tails = [];                            // tails[i] = smallest tail of an LIS of length i+1
  for (const n of nums) {
    let l = 0, r = tails.length;
    while (l < r) { const m = (l + r) >> 1; tails[m] < n ? l = m + 1 : r = m; }
    tails[l] = n;
  }
  return tails.length;
}
```
**O(n log n) / O(n).** The O(n²) DP is the expected answer; this patience-sorting version is the
one that impresses. Note `tails` is not itself a valid subsequence — only its *length* is correct.

### Word Break
```js
function wordBreak(s, wordDict) {
  const words = new Set(wordDict);
  const dp = new Array(s.length + 1).fill(false);
  dp[0] = true;                                        // empty prefix is breakable
  for (let i = 1; i <= s.length; i++)
    for (let j = 0; j < i; j++)
      if (dp[j] && words.has(s.slice(j, i))) { dp[i] = true; break; }
  return dp[s.length];
}
```
**O(n²·L) / O(n).** *State:* `dp[i]` = can the first i characters be segmented.

### Unique Paths (grid, right/down only)
```js
function uniquePaths(m, n) {
  const dp = new Array(n).fill(1);                     // top row is all 1s
  for (let i = 1; i < m; i++)
    for (let j = 1; j < n; j++) dp[j] += dp[j - 1];    // from above + from left
  return dp[n - 1];
}
```
**O(m·n) / O(n).** Rolling one row is the standard 2D→1D space optimisation.

### Longest Common Subsequence
```js
function longestCommonSubsequence(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1                          // match → extend the diagonal
        : Math.max(dp[i - 1][j], dp[i][j - 1]);         // else drop one character
  return dp[a.length][b.length];
}
```
**O(n·m) / O(n·m).** *State:* `dp[i][j]` = LCS of the first i of `a` and first j of `b`.
The template for edit distance, longest palindromic subsequence and diff algorithms.

### Edit Distance
```js
function minDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1],   // replace
                       dp[i - 1][j],       // delete
                       dp[i][j - 1]);      // insert
  return dp[a.length][b.length];
}
```
**O(n·m) / O(n·m).** Name which of the three neighbours is which operation — that's what's being checked.

### 0/1 Knapsack
```js
function knapsack(weights, values, capacity) {
  const dp = new Array(capacity + 1).fill(0);
  for (let i = 0; i < weights.length; i++)
    for (let c = capacity; c >= weights[i]; c--)        // iterate capacity DOWNWARD
      dp[c] = Math.max(dp[c], dp[c - weights[i]] + values[i]);
  return dp[capacity];
}
```
**O(n·capacity) / O(capacity).** Descending order is what enforces "each item used at most once";
ascending gives you the unbounded knapsack instead.

---

## 10. Trie

> **Cue:** prefix matching, autocomplete, dictionary lookups, or many-words-against-one-text.

```js
class TrieNode { constructor() { this.children = new Map(); this.isWord = false; } }

class Trie {
  constructor() { this.root = new TrieNode(); }
  insert(word) {
    let node = this.root;
    for (const c of word) {
      if (!node.children.has(c)) node.children.set(c, new TrieNode());
      node = node.children.get(c);
    }
    node.isWord = true;
  }
  _walk(prefix) {
    let node = this.root;
    for (const c of prefix) {
      if (!node.children.has(c)) return null;
      node = node.children.get(c);
    }
    return node;
  }
  search(word) { return this._walk(word)?.isWord ?? false; }
  startsWith(prefix) { return this._walk(prefix) !== null; }
}
```
**insert/search O(L)** in the word length, independent of how many words are stored — that's the
whole point versus a hash set, which can't answer prefix queries at all.

---

## 11. Design problems

### LRU Cache — O(1) get and put
```js
class LRUCache {
  constructor(capacity) { this.capacity = capacity; this.map = new Map(); }
  get(key) {
    if (!this.map.has(key)) return -1;
    const val = this.map.get(key);
    this.map.delete(key); this.map.set(key, val);      // re-insert → moves to most-recent
    return val;
  }
  put(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity)
      this.map.delete(this.map.keys().next().value);   // first key = least recently used
  }
}
```
**O(1) both / O(capacity).** This exploits `Map`'s insertion ordering. **Interviewers often want
the manual version** — a hash map plus a doubly-linked list — so be ready to say that `Map` is
giving you exactly that internally, and to describe the node-splice version if asked.

---

## Complexity reference

| Structure | Access | Search | Insert | Delete |
|---|---|---|---|---|
| Array | O(1) | O(n) | O(n) | O(n) |
| Hash map / Set | — | O(1) avg | O(1) avg | O(1) avg |
| Balanced BST | O(log n) | O(log n) | O(log n) | O(log n) |
| Heap | O(1) peek | O(n) | O(log n) | O(log n) |
| Linked list | O(n) | O(n) | O(1)* | O(1)* |
| Trie | — | O(L) | O(L) | O(L) |

*\* given a reference to the node.*

**Recursion space:** every recursive solution costs O(depth) stack — balanced tree O(log n),
skewed tree or linked list O(n). State it; most candidates only quote time.

**Rough input-size → expected complexity** (a good sanity check mid-interview):

| n | Target |
|---|---|
| ≤ 12 | O(n!) permutations are fine |
| ≤ 25 | O(2ⁿ) subsets/backtracking |
| ≤ 5,000 | O(n²) acceptable |
| ≤ 10⁶ | O(n log n) or O(n) |
| > 10⁶ | O(n) or O(log n) only |

---

Back to [09-coding-arrays-strings.md](09-coding-arrays-strings.md) · [INDEX.md](INDEX.md)
