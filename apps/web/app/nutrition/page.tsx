'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  deriveTargets,
  computeDailyStatus,
  sumNutrients,
  scaleNutrients,
  type NutritionProfile,
  type NutrientKey,
  type NutrientStatus,
  type NutrientFlag,
  type Food,
  type Sex,
  type Goal,
} from '@musclr/core';
import { searchFoods, requestNutritionAdvice, lookupBarcode, type NutritionAdviceResult } from '../../lib/api';
import { useNutritionStore } from '../../lib/nutritionStore';
import { useHasHydrated } from '../../lib/store';
import { useSettingsStore, toAiSettings } from '../../lib/settingsStore';
import { useRecoveryStore } from '../../lib/recoveryStore';
import { BarcodeScanner } from '../../components/BarcodeScanner';

const LABELS: Record<NutrientKey, string> = {
  energy_kcal: 'Energy', protein_g: 'Protein', carbs_g: 'Carbs', fat_g: 'Fat', fiber_g: 'Fiber',
  vitamin_a_ug: 'Vitamin A', vitamin_c_mg: 'Vitamin C', vitamin_d_ug: 'Vitamin D', vitamin_e_mg: 'Vitamin E', vitamin_k_ug: 'Vitamin K',
  thiamin_mg: 'Thiamin (B1)', riboflavin_mg: 'Riboflavin (B2)', niacin_mg: 'Niacin (B3)', vitamin_b6_mg: 'Vitamin B6', folate_ug: 'Folate (B9)', vitamin_b12_ug: 'Vitamin B12',
  calcium_mg: 'Calcium', iron_mg: 'Iron', magnesium_mg: 'Magnesium', zinc_mg: 'Zinc', potassium_mg: 'Potassium', sodium_mg: 'Sodium', selenium_ug: 'Selenium', copper_ug: 'Copper', manganese_mg: 'Manganese', phosphorus_mg: 'Phosphorus',
};
const MACRO_KEYS: NutrientKey[] = ['energy_kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g'];

function unitOf(key: NutrientKey): string {
  if (key.endsWith('_kcal')) return 'kcal';
  if (key.endsWith('_mg')) return 'mg';
  if (key.endsWith('_ug')) return 'µg';
  return 'g';
}
function flagColor(flag: NutrientFlag): string {
  if (flag === 'low') return '#ffc107';
  if (flag === 'high' || flag === 'over_ul') return '#f44336';
  if (flag === 'ok') return '#4caf50';
  return '#52525c';
}
function fmt(n: number): string {
  return n >= 100 ? Math.round(n).toString() : n.toFixed(1);
}

