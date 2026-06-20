'use client';

import { SYNC_TABLE } from '@musclr/core';
import { supabase } from './supabase';
import { useWeekStore } from './store';
import { useNutritionStore } from './nutritionStore';
import { useHistoryStore } from './historyStore';

function localDocs() {
  return {
    week: useWeekStore.getState().week,
    nutrition: useNutritionStore.getState().items,
    history: useHistoryStore.getState().snapshots,
  };
}

/** Push all synced local stores to the user's rows in Supabase (last-write-wins). */
export async function backupToCloud(userId: string): Promise<void> {
  if (!supabase) throw new Error('Sign in to back up.');
  const now = new Date().toISOString();
  const docs = localDocs();
  const rows = (Object.keys(docs) as (keyof typeof docs)[]).map((kind) => ({
    user_id: userId,
    kind,
    data: docs[kind],
    updated_at: now,
  }));
  const { error } = await supabase.from(SYNC_TABLE).upsert(rows, { onConflict: 'user_id,kind' });
  if (error) throw new Error(error.message);
}

/** Pull the user's cloud documents into the local stores (replaces local). */
export async function restoreFromCloud(userId: string): Promise<void> {
  if (!supabase) throw new Error('Sign in to restore.');
  const { data, error } = await supabase.from(SYNC_TABLE).select('kind,data').eq('user_id', userId);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    if (row.kind === 'week') useWeekStore.setState({ week: row.data });
    else if (row.kind === 'nutrition') useNutritionStore.setState({ items: row.data });
    else if (row.kind === 'history') useHistoryStore.setState({ snapshots: row.data });
  }
}

// Debounced auto-backup whenever a synced store changes (only while signed in).
let timer: ReturnType<typeof setTimeout> | null = null;
export function startAutoBackup(getUserId: () => string | null): () => void {
  const schedule = () => {
    const uid = getUserId();
    if (!uid) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void backupToCloud(uid).catch(() => {}), 2500);
  };
  const unsubs = [
    useWeekStore.subscribe(schedule),
    useNutritionStore.subscribe(schedule),
    useHistoryStore.subscribe(schedule),
  ];
  return () => unsubs.forEach((u) => u());
}
