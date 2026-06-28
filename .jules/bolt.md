## 2024-05-24 - N+1 Query in Vacation Balances
**Learning:** The \`getAllVacationBalances\` function executed N+1 queries when calculating used vacation days for all users in an organization due to a \`Promise.all(users.map(...))\` pattern using Prisma's aggregate function.
**Action:** Replace iterative Prisma queries within loops/Promise.all with a single batched \`findMany\` query using the \`in\` operator, and perform the aggregation in memory (e.g., using a Map).
