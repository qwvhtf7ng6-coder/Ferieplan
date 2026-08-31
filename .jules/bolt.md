## 2023-10-27 - [Optimized department capacity calculation in CalendarGrid]
**Learning:** Nested loops checking user-department relationships (e.g., O(Departments * Requests * Users)) in frontend components can cause significant performance bottlenecks.
**Action:** Use a Map<string, string[]> to precompute the relationship between user IDs and their associated department IDs, reducing the time complexity and handling users with multiple departments functionally.
