## 2026-08-26 - [Optimize nested array lookup in CalendarGrid]
**Learning:** In React grid or table components, avoid calling array.some() or array.find() nested inside loops over days/requests. Precompute these lookup relationships into Maps (e.g., mapping user ID to an array of department IDs).
**Action:** Precompute user-to-departments map for O(1) lookups before the loop instead of O(D * R * U).
