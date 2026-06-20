// Cloud-sync contract shared by web + mobile. Local stores stay the offline source of truth; when
// signed in, each store is mirrored to a per-user row in Supabase Postgres (RLS-guarded) as a JSON
// document. v1 uses explicit backup/restore + auto-backup-on-change (last-write-wins by updatedAt),
// which is plenty for single-user multi-device. PowerSync (local SQLite + fine-grained offline
// conflict resolution) is the documented upgrade path behind this same contract.

export const SYNC_TABLE = 'sync_documents';

/** Which local stores participate in cloud sync. Device-only prefs (API key, palette, locale) do NOT. */
export const SYNC_KINDS = ['week', 'nutrition', 'history'] as const;
export type SyncKind = (typeof SYNC_KINDS)[number];

export interface SyncDocument<T = unknown> {
  kind: SyncKind;
  data: T;
  updatedAt: string; // ISO 8601
}

/** Last-write-wins resolver: returns whichever document has the later `updatedAt` (remote on tie). */
export function resolveLatest<T>(
  local: SyncDocument<T> | null,
  remote: SyncDocument<T> | null,
): SyncDocument<T> | null {
  if (!local) return remote;
  if (!remote) return local;
  return remote.updatedAt >= local.updatedAt ? remote : local;
}