export default function NutritionPage() {
  const hydrated = useHasHydrated();
  const { items, add, remove, clear } = useNutritionStore();
  const settings = useSettingsStore();
  const bodyWeightKg = useRecoveryStore((s) => s.bodyWeightKg);
  const setRecovery = useRecoveryStore((s) => s.set);

  const [sex, setSex] = useState<Sex>('male');
  const [weightKg, setWeightKg] = useState(80);

  // Bodyweight is shared with the recovery store (and, later, wearables).
  useEffect(() => {
    if (typeof bodyWeightKg === 'number' && bodyWeightKg > 0) setWeightKg(bodyWeightKg);
  }, [bodyWeightKg]);
  const [goal, setGoal] = useState<Goal>('maintain');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  const [advice, setAdvice] = useState<NutritionAdviceResult | null>(null);
  const [adviceLoading, setAdviceLoading] = useState(false);

  const profile: NutritionProfile = { sex, age: 30, heightCm: 180, weightKg, activity: 'moderate', goal };
  const targets = useMemo(() => deriveTargets(profile), [sex, weightKg, goal]);

  const consumed = useMemo(
    () => sumNutrients(items.map((i) => scaleNutrients(i.food.per100, i.grams))),
    [items],
  );
  const statuses = useMemo(() => computeDailyStatus(consumed, targets), [consumed, targets]);
  const byKey = useMemo(() => {
    const m = {} as Record<NutrientKey, NutrientStatus>;
    statuses.forEach((s) => (m[s.key] = s));
    return m;
  }, [statuses]);

  async function getAdvice() {
    setAdviceLoading(true);
    try {
      const gaps = {
        lacking: statuses.filter((s) => s.flag === 'low').map((s) => s.key),
        overdone: statuses.filter((s) => s.flag === 'high' || s.flag === 'over_ul').map((s) => s.key),
        unknown: statuses.filter((s) => s.flag === 'unknown').map((s) => s.key),
      };
      setAdvice(await requestNutritionAdvice(gaps, toAiSettings(settings)));
    } catch {
      setAdvice(null);
    } finally {
      setAdviceLoading(false);
    }
  }

  async function runSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      setResults(await searchFoods(query));
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : String(e));
    } finally {
      setSearching(false);
    }
  }

  async function handleBarcode(code: string) {
    setScanning(false);
    setScanMsg('Looking up…');
    try {
      const res = await lookupBarcode(code);
      if (res.found && res.food) {
        add(res.food, 100);
        setScanMsg(`Added ${res.food.name} (100 g).`);
      } else {
        setScanMsg(`No product for ${code}. Try search or add it manually below.`);
        setShowManual(true);
      }
    } catch (e) {
      setScanMsg(e instanceof Error ? e.message : String(e));
    }
  }

  if (!hydrated) {
    return <main className="mx-auto max-w-3xl px-6 py-10 text-ink-3">Loading…</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-2 font-display text-2xl font-semibold">Nutrition</h1>
      <p className="mb-6 text-sm text-ink-2">
        Track macros &amp; micros against evidence-based targets. Foods from USDA FoodData Central.
      </p>

      {/* Profile */}
      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-line bg-surface p-4 text-sm">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-xs text-ink-3">Sex</span>
          <select value={sex} onChange={(e) => setSex(e.target.value as Sex)} className="rounded bg-surface-2 px-2 py-1">
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-xs text-ink-3">Weight (kg)</span>
          <input
            type="number"
            value={weightKg}
            onChange={(e) => {
              const v = Number(e.target.value) || 0;
              setWeightKg(v);
              if (v > 0) setRecovery({ bodyWeightKg: v });
            }}
            className="w-24 rounded bg-surface-2 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-xs text-ink-3">Goal</span>
          <select value={goal} onChange={(e) => setGoal(e.target.value as Goal)} className="rounded bg-surface-2 px-2 py-1">
            <option value="cut">Cut</option>
            <option value="maintain">Maintain</option>
            <option value="gain">Gain</option>
          </select>
        </label>
        <p className="ml-auto font-mono text-xs text-ink-3">
          target {targets.energyKcal} kcal · {targets.rda.protein_g}g protein
        </p>
      </div>

      {/* Search */}
      <div className="mb-3 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          placeholder="Search foods (e.g. greek yogurt)…"
          className="flex-1 rounded-md bg-surface-2 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent"
        />
        <button onClick={runSearch} disabled={searching} className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-bg disabled:opacity-50">
          {searching ? '…' : 'Search'}
        </button>
        <button
          onClick={() => {
            setScanMsg(null);
            setScanning((v) => !v);
          }}
          className="rounded-md bg-surface-2 px-3 py-2 text-sm hover:bg-surface-3"
        >
          {scanning ? 'Stop' : '⬚ Scan'}
        </button>
      </div>
      {searchError && <p className="mb-3 text-sm text-load-over">⚠ {searchError}</p>}
      {scanning && <BarcodeScanner onDetected={handleBarcode} onClose={() => setScanning(false)} />}
      {scanMsg && <p className="mb-3 mt-2 text-sm text-ink-2">{scanMsg}</p>}
      <div className="mb-4">
        <button
          onClick={() => setShowManual((v) => !v)}
          className="font-mono text-xs text-ink-3 hover:text-ink"
        >
          {showManual ? '− Hide manual entry' : '+ Add a food manually'}
        </button>
        {showManual && (
          <ManualFoodForm
            onAdd={(food, grams) => {
              add(food, grams);
              setShowManual(false);
              setScanMsg(`Added ${food.name} (${grams} g).`);
            }}
          />
        )}
      </div>
      {results.length > 0 && (
        <ul className="mb-6 divide-y divide-line/60 overflow-hidden rounded-xl border border-line bg-surface">
          {results.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="flex-1 truncate">
                {f.name}
                {f.brand ? <span className="text-ink-3"> · {f.brand}</span> : null}
              </span>
              <span className="font-mono text-xs text-ink-3">{Math.round(f.per100.energy_kcal ?? 0)} kcal/100g</span>
              <button
                onClick={() => {
                  add(f, 100);
                  setResults([]);
                  setQuery('');
                }}
                className="rounded bg-surface-2 px-2 py-1 text-xs hover:bg-surface-3"
              >
                + 100g
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Today's log */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Today</h2>
          {items.length > 0 && (
            <button onClick={clear} className="font-mono text-xs text-ink-3 hover:text-load-over">
              clear
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-ink-3">No foods logged yet — search above to add some.</p>
        ) : (
          <ul className="space-y-1">
            {items.map((i) => (
              <li key={i.key} className="flex items-center gap-3 rounded-md bg-surface px-3 py-1.5 text-sm">
                <span className="flex-1 truncate">{i.food.name}</span>
                <span className="font-mono text-xs text-ink-3">{i.grams} g</span>
                <button onClick={() => remove(i.key)} className="text-ink-3 hover:text-load-over" aria-label="Remove">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Macros */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {MACRO_KEYS.map((key) => {
          const s = byKey[key];
          return (
            <div key={key} className="rounded-xl border border-line bg-surface p-3">
              <p className="font-mono text-xs text-ink-3">{LABELS[key]}</p>
              <p className="mt-1 text-lg font-semibold" style={{ color: flagColor(s.flag) }}>
                {fmt(s.consumed ?? 0)}
                <span className="text-xs text-ink-3"> / {fmt(s.target ?? 0)} {unitOf(key)}</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* Micros */}
      <h2 className="mb-3 font-display text-lg font-semibold">Micronutrients</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {statuses
          .filter((s) => !MACRO_KEYS.includes(s.key))
          .map((s) => (
            <div key={s.key} className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: flagColor(s.flag) }} />
              <span className="flex-1 truncate">{LABELS[s.key]}</span>
              <span className="font-mono text-xs text-ink-3">
                {s.flag === 'unknown' ? '—' : `${s.pctTarget}%`}
              </span>
            </div>
          ))}
      </div>
      <p className="mt-4 font-mono text-xs text-ink-3">
        green = on target · yellow = low (&lt;70% RDA) · red = over limit · grey = no data (not a deficiency)
      </p>

      {/* AI nutrition advice */}
      <section className="mt-8 rounded-2xl border border-line bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">AI nutrition suggestion</h2>
          <button
            onClick={getAdvice}
            disabled={adviceLoading || items.length === 0}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg disabled:opacity-50"
          >
            {adviceLoading ? 'Analyzing…' : 'Get suggestion'}
          </button>
        </div>
        <p className="mt-2 text-sm text-ink-2">
          Deterministic flags decide what&apos;s lacking or overdone; the coach explains and
          recommends foods. {items.length === 0 ? 'Log a food first.' : ''}
        </p>
        {advice && (
          <div className="mt-4 rounded-xl border border-line bg-bg-2 p-4">
            <p className="font-mono text-[10px] text-ink-3">{advice.meta.provider}</p>
            <p className="mt-1 text-sm text-ink">{advice.advice.summary}</p>
            <ul className="mt-3 space-y-2">
              {advice.advice.focus.map((f, i) => (
                <li key={i} className="text-sm">
                  <span style={{ color: f.direction === 'increase' ? '#4caf50' : '#f44336' }}>
                    {f.direction === 'increase' ? '↑' : '↓'} {f.nutrient}
                  </span>
                  {f.foods.length > 0 && <span className="text-ink-2"> — {f.foods.join(', ')}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}

/** Manual custom-food entry (fallback when a barcode isn't found or for home-cooked foods). */
function ManualFoodForm({ onAdd }: { onAdd: (food: Food, grams: number) => void }) {
  const [name, setName] = useState('');
  const [grams, setGrams] = useState(100);
  const [kcal, setKcal] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);

  const num = (v: number, set: (n: number) => void, label: string) => (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-xs text-ink-3">{label}</span>
      <input
        type="number"
        value={v}
        onChange={(e) => set(Number(e.target.value) || 0)}
        className="w-20 rounded bg-surface-2 px-2 py-1 text-sm"
      />
    </label>
  );

  function submit() {
    if (!name.trim() || grams <= 0) return;
    const scale = 100 / grams; // entered values are per the serving; store per-100g
    const food: Food = {
      id: `custom:${name.trim().toLowerCase()}:${Date.now()}`,
      source: 'custom',
      name: name.trim(),
      per100: {
        energy_kcal: kcal * scale,
        protein_g: protein * scale,
        carbs_g: carbs * scale,
        fat_g: fat * scale,
      },
      servings: [{ id: 'serving', label: `${grams} g`, grams }],
      defaultServingId: 'serving',
      dataCompleteness: 0,
    };
    onAdd(food, grams);
  }

  return (
    <div className="mt-3 rounded-xl border border-line bg-bg-2 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="font-mono text-xs text-ink-3">Food name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. homemade chili"
            className="rounded bg-surface-2 px-2 py-1 text-sm"
          />
        </label>
        {num(grams, setGrams, 'Serving (g)')}
        {num(kcal, setKcal, 'kcal')}
        {num(protein, setProtein, 'Protein')}
        {num(carbs, setCarbs, 'Carbs')}
        {num(fat, setFat, 'Fat')}
        <button onClick={submit} className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-bg">
          Add
        </button>
      </div>
      <p className="mt-2 font-mono text-xs text-ink-3">
        Macros for the serving you enter. Micronutrients stay “unknown” (not zero) — never counted as a deficiency.
      </p>
    </div>
  );
}
