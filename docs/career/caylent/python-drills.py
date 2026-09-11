"""Python coding drills for the Caylent | BOT Consulting Software Engineer round.

Every solution here runs and is checked by the tests at the bottom:

    python3 docs/career/caylent/python-drills.py

The same code is embedded in interview-qa.md §4. If you edit a solution, edit it here
first, re-run, then copy it across.

Split: 1-8 are the classic patterns a coding round reaches for; 9-14 are the practical
"write me a utility" problems a cloud consultancy is more likely to ask (JSON flattening,
retry with backoff, batching, log aggregation, rate limiting, paginated APIs).
"""

from __future__ import annotations

import random
import re
import time
from collections import Counter, OrderedDict, defaultdict, deque
from collections.abc import Callable, Iterable, Iterator
from functools import wraps
from itertools import islice
from typing import Any, TypeVar

T = TypeVar("T")


# ---------------------------------------------------------------------------
# 1. Two Sum — hash map, O(n) time, O(n) space
# ---------------------------------------------------------------------------
def two_sum(nums: list[int], target: int) -> tuple[int, int] | None:
    seen: dict[int, int] = {}  # value -> index
    for i, n in enumerate(nums):
        if target - n in seen:
            return seen[target - n], i
        seen[n] = i
    return None


# ---------------------------------------------------------------------------
# 2. Group anagrams — defaultdict keyed on a canonical form, O(n * k log k)
# ---------------------------------------------------------------------------
def group_anagrams(words: list[str]) -> list[list[str]]:
    groups: defaultdict[str, list[str]] = defaultdict(list)
    for w in words:
        groups["".join(sorted(w))].append(w)
    return list(groups.values())


# ---------------------------------------------------------------------------
# 3. Top-K frequent — Counter.most_common is a heap under the hood, O(n log k)
# ---------------------------------------------------------------------------
def top_k_frequent(items: list[str], k: int) -> list[str]:
    return [item for item, _ in Counter(items).most_common(k)]


# ---------------------------------------------------------------------------
# 4. Valid parentheses — stack, O(n)
# ---------------------------------------------------------------------------
def is_valid_brackets(s: str) -> bool:
    pairs = {")": "(", "]": "[", "}": "{"}
    stack: list[str] = []
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
    return not stack


# ---------------------------------------------------------------------------
# 5. Longest substring without repeating characters — sliding window, O(n)
# ---------------------------------------------------------------------------
def longest_unique_substring(s: str) -> int:
    last_seen: dict[str, int] = {}
    start = best = 0
    for i, ch in enumerate(s):
        if last_seen.get(ch, -1) >= start:
            start = last_seen[ch] + 1  # jump past the previous copy
        last_seen[ch] = i
        best = max(best, i - start + 1)
    return best


# ---------------------------------------------------------------------------
# 6. Merge intervals — sort by start, then sweep, O(n log n)
# ---------------------------------------------------------------------------
def merge_intervals(intervals: list[tuple[int, int]]) -> list[tuple[int, int]]:
    merged: list[tuple[int, int]] = []
    for start, end in sorted(intervals):
        if merged and start <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
        else:
            merged.append((start, end))
    return merged


# ---------------------------------------------------------------------------
# 7. LRU cache — OrderedDict gives O(1) get/put with move_to_end + popitem
# ---------------------------------------------------------------------------
class LRUCache:
    def __init__(self, capacity: int) -> None:
        if capacity <= 0:
            raise ValueError("capacity must be positive")
        self.capacity = capacity
        self._data: OrderedDict[str, Any] = OrderedDict()

    def get(self, key: str) -> Any | None:
        if key not in self._data:
            return None
        self._data.move_to_end(key)  # mark as most recently used
        return self._data[key]

    def put(self, key: str, value: Any) -> None:
        if key in self._data:
            self._data.move_to_end(key)
        self._data[key] = value
        if len(self._data) > self.capacity:
            self._data.popitem(last=False)  # evict least recently used


# ---------------------------------------------------------------------------
# 8. Number of islands — BFS with deque, O(rows * cols)
# ---------------------------------------------------------------------------
def count_islands(grid: list[list[str]]) -> int:
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])
    seen: set[tuple[int, int]] = set()
    islands = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != "1" or (r, c) in seen:
                continue
            islands += 1
            queue = deque([(r, c)])
            seen.add((r, c))
            while queue:
                cr, cc = queue.popleft()
                for nr, nc in ((cr + 1, cc), (cr - 1, cc), (cr, cc + 1), (cr, cc - 1)):
                    if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == "1" and (nr, nc) not in seen:
                        seen.add((nr, nc))
                        queue.append((nr, nc))
    return islands


