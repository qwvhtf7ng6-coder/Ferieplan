## 2024-11-20 - Next.js Request Scope in Standalone Scripts
**Learning:** Testing Next.js functions (like actions) that rely on `auth()` or `headers()` via standalone scripts using `tsx` fails with "headers was called outside a request scope".
**Action:** When validating server actions, avoid standalone node scripts if they rely on request context. Use integration tests or verify via successful build/tsc.
