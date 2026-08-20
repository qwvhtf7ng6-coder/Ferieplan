## 2024-08-20 - Replace nested O(N²) loop with O(N) HashMap for Calendar Capacity
**Learning:** In frontend components with nested relations (e.g. mapping departments to requests via users), O(N²) array `.some()` scans scale poorly and cause main-thread latency. Reversing the relationship into a precomputed Map<string, string[]> (userId -> departmentIds) resolves this cleanly without regressions.
**Action:** Prioritize mapping relational data to O(1) lookups in memory via useMemo, specifically for capacity grids or complex views.
