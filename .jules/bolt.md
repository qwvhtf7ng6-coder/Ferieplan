## 2024-05-24 - Precomputing formatted dates in Calendar Grid
**Learning:** In heavily nested render loops like a Calendar grid (Days × Departments × Users), operations like `date-fns/format` and `isWeekend` inside the innermost loop cause significant render blocking (O(N*M) complexity).
**Action:** Always precompute column-based derived data (like formatted date strings, weekend booleans, and localized weekday names) in a single O(N) pass before iterating over rows, especially in React components where these functions execute on every render.
