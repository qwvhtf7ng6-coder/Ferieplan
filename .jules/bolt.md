## 2023-10-27 - N+1 Query in Cron Jobs
**Learning:** Found a classic N+1 query loop in `app/api/cron/reminders/route.ts` where a DB query was executed for every pending request in a daily cron job.
**Action:** Lift the query outside the loop to fetch all required records in a single batch query, then use in-memory filtering (e.g., `Array.filter`) to process the records.
