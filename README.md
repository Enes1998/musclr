# musclr

A cross-platform (iOS · Android · Web) evidence-based gym app: log workouts, see undertrained/overtrained muscles on a 3D body, get an AI coach grounded **only** in sports-science evidence, and track macro **+ micro** nutrition with AI gap analysis.

This README is the single source of truth for getting the project running and understanding how it's built. It reflects the **actual current state** of the repo (not aspirational features). Where something is planned-but-not-built, it says so explicitly.

---

## Table of contents

1. [TL;DR quick start](#1-tldr-quick-start)
2. [What your computer needs (prerequisites)](#2-what-your-computer-needs-prerequisites)
3. [Recommended IDE & extensions](#3-recommended-ide--extensions)
4. [How to run each part](#4-how-to-run-each-part)
5. [Environment variables](#5-environment-variables)
6. [Repository layout](#6-repository-layout)
7. [Architecture (technical deep-dive)](#7-architecture-technical-deep-dive)
8. [The shared core (`@musclr/core`) in detail](#8-the-shared-core-musclrcore-in-detail)
9. [Data flow & key design rules](#9-data-flow--key-design-rules)
10. [Testing & verification](#10-testing--verification)
11. [Current status — what exists vs. what's planned](#11-current-status--what-exists-vs-whats-planned)
12. [Conventions & "load-bearing" decisions](#12-conventions--load-bearing-decisions)
13. [Known gotchas](#13-known-gotchas)
14. [Roadmap (what to build next)](#14-roadmap-what-to-build-next)
15. [Glossary](#15-glossary)

---

## 1. TL;DR quick start

```bash
# 0. Prereqs: Node 20+ and pnpm 10+ (see section 2)
corepack enable                      # gives you pnpm

# 1. Install everything (one command for the whole monorepo)
pnpm install

# 2. Verify the codebase is healthy
pnpm test            # unit tests (core + backend)
pnpm typecheck       # type-check every package

# 3. Run the pieces (each in its own terminal)
pnpm --filter backend dev            # API on http://localhost:8787
pnpm --filter web dev                # Web app on http://localhost:3000
pnpm --filter @musclr/mobile start   # Expo dev server (scan QR with Expo Go)
```

Open **http://localhost:3000** → you should see the landing page, `/log`, `/summary` (3D heatmap + AI coach), and `/nutrition`. The AI coach and food search work against the backend with **no API keys** (a deterministic fallback + USDA's public `DEMO_KEY`).

---

## 2. What your computer needs (prerequisites)

| Need | Version | Notes |
|---|---|---|
| **Node.js** | **≥ 20.19** (LTS or newer; 22/24 fine) | The whole stack is Node/TypeScript. |
| **pnpm** | **≥ 10** | The package manager. Easiest install: `corepack enable` (ships with Node). Repo is pinned to `pnpm@10.33.2`. |
| **Git** | any recent | Source control. |

That's all you need for **web + backend + running the unit tests**. Everything else below is only for specific tasks.

### Extra, only for the **mobile app**
| Task | Need |
|---|---|
| Iterate quickly on a real phone | **Expo Go** app (iOS App Store / Google Play) — scan the QR from `expo start`. |
| Run an Android emulator | **Android Studio** (SDK + an AVD). |
| Run an iOS simulator | **macOS + Xcode** (Xcode 26.4 for SDK 56; iOS 16.4+). iOS builds are **macOS-only**. |
| Build store binaries / use native modules not in Expo Go | **EAS CLI** (`npm i -g eas-cli`) + an **Expo account**. The 3D-heatmap WebView works in Expo Go; a dev-client build is only needed once you add a native module that isn't bundled in Expo Go. |
| Submit to the stores | **Apple Developer** account + **Google Play Developer** account. |

### Extra, only for the **default hosted AI** (optional)
- A **Google Cloud project** with **Vertex AI** enabled + `gcloud` Application Default Credentials (`gcloud auth application-default login`), and the AI-SDK provider packages installed (see [section 4 → backend](#backend-musclr-api)). Without this, the backend serves a deterministic, evidence-grounded **mock** plan, so the app is fully usable for development.

### Platform notes
- **Windows**: everything runs (the project was built and verified on Windows 11). Use PowerShell or Git Bash. iOS simulator is the only thing you can't do (Apple restriction) — use a physical iPhone via Expo Go, or build iOS via EAS cloud.
- **macOS / Linux**: same commands; macOS additionally unlocks the iOS simulator.

---

## 3. Recommended IDE & extensions

**VS Code** (or Cursor) is recommended. Install these extensions:

- **ESLint** — linting.
- **Prettier** — formatting.
- **Tailwind CSS IntelliSense** — autocompletion for web (Tailwind) and mobile (NativeWind) classes.
- **Expo Tools** — Expo/React Native helpers for `apps/mobile`.
- **Vitest** (optional) — run/debug unit tests inline.

WebStorm/IntelliJ also work well (first-class TS/React/RN support). Whatever you use, make sure it picks up the **workspace TypeScript** version (`typescript@~6.0`) so types resolve across packages.

---

## 4. How to run each part

All commands run from the **repo root** unless noted. `pnpm --filter <name>` targets one package. Package names: `@musclr/core`, `@musclr/tokens`, `@musclr/viewer3d`, `web`, `@musclr/mobile`, `backend`.

### Backend (`musclr` API)

Hono server (Node, run via `tsx`). Serves the AI relay + nutrition proxies.

```bash
pnpm --filter backend dev      # tsx watch, hot reload, http://localhost:8787
# or
pnpm --filter backend start    # one-shot
pnpm --filter backend test     # unit tests
```

Smoke-test it:
```bash
curl http://localhost:8787/health
curl -X POST http://localhost:8787/api/ai -H "Content-Type: application/json" \
  -d '{"goal":"hypertrophy","loads":{"chest":20,"back":80}}'
curl "http://localhost:8787/api/nutrition/search?q=greek%20yogurt"
```

- Works **out of the box** (no keys): `/api/ai` returns a deterministic, evidence-grounded plan; nutrition search uses USDA's `DEMO_KEY`.
- To enable **live LLMs**, install the optional AI-SDK packages and set keys (see [section 5](#5-environment-variables)):
  ```bash
  pnpm --filter backend add ai @ai-sdk/google-vertex @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google @ai-sdk/openai-compatible
  ```

### Web (`apps/web`)

Next.js 15 (App Router) + Tailwind. The primary web product.

```bash
pnpm --filter web dev       # http://localhost:3000
pnpm --filter web build     # production build (also a type/SSG check)
pnpm --filter web start     # serve the production build
pnpm --filter web typecheck
```

Routes: `/` (landing), `/log` (workout logger), `/summary` (3D heatmap + AI coach), `/nutrition` (macro/micro tracker + AI advice). It talks to the backend at `NEXT_PUBLIC_API_URL` (default `http://localhost:8787`), so run the backend too for the AI/nutrition features.

### Mobile (`apps/mobile`)

Expo SDK 56 (React Native) + expo-router + NativeWind. Targets iOS + Android (and a web build used as a CI/compile gate).

```bash
pnpm --filter @musclr/mobile start          # Expo dev server; press i/a or scan QR in Expo Go
pnpm --filter @musclr/mobile android        # open Android emulator
pnpm --filter @musclr/mobile ios            # open iOS simulator (macOS only)
pnpm --filter @musclr/mobile export:web     # compile gate: bundles all RN screens via Metro
pnpm --filter @musclr/mobile typecheck
```

- For the AI/nutrition features on a **physical device**, the phone can't reach `localhost` — set `EXPO_PUBLIC_API_URL` to your computer's **LAN IP** (e.g. `http://192.168.1.20:8787`) in `apps/mobile/.env`.
- Store builds: `eas build -p ios|android` then `eas submit` (needs EAS + store accounts).

#### Android development workflow (VS Code + Android Studio)

`apps/mobile` is a React Native (Expo) app — you **write the code in VS Code** (TypeScript/React); Android Studio is used as the **Android toolbox** (SDK + emulator + Logcat/native debugging), not as the editor. Do **not** start a separate native project in Android Studio — that abandons the shared iOS/web/core codebase.

One-time setup:
1. Install **Android Studio** → *SDK Manager*: install the Android SDK Platform + platform-tools, and a system image; create an emulator (*Device Manager* → AVD).
2. Set `ANDROID_HOME` and add `platform-tools` to your `PATH` (Android Studio shows the SDK path under *Settings → Languages & Frameworks → Android SDK*).

Run it (from VS Code's terminal):
```bash
pnpm --filter @musclr/mobile start     # then press "a" to launch on the Android emulator
# or
pnpm --filter @musclr/mobile android   # boots the AVD and installs the app
```
- **No Android Studio needed** for a physical phone: install **Expo Go**, run `expo start`, scan the QR (same Wi-Fi).
- **Open Android Studio's IDE** only for deeper native work — after `npx expo prebuild` (generates a real `android/` Gradle project you can open directly), or to debug native crashes / view Logcat.

### Whole-monorepo commands (Turborepo)

```bash
pnpm test         # run tests in every package that has them
pnpm typecheck    # type-check every package
pnpm build        # build every buildable package
pnpm lint         # lint
pnpm dev          # runs the dev task in ALL packages at once (web+backend+mobile) — usually run them separately
```

### Regenerating the exercise catalog

The 865-exercise dataset is generated from the public-domain `free-exercise-db`:
```bash
node scripts/build-exercise-catalog.mjs   # rewrites packages/core/src/data/exerciseCatalog.generated.ts
```

### Regenerating the 3D muscle model + mobile viewer

The segmented ~40-muscle model is generated from the `@musclr/core` taxonomy (no external asset):
```bash
pnpm --filter @musclr/viewer3d build:model   # → packages/viewer3d/model/model.glb + apps/web/public/model.glb (+ manifest)
pnpm --filter @musclr/viewer3d build:viewer  # → apps/mobile/assets/viewer.html (three.js + GLB inlined, offline)
pnpm --filter @musclr/viewer3d build:3d      # both, in order
```
Run `build:3d` whenever you change the muscle taxonomy (`packages/core/src/muscles.ts`) or the viewer (`packages/viewer3d/src/`). The vitest drift-guard (`packages/viewer3d/src/meshMap.test.ts`) fails CI if the model and taxonomy diverge.

---

## 5. Environment variables

None are required for local development. Optional overrides:

**Backend** (`backend/.env` or shell):
| Var | Default | Purpose |
|---|---|---|
| `PORT` | `8787` | API port. |
| `USDA_API_KEY` | `DEMO_KEY` | USDA FoodData Central key. `DEMO_KEY` is rate-limited; get a free key at fdc.nal.usda.gov for real use. |
| `ALLOWED_ORIGINS` | `*` | CORS allow-list (comma-separated) for production. |
| `OFF_USER_AGENT` | `musclr/0.1 (dev)` | Required by Open Food Facts. |
| `GOOGLE_VERTEX_PROJECT` | — | GCP project for the default hosted Gemini provider. |
| `GOOGLE_VERTEX_LOCATION` | `us-central1` | Vertex region. |

**Web** (`apps/web/.env.local`): `NEXT_PUBLIC_API_URL` (default `http://localhost:8787`).

**Mobile** (`apps/mobile/.env`): `EXPO_PUBLIC_API_URL` (default `http://localhost:8787`; use a LAN IP on a real device).

> User-supplied LLM keys (OpenAI/Anthropic/Gemini) are **never** put in env files — they live in `expo-secure-store` on device / encrypted per-user, and are passed per-request. The hosted default uses Vertex ADC, not a key in code.

---

## 6. Repository layout

```
musclr/
├─ package.json            # workspace root (pnpm + turbo scripts)
├─ pnpm-workspace.yaml     # workspaces: packages/*, apps/*, backend
├─ turbo.json              # task graph (build/test/typecheck/lint/dev)
├─ tsconfig.base.json      # shared TS compiler options
├─ scripts/
│  └─ build-exercise-catalog.mjs   # regenerates the exercise dataset
│
├─ packages/
│  ├─ core/        @musclr/core      ← all domain logic (pure TS, framework-agnostic)
│  ├─ tokens/      @musclr/tokens    ← design tokens (colors/fonts/spacing) + JSON entry
│  └─ viewer3d/    @musclr/viewer3d  ← the three.js muscle-heatmap module
│
├─ apps/
│  ├─ web/         (Next.js 15)      ← web app: /, /log, /summary, /nutrition
│  └─ mobile/      (Expo SDK 56)     ← iOS/Android app: Log/Summary/Nutrition tabs
│
├─ backend/        (Hono on Node)    ← API: /api/ai, /api/nutrition/*
│
└─ frontend/       ⚠ LEGACY          ← the original Vite prototype. Superseded by apps/web,
                                       NOT part of the pnpm workspace. Kept for reference;
                                       safe to delete once nothing is mined from it.
```

---

## 7. Architecture (technical deep-dive)

### The one-sentence model
**Share the core, fork the UI.** All durable, hard-to-write logic lives in framework-agnostic TypeScript packages; the web (Next.js) and mobile (Expo) apps are thin, platform-appropriate UIs over that core; a small backend handles things a client can't (hosted AI credentials, API keys, cross-origin proxies).

### Why split web (Next.js) and mobile (Expo) instead of one codebase?
A real web presence needs SSR/SSG, SEO, and Core Web Vitals that react-native-web can't match, while native needs true RN. Rather than compromise both, we **duplicate the (cheap) UI layer and share the (expensive) logic layer**. The shared packages are where reuse actually pays off, and they make the clients — and even the 3D renderer — swappable implementation details.

### The pieces

- **`@musclr/core`** — the brain. No React, no DOM, no React Native. Pure functions + data + types. Imported by web, mobile, **and** the backend so the exact same scoring/validation/grounding runs everywhere. (Details in [section 8](#8-the-shared-core-musclrcore-in-detail).)

- **`@musclr/tokens`** — the design system as data (dark palette, the green→yellow→red muscle-load scale, fonts, spacing). Exposed two ways: a typed TS module (for app code) and a **`@musclr/tokens/json`** subpath (for Tailwind/NativeWind config, which can't load raw `.ts`). One source of truth → web and mobile look identical.

- **`@musclr/viewer3d`** — one three.js/WebGL implementation of the muscle heatmap (`createMuscleViewer(container, { modelUrl })`): loads a GLB, recolors meshes by a `{ muscleId: score }` map, OrbitControls. Used **directly on web** and **embedded via `react-native-webview` on mobile** — so there's a single 3D codebase with browser-grade stability (no fragile native-GL dependency). The mesh→muscle map is the documented "swap point" for upgrading the model.

- **`apps/web`** (Next.js 15) — App Router routes, Tailwind via the shared tokens, imports `viewer3d` directly. Client state via Zustand + `localStorage`.

- **`apps/mobile`** (Expo SDK 56) — expo-router tabs, NativeWind via the shared tokens, embeds `viewer3d` in a WebView. State via Zustand + AsyncStorage.

- **`backend`** (Hono on Cloud Run-ready Node) — `POST /api/ai` (build the grounded prompt → call a provider → validate against the schema + evidence bounds → one repair retry → return), and `/api/nutrition/{search,barcode,advice}` (proxy USDA FoodData Central + Open Food Facts; generate gap-driven nutrition advice). The AI relay has a deterministic **mock** fallback so it works with zero configuration; real providers (Vertex/OpenAI/Anthropic/Gemini/local Ollama) plug in via lazily-loaded AI-SDK adapters.

### Tech stack at a glance
| Layer | Tech |
|---|---|
| Language | TypeScript everywhere |
| Monorepo | pnpm workspaces + Turborepo |
| Web | Next.js 15 (App Router, React 19) + Tailwind v3 |
| Mobile | Expo SDK 56 (RN 0.85, React 19.2, New Arch) + expo-router + NativeWind v4 |
| 3D | three.js 0.184 (web native + WebView on mobile) |
| State | Zustand (+ persist: localStorage on web, AsyncStorage on mobile) |
| Backend | Hono + `@hono/node-server`, run via `tsx` |
| AI | Vercel AI SDK (multi-provider) + Zod schemas; deterministic mock fallback |
| Validation | Zod (AI plan schema) |
| Tests | Vitest |
| Data | USDA FoodData Central (CC0), Open Food Facts (ODbL), free-exercise-db (Unlicense) |

---

## 8. The shared core (`@musclr/core`) in detail

Every module is pure TypeScript with unit tests. Import anything from the barrel: `import { computeMuscleLoad, deriveTargets } from '@musclr/core'`.

| Module | What it provides |
|---|---|
| `exercises.ts` | Domain types (`MuscleId`, `Exercise`, `WorkoutEntry`, `WeekData`, `DayId`), the 11 muscle **groups**, the original 33 hand-tuned exercises, and `SAMPLE_WEEK` seed data. |
| `exerciseDb.ts` | **865 exercises** ingested from free-exercise-db and mapped onto the muscle taxonomy; `ALL_EXERCISES`, `findExercise`, `searchExercises`, `exercisesForMuscle`, and the muscle-vocabulary crosswalk. |
| `muscles.ts` | The **~42-leaf anatomical taxonomy** (`MuscleLeafId`) layered over the 11 coarse groups, with mesh IDs (`m_*`), region grouping, and rollup/expand helpers for the 3D model. |
| `scoring.ts` | **`computeMuscleLoad`** — the frozen, parity-locked muscle-load math (0–100 per muscle) + `scoreToColor` / `scoreLabel`. **Do not change the math** (tests pin it). |
| `validation.ts` | Workout-entry validation + trusted day/week totals. |
| `history.ts` | Date-based `TrainingSession` history + rolling-window projection into the scoring engine. |
| `evidence.ts` | The **versioned, citable evidence module**: training principles with numeric bounds + DOIs, RP volume landmarks (MEV/MAV/MRV), and **guardrails** that reject out-of-bounds or uncited AI prescriptions. |
| `nutrition.ts` | `NutrientKey`/`NutrientVector`, DRI/RDA/UL tables, Mifflin–St Jeor targets, the deterministic **flag engine** (low/ok/high/over_ul/unknown), and the **USDA → NutrientVector** mapper. |
| `ai.ts` | The **AI gateway contract**: a strict Zod plan schema, the evidence-grounded prompt builder, plan grounding-validation, and the provider-kind types. |
| `health.ts` | The unified `HealthProvider` interface + normalized wearable data model + dedup/readiness logic (used by the planned wearables integration). |
| `program.ts` | Generated-program types (shared by the AI plan schema). |
| `storage.ts` / `profiles.ts` | Platform-agnostic key/value storage interface + named workout "profiles". |

**Principle:** deterministic logic (scoring, nutrient flags, evidence bounds) is computed and validated in `core`; the LLM only *explains and recommends*. The model must return a schema-valid object whose numbers fall inside cited evidence bounds, or it's rejected/repaired.

---

## 9. Data flow & key design rules

**A typical request (AI coach):**
```
apps/web or apps/mobile
  → computeMuscleLoad(week)               # in @musclr/core, on the client
  → POST /api/ai { goal, loads }          # to backend
      → buildPlanPrompt(...)              # @musclr/core: inject evidence module
      → provider (mock | Vertex | BYO | local)   # Vercel AI SDK generateObject
      → generatedPlanSchema.safeParse + validateGeneratedPlan   # @musclr/core guardrails
      → (one repair retry if invalid)
  ← { plan, meta }                         # schema-valid, grounded, cited
  → rendered in the UI
```

**Where the AI runs (by necessity):**
- **hosted / default** → backend (Vertex via ADC) — credentials stay server-side.
- **BYO cloud key** → device-direct on mobile / backend-proxy on web.
- **local agent** (Ollama / LM Studio) → device-direct only (the cloud can't reach your `localhost`).

**Nutrition flow:** client computes `deriveTargets(profile)` + `computeDailyStatus(consumed, targets)` (flags) in `core`; food data comes from the backend's USDA/OFF proxy; the AI only writes the prose advice.

**Hard rules:**
- The **scoring math is frozen** (parity tests guard it). Wearables/recovery data may *enrich* recommendations but never modify the scoring.
- Missing nutrient data is **`unknown`**, never treated as a deficiency.
- Every AI prescription must cite an evidence `principle.id` and stay within its numeric bounds.

---

## 10. Testing & verification

```bash
pnpm test            # Vitest across core (73 tests) + backend (6 tests) = 79
pnpm typecheck       # tsc --noEmit across all 6 packages
pnpm --filter web build                  # web prod build + SSG (a real compile check)
pnpm --filter @musclr/mobile export:web  # mobile: Metro/react-native-web compile gate
```

What the tests pin: scoring parity (same inputs → same scores), evidence guardrails (reject out-of-bounds/uncited plans), nutrition flags (incl. sodium-CDRR & magnesium-supplement edge cases), Mifflin–St Jeor targets, health dedup (cross-source workouts collapse; SDNN≠RMSSD never mixed), USDA mapping, and the deterministic AI/nutrition mock outputs.

**On-device mobile verification** (the 3D WebView heatmap, gestures, persistence, backend-over-LAN) is **manual** — run `expo start` with Expo Go, or an EAS dev-client build, on a real phone.

---

## 11. Current status — what exists vs. what's planned

The 8 original product asks, mapped to reality (all built features are **verified on web**; mobile mirrors them and compiles, with on-device checks pending a device):

| # | Feature | Status |
|---|---|---|
| 1 | Exercise tracking (iOS/Android/web) | ✅ Web done · 📱 Mobile screens built + compiling |
| 2 | 3D model showing under/over-trained muscles | ✅ Web (live WebGL) · ✅ mobile via WebView (the **real** three.js viewer + segmented GLB, inlined into one offline `viewer.html`) |
| 3 | Model split per medical anatomy | ✅ ~42-muscle **taxonomy** + a **segmented ~40-muscle GLB** (one named mesh per leaf, `m_<leafId>`) generated in-repo by `scripts/build-muscle-model.mjs` — first-party (no external/CC-BY-SA asset); the heatmap colors individual heads (e.g. anterior vs. lateral delt) |
| 4 | Exercises matched to muscles | ✅ 865 exercises crosswalked to the taxonomy |
| 5 | AI for ChatGPT/Claude/Gemini keys + local + default hosted | ✅ Gateway + relay with the AI-SDK provider packages installed; BYO-key **Settings** UI on web + mobile (key in `expo-secure-store` on device); deterministic mock works keyless; anti-abuse (rate-limit + optional Supabase-JWT/Turnstile) on the LLM routes |
| 6 | Suggestions based ONLY on scientific evidence | ✅ Evidence module + grounding + guardrails |
| 7 | Macro + micro tracker | ✅ USDA-backed search, macros + ~20 micros vs DRI targets |
| 8 | AI nutrition advice (lacking/overdone) | ✅ Gap-driven advice with food sources |

**Build state:** `@musclr/core`, `@musclr/tokens`, `@musclr/viewer3d`, `apps/web` (4 routes), `backend`, and `apps/mobile` (3 screens) are all implemented, typecheck-clean, and compile. 79 unit tests pass.

**Not built yet** (see [Roadmap](#14-roadmap-what-to-build-next)): the anatomically-segmented GLB; the real three.js single-file `viewer.html` for the mobile WebView; live-AI provider wiring/keys; accounts + offline-first sync (Supabase + PowerSync); wearables runtime (Apple Health / Health Connect / Whoop / Garmin / …); barcode scanner UI; production hardening (RevenueCat, Sentry, PostHog, CI/CD); store release.

---

## 12. Conventions & "load-bearing" decisions

- **One app, all platforms.** Every feature ships to `apps/web` **and** `apps/mobile` in the same session/PR. Features siloed to one platform are incomplete. See `CLAUDE.md` at the repo root for the canonical rule and feature parity table.
- **`frontend/` is dead.** The root-level `frontend/` directory is an archived Vite prototype — not in the pnpm workspace, not run by Turborepo. Never develop there; start `apps/web` instead.
- **TypeScript, strict, everywhere.** Shared logic has **no** React/DOM/RN imports so it stays portable (and so Metro can type-strip it).
- **Frozen scoring math** in `scoring.ts` — change it and parity tests fail by design.
- **Tokens are the single source of truth** for styling; never hardcode colors. Use the `@musclr/tokens/json` entry in Tailwind/NativeWind configs (raw `.ts` won't load there).
- **The 3D model is a swappable asset** loaded by `viewer3d`; upgrading it = a new GLB + updating the mesh→muscle map, no app code changes.
- **The LLM never decides facts.** Flags, scores, and bounds are computed in `core`; the model explains within those bounds and must cite.
- **`pnpm --filter <pkg>`** to act on one package; **Turborepo** runs tasks across the graph with caching.

---

## 13. Known gotchas

- **pnpm + Expo:** NativeWind's transitive `react-native-css-interop` is declared as a direct dep of `apps/mobile` so Metro resolves it. For **native EAS builds** you may additionally need `node-linker=hoisted` in a root `.npmrc` (not required for the JS/web compile path).
- **Tailwind can't load raw `.ts`:** mobile/web Tailwind configs `require('@musclr/tokens/json')`, not the TS module (Tailwind's `jiti` loader can't resolve cross-package `.ts`).
- **Device can't reach `localhost`:** set `EXPO_PUBLIC_API_URL` to your machine's LAN IP for on-device AI/nutrition.
- **USDA `DEMO_KEY`** is rate-limited — fine for dev, get a free key for real usage.
- **Two lockfiles warning** from Next: there's a stray `package-lock.json` in some home dirs; `apps/web/next.config.mjs` pins `outputFileTracingRoot` to silence it.
- **Legacy `frontend/`** is the old Vite prototype, not part of the workspace — don't confuse it with `apps/web`.
- **iOS WebView WebGL** can drop its GL context on backgrounding — the (future) real three.js `viewer.html` must handle `webglcontextlost`/`restored`.

---

## 14. Roadmap (what to build next)

The full phased plan lives in `~/.claude/plans/finish-this-app-for-async-rossum.md`. Near-term, highest-leverage items:

1. ✅ **Real 3D viewer for mobile** — `viewer3d` is bundled (esbuild) into a single offline `viewer.html` (three.js + GLB inlined as base64) replacing the placeholder; on-demand render + WebGL context-loss recovery for iOS. Regenerate: `pnpm --filter @musclr/viewer3d build:viewer`. *(On-device visual check still recommended.)*
2. ✅ **Anatomically-segmented GLB** — a ~40-muscle model (one named mesh per taxonomy leaf) is generated in-repo by `scripts/build-muscle-model.mjs` (`pnpm --filter @musclr/viewer3d build:model`), replacing the 10-region prototype. A vitest drift-guard ties the model ↔ the taxonomy. First-party geometry → no CC-BY-SA obligation.
3. ✅ **Live AI** — AI-SDK provider packages installed; BYO-key **Settings** screen (web `/settings` + mobile Settings tab) with provider/model/key/local-URL + "Test connection"; rate-limit + optional Supabase-JWT/Turnstile anti-abuse on the relay. Set keys per `docs/CREDENTIALS.md`; the keyless mock still works for dev.
4. **Accounts + sync** — Supabase (Postgres + Auth) + PowerSync for offline-first multi-device sync.
5. **Wearables** — Apple Health + Health Connect (on-device), then Whoop/Garmin/Fitbit/Oura (cloud OAuth via the backend).
6. **Production hardening** — RevenueCat (subscriptions), Sentry (errors), PostHog (analytics/flags), GitHub Actions + EAS CI/CD.
7. **Store release** — EAS build/submit to the App Store + Play Store; deploy web + backend.

---

## 15. Glossary

- **MuscleId / muscle group** — the 11 coarse groups scoring works in (chest, back, …).
- **Muscle leaf / taxonomy** — the ~42 individually-named muscles the 3D model is (to be) segmented into; each rolls up to a group.
- **Evidence module** — the versioned, cited knowledge base (volume landmarks, rep ranges, recovery, protein targets) the AI must ground in.
- **Volume landmarks (MEV/MAV/MRV)** — minimum-effective / maximum-adaptive / maximum-recoverable weekly sets per muscle.
- **DRI / RDA / UL** — Dietary Reference Intakes / Recommended Daily Allowance / Tolerable Upper Limit (nutrition targets).
- **Grounding / guardrails** — the requirement that AI output cite evidence and stay within cited numeric bounds, enforced in code.
- **Dev client** — a custom Expo build that includes native modules not present in Expo Go.

---

*musclr — evidence-based training, visualized.*
