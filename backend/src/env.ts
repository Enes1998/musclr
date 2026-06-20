export const PORT = Number(process.env.PORT ?? 8787);

// Vertex AI (default hosted provider) — uses Application Default Credentials on Cloud Run.
export const VERTEX_PROJECT = process.env.GOOGLE_VERTEX_PROJECT ?? '';
export const VERTEX_LOCATION = process.env.GOOGLE_VERTEX_LOCATION ?? 'us-central1';

// CORS allow-list for the web app (comma-separated). '*' in dev.
export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ?? '*';

// USDA FoodData Central (CC0). DEMO_KEY works for low-volume dev (rate-limited).
export const USDA_API_KEY = process.env.USDA_API_KEY ?? 'DEMO_KEY';

// Open Food Facts requires a descriptive User-Agent.
export const OFF_USER_AGENT = process.env.OFF_USER_AGENT ?? 'musclr/0.1 (dev)';

// Default model per provider — overridable without code changes (model IDs churn quickly).
export const MODEL_DEFAULTS = {
  hosted: process.env.HOSTED_MODEL ?? 'gemini-2.5-flash',
  openai: process.env.OPENAI_MODEL ?? 'gpt-4o-2024-08-06',
  anthropic: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
  google: process.env.GOOGLE_MODEL ?? 'gemini-2.5-flash',
  local: process.env.LOCAL_MODEL ?? 'llama3.1',
} as const;

export const LOCAL_BASE_URL = process.env.LOCAL_BASE_URL ?? 'http://localhost:11434/v1';

// --- Anti-abuse (all optional; enforced only when configured) ---
// Per-client rate limits on the expensive LLM routes (0 = disabled).
export const RATE_LIMIT_PER_MIN = Number(process.env.RATE_LIMIT_PER_MIN ?? 20);
export const RATE_LIMIT_PER_DAY = Number(process.env.RATE_LIMIT_PER_DAY ?? 500);
// Supabase auth: verify a Bearer JWT when configured. JWKS (modern) or HS256 secret (legacy).
export const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
export const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? '';
// Require a valid Supabase JWT on the hosted relay (anonymous sign-in counts). Off in dev.
export const REQUIRE_AUTH = (process.env.REQUIRE_AUTH ?? 'false') === 'true';
// Cloudflare Turnstile (web bot defense): verify the token when the secret is set.
export const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET ?? '';
