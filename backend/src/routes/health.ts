import { Hono } from 'hono';
import { createHash, randomBytes } from 'node:crypto';
import {
  CLOUD_PROVIDERS,
  isCloudProvider,
  buildAuthorizeUrl,
  buildTokenExchange,
  type CloudProvider,
} from '../health/oauth';

export const health = new Hono();

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL ?? 'http://localhost:8787';
const clientId = (p: CloudProvider) => process.env[`${p.toUpperCase()}_CLIENT_ID`];
const clientSecret = (p: CloudProvider) => process.env[`${p.toUpperCase()}_CLIENT_SECRET`];

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// List cloud providers + whether each is configured (client id present).
health.get('/providers', (c) =>
  c.json({
    providers: Object.values(CLOUD_PROVIDERS).map((p) => ({
      id: p.id,
      label: p.label,
      scopes: p.scopes,
      usesPkce: p.usesPkce,
      note: p.note,
      configured: Boolean(clientId(p.id)),
    })),
  }),
);

// Begin OAuth: returns the authorize URL (+ a PKCE verifier the caller must keep for the callback).
health.get('/:provider/connect', (c) => {
  const provider = c.req.param('provider');
  if (!isCloudProvider(provider)) return c.json({ error: 'unknown_provider' }, 404);
  const id = clientId(provider);
  if (!id) {
    return c.json(
      {
        error: 'provider_not_configured',
        detail: `Set ${provider.toUpperCase()}_CLIENT_ID and register the app — see docs/WEARABLES.md.`,
      },
      501,
    );
  }
  const cfg = CLOUD_PROVIDERS[provider];
  const state = base64url(randomBytes(16));
  const redirectUri = `${PUBLIC_BASE_URL}/api/health/${provider}/callback`;

  let codeVerifier: string | undefined;
  let codeChallenge: string | undefined;
  if (cfg.usesPkce) {
    codeVerifier = base64url(randomBytes(32));
    codeChallenge = base64url(createHash('sha256').update(codeVerifier).digest());
  }

  const authorizeUrl = buildAuthorizeUrl(provider, { clientId: id, redirectUri, state, codeChallenge });
  // The caller stores { state, codeVerifier } (e.g. in the user's session) and re-supplies them at callback.
  return c.json({ authorizeUrl, state, codeVerifier });
});

// OAuth callback: exchange the code for tokens. Persisting tokens requires Supabase + Cloud KMS
// (envelope encryption) — see docs/WEARABLES.md. Without them we don't store plaintext secrets.
health.get('/:provider/callback', async (c) => {
  const provider = c.req.param('provider');
  if (!isCloudProvider(provider)) return c.json({ error: 'unknown_provider' }, 404);
  const code = c.req.query('code');
  const codeVerifier = c.req.query('code_verifier') ?? undefined;
  const id = clientId(provider);
  const secret = clientSecret(provider);
  if (!code || !id) return c.json({ error: 'missing_code_or_config' }, 400);

  const redirectUri = `${PUBLIC_BASE_URL}/api/health/${provider}/callback`;
  const { url, body } = buildTokenExchange(provider, { code, redirectUri, clientId: id, codeVerifier });
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (secret) headers.Authorization = `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`;

  try {
    const res = await fetch(url, { method: 'POST', headers, body });
    if (!res.ok) return c.json({ error: 'token_exchange_failed', status: res.status }, 502);
    // Tokens obtained. Encrypt with Cloud KMS + upsert into Supabase health_connections before
    // returning to production. For now, acknowledge without persisting plaintext.
    return c.json({ connected: true, persisted: false, note: 'Configure Supabase + Cloud KMS to persist tokens (docs/WEARABLES.md).' });
  } catch (e) {
    return c.json({ error: 'provider_error', detail: e instanceof Error ? e.message : String(e) }, 502);
  }
});
