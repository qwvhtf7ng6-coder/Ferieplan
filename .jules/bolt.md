## 2024-05-18 - Fast Date String Serialization
**Learning:** Dates serialized from Prisma/Next.js APIs to the frontend are strictly ISO 8601 formatted strings. Calling `new Date(dateStr).toISOString().slice(0, 10)` in React render loops is a massive performance bottleneck due to continuous object allocation and parsing overhead.
**Action:** Use string slicing `.substring(0, 10)` directly on the ISO string to avoid `Date` allocations entirely in hot paths.
