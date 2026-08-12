# 09 — Coding Problems I: Arrays, Strings, Two Pointers, Windows, Search, Stack, Matrix, Bits

> **Read-through format.** Every problem gives you the **recognition cue** (what in the question
> tells you to use this pattern), a working **JavaScript** solution, and **complexity**. Read the
> cue first and try to recall the approach before looking at the code — that's the whole value
> when you don't have time to actually solve them.
>
> Structures, graphs and DP are in [10-coding-structures-dp.md](10-coding-structures-dp.md).
> The spaced-repetition schedule is in [dsa-6-month-plan.md](../dsa-6-month-plan.md).

**Contents:** [JS toolkit](#js-toolkit) · [Arrays & hashing](#1-arrays--hashing) ·
[Prefix sums](#2-prefix-sums) · [Two pointers](#3-two-pointers) ·
[Sliding window](#4-sliding-window) · [Strings](#5-strings) ·
[Binary search](#6-binary-search) · [Stack](#7-stack--monotonic-stack) ·
[Matrix](#8-matrix) · [Bit manipulation](#9-bit-manipulation) ·
[Sorting](#10-sorting) · [Cheat sheet](#pattern-cheat-sheet)

---

## JS toolkit

The language details that cost people points in a JavaScript coding round:

```js
// SORTING IS LEXICOGRAPHIC BY DEFAULT — the #1 JS interview bug
[10, 9, 1].sort();            // [1, 10, 9]   ← wrong
[10, 9, 1].sort((a, b) => a - b);  // [1, 9, 10]  ← always pass a comparator

// Map / Set — O(1) lookup, any key type, insertion-ordered
const m = new Map(); m.set(k, (m.get(k) ?? 0) + 1); m.has(k); m.get(k);
const s = new Set(arr); s.has(x); s.add(x); s.size;

// Frequency map in one line
const freq = new Map();
for (const c of str) freq.set(c, (freq.get(c) || 0) + 1);

// 2D array — NEVER Array(n).fill(Array(m).fill(0)), every row is the SAME reference
const grid = Array.from({ length: n }, () => new Array(m).fill(0));

// Useful
arr.at(-1);                     // last element
[...str].reverse().join('');    // reverse a string
str.charCodeAt(0) - 97;         // 'a'..'z' → 0..25
Number.MAX_SAFE_INTEGER; -Infinity; Infinity;
Math.floor((lo + hi) / 2);      // JS division is float — always floor
arr.slice(a, b);                // copy, non-mutating
arr.splice(i, 1);               // mutates — O(n)
```

**Say the complexity unprompted, every time.** It's free marks and most candidates forget.

---

## 1. Arrays & hashing

> **Cue:** "find a pair / duplicate / count of…" and a nested loop feels natural.
> A hash map trades O(n) memory to turn O(n²) into O(n). This is the single highest-yield
> trade in interviews.

### Two Sum
Return indices of the two numbers adding to `target`.

```js
function twoSum(nums, target) {
  const seen = new Map();               // value → index
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return [];
}
```
**O(n) / O(n).** Check for the complement *before* inserting, so an element can't pair with itself.

### Contains Duplicate
```js
const containsDuplicate = nums => new Set(nums).size !== nums.length;
```
**O(n) / O(n).**

### Valid Anagram
```js
function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const count = new Map();
  for (const c of s) count.set(c, (count.get(c) || 0) + 1);
  for (const c of t) {
    if (!count.get(c)) return false;    // absent or already exhausted
    count.set(c, count.get(c) - 1);
  }
  return true;
}
```
**O(n) / O(1)** — the map holds at most 26 keys for lowercase input.

### Group Anagrams
```js
function groupAnagrams(strs) {
  const groups = new Map();
  for (const s of strs) {
    const key = [...s].sort().join('');       // anagrams share a sorted key
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  return [...groups.values()];
}
```
**O(n·k log k) / O(n·k).** Counting-sort the key (a 26-slot array) to get O(n·k).

### Top K Frequent Elements
```js
function topKFrequent(nums, k) {
  const freq = new Map();
  for (const n of nums) freq.set(n, (freq.get(n) || 0) + 1);

  // bucket sort: index = frequency, so no heap needed
  const buckets = Array.from({ length: nums.length + 1 }, () => []);
  for (const [num, c] of freq) buckets[c].push(num);

  const out = [];
  for (let c = buckets.length - 1; c >= 0 && out.length < k; c--) out.push(...buckets[c]);
  return out.slice(0, k);
}
```
**O(n) / O(n).** The heap solution is O(n log k) — mention both; bucket sort is the better answer.

### Product of Array Except Self (no division)
```js
function productExceptSelf(nums) {
  const n = nums.length, out = new Array(n).fill(1);
  let prefix = 1;
  for (let i = 0; i < n; i++) { out[i] = prefix; prefix *= nums[i]; }
  let suffix = 1;
  for (let i = n - 1; i >= 0; i--) { out[i] *= suffix; suffix *= nums[i]; }
  return out;
}
```
**O(n) / O(1) extra.** Each slot ends up holding *everything left of it × everything right of it*.

### Longest Consecutive Sequence
```js
function longestConsecutive(nums) {
  const set = new Set(nums);
  let best = 0;
  for (const n of set) {
    if (set.has(n - 1)) continue;        // only start counting at a sequence START
    let len = 1;
    while (set.has(n + len)) len++;
    best = Math.max(best, len);
  }
  return best;
}
```
**O(n) / O(n).** The `continue` guard is what keeps it linear — without it, it's O(n²).

### Maximum Subarray — Kadane's
```js
function maxSubArray(nums) {
  let best = nums[0], cur = nums[0];
  for (let i = 1; i < nums.length; i++) {
    cur = Math.max(nums[i], cur + nums[i]);   // extend, or start fresh here
    best = Math.max(best, cur);
  }
  return best;
}
```
**O(n) / O(1).** The insight: a running sum that's gone negative can only hurt you — drop it.

### Best Time to Buy and Sell Stock
```js
function maxProfit(prices) {
  let min = Infinity, best = 0;
  for (const p of prices) {
    min = Math.min(min, p);
    best = Math.max(best, p - min);
  }
  return best;
}
```
**O(n) / O(1).**

### Move Zeroes (stable, in place)
```js
function moveZeroes(nums) {
  let write = 0;
  for (let read = 0; read < nums.length; read++)
    if (nums[read] !== 0) [nums[write], nums[read]] = [nums[read], nums[write]], write++;
  return nums;
}
```
**O(n) / O(1).** The read/write two-pointer is a pattern in itself — reuse it for "remove element".

### Majority Element — Boyer–Moore
```js
function majorityElement(nums) {
  let candidate = null, count = 0;
  for (const n of nums) {
    if (count === 0) candidate = n;
    count += (n === candidate) ? 1 : -1;
  }
  return candidate;
}
```
**O(n) / O(1).** Pairing off every non-majority element with a majority one leaves the majority standing.

### Merge Sorted Array (in place, into `nums1`)
```js
function merge(nums1, m, nums2, n) {
  let i = m - 1, j = n - 1, k = m + n - 1;
  while (j >= 0) nums1[k--] = (i >= 0 && nums1[i] > nums2[j]) ? nums1[i--] : nums2[j--];
  return nums1;
}
```
**O(m+n) / O(1).** Fill from the **back** so you never overwrite unread data.

### Rotate Array by k
```js
function rotate(nums, k) {
  k %= nums.length;
  const reverse = (l, r) => { while (l < r) [nums[l], nums[r]] = [nums[r], nums[l]], l++, r--; };
  reverse(0, nums.length - 1); reverse(0, k - 1); reverse(k, nums.length - 1);
  return nums;
}
```
**O(n) / O(1).** Reverse-all, then reverse each part — a classic worth memorising.

---

## 2. Prefix sums

> **Cue:** repeated "sum of a range" or "count subarrays summing to K".
> `prefix[j] - prefix[i]` is the sum of `(i, j]` in O(1).

### Subarray Sum Equals K
```js
function subarraySum(nums, k) {
  const seen = new Map([[0, 1]]);      // prefix sum 0 has occurred once (empty prefix)
  let sum = 0, count = 0;
  for (const n of nums) {
    sum += n;
    count += seen.get(sum - k) || 0;   // how many earlier prefixes make this window = k
    seen.set(sum, (seen.get(sum) || 0) + 1);
  }
  return count;
}
```
**O(n) / O(n).** The `[[0, 1]]` seed is what makes subarrays starting at index 0 count — it's
the detail everyone forgets. Note sliding window does **not** work here: negatives break monotonicity.

### Range Sum Query (immutable)
```js
class NumArray {
  constructor(nums) {
    this.prefix = [0];
    for (const n of nums) this.prefix.push(this.prefix.at(-1) + n);
  }
  sumRange(i, j) { return this.prefix[j + 1] - this.prefix[i]; }
}
```
**O(n) build / O(1) query.**

---

## 3. Two pointers

> **Cue:** the array is **sorted** (or you can sort it), and you're looking for a pair/triple,
> or you're converging from both ends. Sorting first is usually allowed — say so out loud.

### Two Sum II (sorted input)
```js
function twoSumSorted(nums, target) {
  let l = 0, r = nums.length - 1;
  while (l < r) {
    const sum = nums[l] + nums[r];
    if (sum === target) return [l + 1, r + 1];
    sum < target ? l++ : r--;          // too small → raise left; too big → lower right
  }
  return [];
}
```
**O(n) / O(1).**

### 3Sum (all unique triplets summing to 0)
```js
function threeSum(nums) {
  nums.sort((a, b) => a - b);
  const res = [];
  for (let i = 0; i < nums.length - 2; i++) {
    if (nums[i] > 0) break;                        // sorted: no way back to 0
    if (i > 0 && nums[i] === nums[i - 1]) continue; // skip duplicate anchors
    let l = i + 1, r = nums.length - 1;
    while (l < r) {
      const sum = nums[i] + nums[l] + nums[r];
      if (sum < 0) l++;
      else if (sum > 0) r--;
      else {
        res.push([nums[i], nums[l], nums[r]]);
        while (l < r && nums[l] === nums[l + 1]) l++;   // skip duplicate pairs
        while (l < r && nums[r] === nums[r - 1]) r--;
        l++; r--;
      }
    }
  }
  return res;
}
```
**O(n²) / O(1)** extra. The duplicate-skipping is the whole difficulty — walk through it slowly.

### Container With Most Water
```js
function maxArea(height) {
  let l = 0, r = height.length - 1, best = 0;
  while (l < r) {
    best = Math.max(best, Math.min(height[l], height[r]) * (r - l));
    height[l] < height[r] ? l++ : r--;    // move the SHORTER wall — the only way to improve
  }
  return best;
}
```
**O(n) / O(1).** Justify the move rule: width always shrinks, so height must have a chance to grow.

### Trapping Rain Water
```js
function trap(height) {
  let l = 0, r = height.length - 1, leftMax = 0, rightMax = 0, total = 0;
  while (l < r) {
    if (height[l] < height[r]) {
      leftMax = Math.max(leftMax, height[l]);
      total += leftMax - height[l];   // left side is the binding constraint
      l++;
    } else {
      rightMax = Math.max(rightMax, height[r]);
      total += rightMax - height[r];
      r--;
    }
  }
  return total;
}
```
**O(n) / O(1).** Water above a bar = `min(maxLeft, maxRight) − height`. Because we advance the
smaller side, the max on that side is *known* to be the binding one.

### Remove Duplicates from Sorted Array
```js
function removeDuplicates(nums) {
  let write = 1;
  for (let read = 1; read < nums.length; read++)
    if (nums[read] !== nums[read - 1]) nums[write++] = nums[read];
  return write;                          // new logical length
}
```
**O(n) / O(1).**

### Sort Colors — Dutch national flag
```js
function sortColors(nums) {
  let low = 0, mid = 0, high = nums.length - 1;
  while (mid <= high) {
    if (nums[mid] === 0)      [nums[low], nums[mid]] = [nums[mid], nums[low]], low++, mid++;
    else if (nums[mid] === 2) [nums[high], nums[mid]] = [nums[mid], nums[high]], high--; // don't mid++
    else mid++;
  }
  return nums;
}
```
**O(n) / O(1), one pass.** Don't advance `mid` after a swap with `high` — the incoming value is unseen.

---

## 4. Sliding window

> **Cue:** "longest / shortest / max sum **contiguous** subarray or substring satisfying X".
> Grow the window with `right`; shrink from `left` while the constraint is violated.
> **Requires non-negative values** for sum-based variants.

### Fixed window — max sum of size k
```js
function maxSumK(nums, k) {
  let sum = 0;
  for (let i = 0; i < k; i++) sum += nums[i];
  let best = sum;
  for (let i = k; i < nums.length; i++) {
    sum += nums[i] - nums[i - k];       // add entering, remove leaving
    best = Math.max(best, sum);
  }
  return best;
}
```
**O(n) / O(1).**

### Longest Substring Without Repeating Characters
```js
function lengthOfLongestSubstring(s) {
  const lastSeen = new Map();
  let left = 0, best = 0;
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    if (lastSeen.has(c) && lastSeen.get(c) >= left) left = lastSeen.get(c) + 1;
    lastSeen.set(c, right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}
```
**O(n) / O(min(n, charset)).** The `>= left` check matters — a stale index outside the window
must be ignored, or `left` jumps backwards.

### Longest Repeating Character Replacement (≤ k changes)
```js
function characterReplacement(s, k) {
  const count = new Map();
  let left = 0, maxFreq = 0, best = 0;
  for (let right = 0; right < s.length; right++) {
    count.set(s[right], (count.get(s[right]) || 0) + 1);
    maxFreq = Math.max(maxFreq, count.get(s[right]));
    while (right - left + 1 - maxFreq > k) {     // chars needing replacement exceed k
      count.set(s[left], count.get(s[left]) - 1);
      left++;
    }
    best = Math.max(best, right - left + 1);
  }
  return best;
}
```
**O(n) / O(1).** Window is valid when `size − mostFrequentCount ≤ k`.

### Minimum Window Substring (hard — but very common)
```js
function minWindow(s, t) {
  if (!t || !s || s.length < t.length) return '';
  const need = new Map();
  for (const c of t) need.set(c, (need.get(c) || 0) + 1);

  let required = need.size, formed = 0, left = 0;
  let best = [Infinity, 0, 0];
  const window = new Map();

  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    window.set(c, (window.get(c) || 0) + 1);
    if (need.has(c) && window.get(c) === need.get(c)) formed++;

    while (formed === required) {                 // valid → try to shrink
      if (right - left + 1 < best[0]) best = [right - left + 1, left, right];
      const lc = s[left];
      window.set(lc, window.get(lc) - 1);
      if (need.has(lc) && window.get(lc) < need.get(lc)) formed--;
      left++;
    }
  }
  return best[0] === Infinity ? '' : s.slice(best[1], best[2] + 1);
}
```
**O(|s| + |t|) / O(charset).** Track `formed` (distinct chars fully satisfied) rather than
re-comparing whole maps — that's what keeps it linear.

### Find All Anagrams / Permutation in String
```js
function findAnagrams(s, p) {
  if (s.length < p.length) return [];
  const need = new Array(26).fill(0), win = new Array(26).fill(0);
  const idx = c => c.charCodeAt(0) - 97;
  for (const c of p) need[idx(c)]++;

  const res = [];
  for (let i = 0; i < s.length; i++) {
    win[idx(s[i])]++;
    if (i >= p.length) win[idx(s[i - p.length])]--;      // slide
    if (i >= p.length - 1 && need.every((v, j) => v === win[j])) res.push(i - p.length + 1);
  }
  return res;
}
```
**O(26n) = O(n) / O(1).**

### Max Consecutive Ones III (flip at most k zeros)
```js
function longestOnes(nums, k) {
  let left = 0, zeros = 0, best = 0;
  for (let right = 0; right < nums.length; right++) {
    if (nums[right] === 0) zeros++;
    while (zeros > k) { if (nums[left] === 0) zeros--; left++; }
    best = Math.max(best, right - left + 1);
  }
  return best;
}
```
**O(n) / O(1).**

---

## 5. Strings

> **Cue:** most string problems are an array pattern in disguise — two pointers, sliding
> window, or a frequency map. In JS, remember strings are **immutable**: build with an array
> and `join('')` rather than `+=` in a loop.

### Valid Palindrome (alphanumeric only)
```js
function isPalindrome(s) {
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  let l = 0, r = clean.length - 1;
  while (l < r) if (clean[l++] !== clean[r--]) return false;
  return true;
}
```
**O(n) / O(n)** — O(1) space if you two-pointer the original and skip non-alphanumerics inline.

### Longest Palindromic Substring — expand around centre
```js
function longestPalindrome(s) {
  let start = 0, maxLen = 0;
  const expand = (l, r) => {
    while (l >= 0 && r < s.length && s[l] === s[r]) l--, r++;
    if (r - l - 1 > maxLen) { maxLen = r - l - 1; start = l + 1; }
  };
  for (let i = 0; i < s.length; i++) { expand(i, i); expand(i, i + 1); } // odd + even centres
  return s.slice(start, start + maxLen);
}
```
**O(n²) / O(1).** Two `expand` calls per index covers odd- and even-length palindromes.

### Palindromic Substrings (count)
```js
function countSubstrings(s) {
  let count = 0;
  const expand = (l, r) => { while (l >= 0 && r < s.length && s[l] === s[r]) count++, l--, r++; };
  for (let i = 0; i < s.length; i++) { expand(i, i); expand(i, i + 1); }
  return count;
}
```
**O(n²) / O(1).** Same skeleton — recognise it and you get both problems free.

### Valid Parentheses
```js
function isValid(s) {
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  for (const c of s) {
    if (c in pairs) { if (stack.pop() !== pairs[c]) return false; }
    else stack.push(c);
  }
  return stack.length === 0;              // leftover openers = invalid
}
```
**O(n) / O(n).**

### Longest Common Prefix
```js
function longestCommonPrefix(strs) {
  if (!strs.length) return '';
  let prefix = strs[0];
  for (const s of strs) {
    while (!s.startsWith(prefix)) prefix = prefix.slice(0, -1);
    if (!prefix) return '';
  }
  return prefix;
}
```
**O(total chars) / O(1).**

### Isomorphic Strings
```js
function isIsomorphic(s, t) {
  if (s.length !== t.length) return false;
  const forward = new Map(), backward = new Map();
  for (let i = 0; i < s.length; i++) {
    if (forward.has(s[i]) && forward.get(s[i]) !== t[i]) return false;
    if (backward.has(t[i]) && backward.get(t[i]) !== s[i]) return false;
    forward.set(s[i], t[i]); backward.set(t[i], s[i]);
  }
  return true;
}
```
**O(n) / O(1).** Two maps — the mapping must be a bijection, not just one-way.

### Reverse Words in a String
```js
const reverseWords = s => s.trim().split(/\s+/).reverse().join(' ');
```
**O(n) / O(n).**

### String Compression (run-length, in place)
```js
function compress(chars) {
  let write = 0, read = 0;
  while (read < chars.length) {
    const c = chars[read];
    let count = 0;
    while (read < chars.length && chars[read] === c) read++, count++;
    chars[write++] = c;
    if (count > 1) for (const d of String(count)) chars[write++] = d;
  }
  return write;
}
```
**O(n) / O(1).** Counts above 9 must be written digit by digit — the trap in this one.

### First Unique Character
```js
function firstUniqChar(s) {
  const freq = new Map();
  for (const c of s) freq.set(c, (freq.get(c) || 0) + 1);
  for (let i = 0; i < s.length; i++) if (freq.get(s[i]) === 1) return i;
  return -1;
}
```
**O(n) / O(1).**

---

## 6. Binary search

> **Cue:** sorted input, **or** the phrase "minimum/maximum value such that…" — that second one
> is *binary search on the answer* and it's the version interviewers actually use.
> Use `while (l <= r)` for exact-match, `while (l < r)` for boundary-finding.

### Classic
```js
function search(nums, target) {
  let l = 0, r = nums.length - 1;
  while (l <= r) {
    const mid = l + Math.floor((r - l) / 2);   // avoids overflow in other languages
    if (nums[mid] === target) return mid;
    nums[mid] < target ? l = mid + 1 : r = mid - 1;
  }
  return -1;
}
```
**O(log n) / O(1).**

### First and Last Position of an element
```js
function searchRange(nums, target) {
  const bound = isLower => {
    let l = 0, r = nums.length, ans = -1;
    while (l < r) {
      const mid = (l + r) >> 1;
      if (nums[mid] === target) { ans = mid; isLower ? r = mid : l = mid + 1; }
      else if (nums[mid] < target) l = mid + 1;
      else r = mid;
    }
    return ans;
  };
  return [bound(true), bound(false)];
}
```
**O(log n) / O(1).** Don't stop at the first hit — keep narrowing toward the edge you want.

### Search in Rotated Sorted Array
```js
function searchRotated(nums, target) {
  let l = 0, r = nums.length - 1;
  while (l <= r) {
    const mid = (l + r) >> 1;
    if (nums[mid] === target) return mid;
    if (nums[l] <= nums[mid]) {                        // left half is sorted
      (nums[l] <= target && target < nums[mid]) ? r = mid - 1 : l = mid + 1;
    } else {                                           // right half is sorted
      (nums[mid] < target && target <= nums[r]) ? l = mid + 1 : r = mid - 1;
    }
  }
  return -1;
}
```
**O(log n) / O(1).** One half is always sorted — identify which, then decide if the target lies inside it.

### Find Minimum in Rotated Sorted Array
```js
function findMin(nums) {
  let l = 0, r = nums.length - 1;
  while (l < r) {
    const mid = (l + r) >> 1;
    nums[mid] > nums[r] ? l = mid + 1 : r = mid;   // compare to RIGHT, not left
  }
  return nums[l];
}
```
**O(log n) / O(1).** Comparing against `nums[r]` handles the non-rotated case for free.

### Koko Eating Bananas — binary search on the answer
```js
function minEatingSpeed(piles, h) {
  const hoursNeeded = k => piles.reduce((sum, p) => sum + Math.ceil(p / k), 0);
  let l = 1, r = Math.max(...piles);
  while (l < r) {
    const mid = (l + r) >> 1;
    hoursNeeded(mid) <= h ? r = mid : l = mid + 1;   // feasible → try slower
  }
  return l;
}
```
**O(n log max) / O(1).** **The template to memorise:** define a monotonic `feasible(x)` predicate,
then binary search the smallest `x` where it's true. Ship-capacity, split-array and
minimise-max problems are all this.

### Search a 2D Matrix (rows sorted, each row starts after the previous ends)
```js
function searchMatrix(matrix, target) {
  const rows = matrix.length, cols = matrix[0].length;
  let l = 0, r = rows * cols - 1;
  while (l <= r) {
    const mid = (l + r) >> 1;
    const val = matrix[Math.floor(mid / cols)][mid % cols];   // treat as one flat array
    if (val === target) return true;
    val < target ? l = mid + 1 : r = mid - 1;
  }
  return false;
}
```
**O(log(m·n)) / O(1).**

---

## 7. Stack & monotonic stack

> **Cue:** "next greater / previous smaller element", nested structure, or you need to undo
> recent work. A **monotonic** stack (kept increasing or decreasing) answers all next-greater
> family questions in O(n).

### Min Stack — O(1) getMin
```js
class MinStack {
  constructor() { this.stack = []; this.mins = []; }
  push(x) {
    this.stack.push(x);
    this.mins.push(this.mins.length ? Math.min(x, this.mins.at(-1)) : x);
  }
  pop() { this.mins.pop(); return this.stack.pop(); }
  top() { return this.stack.at(-1); }
  getMin() { return this.mins.at(-1); }
}
```
**O(1) all ops / O(n).** A parallel stack of "min so far at this depth".

### Daily Temperatures — monotonic decreasing stack
```js
function dailyTemperatures(temps) {
  const res = new Array(temps.length).fill(0);
  const stack = [];                             // holds INDICES, decreasing temperature
  for (let i = 0; i < temps.length; i++) {
    while (stack.length && temps[i] > temps[stack.at(-1)]) {
      const j = stack.pop();
      res[j] = i - j;                           // i is j's next warmer day
    }
    stack.push(i);
  }
  return res;
}
```
**O(n) / O(n).** Each index is pushed and popped at most once — that's why it's linear despite the inner loop.

### Next Greater Element (circular)
```js
function nextGreaterElements(nums) {
  const n = nums.length, res = new Array(n).fill(-1), stack = [];
  for (let i = 0; i < 2 * n; i++) {             // two passes simulate the wrap-around
    const cur = nums[i % n];
    while (stack.length && cur > nums[stack.at(-1)]) res[stack.pop()] = cur;
    if (i < n) stack.push(i);
  }
  return res;
}
```
**O(n) / O(n).**

### Evaluate Reverse Polish Notation
```js
function evalRPN(tokens) {
  const stack = [];
  const ops = {
    '+': (a, b) => a + b, '-': (a, b) => a - b,
    '*': (a, b) => a * b, '/': (a, b) => Math.trunc(a / b),   // trunc, not floor (negatives)
  };
  for (const t of tokens) {
    if (t in ops) { const b = stack.pop(), a = stack.pop(); stack.push(ops[t](a, b)); }
    else stack.push(Number(t));
  }
  return stack[0];
}
```
**O(n) / O(n).** Order matters: pop `b` before `a`.

### Largest Rectangle in Histogram (hard)
```js
function largestRectangleArea(heights) {
  const stack = [];                 // indices with increasing heights
  let best = 0;
  for (let i = 0; i <= heights.length; i++) {
    const h = i === heights.length ? 0 : heights[i];   // sentinel flushes the stack
    while (stack.length && heights[stack.at(-1)] >= h) {
      const height = heights[stack.pop()];
      const left = stack.length ? stack.at(-1) + 1 : 0;
      best = Math.max(best, height * (i - left));
    }
    stack.push(i);
  }
  return best;
}
```
**O(n) / O(n).** When a bar is popped, the current index is its right boundary and the new stack
top is its left — so its maximal rectangle is known exactly then.

---

## 8. Matrix

### Rotate Image 90° in place
```js
function rotateImage(matrix) {   // LeetCode calls it rotate(); renamed here to avoid the clash
  const n = matrix.length;
  for (let i = 0; i < n; i++)                        // transpose
    for (let j = i + 1; j < n; j++)
      [matrix[i][j], matrix[j][i]] = [matrix[j][i], matrix[i][j]];
  for (const row of matrix) row.reverse();           // then mirror each row
  return matrix;
}
```
**O(n²) / O(1).** Transpose + reverse rows = clockwise. Reverse rows first = anticlockwise.

### Spiral Matrix
```js
function spiralOrder(matrix) {
  const res = [];
  let top = 0, bottom = matrix.length - 1, left = 0, right = matrix[0].length - 1;
  while (top <= bottom && left <= right) {
    for (let j = left; j <= right; j++) res.push(matrix[top][j]); top++;
    for (let i = top; i <= bottom; i++) res.push(matrix[i][right]); right--;
    if (top <= bottom) { for (let j = right; j >= left; j--) res.push(matrix[bottom][j]); bottom--; }
    if (left <= right) { for (let i = bottom; i >= top; i--) res.push(matrix[i][left]); left++; }
  }
  return res;
}
```
**O(m·n) / O(1) extra.** The two `if` guards prevent re-reading a single remaining row or column.

### Set Matrix Zeroes (O(1) space)
```js
function setZeroes(matrix) {
  const rows = matrix.length, cols = matrix[0].length;
  let firstColZero = false;
  for (let i = 0; i < rows; i++) {
    if (matrix[i][0] === 0) firstColZero = true;
    for (let j = 1; j < cols; j++)
      if (matrix[i][j] === 0) matrix[i][0] = matrix[0][j] = 0;   // use row 0 / col 0 as flags
  }
  for (let i = rows - 1; i >= 0; i--) {          // fill bottom-up so flags survive
    for (let j = cols - 1; j >= 1; j--)
      if (matrix[i][0] === 0 || matrix[0][j] === 0) matrix[i][j] = 0;
    if (firstColZero) matrix[i][0] = 0;
  }
  return matrix;
}
```
**O(m·n) / O(1).** The first row and column double as the marker arrays; `firstColZero` resolves
the overlap at `[0][0]`.

---

## 9. Bit manipulation

> **Cue:** "without extra space", "appears once/twice", powers of two, or subsets of a small set.
> `x & (x-1)` clears the lowest set bit; `x ^ x === 0`; `1 << i` is the i-th bit.

```js
// Single Number — every element appears twice except one.  O(n)/O(1)
const singleNumber = nums => nums.reduce((a, b) => a ^ b, 0);

// Number of 1 Bits (Hamming weight).  O(set bits)
function hammingWeight(n) {
  let count = 0;
  while (n) { n &= n - 1; count++; }     // clears the lowest set bit each time
  return count;
}

// Counting Bits 0..n — DP on bits.  O(n)/O(n)
function countBits(n) {
  const dp = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) dp[i] = dp[i >> 1] + (i & 1);
  return dp;
}

// Missing Number in 0..n.  O(n)/O(1)
function missingNumber(nums) {
  let x = nums.length;
  for (let i = 0; i < nums.length; i++) x ^= i ^ nums[i];
  return x;
}

// Power of two
const isPowerOfTwo = n => n > 0 && (n & (n - 1)) === 0;

// Reverse 32 bits
function reverseBits(n) {
  let res = 0;
  for (let i = 0; i < 32; i++) { res = (res << 1) | (n & 1); n >>>= 1; }
  return res >>> 0;                      // >>> 0 forces unsigned in JS
}
```

> **JS caveat worth saying out loud:** bitwise operators coerce to **32-bit signed** integers,
> so they break above 2³¹−1. Use `>>> 0` for unsigned results, or `BigInt` for wider values.

---

## 10. Sorting

Know the properties even if you never implement them — "which sort and why" is a common follow-up.

| Algorithm | Time (avg / worst) | Space | Stable | Note |
|---|---|---|---|---|
| Merge sort | O(n log n) / O(n log n) | O(n) | ✅ | Predictable; the choice for linked lists |
| Quicksort | O(n log n) / O(n²) | O(log n) | ❌ | Fastest in practice; worst case on bad pivots |
| Heapsort | O(n log n) / O(n log n) | O(1) | ❌ | In-place, but poor cache behaviour |
| Counting/bucket | O(n + k) | O(k) | ✅ | Only for a small bounded key range |
| `Array.prototype.sort` | O(n log n) | — | ✅ | V8 uses TimSort; **stable since ES2019** |

```js
function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = arr.length >> 1;
  const left = mergeSort(arr.slice(0, mid)), right = mergeSort(arr.slice(mid));
  const out = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) out.push(left[i] <= right[j] ? left[i++] : right[j++]);
  return out.concat(left.slice(i), right.slice(j));   // `<=` keeps it stable
}

function quickSort(arr, lo = 0, hi = arr.length - 1) {
  if (lo >= hi) return arr;
  const pivot = arr[hi];
  let i = lo;
  for (let j = lo; j < hi; j++)
    if (arr[j] < pivot) [arr[i], arr[j]] = [arr[j], arr[i]], i++;
  [arr[i], arr[hi]] = [arr[hi], arr[i]];
  quickSort(arr, lo, i - 1); quickSort(arr, i + 1, hi);
  return arr;
}
```

---

## Pattern cheat sheet

Read this the hour before a coding round. The skill being tested is **mapping the question to a
pattern in the first 60 seconds**.

| The question says… | Reach for | Typical cost |
|---|---|---|
| "find a pair / duplicate / count of" | Hash map or Set | O(n) |
| "sum of a range", "subarrays summing to k" | Prefix sums (+ map) | O(n) |
| sorted array, find a pair/triple | Two pointers | O(n) / O(n²) |
| "longest/shortest **contiguous**" | Sliding window | O(n) |
| sorted, or "minimum X such that…" | Binary search (on index or answer) | O(log n) |
| "next greater/smaller element" | Monotonic stack | O(n) |
| "top k" / "k-th largest" | Heap, or bucket sort | O(n log k) / O(n) |
| "all combinations/permutations/subsets" | Backtracking | O(2ⁿ) / O(n!) |
| grid, connected regions | BFS / DFS / union-find | O(m·n) |
| "shortest path, unweighted" | BFS | O(V+E) |
| dependency or ordering | Topological sort | O(V+E) |
| "number of ways" / "min-max cost", overlapping subproblems | DP | O(n·states) |
| "in place", "no extra space" | Two pointers, or bit tricks | O(1) space |
| prefix / autocomplete on words | Trie | O(word length) |

**Interview-day habits** (from [dsa-6-month-plan.md](../dsa-6-month-plan.md)):
narrate the approach *before* coding · state brute force, then optimise · give complexity
unprompted · test on one normal case and one edge case (empty, single element, all-same, negatives)
before you say "done".

---

Next: [10-coding-structures-dp.md](10-coding-structures-dp.md) · Back to [INDEX.md](INDEX.md)
