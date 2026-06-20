'use client';

import { useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { startAutoBackup } from '../lib/sync';

/** Boots Supabase auth (if configured) and auto-backs-up synced stores while signed in. Renders nothing. */
export function SyncProvider() {
  const init = useAuth((s) => s.init);
  useEffect(() => {
    init();
    const stop = startAutoBackup(() => useAuth.getState().user?.id ?? null);
    return stop;
  }, [init]);
  return null;
}
