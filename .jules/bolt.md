## 2024-06-25 - Avoid N+1 Queries in Prisma
**Learning:** Found an N+1 query loop in `checkCapacity` (actions/manager.ts) where a separate `prisma.vacationRequestEntry.count()` was performed for every date in a vacation request.
**Action:** Replace sequential Prisma counts within a `for` loop with a single `findMany` using `{ in: dates }`, and group/count the results in memory.
