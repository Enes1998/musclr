# Privacy policy & store data-safety (draft)

> Draft for review by counsel before commercial launch. Reflects how musclr actually handles data today.

## What we collect
- **Training & nutrition data you enter** (workouts, foods, weekly snapshots, bodyweight, optional
  recovery numbers). Stored **on your device** by default.
- **Account data** (only if you sign in): email + an auth token via Supabase, to sync your data
  across your devices.
- **Health data** (only if you connect a wearable): recovery/HRV/sleep/energy/steps/etc., used to
  tailor coaching and nutrition. Never sold, never used for ads/marketing.
- **Your AI provider key** (only if you bring one): stored **on your device** (browser storage on
  web; the secure Keychain/Keystore via `expo-secure-store` on mobile). Sent to our relay only to
  fulfill your request and **never persisted on our servers**.
- **Product analytics** (only if enabled): pseudonymous events (e.g. "plan generated") via PostHog;
  crash reports via Sentry. No health data is included in analytics.

## How AI works
The AI coach is grounded in a versioned, cited sports-science evidence module. Deterministic
calculations (training scores, nutrient flags) are computed in code; the model only explains and
recommends within cited bounds. You can use the built-in (no-key, on-device-friendly) coach, your
own provider key, or the hosted coach.

## Your controls
- Use the app fully **without an account** (local-only).
- **Disconnect** any wearable (revokes access) and **delete** your synced/health data (purges it).
- Clear your AI key from Settings at any time.

## Health-data compliance commitments
- **Apple HealthKit (Guideline 5.1.3):** no health data for advertising/marketing/sale; no iCloud
  storage of health data; minimum scopes with clear purpose strings.
- **Google Play:** Health Connect data-type declaration + Health apps policy.
- **WA My Health My Data Act / CCPA / GDPR:** explicit per-category consent; access, export, and
  deletion on request; no sale of health data.

## Store "Data safety" / privacy-nutrition summary
| Data type | Collected? | Linked to you? | Purpose | Shared/sold |
|---|---|---|---|---|
| Workouts / nutrition / bodyweight | Optional (you enter) | Only if signed in | App functionality | No |
| Health & fitness (wearables) | Optional (you connect) | Yes | App functionality | No |
| Email | Optional (sign-in) | Yes | Account / sync | No |
| Analytics events | Optional | Pseudonymous | Product improvement | No |
| AI provider key | Optional | On-device only | Fulfill AI requests | No (never stored server-side) |

Contact: privacy@musclr.app (placeholder — set before launch).
