# Deploy & release runbook

CI (`.github/workflows/ci.yml`) runs typecheck + tests + the web build + the mobile compile gate +
Playwright (incl. the 3D viewer) + a backend Docker build on every push/PR. Below is how to ship
each surface. Credentials: see `docs/CREDENTIALS.md`.

## One-action deploy
`.github/workflows/deploy.yml` deploys **everything** on a `v*` tag or manual run — each job
self-skips until its secret is present, so you can light them up one at a time:
- **Backend → Cloud Run:** add secret `GCP_SA_KEY` (service-account JSON) + variable `GCP_PROJECT`.
- **Web → Vercel:** add secret `VERCEL_TOKEN` (web also has `apps/web/vercel.json` for zero-config import).
- **Mobile → EAS build:** add secret `EXPO_TOKEN`.

After adding credentials, verify what's actually live with the self-test:
```bash
API_URL=https://your-backend node scripts/golive-check.mjs
```
It checks backend health, the AI relay, USDA nutrition, configured wearable providers, and Supabase,
and exits non-zero on any failure (so it can gate a release).

## Web → Vercel
1. Import the repo at <https://vercel.com/new>. Set **Root Directory** to `apps/web`.
2. Build command `pnpm --filter web build`; install command `pnpm install` (Vercel detects pnpm).
3. Env: `NEXT_PUBLIC_API_URL` (your deployed backend URL), `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`,
   `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_SENTRY_DSN` (optional).
4. Deploy. (Alternatively Cloud Run via a Next standalone Dockerfile.)

## Backend → Google Cloud Run
```bash
gcloud run deploy musclr-backend \
  --source backend \
  --region us-central1 --allow-unauthenticated \
  --set-env-vars "ALLOWED_ORIGINS=https://your-web-domain,USDA_API_KEY=...,GOOGLE_VERTEX_PROJECT=..."
```
- Uses `backend/Dockerfile`. Cloud Run injects `$PORT` (the server reads it).
- For the hosted AI coach, grant the Cloud Run service account **Vertex AI User**.
- Set anti-abuse env (`RATE_LIMIT_*`, `SUPABASE_URL`, `REQUIRE_AUTH`, `TURNSTILE_SECRET`) for production.
- Secrets via **Google Secret Manager** (don't bake into the image).

## Mobile → EAS (TestFlight / Play)
```bash
npm i -g eas-cli && eas login
cd apps/mobile && eas init            # links the EAS project
eas build --profile preview -p ios     # or android — internal test build
eas build --profile production -p ios   # store build
eas submit -p ios                       # needs Apple Developer; -p android needs the Play service account
eas update --branch production          # OTA JS/asset updates (not native changes)
```
- Profiles live in `apps/mobile/eas.json`; bundle ids + permissions in `apps/mobile/app.json`.
- **Staged OTA rollout:** `eas update` to `production`, monitor Sentry/PostHog, expand; keep
  `eas update:rollback` ready. OTA ships JS/assets only — native module changes need a full build.

## Monitoring / analytics / subscriptions (wire at deploy)
- **Sentry:** `@sentry/nextjs` (web), `@sentry/node` (backend), `@sentry/react-native` (mobile,
  dev-client). Set the DSNs; route errors through `captureError` (`@musclr/core`).
- **PostHog:** web is wired (`posthog-js`, activates on `NEXT_PUBLIC_POSTHOG_KEY`). Mobile: add
  `posthog-react-native` in a dev-client and call `setAnalytics(...)` at startup. Event taxonomy is
  `@musclr/core` `analytics.ts`.
- **RevenueCat:** add `react-native-purchases` (mobile) + RevenueCat Web Billing (web); configure the
  `pro` entitlement (`@musclr/core` `entitlements.ts`). Gate the hosted AI server-side on the verified
  entitlement.

## E2E (optional, before release)
- Web: `pnpm --filter web exec playwright test` (config `apps/web/playwright.config.ts`; run
  `npx playwright install` once).
- Mobile: `maestro test apps/mobile/.maestro/smoke.yaml` against a running dev-client/simulator.
