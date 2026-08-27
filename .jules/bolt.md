## 2024-03-01 - Avoid format() in nested loops
**Learning:** Calling date-fns `format()` inside nested loops (O(Users * Days)) like in React grids causes significant performance overhead.
**Action:** Precompute static column data like formatted date strings into an array of objects using `useMemo` to reduce calculation overhead to O(Days).
