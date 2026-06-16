// Regenerate the exercise catalog from the public-domain free-exercise-db.
//
//   node scripts/build-exercise-catalog.mjs
//
// Source: https://github.com/yuhonas/free-exercise-db (Unlicense / public domain).
// Writes packages/core/src/data/exerciseCatalog.generated.ts — a slim catalog mapped onto
// musclr's 11 MuscleId groups. Re-run when bumping the pinned source.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../packages/core/src/data/exerciseCatalog.generated.ts');
const SOURCE_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';

// free-exercise-db muscle vocabulary -> musclr MuscleId group (null = drop, e.g. neck).
const GROUP = {
  abdominals: 'core',
  abductors: 'glutes', // hip abductors = gluteus medius/minimus
  adductors: 'quads', // hip adductors leaf rolls into the quads/legs group
  biceps: 'biceps',
  calves: 'calves',
  chest: 'chest',
  forearms: 'forearms',
  glutes: 'glutes',
  hamstrings: 'hamstrings',
  lats: 'back',
  'lower back': 'back',
  'middle back': 'back',
  neck: null,
  quadriceps: 'quads',
  shoulders: 'shoulders',
  traps: 'back',
  triceps: 'triceps',
};

const PRIMARY_WEIGHT = 1.0;
const SECONDARY_WEIGHT = 0.5;

function mapExercise(e) {
  const primary = {};
  for (const pm of e.primaryMuscles ?? []) {
    const g = GROUP[pm];
    if (!g) continue;
    primary[g] = Math.max(primary[g] ?? 0, PRIMARY_WEIGHT);
  }
  if (Object.keys(primary).length === 0) return null; // e.g. neck-only — nothing to score

  const secondary = {};
  for (const sm of e.secondaryMuscles ?? []) {
    const g = GROUP[sm];
    if (!g || primary[g] != null) continue;
    secondary[g] = Math.max(secondary[g] ?? 0, SECONDARY_WEIGHT);
  }

  const rec = {
    id: e.id,
    name: e.name,
    primary,
    ...(Object.keys(secondary).length ? { secondary } : {}),
  };
  if (e.equipment) rec.equipment = e.equipment;
  if (e.mechanic) rec.mechanic = e.mechanic;
  if (e.category) rec.category = e.category;
  if (e.level) rec.level = e.level;
  if (e.force) rec.force = e.force;
  return rec;
}

const res = await fetch(SOURCE_URL);
if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
const raw = await res.json();

const mapped = raw
  .map(mapExercise)
  .filter(Boolean)
  .sort((a, b) => a.name.localeCompare(b.name));

const today = new Date().toISOString().slice(0, 10);
const header = `// AUTO-GENERATED — do not edit by hand. Run: node scripts/build-exercise-catalog.mjs
// Source: yuhonas/free-exercise-db (Unlicense / public domain), dist/exercises.json
// ${SOURCE_URL}
// Retrieved: ${today}. ${mapped.length} of ${raw.length} exercises (neck-only dropped).
import type { CatalogExercise } from '../exerciseDb';

export const FREE_EXERCISE_DB_RETRIEVED = '${today}';
export const FREE_EXERCISE_DB: CatalogExercise[] = ${JSON.stringify(mapped, null, 0)};
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, header);
console.log(`wrote ${mapped.length} exercises -> ${OUT}`);
