## 2024-05-14 - Performance Bottleneck Discovery
**Learning:** Found O(N * M) lookup inside useMemo deptCapacity computation in CalendarGrid component where N = departments, M = requests, and it further checks inside `requests` an O(K) lookup `dept.users.some(u => u.id === req.user.id)`. This can be optimized by preprocessing user to department mapping.
**Action:** Replace `!dept.users.some(...)` nested loop with an O(1) Set or Map lookup for faster computation.
