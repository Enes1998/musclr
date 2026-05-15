import type { WeekData } from './exercises';

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

export function listProfiles(): SavedProfile[] {
  try {
    return JSON.parse(localStorage.getItem(LIST_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveProfile(name: string, week: WeekData): SavedProfile {
  const slug = toSlug(name);
  const profile: SavedProfile = {
    slug,
    name: name.trim() || 'Unnamed',
    savedAt: new Date().toISOString(),
  };
  const list = listProfiles().filter((p) => p.slug !== slug);
  list.unshift(profile);
  localStorage.setItem(LIST_KEY, JSON.stringify(list));
  localStorage.setItem(`musclr.profile.${slug}`, JSON.stringify(week));
  return profile;
}

export function loadProfileWeek(slug: string): WeekData | null {
  try {
    const raw = localStorage.getItem(`musclr.profile.${slug}`);
    return raw ? (JSON.parse(raw) as WeekData) : null;
  } catch {
    return null;
  }
}

export function deleteProfile(slug: string): void {
  const list = listProfiles().filter((p) => p.slug !== slug);
  localStorage.setItem(LIST_KEY, JSON.stringify(list));
  localStorage.removeItem(`musclr.profile.${slug}`);
}
