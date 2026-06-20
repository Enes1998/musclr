# Resume guide — picking musclr back up

This is the single doc to read when you return. It tells you (1) exactly what to paste to continue,
(2) whether to use `/goal` or `/loop`, and (3) precisely what to set up on your side first, with
where to find each thing and where it goes.

---

## 0. Where the project is right now

- Branch `feat/cross-platform-foundation`. Everything below is **committed**.
- **Feature-complete** across web (`apps/web`), iOS+Android (`apps/mobile`), backend (`backend`),
  and shared packages (`@musclr/core`, `@musclr/viewer3d`, `@musclr/tokens`).
- Verified: **117 unit/contract tests + 5 Playwright E2E (real Chromium)** green; all 6 packages
  typecheck-clean; web prod build (10 routes) + prod server serving; mobile `expo export:web`
  compile gate; backend prod server (`golive-check` green); CI builds the Docker image.
- The app runs **fully today with zero credentials** (deterministic AI mock, USDA `DEMO_KEY`,
  on-device storage). Adding the credentials below flips features to **live**.
- What is NOT done (and cannot be without you): deploying to your cloud/stores, activating your
  secret keys, and running on your physical devices. That's what the setup below unlocks.

Quick local sanity check any time:
```bash
pnpm install && pnpm test && pnpm typecheck
pnpm --filter backend dev      # http://localhost:8787
pnpm --filter web dev          # http://localhost:3000
pnpm --filter @musclr/mobile start   # Expo (scan QR in Expo Go)
node scripts/golive-check.mjs  # reports which integrations are live
```

---

## 1. The prompt to paste tomorrow

**Do NOT re-run the maximalist `/goal`** from before. That goal's success condition included
"deployed to the app stores / live in production," which depends on *your* accounts, devices, and
Apple/Google review — so the stop-hook can never mark it done and it loops forever. Use a plain
prompt (recommended), or a *scoped* goal that is actually satisfiable.

### Recommended (plain prompt — paste this):
> Read `CLAUDE.md`, `docs/RESUME.md`, `docs/CREDENTIALS.md`, and the memory for musclr, then give me
> a 5-line status recap. I've added credentials to the `.env` files (and/or will paste keys here).
> For every credential now present: wire it, run it live, and verify it end-to-end (use
> `scripts/golive-check.mjs` and targeted tests), then commit. Then walk me through deploying —
> backend to Cloud Run, web to Vercel, and an EAS build — one step at a time, pausing for anything
> only I can click. Don't fabricate anything; if a credential is missing, tell me exactly what to add.

### Optional scoped goal (only if you want autonomous push, and it can actually complete):
> `/goal Verify live every integration for which a credential exists in the .env files (AI, Supabase,
> nutrition, analytics), expand automated tests to cover them, and produce green release artifacts
> (CI + golive-check). Stop when all credential-backed integrations are verified and the release
> checklist passes. Do NOT block on store submission or cloud deploy — those are my manual steps.`

