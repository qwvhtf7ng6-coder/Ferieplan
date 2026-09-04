## 2025-03-02 - Avoiding string operations in tight React loops
**Learning:** Calling `date-fns` `format()` or string operations like `d.toISOString().slice(0, 10)` inside deeply nested loops (e.g., O(Users * Days)) in grid components severely bottlenecks React render performance.
**Action:** Always precompute static column data (like formatted date strings and weekend booleans) into an array of objects using `useMemo` before mapping over rows, reducing the complexity to O(Days).
