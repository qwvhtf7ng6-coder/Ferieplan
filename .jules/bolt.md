
## 2025-07-06 - Replacing N+1 queries with Prisma groupBy
**Learning:** Found an N+1 query issue in backend actions where capacity checks were made in loops for each vacation day. This can be highly inefficient for long vacation requests (O(n) DB calls).
**Action:** Replaced the O(n) `.count()` queries in loops with a single O(1) `.groupBy()` query, which significantly cuts down on DB overhead and latency.
