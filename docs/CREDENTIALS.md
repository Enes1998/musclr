# Credentials & accounts — how to get each one and where it goes

musclr runs **fully** with **zero credentials** (deterministic AI mock, USDA `DEMO_KEY`, local-only
storage). This guide is for turning on the **live** features. Do them in any order; each section is
independent. Every value goes in a `.env` file that is **git-ignored** — never commit real keys.

> Copy the example files first:
> ```bash
> cp backend/.env.example backend/.env
> cp apps/web/.env.local.example apps/web/.env.local
> cp apps/mobile/.env.example apps/mobile/.env
> ```

Legend: 🟢 easy/free · 🟡 needs an account · 🔴 paid or approval-gated.

---

## 1. 🟢 USDA FoodData Central (better nutrition data)

The app ships with USDA's shared `DEMO_KEY` (rate-limited). Get your own free key for real use.

1. Go to <https://fdc.nal.usda.gov/api-key-signup.html>, enter your email → the key is emailed instantly.
2. `backend/.env`: `USDA_API_KEY=your_key_here`

Also set a contact UA for Open Food Facts (required by their terms):
`backend/.env`: `OFF_USER_AGENT=musclr/1.0 (you@example.com)`

---

## 2. 🟡 AI provider keys (live AI coach)

You only need **one** to start. The app sends the key to the backend relay per request; it is
never stored server-side. (On mobile it's kept in the device Keychain/Keystore via
`expo-secure-store`.) You enter these in the app's **Settings → AI coach provider**, not in env —
except the hosted Gemini default below.

| Provider | Where to get a key | Notes |
|---|---|---|
| **OpenAI** | <https://platform.openai.com/api-keys> → "Create new secret key" | Requires a billing method. |
| **Anthropic (Claude)** | <https://console.anthropic.com/settings/keys> | Requires credits. Default model `claude-sonnet-4-6` (override in Settings). |
| **Google Gemini** | <https://aistudio.google.com/app/apikey> → "Create API key" | Free tier available. |
| **Local (Ollama / LM Studio)** | Install <https://ollama.com> → `ollama run llama3.1` | Only reachable when the **backend** runs on the same machine (dev/desktop). |

### Hosted default coach (optional) — Google Vertex AI

This is the "works without the user bringing a key" cloud coach. It uses Application Default
Credentials, not a key in code.

1. Create / pick a Google Cloud project: <https://console.cloud.google.com/projectcreate>.
2. Enable the **Vertex AI API**: <https://console.cloud.google.com/apis/library/aiplatform.googleapis.com>.
3. Local dev: install the gcloud CLI, then `gcloud auth application-default login`.
4. `backend/.env`: `GOOGLE_VERTEX_PROJECT=your-gcp-project-id` (and optionally `GOOGLE_VERTEX_LOCATION=us-central1`).
5. On Cloud Run, attach a service account with role **Vertex AI User** (`roles/aiplatform.user`) — no key file.

---

## 3. 🟡 Supabase (accounts + multi-device sync) — for M6

