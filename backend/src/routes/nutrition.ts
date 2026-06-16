import { Hono } from 'hono';
import { foodFromUsda, type Food, type UsdaFood, type NutrientVector, type NutrientKey } from '@musclr/core';
import { USDA_API_KEY, OFF_USER_AGENT } from '../env';

export const nutrition = new Hono();

// USDA FoodData Central food search (primary nutrient source, CC0).
nutrition.get('/search', async (c) => {
  const q = c.req.query('q')?.trim();
  if (!q) return c.json({ foods: [] });

  const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/search');
  url.searchParams.set('api_key', USDA_API_KEY);
  url.searchParams.set('query', q);
  url.searchParams.set('dataType', 'Foundation,SR Legacy,Branded');
  url.searchParams.set('pageSize', '15');

  const res = await fetch(url);
  if (!res.ok) return c.json({ error: 'usda_error', status: res.status }, 502);
  const data = (await res.json()) as { foods?: UsdaFood[] };
  const foods: Food[] = (data.foods ?? [])
    .map(foodFromUsda)
    .filter((f) => Object.keys(f.per100).length > 0);
  return c.json({ foods });
});

// Open Food Facts barcode lookup (ODbL, barcode-keyed fallback). No API key; UA required.
const OFF_MAP: Record<string, { key: NutrientKey; factor: number }> = {
  'energy-kcal_100g': { key: 'energy_kcal', factor: 1 },
  proteins_100g: { key: 'protein_g', factor: 1 },
  carbohydrates_100g: { key: 'carbs_g', factor: 1 },
  fat_100g: { key: 'fat_g', factor: 1 },
  fiber_100g: { key: 'fiber_g', factor: 1 },
  'vitamin-c_100g': { key: 'vitamin_c_mg', factor: 1000 }, // OFF stores in g
  calcium_100g: { key: 'calcium_mg', factor: 1000 },
  iron_100g: { key: 'iron_mg', factor: 1000 },
  sodium_100g: { key: 'sodium_mg', factor: 1000 },
  potassium_100g: { key: 'potassium_mg', factor: 1000 },
};

nutrition.get('/barcode/:code', async (c) => {
  const code = c.req.param('code');
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`, {
    headers: { 'User-Agent': OFF_USER_AGENT },
  });
  if (!res.ok) return c.json({ error: 'off_error', status: res.status }, 502);
  const data = (await res.json()) as { status?: number; product?: { product_name?: string; brands?: string; nutriments?: Record<string, number> } };
  if (data.status !== 1 || !data.product) return c.json({ found: false }, 404);

  const nutriments = data.product.nutriments ?? {};
  const per100: NutrientVector = {};
  for (const [offKey, m] of Object.entries(OFF_MAP)) {
    const v = nutriments[offKey];
    if (typeof v === 'number') per100[m.key] = v * m.factor;
  }
  const food: Food = {
    id: `off:${code}`,
    source: 'off',
    sourceId: code,
    name: data.product.product_name ?? `Product ${code}`,
    brand: data.product.brands,
    per100,
    servings: [{ id: '100g', label: '100 g', grams: 100 }],
    defaultServingId: '100g',
    dataCompleteness: 0,
  };
  return c.json({ found: true, food });
});
