-- musclr Supabase schema. Apply in the Supabase SQL editor (or `supabase db push`).
-- One JSON document per (user, store kind), guarded by Row-Level Security so a user can only ever
-- read/write their own rows. This backs the web + mobile cloud backup/restore + auto-sync.

create table if not exists public.sync_documents (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  kind       text        not null check (kind in ('week', 'nutrition', 'history')),
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind)
);

alter table public.sync_documents enable row level security;

-- A user may only touch rows where user_id = their auth uid.
drop policy if exists "sync_documents_select_own" on public.sync_documents;
create policy "sync_documents_select_own" on public.sync_documents
  for select using (auth.uid() = user_id);

drop policy if exists "sync_documents_insert_own" on public.sync_documents;
create policy "sync_documents_insert_own" on public.sync_documents
  for insert with check (auth.uid() = user_id);

drop policy if exists "sync_documents_update_own" on public.sync_documents;
create policy "sync_documents_update_own" on public.sync_documents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sync_documents_delete_own" on public.sync_documents;
create policy "sync_documents_delete_own" on public.sync_documents
  for delete using (auth.uid() = user_id);

-- (Wearables, Phase 7) cloud OAuth token store — envelope-encrypted via Cloud KMS, never plaintext.
create table if not exists public.health_connections (
  user_id        uuid        not null references auth.users (id) on delete cascade,
  provider       text        not null,
  encrypted_token bytea      not null,
  scopes         text[]      not null default '{}',
  connected_at   timestamptz not null default now(),
  primary key (user_id, provider)
);
alter table public.health_connections enable row level security;
drop policy if exists "health_connections_own" on public.health_connections;
create policy "health_connections_own" on public.health_connections
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
