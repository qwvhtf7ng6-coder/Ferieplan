## 2024-07-29 - N+1 Query in Check Capacity
**Learning:** Found a severe N+1 query issue in Next.js Server Actions when checking vacation request capacity. Looping `prisma.count` over dates results in O(N) database queries which slows down request approval and capacity checks significantly for longer requests.
**Action:** When calculating daily aggregations in Prisma involving relationship filters (which blocks the usage of `groupBy`), retrieve the dates using a single `date: { in: dates }` query and compute the frequency offline using an in-memory Map.
