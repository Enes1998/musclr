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
