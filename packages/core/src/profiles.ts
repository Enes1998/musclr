// Named week profiles — ported from the prototype (frontend/src/lib/profiles.ts)
// and refactored behind the KeyValueStore abstraction so it works on web, native,
// and (later) a PowerSync/SQLite-backed store. All methods are async.

import type { WeekData } from './exercises';
import type { KeyValueStore } from './storage';

const LIST_KEY = 'musclr.profiles';

export interface SavedProfile {
  slug: string;
  name: string;
  savedAt: string; // ISO 8601
}

function toSlug(name: string): string {
  const s = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return s || 'unnamed';
}

export interface ProfileStore {
  list(): Promise<SavedProfile[]>;
  save(name: string, week: WeekData): Promise<SavedProfile>;
  loadWeek(slug: string): Promise<WeekData | null>;
  remove(slug: string): Promise<void>;
}

export function createProfileStore(store: KeyValueStore): ProfileStore {
  async function list(): Promise<SavedProfile[]> {
    try {
      const raw = await store.getItem(LIST_KEY);
      return raw ? (JSON.parse(raw) as SavedProfile[]) : [];
    } catch {
      return [];
    }
  }

  async function save(name: string, week: WeekData): Promise<SavedProfile> {
    const slug = toSlug(name);
    const profile: SavedProfile = {
      slug,
      name: name.trim() || 'Unnamed',
      savedAt: new Date().toISOString(),
    };
    const next = (await list()).filter((p) => p.slug !== slug);
    next.unshift(profile);
    await store.setItem(LIST_KEY, JSON.stringify(next));
    await store.setItem(`musclr.profile.${slug}`, JSON.stringify(week));
    return profile;
  }

  async function loadWeek(slug: string): Promise<WeekData | null> {
    try {
      const raw = await store.getItem(`musclr.profile.${slug}`);
      return raw ? (JSON.parse(raw) as WeekData) : null;
    } catch {
      return null;
    }
  }

  async function remove(slug: string): Promise<void> {
    const next = (await list()).filter((p) => p.slug !== slug);
    await store.setItem(LIST_KEY, JSON.stringify(next));
    await store.removeItem(`musclr.profile.${slug}`);
  }

  return { list, save, loadWeek, remove };
}
