import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, Pressable, TextInput } from 'react-native';
import {
  deriveTargets,
  computeDailyStatus,
  sumNutrients,
  scaleNutrients,
  type NutritionProfile,
  type NutrientKey,
  type NutrientFlag,
  type Food,
  type Sex,
  type Goal,
} from '@musclr/core';
import { searchFoods, requestNutritionAdvice, lookupBarcode, type NutritionAdviceResult } from '../../lib/api';
import { useNutritionStore } from '../../lib/nutritionStore';
import { useSettingsStore, toAiSettings } from '../../lib/settingsStore';
import { useRecoveryStore } from '../../lib/recoveryStore';
import { BarcodeScanner } from '../../components/BarcodeScanner';

const LABELS: Record<NutrientKey, string> = {
  energy_kcal: 'Energy', protein_g: 'Protein', carbs_g: 'Carbs', fat_g: 'Fat', fiber_g: 'Fiber',
  vitamin_a_ug: 'Vit A', vitamin_c_mg: 'Vit C', vitamin_d_ug: 'Vit D', vitamin_e_mg: 'Vit E', vitamin_k_ug: 'Vit K',
  thiamin_mg: 'B1', riboflavin_mg: 'B2', niacin_mg: 'B3', vitamin_b6_mg: 'B6', folate_ug: 'Folate', vitamin_b12_ug: 'B12',
  calcium_mg: 'Calcium', iron_mg: 'Iron', magnesium_mg: 'Magnesium', zinc_mg: 'Zinc', potassium_mg: 'Potassium',
  sodium_mg: 'Sodium', selenium_ug: 'Selenium', copper_ug: 'Copper', manganese_mg: 'Manganese', phosphorus_mg: 'Phosphorus',
};
const MACROS: NutrientKey[] = ['energy_kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g'];

function flagColor(f: NutrientFlag): string {
  if (f === 'low') return '#ffc107';
  if (f === 'high' || f === 'over_ul') return '#f44336';
  if (f === 'ok') return '#4caf50';
  return '#52525c';
}
const round = (n: number) => (n >= 100 ? Math.round(n).toString() : n.toFixed(1));

