import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { generatePlan, PlanError, type GenerateInput, type PlanProvider } from './ai/generatePlan';
import { nutrition } from './routes/nutrition';
import { ALLOWED_ORIGINS } from './env';
import type { MuscleId, TrainingGoal } from '@musclr/core';

const GOALS: TrainingGoal[] = ['strength', 'hypertrophy', 'endurance', 'general'];
const PROVIDERS: PlanProvider[] = ['mock', 'hosted', 'openai', 'anthropic', 'google', 'local'];

export const app = new Hono();

app.use(
  '/api/*',
  cors({ origin: ALLOWED_ORIGINS === '*' ? '*' : ALLOWED_ORIGINS.split(','), allowMethods: ['POST', 'GET', 'OPTIONS'] }),
);

app.get('/health', (c) => c.json({ ok: true, service: 'musclr-backend' }));

app.route('/api/nutrition', nutrition);

app.post('/api/ai', async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== 'object') return c.json({ error: 'invalid_body' }, 400);

  // Light coercion / allow-listing of the request.
  const goal = (GOALS.includes(body.goal as TrainingGoal) ? body.goal : 'general') as TrainingGoal;
  const provider = (PROVIDERS.includes(body.provider as PlanProvider) ? body.provider : 'mock') as PlanProvider;
  const loads = (body.loads ?? {}) as Partial<Record<MuscleId, number>>;

  const input: GenerateInput = {
    goal,
    loads,
    provider,
    recentWeeklySets: body.recentWeeklySets as GenerateInput['recentWeeklySets'],
    nutrition: body.nutrition as GenerateInput['nutrition'],
    readiness: typeof body.readiness === 'number' ? (body.readiness as number) : undefined,
    model: typeof body.model === 'string' ? body.model : undefined,
    byoKey: typeof body.byoKey === 'string' ? body.byoKey : undefined,
    localBaseUrl: typeof body.localBaseUrl === 'string' ? body.localBaseUrl : undefined,
  };

  try {
    const out = await generatePlan(input);
    return c.json(out);
  } catch (e) {
    if (e instanceof PlanError) return c.json({ error: e.kind, issues: e.issues }, 422);
    return c.json({ error: 'provider_error', detail: e instanceof Error ? e.message : String(e) }, 502);
  }
});
