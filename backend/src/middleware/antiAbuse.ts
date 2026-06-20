// Anti-abuse for the expensive LLM routes. Everything is OPT-IN via env and enforced only when
// configured, so the backend runs open in dev and locks down in production by setting env vars.
//
//   - Rate limiting: per-client fixed windows (per-minute + per-day cost cap). In-memory — fine for
//     a single instance; for multi-instance Cloud Run, back this with Redis/Upstash (see runbook).
//   - Auth: verify a Supabase Bearer JWT (JWKS for modern projects, or HS256 secret for legacy).
//     Anonymous sign-in counts. With REQUIRE_AUTH=true, requests without a valid token are rejected.
//   - Cloudflare Turnstile: when TURNSTILE_SECRET is set, web clients must pass a verified token.
//
// Mobile attestation (Apple App Attest / Google Play Integrity) is a documented extension point
// (verifyMobileAttestation) — full server verification needs the platform crypto/libraries; see
// docs/CREDENTIALS.md. Until enabled, mobile is protected by rate limiting + (optional) auth.

import type { Context, Next } from 'hono';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import {
  RATE_LIMIT_PER_MIN,
  RATE_LIMIT_PER_DAY,
  REQUIRE_AUTH,
  SUPABASE_JWT_SECRET,
  SUPABASE_URL,
  TURNSTILE_SECRET,
} from '../env';

function clientIp(c: Context): string {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    'unknown'
  );
}

// --- Fixed-window counters (in-memory) ---
interface Window {
  count: number;
  resetAt: number;
}
const perMinute = new Map<string, Window>();
const perDay = new Map<string, Window>();

function allow(map: Map<string, Window>, key: string, windowMs: number, limit: number, now: number): boolean {
  if (limit <= 0) return true;
  const w = map.get(key);
  if (!w || now >= w.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (w.count >= limit) return false;
  w.count += 1;
  return true;
}

// Occasionally evict expired windows so the maps don't grow unbounded.
function sweep(now: number): void {
  for (const map of [perMinute, perDay]) {
    if (map.size < 5000) continue;
    for (const [k, w] of map) if (now >= w.resetAt) map.delete(k);
  }
}

// --- Supabase JWT verification ---
let jwks: JWTVerifyGetKey | null = null;
function getJwks(): JWTVerifyGetKey {
  if (!jwks) jwks = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
  return jwks;
}

/** Returns the JWT subject (user id) when valid, else null. No-op (null) when auth isn't configured. */
async function verifyJwt(token: string): Promise<string | null> {
  try {
    if (SUPABASE_JWT_SECRET) {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(SUPABASE_JWT_SECRET));
      return (payload.sub as string) ?? null;
    }
    if (SUPABASE_URL) {
      const { payload } = await jwtVerify(token, getJwks());
      return (payload.sub as string) ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

// --- Cloudflare Turnstile ---
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: TURNSTILE_SECRET, response: token, remoteip: ip }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

/**
 * Extension point: verify a mobile platform-attestation header. Full verification of Apple App
 * Attest / Google Play Integrity tokens requires the respective platform libraries and key
 * material; wire that here (and flip on via env) per docs/CREDENTIALS.md. Returns true today so it
 * never blocks before being configured — rate limiting + auth still apply.
 */
async function verifyMobileAttestation(_token: string | undefined, _platform: string): Promise<boolean> {
  return true;
}

export function antiAbuse() {
  return async (c: Context, next: Next) => {
    const now = Date.now();
    sweep(now);

    // 1) Auth (Supabase JWT). Identify the subject if a token is present.
    let subject: string | null = null;
    const auth = c.req.header('authorization');
    if (auth?.startsWith('Bearer ')) subject = await verifyJwt(auth.slice(7));
    if (REQUIRE_AUTH && !subject) {
      return c.json({ error: 'unauthorized', detail: 'A valid Supabase token is required.' }, 401);
    }

    // 2) Bot defense by platform.
    const platform = (c.req.header('x-musclr-platform') ?? 'web').toLowerCase();
    if (platform === 'web' && TURNSTILE_SECRET) {
      const token = c.req.header('x-turnstile-token');
      if (!token || !(await verifyTurnstile(token, clientIp(c)))) {
        return c.json({ error: 'turnstile_failed' }, 403);
      }
    } else if (platform === 'ios' || platform === 'android') {
      const ok = await verifyMobileAttestation(c.req.header('x-attestation-token'), platform);
      if (!ok) return c.json({ error: 'attestation_failed' }, 403);
    }

    // 3) Rate limit + daily cost cap, keyed by user (if signed in) else IP.
    const key = subject ?? `ip:${clientIp(c)}`;
    if (!allow(perMinute, key, 60_000, RATE_LIMIT_PER_MIN, now)) {
      return c.json({ error: 'rate_limited', scope: 'minute', retryAfterSec: 60 }, 429);
    }
    if (!allow(perDay, key, 86_400_000, RATE_LIMIT_PER_DAY, now)) {
      return c.json({ error: 'rate_limited', scope: 'day' }, 429);
    }

    await next();
  };
}
