## 2024-05-24 - N+1 query inside checkCapacity loop
**Learning:** Found an anti-pattern in `actions/manager.ts` where Prisma queries (`count`) were run inside a loop iterating over vacation request dates. This causes N+1 queries for N days of vacation.
**Action:** When validating dates or items in a list against the database, fetch all relevant overlapping data in a single query using the `{ in: items }` operator before iterating over the items to validate them.
