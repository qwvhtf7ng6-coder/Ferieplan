## 2023-10-25 - N+1 Issue in Aggregations
**Learning:** In `getAllVacationBalances`, `Promise.all` with individual `_sum` database queries inside a map caused an N+1 performance bottleneck. Grouping and filtering directly by relational fields within `groupBy` may be problematic in Prisma.
**Action:** Use `findMany` to fetch all necessary records across the user IDs and group the records in-memory using `reduce` for O(1) query performance and O(n) memory performance.
