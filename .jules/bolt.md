## 2024-07-03 - N+1 query in checkCapacity
**Learning:** Checking capacity for vacation requests originally iterated over each requested entry sequentially using `prisma.vacationRequestEntry.count`, resulting in an N+1 issue for multi-day requests. This is because it performed a database query for each day individually.
**Action:** Replaced the `for` loop in `checkCapacity` with a single grouped query using `prisma.vacationRequestEntry.groupBy` and `date: { in: dates }` to fetch all concurrent requests for all dates in a single database roundtrip.
