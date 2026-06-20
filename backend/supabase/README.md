# Supabase setup

1. Create a project at <https://supabase.com/dashboard> (see `docs/CREDENTIALS.md` §3).
2. Open **SQL Editor** → paste `schema.sql` → Run. This creates `sync_documents` (+ a wearables
   token table) with Row-Level Security so each user only sees their own rows.
3. **Authentication → Providers**: enable Email; add Apple (required by the App Store when you offer
   social login) + Google if desired. **Authentication → Settings**: enable Anonymous sign-ins.
4. **Project Settings → API**: copy the Project URL + `anon` key into the app `.env` files
   (`NEXT_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL`, and the matching `*_ANON_KEY`), and the
   URL into `backend/.env` (`SUPABASE_URL`) so the relay can verify tokens.

## Verifying

- Signed out: the app works fully (local-only).
- Sign in on device A → "Back up now". Sign in with the same account on device B → "Restore on this
  device" → your week/nutrition/history appear.
- RLS check: a second user cannot read the first user's rows (the `*_own` policies enforce
  `auth.uid() = user_id`).

## PowerSync (optional upgrade — finer-grained offline sync)

The current sync is per-document last-write-wins over Supabase, which is plenty for single-user
multi-device. For true offline-first local SQLite with incremental/conflict-aware sync, point a
[PowerSync](https://powersync.com) instance at this Postgres and use `powersync/sync-rules.yaml`;
the app's sync contract (`@musclr/core` `sync.ts`) is the swap point.
