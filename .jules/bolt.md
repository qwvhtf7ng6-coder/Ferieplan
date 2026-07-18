## 2025-02-12 - N+1 Issue in checkCapacity resolved
**Learning:** Checking capacity for vacation requests originally issued N separate `count` queries in a loop, slowing down approval of multi-day requests. Prisma's `groupBy` doesn't efficiently support filtering on relational fields.
**Action:** Always fetch related aggregated data using a single `findMany` request combined with an in-memory Map structure for `O(1)` lookups whenever similar scenarios are encountered in actions.
