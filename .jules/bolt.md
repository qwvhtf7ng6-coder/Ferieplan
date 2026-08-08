## 2024-05-30 - N+1 Query in prisma with relation
**Learning:** Found an N+1 query issue in Next.js Prisma implementation where `getAllVacationBalances` used `Promise.all` over `users.map()` making multiple separate database requests.
**Action:** Replaced N+1 queries with a single query using Prisma's `findMany` along with `{ request: { userId: { in: userIds } } }` for relation filtering, and then aggregate in memory using a `Map`.
