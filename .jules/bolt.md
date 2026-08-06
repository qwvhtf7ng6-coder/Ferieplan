## 2023-10-27 - [Prisma N+1 Optimization]
**Learning:** Prisma's count aggregation inside a loop leads to N+1 performance bottlenecks.
**Action:** Always fetch the target scope in one go using findMany and IN clauses, then aggregate in-memory instead of looping counts.
