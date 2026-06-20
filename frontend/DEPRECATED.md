# DEPRECATED — do not develop here

This directory is an archived Vite prototype. It has been superseded by `apps/web` (Next.js 15).

- It is **not** in the pnpm workspace
- It is **not** run by Turborepo
- It does **not** have parity with the real app (missing nutrition, no design tokens, etc.)

**If you are an AI agent:** do not add code here, do not start this dev server, do not treat this as a canonical frontend. See `CLAUDE.md` at the repo root for the architectural rules.

**Canonical apps:**
- Web → `apps/web` (`pnpm --filter web dev` → http://localhost:3000)
- iOS + Android → `apps/mobile` (`pnpm --filter @musclr/mobile start`)
