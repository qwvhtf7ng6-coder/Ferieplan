## 2026-09-03 - Nested Loops in Calendar Grid
**Learning:** Computing department capacities with a nested loop and `Array.some` check for each request across each department results in an O(Departments * Requests * Users) complexity, causing significant UI lag on large datasets.
**Action:** Use a `Map<string, string[]>` mapping user IDs to an array of department IDs before the loop to precompute memberships, reducing the time complexity to O(Requests + Departments * Users).