1. Create a project at <https://supabase.com/dashboard> (free tier is fine). Pick a region close to your users.
2. **Project Settings → API**: copy the **Project URL** and the **anon public** key.
   - `apps/web/.env.local`: `NEXT_PUBLIC_SUPABASE_URL=…`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=…`
   - `apps/mobile/.env`: `EXPO_PUBLIC_SUPABASE_URL=…`, `EXPO_PUBLIC_SUPABASE_ANON_KEY=…`
3. Backend (for verifying tokens on the AI relay): `backend/.env`: `SUPABASE_URL=…` (JWKS verification). Set `REQUIRE_AUTH=true` to require sign-in on the hosted coach.
4. **Authentication → Providers**: enable Email, and (for the iOS App Store requirement) **Apple**, plus Google if desired. Turn on **Anonymous sign-ins** (Authentication → Settings) for local-first onboarding.
5. Run the SQL migrations in `backend/supabase/` (see that folder's README) to create tables + RLS.

### PowerSync (offline-first sync engine) — for M6
1. Create an instance at <https://powersync.com> and connect it to your Supabase Postgres (connection string from Supabase → Database → Connection string).
2. Paste the sync rules from `backend/powersync/sync-rules.yaml`.
3. `apps/web/.env.local` / `apps/mobile/.env`: `*_POWERSYNC_URL=…` (the instance URL).

---

## 4. 🔴 Expo / EAS + app stores (device builds & release) — for M9

1. **Expo account**: <https://expo.dev/signup>. Install the CLI: `npm i -g eas-cli` then `eas login`.
2. `eas init` in `apps/mobile` to link the project (writes the EAS project id).
3. **Apple Developer Program** ($99/yr): <https://developer.apple.com/programs/>. Needed for TestFlight + App Store. Enroll the **Apple Small Business Program** for the 15% rate.
4. **Google Play Developer** ($25 one-time): <https://play.google.com/console/signup>. Create a service account JSON for `eas submit` (Play Console → Setup → API access).
5. Build: `eas build -p ios|android --profile preview`; submit: `eas submit -p ios|android`. See `apps/mobile/eas.json` (created in M9).

---

## 5. 🟡 Sentry / PostHog / RevenueCat (monitoring, analytics, subscriptions) — for M8

All optional; the app no-ops cleanly when unset and goes live when the keys appear.

| Service | Get it | Env vars |
|---|---|---|
| **Sentry** (crash/errors) | <https://sentry.io> → create RN + Next + Node projects → copy each **DSN** | `SENTRY_DSN` (backend), `NEXT_PUBLIC_SENTRY_DSN` (web), `EXPO_PUBLIC_SENTRY_DSN` (mobile) |
| **PostHog** (analytics + flags) | <https://posthog.com> → Project API key | `NEXT_PUBLIC_POSTHOG_KEY` (web), `EXPO_PUBLIC_POSTHOG_KEY` (mobile), `POSTHOG_HOST` |
| **RevenueCat** (subscriptions) | <https://app.revenuecat.com> → create app → public SDK keys; configure a `pro` entitlement | `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`; web billing via `NEXT_PUBLIC_REVENUECAT_WEB_KEY` |
| **Stripe** (web checkout, via RevenueCat Web Billing) | <https://dashboard.stripe.com/apikeys> | configured inside RevenueCat |

---

## 6. 🟢 Cloudflare Turnstile (web bot defense, optional) — anti-abuse

1. <https://dash.cloudflare.com> → Turnstile → add a site → copy the **Secret key**.
2. `backend/.env`: `TURNSTILE_SECRET=…`. The web client attaches a token; the relay verifies it. Mobile uses platform attestation instead (App Attest / Play Integrity — see the wearables/anti-abuse notes).

---

## 7. 🔴 Wearable developer apps (cloud health providers) — for M7

On-device Apple Health + Health Connect need **no** cloud credentials (just on-device permission).
Cloud providers each need a registered OAuth app (backend `connect/callback` routes):

| Provider | Register at | Gotchas |
|---|---|---|
| **Whoop** | <https://developer.whoop.com> | OAuth `offline`; **10-user cap until app approval — apply early**. |
| **Fitbit** | <https://dev.fitbit.com/apps> | PKCE; 150 req/hr/user; webhooks. |
| **Oura** | <https://cloud.ouraring.com/oauth/applications> | OAuth-only. |
| **Garmin** | <https://developerportal.garmin.com> | **Partner-approval gated — apply during M7**; sandbox first. |
| **Polar** | <https://admin.polaraccesslink.com> | Transaction model; signed webhooks. |

Tokens are stored envelope-encrypted with **Google Cloud KMS** (`backend/.env`: `KMS_KEY_NAME=…`).

---

## Where each value lives (summary)

- **`backend/.env`** — server secrets: USDA, OFF UA, Vertex project, Supabase URL/JWT, Turnstile, KMS, wearable client secrets, rate limits.
- **`apps/web/.env.local`** — `NEXT_PUBLIC_*` (safe-to-expose) URLs/keys: API URL, Supabase anon, PostHog/Sentry/RevenueCat public keys.
- **`apps/mobile/.env`** — `EXPO_PUBLIC_*`: API URL (your LAN IP on device), Supabase anon, PostHog/Sentry/RevenueCat public keys.
- **In-app Settings** — your personal AI provider key (stored locally / in the device keychain, sent per request, never persisted server-side).

Anything labeled `*_ANON_*` / `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*` is **publishable** (safe in the client). Everything in `backend/.env` is **secret** — keep it server-side only.
