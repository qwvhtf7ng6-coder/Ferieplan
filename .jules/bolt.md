## 2024-05-24 - [Optimize CalendarGrid department capacity calculation]
**Learning:** The nested loops calculating department capacity performed repeated date parsing and array scans O(Departments * Requests * Users), causing unnecessary CPU overhead.
**Action:** Pre-calculate user-to-department mappings to allow single-pass processing of requests, avoiding repeated inner loop calculations.
