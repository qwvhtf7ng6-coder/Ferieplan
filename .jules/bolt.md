## 2025-07-09 - N+1 in checkCapacity
**Learning:** Found N+1 query pattern in `checkCapacity` (in `actions/manager.ts`) where it queries `vacationRequestEntry.count` in a loop for each entry in a vacation request.
**Action:** Replace loop with single `groupBy` or `findMany` using `in: dates` to batch fetch counts.
