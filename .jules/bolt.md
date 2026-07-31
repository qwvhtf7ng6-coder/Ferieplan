## 2025-02-12 - Initial exploration
**Learning:** Understanding  rendering on dashboard. In  and , sorting of  array on every render: `const sortedEntries = [...request.entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());`
**Action:** The backend API already sorts  ascending by date (`entries: { orderBy: { date: 'asc' } }`). Sorting them again on the client is redundant and negatively impacts rendering performance, especially when there are many vacation requests displayed on a dashboard page. Remove the client-side sorting and just use  directly.
## 2024-07-08 - Client-side sorting on already sorted data
**Learning:** Found redundant array sorting in `components/RequestCard.tsx` and `components/manager/ManagerRequestRow.tsx`. The database query (`prisma.vacationRequest.findMany`) already specifies `entries: { orderBy: { date: "asc" } }`. Re-sorting these entries on the client for every render (`[...request.entries].sort(...)`) is unnecessary and causes performance overhead, particularly when multiple requests are displayed in a list.
**Action:** Remove client-side sorting and rely on the database-ordered array.
