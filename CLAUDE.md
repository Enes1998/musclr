# CLAUDE.md — Musclr Architecture Rules

> This file is loaded automatically by every Claude session. Read it before touching any code.

---

## One app, all platforms — the cardinal rule

Every feature ships to **both** canonical apps **in the same session**. No exceptions.

| Platform | App | Dev command |
|---|---|---|
| **Web** (browsers) | `apps/web` — Next.js 15 + React 19 + Tailwind | `pnpm --filter web dev` → http://localhost:3000 |
| **iOS + Android** | `apps/mobile` — Expo 56 + React Native + NativeWind | `pnpm --filter @musclr/mobile start` |

If you add a screen, route, or significant UI feature to one, you must add it to the other before closing out the task. A PR or session that ships to one platform only is incomplete by definition.

---

## `frontend/` is dead — never touch it

The `frontend/` directory at the repo root is an **archived Vite prototype**. It is:
- **NOT** in the pnpm workspace (`pnpm-workspace.yaml` lists `apps/*`, not `frontend/`)
- **NOT** built or run by Turborepo
- **NOT** to be developed further under any circumstances

Do not start its dev server. Do not add features to it. If you see it running on port 5173, stop it and start `apps/web` instead (`pnpm --filter web dev`, port 3000).

---

## How to run everything correctly

```bash
# Install (once)
pnpm install

# Backend — always run this for AI + nutrition features
pnpm --filter backend dev          # http://localhost:8787

# Web app (canonical web frontend)
pnpm --filter web dev              # http://localhost:3000

# Mobile app (iOS + Android)
pnpm --filter @musclr/mobile start # Expo dev server; press i/a or scan QR in Expo Go
```

Do **not** run `cd frontend && pnpm dev` — that starts the deprecated prototype.

---

## Shared-code-first rule

When adding domain logic (calculations, types, validation, data):

1. Put it in `@musclr/core` (`packages/core/src/`) first — pure TypeScript, no React, no DOM, no RN
2. Then write the thin UI layer in **both** `apps/web` and `apps/mobile`
3. If the logic must live server-side (API keys, external proxies), add it to `backend/src/`

Never duplicate business logic between the two apps. If the same calculation exists in two places, one is wrong.

---

## Design system

- All colors, fonts, and spacing come from `@musclr/tokens` (`packages/tokens/`)
- Web uses Tailwind (`tailwind.config.js` imports `@musclr/tokens/json`)
- Mobile uses NativeWind (same token source)
- Never hardcode a color or spacing value — use the token

---

## Feature parity table

This table is the source of truth. Both columns must be ✅ before any feature is considered shipped.

| Feature | `apps/web` | `apps/mobile` |
|---|---|---|
| Workout logger | ✅ `/log` | ✅ Log tab |
| 3D muscle heatmap | ✅ `/summary` | ✅ Summary tab (WebView) |
| AI coach | ✅ | ✅ |
| Nutrition tracker (macros + micros) | ✅ `/nutrition` | ✅ Nutrition tab |
| Barcode scanner + manual food entry | ✅ `/nutrition` (ZXing) | ✅ Nutrition tab (expo-camera) |
| AI provider settings (BYO keys) | ✅ `/settings` | ✅ Settings tab |
| Profile history / weekly snapshots | ✅ `/history` | ✅ History tab |
| Accessibility (colorblind palette, text alt, reduced motion) | ✅ `/settings` | ✅ Settings tab |
| Licenses / credits | ✅ `/licenses` | ✅ `/licenses` (stack) |
| i18n (en/es foundation) | ✅ | ✅ |
| Units (kg/lb) + RIR logging | ✅ `/log` | ✅ Log tab |
| Accounts + multi-device sync (Supabase) | ✅ `/settings` | ✅ Settings tab |

When you add a new feature, add a row. Both cells must be ✅ before you're done.

---

## Package names (for `pnpm --filter`)

| Directory | Package name |
|---|---|
| `apps/web` | `web` |
| `apps/mobile` | `@musclr/mobile` |
| `backend` | `backend` |
| `packages/core` | `@musclr/core` |
| `packages/tokens` | `@musclr/tokens` |
| `packages/viewer3d` | `@musclr/viewer3d` |
