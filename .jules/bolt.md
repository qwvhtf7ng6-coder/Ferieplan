## 2026-08-25 - Prevent O(N*M) Date Parsing in React Grids
**Learning:** In React grid or table components, calling date-fns format() or similar expensive string parsing inside nested loops (e.g., O(Users * Days)) causes significant performance bottlenecks.
**Action:** Precompute this static column data into an array of objects using useMemo to reduce calculation overhead to O(Days).
