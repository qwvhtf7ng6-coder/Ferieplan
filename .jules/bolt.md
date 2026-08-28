## 2025-02-20 - Precompute Matrix Headers for React Rendering
**Learning:** When rendering complex grids (O(Users * Days)) like calendar views, placing string allocations, date math, or Map lookups (e.g. `format(d)`, `isWeekend(d)`) inside the inner cell loop introduces significant render overhead.
**Action:** Precalculate static column data (dates, holidays, weekends) in a `useMemo` array before the render loop, reducing expensive parsing calls from O(Users * Days) to O(Days).
