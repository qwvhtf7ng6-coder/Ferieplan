## 2024-05-18 - Precomputing static strings in React mapped arrays
**Learning:** In components rendering dense tables or grids (like CalendarGrid), executing date parsing logic (like `format()`) inside heavily nested loops runs O(Rows * Columns) times.
**Action:** When a table header or cell loop uses static row or column values, always map the array in advance inside a `useMemo` block to generate custom objects with the precomputed values. Map over these precomputed objects during rendering to reduce complexity to O(Columns) or O(Rows).
