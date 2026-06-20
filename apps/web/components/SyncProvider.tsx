'use client';

import { useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { startAutoBackup } from '../lib/sync';
import { initAnalytics } from '../lib/analytics';

/** Boots analytics + Supabase auth (if configured) and auto-backs-up synced stores. Renders nothing. */
export function SyncProvider() {
  const init = useAuth((s) => s.init);
  useEffect(() => {
    initAnalytics();
    init();
    const stop = startAutoBackup(() => useAuth.getState().user?.id ?? null);
    return stop;
  }, [init]);
  return null;
}
