## 2024-05-24 - Efficient Data Aggregation in React
**Learning:** Using multiple nested `Array.prototype.filter` and `Array.prototype.reduce` passes inside a `useMemo` on a large dataset creates an O(N^2) bottleneck that blocks the main thread.
**Action:** Replace multiple array passes with a single-pass O(N) iteration that groups data into a `Map`. Update components that aggregate data over large arrays to use efficient data structures early on.
