// The OAuth token-exchange → encrypt → store pipeline (shared by the route + tests). Keeps the
// network call (fetch) thin so the whole flow is testable against a conformant token endpoint.

import { buildTokenExchange, type CloudProvider } from './oauth';
import { seal, storeConnection } from './tokenStore';

export interface ExchangeParams {
  code: string;
  codeVerifier?: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  /** Identifies the user (resolved from OAuth `state` → session in the route). */
  userKey: string;
}

export interface ExchangeResult {
  connected: boolean;
  persisted: boolean;
}

/** Exchange the auth code for tokens, encrypt them, and store the connection. Never logs/returns the tokens. */
export async function exchangeAndStore(provider: CloudProvider, p: ExchangeParams): Promise<ExchangeResult> {
  const { url, body } = buildTokenExchange(provider, {
    code: p.code,
    redirectUri: p.redirectUri,
    clientId: p.clientId,
    codeVerifier: p.codeVerifier,
  });
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (p.clientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${p.clientId}:${p.clientSecret}`).toString('base64')}`;
  }

  const res = await fetch(url, { method: 'POST', headers, body });
  if (!res.ok) throw new Error(`token_exchange_failed:${res.status}`);
  const tokens = (await res.json()) as Record<string, unknown>;
  if (!tokens.access_token) throw new Error('token_exchange_missing_access_token');

  storeConnection(p.userKey, provider, seal(JSON.stringify(tokens)));
  return { connected: true, persisted: true };
}
