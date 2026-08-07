## 2024-06-11 - Database capacity checking in NextJS action N+1 query
**Learning:** Found an N+1 query inside a loop resolving concurrent department limits on vacation requests (`checkCapacity`).
**Action:** Always check loop constructs processing multi-day array parameters (like `entries: {date: Date}[]`). Group those checks into a single `findMany` using an `in: dates` clause, and aggregate via a map structure in JS/TS.
