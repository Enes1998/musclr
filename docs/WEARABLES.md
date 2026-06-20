# Wearables & health integration

musclr's recovery-aware coaching works **today** without any wearable: enter a recovery score (and
bodyweight) on the **Summary** screen and the AI coach applies a bounded, evidence-cited
autoregulation nudge (HRV-guided training; `recovery.hrv_guided` — strong for endurance, thinner for
hypertrophy) to the 48–72 h recovery window. Bodyweight feeds the nutrition Mifflin–St Jeor targets.

Wearables simply **populate the same recovery store automatically**. Everything routes through the
framework-agnostic `HealthProvider` interface + normalized model in `@musclr/core` `health.ts`, and
the dedup/readiness logic there. Health data **enriches**; it never changes the frozen training scores.

---

## On-device aggregators (ship first — no partner gating)

These read directly on the device and need a **dev-client build** (not Expo Go) because they bundle
native modules. After installing, implement the `HealthProvider` against `@musclr/core`.

### iOS — Apple HealthKit
```bash
npx expo install @kingstinct/react-native-healthkit react-native-nitro-modules
```
- Config plugin in `app.json` with purpose strings (`NSHealthShareUsageDescription`,
  `NSHealthUpdateUsageDescription`).
- Read: workouts, heart rate, HRV (**SDNN**), active/basal energy, sleep, steps, VO2max, body mass,
  resting HR. Write workouts back via `saveWorkoutSample`. Use anchored queries for incremental sync.
- Map each sample → `@musclr/core` `NormalizedRecord` (units kg/kcal/m/s/bpm/ms, ISO-UTC timestamps);
  set `source: 'apple_health'` + a stable `dedupeKey`.

### Android — Health Connect
```bash
npx expo install react-native-health-connect
```
- `minSdkVersion 26`; built-in Expo plugin. Samsung Health + Google + Fitbit flow in **free** via
  Health Connect (Google Fit is dead).
- Read: ExerciseSession, HeartRate, HRV (**RMSSD**), Active+Total calories, Sleep, Weight, Steps,
  Vo2Max, RestingHR. Map → `NormalizedRecord` with `source: 'health_connect'`.

> **Never mix SDNN and RMSSD** in one HRV baseline — `canonicalDailyHrv` in core enforces one metric
> type per day. Read device **aggregated** totals; never sum cumulative metrics across sources.

The provider writes normalized records into the recovery store (and, signed in, to Postgres via the
sync layer). `computeReadiness` + `recoveryWindowMultiplier` (already wired to the AI request) do the rest.

---

## Cloud providers (OAuth, via the backend) — `/api/health/*`

Backend routes (`backend/src/routes/health.ts`, registry in `health/oauth.ts`):
`GET /api/health/providers`, `GET /api/health/:provider/connect`, `GET /api/health/:provider/callback`.
A provider is "configured" once its client id/secret env vars are set.

| Provider | Register at | env vars | Gotchas |
|---|---|---|---|
| WHOOP | developer.whoop.com | `WHOOP_CLIENT_ID/SECRET` | 10-user cap until approval — apply early. |
| Fitbit | dev.fitbit.com/apps | `FITBIT_CLIENT_ID/SECRET` | PKCE; 150 req/hr/user; webhooks. |
| Oura | cloud.ouraring.com | `OURA_CLIENT_ID/SECRET` | OAuth-only. |
| Garmin | developerportal.garmin.com | `GARMIN_CLIENT_ID/SECRET` | Partner-approval gated; sandbox first. |
| Polar | admin.polaraccesslink.com | `POLAR_CLIENT_ID/SECRET` | Transaction model; signed webhooks. |

Also set `PUBLIC_BASE_URL` (the backend's public URL) so redirect URIs are correct, and register
`${PUBLIC_BASE_URL}/api/health/<provider>/callback` as the OAuth redirect in each provider console.

**Token storage (production):** envelope-encrypt tokens with **Google Cloud KMS**
(`KMS_KEY_NAME`) and upsert into the `health_connections` table (`backend/supabase/schema.sql`,
RLS-guarded). The callback returns `persisted:false` until KMS + Supabase are configured — by design
we never store plaintext provider tokens. Refresh via a scheduled worker; ingest via
webhook → queue → normalize → upsert.

---

## Compliance (before store submission)

- **Apple HealthKit (Guideline 5.1.3):** no health data for ads/marketing/sale, no iCloud storage of
  health data, clear purpose strings, request **minimum** scopes.
- **Google Play:** Health Connect data-types declaration + the Health apps policy (re-verify at submission).
- **WA My Health My Data / CCPA / GDPR:** explicit per-kind consent, a connected-sources transparency
  screen, working **disconnect** (revoke) and **delete** (purge). Don't sell health data.