### `/loop` and other skills
- **`/loop`** — not useful here (there's no recurring poll). Skip it.
- **`deep-research`** — optional, if you want a deeper competitor/science pass on a specific feature.
- **`code-review` / `security-review`** — worth running once before you ship publicly.
- You don't need to attach skills to continue; `CLAUDE.md` + this doc are enough context.

---

## 2. What to set up before prompting (do these in order)

Each item lists: **where**, **what to make**, **what to copy**, **where it goes**, plus cost/time.
Full per-key detail is in `docs/CREDENTIALS.md`; this is the prioritized, do-this-first version.
Files: copy `*.env.example` → real env files first:
```bash
cp backend/.env.example backend/.env
cp apps/web/.env.local.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

### Tier 0 — free, ~15 min, biggest payoff (do these first)
1. **AI coach (pick ONE to start; Gemini is free + easiest):**
   - Google Gemini: https://aistudio.google.com/app/apikey → "Create API key". Free tier.
     You'll paste this into the app's **Settings → AI provider** (not an env file). For testing in
     this chat, just paste it to me.
   - (or OpenAI https://platform.openai.com/api-keys — needs billing; or Anthropic
     https://console.anthropic.com/settings/keys — needs credits.)
2. **USDA nutrition key** (better than the rate-limited demo): https://fdc.nal.usda.gov/api-key-signup.html
   → emailed instantly → `backend/.env`: `USDA_API_KEY=...`
3. **Supabase** (accounts + multi-device sync): https://supabase.com/dashboard → New project (free).
   - SQL Editor → paste `backend/supabase/schema.sql` → Run.
   - Authentication → Providers: enable **Email**; Settings → enable **Anonymous sign-ins**.
   - Project Settings → API → copy **Project URL** + **anon public** key into:
     - `apps/web/.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `apps/mobile/.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
     - `backend/.env`: `SUPABASE_URL` (for token verification)

### Tier 1 — analytics & monitoring (free tiers, ~10 min)
4. **PostHog** (product analytics): https://posthog.com → project → API key →
   `apps/web/.env.local`: `NEXT_PUBLIC_POSTHOG_KEY` (+ `NEXT_PUBLIC_POSTHOG_HOST`).
5. **Sentry** (crash/error reporting): https://sentry.io → create Next.js + Node + React-Native
   projects → copy each **DSN** → the matching `*_SENTRY_DSN` env vars.

### Tier 2 — mobile builds & app stores (costs money + has lead time; start the enrollments early)
6. **Expo account** (build service, free to start): https://expo.dev/signup. Then locally:
   `npm i -g eas-cli && eas login && cd apps/mobile && eas init`.
   For CI deploys, create an **Expo access token** (expo.dev → Account → Access Tokens) →
   GitHub repo Secret `EXPO_TOKEN`.
7. **Apple Developer Program** — **$99/year**, ~24–48 h to approve: https://developer.apple.com/programs/enroll/
   Needed for TestFlight + the App Store. (Enroll the **Apple Small Business Program** for the 15%
   commission rate.) You'll create an App ID / bundle `com.musclr.app` and an app record in
   App Store Connect. EAS handles signing certificates for you.
8. **Google Play Developer** — **$25 one-time**, ~1–2 days ID verification:
   https://play.google.com/console/signup. Create the app, then a **service account JSON**
   (Play Console → Setup → API access) for `eas submit`.

### Tier 3 — hosting / deploy
9. **Vercel** (web): https://vercel.com/new → import the repo → set **Root Directory = `apps/web`**
   (a `vercel.json` is already there) → add the `NEXT_PUBLIC_*` env vars. For CI deploys, create a
   **Vercel token** → GitHub Secret `VERCEL_TOKEN`.
10. **Google Cloud** (backend on Cloud Run + the hosted AI coach):
    - Create a project: https://console.cloud.google.com/projectcreate (note the **project id**).
    - Enable **Vertex AI API** + **Cloud Run** + (optional) **Secret Manager**, **Cloud KMS**.
    - `gcloud auth application-default login` for local hosted-AI; for CI create a **service-account
      JSON** with roles *Cloud Run Admin*, *Vertex AI User* → GitHub Secret `GCP_SA_KEY`, and repo
      Variable `GCP_PROJECT`.
    - `backend/.env`: `GOOGLE_VERTEX_PROJECT=<project id>`.

### Tier 4 — monetization (when you're ready to charge)
11. **RevenueCat**: https://app.revenuecat.com → app → public SDK keys → `EXPO_PUBLIC_REVENUECAT_*`.
    Configure a `pro` entitlement. Web billing via RevenueCat Web Billing / **Stripe**
    (https://dashboard.stripe.com/apikeys).

### Tier 5 — wearables (slow / gated — apply EARLY, they take days–weeks)
12. Register a developer app per provider and put the client id/secret in `backend/.env`
    (`WHOOP_CLIENT_ID/SECRET`, `FITBIT_*`, `OURA_*`, `GARMIN_*`, `POLAR_*`). Set `PUBLIC_BASE_URL`
    + `HEALTH_TOKEN_MASTER_KEY`. **Whoop** has a 10-user cap until app approval and **Garmin** is
    partner-gated — submit those applications first. Full table + URLs in `docs/WEARABLES.md`.
    On-device Apple Health / Health Connect need a **dev-client build** on your phones (no cloud
    accounts) — steps in `docs/WEARABLES.md`.

---

## 3. The fastest path to "I can see it live"

If you only do a little: **Tier 0** (Gemini key + USDA + Supabase) → tomorrow's session wires +
verifies the live AI coach and real multi-device sync end-to-end. Then **Vercel + Cloud Run**
(Tier 3) gets a public URL. Mobile store builds (Tier 2) have the longest lead time, so start the
Apple/Google enrollments whenever you can — they approve in the background.

When credentials are in place, the new session (or you) runs `node scripts/golive-check.mjs` and the
CI `deploy.yml` workflow does the rest once the GitHub Secrets are set.