# ---------------------------------------------------------------------------
# 9. Flatten a nested dict/JSON into dotted keys — the everyday ETL task
# ---------------------------------------------------------------------------
def flatten(obj: dict[str, Any], parent: str = "", sep: str = ".") -> dict[str, Any]:
    flat: dict[str, Any] = {}
    for key, value in obj.items():
        path = f"{parent}{sep}{key}" if parent else key
        if isinstance(value, dict) and value:
            flat.update(flatten(value, path, sep))
        elif isinstance(value, list):
            for i, item in enumerate(value):
                item_path = f"{path}{sep}{i}"
                if isinstance(item, dict) and item:
                    flat.update(flatten(item, item_path, sep))
                else:
                    flat[item_path] = item
        else:
            flat[path] = value
    return flat


# ---------------------------------------------------------------------------
# 10. Retry decorator with exponential backoff + full jitter
#     (what you wrap around a throttled AWS / Bedrock call)
# ---------------------------------------------------------------------------
def retry(
    max_attempts: int = 5,
    base_delay: float = 0.2,
    max_delay: float = 5.0,
    retry_on: tuple[type[BaseException], ...] = (Exception,),
    sleep: Callable[[float], None] = time.sleep,
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    def decorator(fn: Callable[..., T]) -> Callable[..., T]:
        @wraps(fn)  # keeps fn.__name__ / __doc__ for logs and tracebacks
        def wrapper(*args: Any, **kwargs: Any) -> T:
            for attempt in range(max_attempts):
                try:
                    return fn(*args, **kwargs)
                except retry_on:
                    if attempt == max_attempts - 1:
                        raise  # out of attempts: surface the real error
                    # Full jitter: random point in [0, capped exponential]
                    sleep(random.uniform(0, min(max_delay, base_delay * 2**attempt)))
            raise AssertionError("unreachable")

        return wrapper

    return decorator


# ---------------------------------------------------------------------------
# 11. Batch any iterable into fixed-size chunks — lazily
#     (S3 delete_objects takes 1,000 keys; DynamoDB batch_write_item takes 25)
# ---------------------------------------------------------------------------
def batched(iterable: Iterable[T], size: int) -> Iterator[list[T]]:
    if size <= 0:
        raise ValueError("size must be positive")
    it = iter(iterable)
    while chunk := list(islice(it, size)):
        yield chunk


# ---------------------------------------------------------------------------
# 12. Log aggregation — top IPs and per-endpoint 5xx rate from access-log lines
# ---------------------------------------------------------------------------
LOG_LINE = re.compile(r'^(?P<ip>\S+) .* "(?P<method>[A-Z]+) (?P<path>\S+) [^"]*" (?P<status>\d{3})')


def summarise_logs(lines: Iterable[str], top_n: int = 3) -> dict[str, Any]:
    ips: Counter[str] = Counter()
    totals: Counter[str] = Counter()
    errors: Counter[str] = Counter()
    malformed = 0
    for line in lines:
        m = LOG_LINE.match(line)
        if not m:
            malformed += 1  # count, don't crash — real logs are dirty
            continue
        ips[m["ip"]] += 1
        endpoint = m["path"].split("?", 1)[0]
        totals[endpoint] += 1
        if m["status"].startswith("5"):
            errors[endpoint] += 1
    return {
        "top_ips": ips.most_common(top_n),
        "error_rate": {ep: round(errors[ep] / n, 3) for ep, n in totals.items()},
        "malformed": malformed,
    }


# ---------------------------------------------------------------------------
# 13. Token-bucket rate limiter — injectable clock so it's testable
# ---------------------------------------------------------------------------
class TokenBucket:
    def __init__(self, rate_per_sec: float, capacity: int, clock: Callable[[], float] = time.monotonic) -> None:
        self.rate = rate_per_sec
        self.capacity = capacity
        self.tokens = float(capacity)
        self.clock = clock
        self.updated = clock()

    def allow(self, cost: float = 1.0) -> bool:
        now = self.clock()
        self.tokens = min(self.capacity, self.tokens + (now - self.updated) * self.rate)
        self.updated = now
        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False


# ---------------------------------------------------------------------------
# 14. Consume a paginated API as one lazy stream — the boto3 NextToken shape
# ---------------------------------------------------------------------------
def paginate(fetch_page: Callable[[str | None], dict[str, Any]], items_key: str = "Items") -> Iterator[Any]:
    token: str | None = None
    while True:
        page = fetch_page(token)
        yield from page.get(items_key, [])
        token = page.get("NextToken")
        if not token:
            return


# ===========================================================================
# Tests — run this file directly
# ===========================================================================
def _tests() -> None:
    assert two_sum([2, 7, 11, 15], 9) == (0, 1)
    assert two_sum([3, 3], 6) == (0, 1)
    assert two_sum([1, 2], 7) is None

    groups = sorted(sorted(g) for g in group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))
    assert groups == [["ate", "eat", "tea"], ["bat"], ["nat", "tan"]]
    assert group_anagrams([]) == []

    assert top_k_frequent(["a", "b", "a", "c", "b", "a"], 2) == ["a", "b"]
    assert top_k_frequent([], 3) == []

    assert is_valid_brackets("({[]})") and is_valid_brackets("")
    assert not is_valid_brackets("(]") and not is_valid_brackets("((") and not is_valid_brackets(")")

    assert longest_unique_substring("abcabcbb") == 3
    assert longest_unique_substring("bbbbb") == 1
    assert longest_unique_substring("pwwkew") == 3
    assert longest_unique_substring("abba") == 2  # the start pointer must never move backwards
    assert longest_unique_substring("") == 0

    assert merge_intervals([(1, 3), (2, 6), (8, 10), (15, 18)]) == [(1, 6), (8, 10), (15, 18)]
    assert merge_intervals([(1, 4), (4, 5)]) == [(1, 5)]
    assert merge_intervals([(5, 6), (1, 10)]) == [(1, 10)]
    assert merge_intervals([]) == []

    lru = LRUCache(2)
    lru.put("a", 1)
    lru.put("b", 2)
    assert lru.get("a") == 1  # a is now most recent
    lru.put("c", 3)  # evicts b
    assert lru.get("b") is None and lru.get("a") == 1 and lru.get("c") == 3
    lru.put("a", 10)  # update existing key, no eviction
    assert lru.get("a") == 10 and lru.get("c") == 3

    grid = [list("11000"), list("11000"), list("00100"), list("00011")]
    assert count_islands(grid) == 3
    assert count_islands([]) == 0
    assert count_islands([list("000")]) == 0

    nested = {"user": {"id": 7, "tags": ["a", "b"], "addr": {"city": "Jaipur"}}, "ok": True, "empty": {}}
    assert flatten(nested) == {
        "user.id": 7,
        "user.tags.0": "a",
        "user.tags.1": "b",
        "user.addr.city": "Jaipur",
        "ok": True,
        "empty": {},
    }
    assert flatten({"a": [{"b": 1}]}) == {"a.0.b": 1}

    delays: list[float] = []
    calls = {"n": 0}

    @retry(max_attempts=4, retry_on=(ConnectionError,), sleep=delays.append)
    def flaky() -> str:
        calls["n"] += 1
        if calls["n"] < 3:
            raise ConnectionError("throttled")
        return "ok"

    assert flaky() == "ok" and calls["n"] == 3 and len(delays) == 2
    assert flaky.__name__ == "flaky"  # functools.wraps did its job
    assert all(0 <= d <= 5.0 for d in delays)

    @retry(max_attempts=3, retry_on=(ConnectionError,), sleep=lambda _: None)
    def always_fails() -> None:
        raise ConnectionError("down")

    try:
        always_fails()
        raise AssertionError("should have raised")
    except ConnectionError:
        pass

    @retry(max_attempts=3, retry_on=(ConnectionError,), sleep=lambda _: None)
    def bad_input() -> None:
        raise ValueError("not retryable")

    try:
        bad_input()
        raise AssertionError("should have raised")
    except ValueError:
        pass  # non-retryable errors propagate immediately

    assert list(batched(range(7), 3)) == [[0, 1, 2], [3, 4, 5], [6]]
    assert list(batched([], 3)) == []
    assert next(batched(iter(range(10**9)), 2)) == [0, 1]  # lazy: never materialises the range

    logs = [
        '10.0.0.1 - - [11/Sep/2026:10:00:00] "GET /api/orders?page=2 HTTP/1.1" 200 512',
        '10.0.0.2 - - [11/Sep/2026:10:00:01] "POST /api/orders HTTP/1.1" 500 12',
        '10.0.0.1 - - [11/Sep/2026:10:00:02] "GET /api/health HTTP/1.1" 200 2',
        '10.0.0.1 - - [11/Sep/2026:10:00:03] "GET /api/orders HTTP/1.1" 503 0',
        "garbage line",
    ]
    summary = summarise_logs(logs, top_n=2)
    assert summary["top_ips"] == [("10.0.0.1", 3), ("10.0.0.2", 1)]
    assert summary["error_rate"] == {"/api/orders": 0.667, "/api/health": 0.0}
    assert summary["malformed"] == 1

    now = {"t": 0.0}
    bucket = TokenBucket(rate_per_sec=2, capacity=2, clock=lambda: now["t"])
    assert bucket.allow() and bucket.allow() and not bucket.allow()  # burst of 2, then empty
    now["t"] = 0.5  # half a second refills 1 token
    assert bucket.allow() and not bucket.allow()
    now["t"] = 100.0  # refill is capped at capacity
    assert bucket.allow() and bucket.allow() and not bucket.allow()

    pages = {None: {"Items": [1, 2], "NextToken": "p2"}, "p2": {"Items": [3], "NextToken": "p3"}, "p3": {"Items": []}}
    assert list(paginate(lambda tok: pages[tok])) == [1, 2, 3]
    assert list(paginate(lambda tok: {"Items": []})) == []

    print("All 14 drills pass.")


if __name__ == "__main__":
    _tests()
