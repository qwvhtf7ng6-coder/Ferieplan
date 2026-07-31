## 2024-05-19 - N+1 Loop in nested vacation structures
**Learning:** The `checkCapacity` method exhibited an N+1 query pattern by looping through nested arrays of vacation dates and running `prisma.vacationRequestEntry.count()` inside the loop, meaning an N-day vacation caused N sequential database queries.
**Action:** When validating capacity limits against lists of dates, always use batch aggregate queries like `prisma.model.groupBy` to fetch all relevant aggregate stats at once and handle the logic in memory, avoiding N+1 queries.
