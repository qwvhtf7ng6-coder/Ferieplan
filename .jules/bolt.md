## 2024-05-18 - N+1 Query in Prisma Loop
**Learning:** Found an N+1 query loop in `actions/manager.ts` inside `checkCapacity`. Instead of querying for each date, pulling all dates in one `findMany` using `{ in: dates }` and grouping in a JavaScript Map provides an O(1) query solution. This is specifically useful when verifying capacities across multiple distinct dates.
**Action:** Always check `for` loops in server actions for Prisma `count` or `findMany` calls, and replace them with a single `in` query paired with in-memory mapping.
