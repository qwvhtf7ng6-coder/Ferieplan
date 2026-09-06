## 2025-02-27 - O(N^3) Component Render Bottleneck Fixed with Hash Maps
**Learning:** Found a severely unoptimized nested loop in CalendarGrid deptCapacity calculation where it checked `!dept.users.some` inside a loop over all requests, inside a loop over all departments.
**Action:** When working with nested relation matching in frontend components, always pre-compute a Map<string, string[]> of the relationships first. This reduces the complexity to O(N).
