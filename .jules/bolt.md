## 2024-06-25 - Redundant Database Queries on Calendar Load
**Learning:** Next.js Server Components that fetch complex data objects (like calendar requests with entries) can inadvertently trigger redundant queries further down the component if derived sets (like cross-checking shift absences) are re-queried instead of aggregated in-memory from the initial load payload.
**Action:** Always check if the required data subset for conflict/cross-checking is already present in parallelly fetched arrays before issuing additional Prisma queries.
