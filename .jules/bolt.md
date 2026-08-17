## 2025-02-18 - Optimized `deptCapacity` calculation in CalendarGrid
**Learning:** The `deptCapacity` useMemo in `components/CalendarGrid.tsx` used a heavily nested loop O(D * R * U) to aggregate approved request days per department. Using `Array.prototype.some` inside a double loop for a large dataset of requests and departments scales poorly.
**Action:** When aggregating relationships across lists (like requests to users to departments), build an intermediate hash map (e.g., mapping user ID to department IDs) to avoid O(n^3) or O(n^2) nested iterations, replacing them with O(1) map lookups.
