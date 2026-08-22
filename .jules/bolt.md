## 2024-08-22 - Precomputing day keys for loop performance
**Learning:** In React grid or table components, avoid calling `date-fns` `format()` or similar expensive string parsing inside nested loops (e.g., O(Users * Days)). Precompute this static column data into an array of objects using `useMemo` to reduce calculation overhead to O(Days).
**Action:** Extract day calculations outside the render loop.
