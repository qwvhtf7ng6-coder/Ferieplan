
## 2024-07-13 - [Prisma N+1 Query Fix]
**Learning:** Calling Prisma's aggregate/findMany functions within `Promise.all` inside `.map` loops for relational queries causes severe N+1 bottlenecks. Prisma's `groupBy` doesn't natively support filtering by relation fields, so the optimal approach is fetching all needed relational data in one bulk query using `in` and grouping/summing in memory.
**Action:** Always inspect array `.map` operations that involve database calls in `Promise.all`. Replace them with bulk queries (`userId: { in: userIds }`) and in-memory Maps to drastically reduce database roundtrips.
