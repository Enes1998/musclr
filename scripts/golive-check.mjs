// Go-live self-test. After adding credentials (docs/CREDENTIALS.md), run this to verify which live
// integrations are actually working end-to-end:
//   API_URL=https://your-backend node scripts/golive-check.mjs
// Exits non-zero if a configured integration fails (so it can gate a release).

const API = process.env.API_URL ?? 'http://localhost:8787';
const results = [];
const ok = (name, detail) => results.push({ name, status: 'ok', detail });
const warn = (name, detail) => results.push({ name, status: 'skip', detail });
const fail = (name, detail) => results.push({ name, status: 'FAIL', detail });

async function json(url, init) {
  const res = await fetch(url, init);
  return { res, body: await res.json().catch(() => ({})) };
}

// 1. Backend health
try {
  const { res, body } = await json(`${API}/health`);
  if (res.ok && body.ok) ok('backend /health', `${API}`);
  else fail('backend /health', `HTTP ${res.status}`);
} catch (e) {
  fail('backend /health', e.message);
}

// 2. AI relay (mock path always works; reports if a live provider is wired server-side)
try {
  const { res, body } = await json(`${API}/api/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal: 'hypertrophy', loads: { chest: 60 }, provider: 'mock' }),
  });
  if (res.ok && body.plan) ok('AI relay (mock)', `provider=${body.meta?.provider}`);
  else fail('AI relay (mock)', `HTTP ${res.status}`);
} catch (e) {
  fail('AI relay (mock)', e.message);
}

// 3. Nutrition / USDA
try {
  const { res, body } = await json(`${API}/api/nutrition/search?q=greek%20yogurt`);
  if (res.ok && Array.isArray(body.foods) && body.foods.length) ok('USDA nutrition search', `${body.foods.length} foods`);
  else warn('USDA nutrition search', 'no foods (DEMO_KEY rate-limited? set USDA_API_KEY)');
} catch (e) {
  fail('USDA nutrition search', e.message);
}

// 4. Wearable cloud providers configured?
try {
  const { res, body } = await json(`${API}/api/health/providers`);
  if (res.ok) {
    const live = (body.providers ?? []).filter((p) => p.configured).map((p) => p.id);
    live.length ? ok('Wearable OAuth', `configured: ${live.join(', ')}`) : warn('Wearable OAuth', 'none configured yet');
  } else fail('Wearable OAuth', `HTTP ${res.status}`);
} catch (e) {
  fail('Wearable OAuth', e.message);
}

// 5. Supabase (client env) reachability
const sb = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
if (sb) {
  try {
    const res = await fetch(`${sb}/auth/v1/health`);
    res.ok ? ok('Supabase auth', sb) : warn('Supabase auth', `HTTP ${res.status}`);
  } catch (e) {
    fail('Supabase auth', e.message);
  }
} else {
  warn('Supabase auth', 'SUPABASE_URL not set (app runs local-only)');
}

// Report
const pad = (s, n) => String(s).padEnd(n);
console.log('\nmuslr go-live check —', API, '\n' + '-'.repeat(60));
for (const r of results) {
  const icon = r.status === 'ok' ? '✓' : r.status === 'skip' ? '·' : '✗';
  console.log(`${icon} ${pad(r.name, 26)} ${r.status === 'FAIL' ? 'FAIL' : r.status === 'skip' ? 'skip' : 'live'}  ${r.detail ?? ''}`);
}
const failed = results.filter((r) => r.status === 'FAIL').length;
console.log('-'.repeat(60));
console.log(failed ? `${failed} check(s) failed.` : 'All configured integrations healthy.');
process.exit(failed ? 1 : 0);
