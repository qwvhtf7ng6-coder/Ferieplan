## 2025-02-27 - [Optimize department capacity calculation]
**Learning:** Nested loops containing Array.prototype.some (e.g., O(Departments * Requests * Users)) in React components (like CalendarGrid) cause significant performance bottlenecks.
**Action:** Pre-compute user-to-department relationships into a Map<string, string[]> for fast O(1) lookups, reducing time complexity to O(Departments * Users + Requests) and greatly improving rendering speed.
