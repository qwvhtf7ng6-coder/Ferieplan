## 2025-02-18 - Prisma relation grouping workaround
**Learning:** Prisma's `groupBy` method does not directly support grouping by nested relation fields.
**Action:** Always fetch the necessary relation fields using a single bulk `findMany` query and perform grouping and aggregation using in-memory `Map` data structures.
