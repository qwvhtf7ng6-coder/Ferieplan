## 2025-02-18 - Avoid committing workspace pollution
**Learning:** During test runs, temporary files like `pnpm-lock.yaml`, development scratchpads, and auto-modified files like `tsconfig.json` can be accidentally committed and taint a PR.
**Action:** Always carefully check `git status` before requesting a code review or submitting to ensure only intended files are staged, and explicitly clean up unneeded files.
