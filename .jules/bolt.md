## 2025-02-20 - Precalculate format operations in React grids
**Learning:** Using `format` from date-fns inside nested loops (O(Users * Days)) in large grid components causes massive CPU overhead and blocks the main thread during render.
**Action:** Always precompute static column data (like formatted dates, weekends, holidays) into an array of objects at the component root using `useMemo` to turn O(N * M) operations into O(M).
