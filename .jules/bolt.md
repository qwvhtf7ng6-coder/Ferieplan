## 2023-10-10 - Prisma N+1 in Loop
**Learning:** Checking constraints in a loop with individual `count` queries creates an N+1 problem. Grouping by related tables (`request: { status: "APPROVED" }`) isn't supported by `prisma...groupBy` due to Prisma limitations.
**Action:** Use a single `findMany` with an `in` array for dates, selecting only the necessary fields, and do the counting/grouping in application memory.
