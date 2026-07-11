## 2024-05-24 - Hidden N+1 Queries in Validation Loops
**Learning:** N+1 queries can be hidden in helper functions that iterate over requested entries (like dates) to validate constraints sequentially (e.g., checking capacity per date).
**Action:** When validating constraints against multiple inputs (like a range of requested dates), use `groupBy` and filter with `in` operators to batch database lookups instead of querying inside a loop.