export default function NutritionScreen() {
  const { items, add, remove, clear } = useNutritionStore();
  const settings = useSettingsStore();
  const bodyWeightKg = useRecoveryStore((s) => s.bodyWeightKg);
  const setRecovery = useRecoveryStore((s) => s.set);
  const [sex, setSex] = useState<Sex>('male');
  const [weightKg, setWeightKg] = useState(80);

  useEffect(() => {
    if (typeof bodyWeightKg === 'number' && bodyWeightKg > 0) setWeightKg(bodyWeightKg);
  }, [bodyWeightKg]);
  const [goal, setGoal] = useState<Goal>('maintain');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const [advice, setAdvice] = useState<NutritionAdviceResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  const profile: NutritionProfile = { sex, age: 30, heightCm: 180, weightKg, activity: 'moderate', goal };
  const targets = useMemo(() => deriveTargets(profile), [sex, weightKg, goal]);
  const consumed = useMemo(() => sumNutrients(items.map((i) => scaleNutrients(i.food.per100, i.grams))), [items]);
  const statuses = useMemo(() => computeDailyStatus(consumed, targets), [consumed, targets]);
  const byKey = useMemo(() => Object.fromEntries(statuses.map((s) => [s.key, s])), [statuses]);

  async function run() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      setResults(await searchFoods(query));
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
        setScanMsg(`No product for ${code}. Try search instead.`);
      }
    } catch (e) {
      setScanMsg(e instanceof Error ? e.message : String(e));
    }
  }
  async function getAdvice() {
    setAdvice(
      await requestNutritionAdvice(
        {
          lacking: statuses.filter((s) => s.flag === 'low').map((s) => s.key),
          overdone: statuses.filter((s) => s.flag === 'high' || s.flag === 'over_ul').map((s) => s.key),
          unknown: statuses.filter((s) => s.flag === 'unknown').map((s) => s.key),
        },
        toAiSettings(settings),
      ),
    );
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Text className="mb-1 font-display text-2xl text-ink">Nutrition</Text>
      <Text className="mb-4 text-sm text-ink-2">Macros &amp; micros vs evidence-based targets (USDA data).</Text>

      <View className="mb-4 flex-row flex-wrap items-center gap-2">
        {(['male', 'female'] as Sex[]).map((s) => (
          <Pressable key={s} onPress={() => setSex(s)} className={`rounded-md px-3 py-1.5 ${sex === s ? 'bg-accent' : 'bg-surface-2'}`}>
            <Text className={sex === s ? 'text-bg' : 'text-ink-2'}>{s}</Text>
          </Pressable>
        ))}
        <View className="flex-row items-center gap-1 rounded-md bg-surface-2 px-2 py-1">
          <TextInput
            value={String(weightKg)}
            onChangeText={(t) => {
              const v = Number(t) || 0;
              setWeightKg(v);
              if (v > 0) setRecovery({ bodyWeightKg: v });
            }}
            keyboardType="numeric"
            className="w-10 text-center text-sm text-ink"
            placeholderTextColor="#52525c"
          />
          <Text className="text-xs text-ink-3">kg</Text>
        </View>
        {(['cut', 'maintain', 'gain'] as Goal[]).map((g) => (
          <Pressable key={g} onPress={() => setGoal(g)} className={`rounded-md px-3 py-1.5 ${goal === g ? 'bg-accent' : 'bg-surface-2'}`}>
            <Text className={goal === g ? 'text-bg' : 'text-ink-2'}>{g}</Text>
          </Pressable>
        ))}
        <Text className="ml-auto font-mono text-xs text-ink-3">{targets.energyKcal} kcal · {targets.rda.protein_g}g P</Text>
      </View>

      <View className="mb-4 flex-row gap-2">
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={run}
          placeholder="Search foods…"
          placeholderTextColor="#52525c"
          className="flex-1 rounded-md bg-surface-2 px-3 py-2 text-ink"
        />
        <Pressable onPress={run} disabled={searching} className="rounded-md bg-accent px-4 py-2">
          <Text className="font-medium text-bg">{searching ? '…' : 'Search'}</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setScanMsg(null);
            setScanning((v) => !v);
          }}
          className="rounded-md bg-surface-2 px-4 py-2"
        >
          <Text className="text-ink">{scanning ? 'Stop' : 'Scan'}</Text>
        </Pressable>
      </View>
      {scanning && <BarcodeScanner onDetected={handleBarcode} onClose={() => setScanning(false)} />}
      {scanMsg && <Text className="mb-2 text-sm text-ink-2">{scanMsg}</Text>}

      <Pressable onPress={() => setShowManual((v) => !v)} className="mb-2">
        <Text className="font-mono text-xs text-ink-3">{showManual ? '− Hide manual entry' : '+ Add a food manually'}</Text>
      </Pressable>
      {showManual && (
        <ManualFoodForm
          onAdd={(food, grams) => {
            add(food, grams);
            setShowManual(false);
            setScanMsg(`Added ${food.name} (${grams} g).`);
          }}
        />
      )}

      {results.length > 0 && (
        <View className="mb-4 overflow-hidden rounded-xl border border-line bg-surface">
          {results.slice(0, 10).map((f) => (
            <View key={f.id} className="flex-row items-center gap-2 border-b border-line/40 px-3 py-2">
              <Text className="flex-1 text-sm text-ink" numberOfLines={1}>{f.name}</Text>
              <Pressable onPress={() => { add(f, 100); setResults([]); setQuery(''); }} className="rounded bg-surface-2 px-2 py-1">
                <Text className="text-xs text-ink">+100g</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View className="mb-4 flex-row items-center justify-between">
        <Text className="font-display text-lg text-ink">Today ({items.length})</Text>
        {items.length > 0 && <Pressable onPress={clear}><Text className="font-mono text-xs text-ink-3">clear</Text></Pressable>}
      </View>
      {items.map((i) => (
        <View key={i.key} className="mb-1 flex-row items-center gap-2 rounded-md bg-surface px-3 py-1.5">
          <Text className="flex-1 text-sm text-ink" numberOfLines={1}>{i.food.name}</Text>
          <Text className="font-mono text-xs text-ink-3">{i.grams}g</Text>
          <Pressable onPress={() => remove(i.key)}><Text className="text-ink-3">✕</Text></Pressable>
        </View>
      ))}

      <View className="mt-4 flex-row flex-wrap gap-2">
        {MACROS.map((k) => {
          const s = byKey[k];
          return (
            <View key={k} className="min-w-[30%] flex-1 rounded-xl border border-line bg-surface p-3">
              <Text className="font-mono text-xs text-ink-3">{LABELS[k]}</Text>
              <Text className="mt-1 text-base font-semibold" style={{ color: flagColor(s.flag) }}>
                {round(s.consumed ?? 0)}
                <Text className="text-xs text-ink-3"> / {round(s.target ?? 0)}</Text>
              </Text>
            </View>
          );
        })}
      </View>

      <Text className="mb-2 mt-4 font-display text-lg text-ink">Micronutrients</Text>
      <View className="flex-row flex-wrap gap-2">
        {statuses.filter((s) => !MACROS.includes(s.key)).map((s) => (
          <View key={s.key} className="min-w-[30%] flex-1 flex-row items-center gap-2 rounded-lg border border-line bg-surface px-2 py-1.5">
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: flagColor(s.flag) }} />
            <Text className="flex-1 text-xs text-ink" numberOfLines={1}>{LABELS[s.key]}</Text>
            <Text className="font-mono text-[10px] text-ink-3">{s.flag === 'unknown' ? '—' : `${s.pctTarget}%`}</Text>
          </View>
        ))}
      </View>

      <View className="mt-6 rounded-2xl border border-line bg-surface p-4">
        <View className="flex-row items-center justify-between">
          <Text className="font-display text-lg text-ink">AI suggestion</Text>
          <Pressable onPress={getAdvice} disabled={items.length === 0} className={`rounded-md px-3 py-1.5 ${items.length === 0 ? 'bg-surface-2' : 'bg-accent'}`}>
            <Text className={items.length === 0 ? 'text-ink-3' : 'text-bg'}>Get suggestion</Text>
          </Pressable>
        </View>
        {advice && (
          <View className="mt-3">
            <Text className="text-sm text-ink">{advice.advice.summary}</Text>
            {advice.advice.focus.map((f, i) => (
              <Text key={i} className="mt-1 text-sm" style={{ color: f.direction === 'increase' ? '#4caf50' : '#f44336' }}>
                {f.direction === 'increase' ? '↑' : '↓'} {f.nutrient}
                {f.foods.length ? <Text className="text-ink-2"> — {f.foods.join(', ')}</Text> : null}
              </Text>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

/** Manual custom-food entry (fallback when a barcode isn't found or for home-cooked foods). */
function ManualFoodForm({ onAdd }: { onAdd: (food: Food, grams: number) => void }) {
  const [name, setName] = useState('');
  const [grams, setGrams] = useState('100');
  const [kcal, setKcal] = useState('0');
  const [protein, setProtein] = useState('0');
  const [carbs, setCarbs] = useState('0');
  const [fat, setFat] = useState('0');

  const field = (label: string, v: string, set: (s: string) => void, w = 'w-16') => (
    <View>
      <Text className="font-mono text-[10px] text-ink-3">{label}</Text>
      <TextInput
        value={v}
        onChangeText={set}
        keyboardType="numeric"
        placeholderTextColor="#52525c"
        className={`${w} mt-1 rounded bg-surface-2 px-2 py-1 text-sm text-ink`}
      />
    </View>
  );

  function submit() {
    const g = Number(grams) || 0;
    if (!name.trim() || g <= 0) return;
    const scale = 100 / g;
    const food: Food = {
      id: `custom:${name.trim().toLowerCase()}:${Date.now()}`,
      source: 'custom',
      name: name.trim(),
      per100: {
        energy_kcal: (Number(kcal) || 0) * scale,
        protein_g: (Number(protein) || 0) * scale,
        carbs_g: (Number(carbs) || 0) * scale,
        fat_g: (Number(fat) || 0) * scale,
      },
      servings: [{ id: 'serving', label: `${g} g`, grams: g }],
      defaultServingId: 'serving',
      dataCompleteness: 0,
    };
    onAdd(food, g);
  }

  return (
    <View className="mb-4 rounded-xl border border-line bg-bg-2 p-3">
      <Text className="font-mono text-[10px] text-ink-3">Food name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. homemade chili"
        placeholderTextColor="#52525c"
        className="mb-2 mt-1 rounded bg-surface-2 px-2 py-1 text-sm text-ink"
      />
      <View className="flex-row flex-wrap gap-2">
        {field('Serving (g)', grams, setGrams)}
        {field('kcal', kcal, setKcal)}
        {field('Protein', protein, setProtein)}
        {field('Carbs', carbs, setCarbs)}
        {field('Fat', fat, setFat)}
      </View>
      <Pressable onPress={submit} className="mt-3 self-start rounded-md bg-accent px-4 py-2">
        <Text className="font-medium text-bg">Add</Text>
      </Pressable>
      <Text className="mt-2 font-mono text-[10px] text-ink-3">
        Micronutrients stay “unknown” (not zero) — never counted as a deficiency.
      </Text>
    </View>
  );
}
