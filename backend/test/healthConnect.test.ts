import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exchangeAndStore } from '../src/health/connect';
import { getConnection, open, seal } from '../src/health/tokenStore';

describe('wearable token encryption (AES-256-GCM)', () => {
  it('seals + opens round-trip; ciphertext does not contain the plaintext', () => {
    const secret = JSON.stringify({ access_token: 'super-secret-token', refresh_token: 'r' });
    const sealed = seal(secret);
    expect(sealed.ct).not.toContain('super-secret-token');
    expect(sealed.iv).toBeTruthy();
    expect(sealed.tag).toBeTruthy();
    expect(open(sealed)).toBe(secret);
  });

  it('tamper detection: a modified ciphertext fails to open', () => {
    const sealed = seal('hello');
    const tampered = { ...sealed, ct: Buffer.from('garbage').toString('base64') };
    expect(() => open(tampered)).toThrow();
  });
});

describe('OAuth exchange → encrypt → store pipeline (conformant mock provider)', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('exchanges the code, then stores ENCRYPTED tokens that decrypt back', async () => {
    const tokens = { access_token: 'AT-123', refresh_token: 'RT-456', expires_in: 3600 };
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify(tokens), { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await exchangeAndStore('fitbit', {
      code: 'auth-code',
      codeVerifier: 'verifier',
      clientId: 'cid',
      clientSecret: 'secret',
      redirectUri: 'https://app/cb',
      userKey: 'user-1',
    });
    expect(res).toEqual({ connected: true, persisted: true });

    // Hit the right token endpoint with the right grant + basic auth + PKCE verifier.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.fitbit.com/oauth2/token');
    const body = String(init.body);
    expect(body).toContain('grant_type=authorization_code');
    expect(body).toContain('code_verifier=verifier');
    expect((init.headers as Record<string, string>).Authorization).toMatch(/^Basic /);

    // Stored at rest as ciphertext; decrypts back to exactly the provider tokens.
    const sealed = getConnection('user-1', 'fitbit')!;
    expect(sealed.ct).not.toContain('AT-123');
    expect(JSON.parse(open(sealed))).toEqual(tokens);
  });

  it('rejects a failed token exchange (no partial connection stored)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('unauthorized', { status: 401 })));
    await expect(
      exchangeAndStore('whoop', { code: 'c', clientId: 'id', redirectUri: 'r', userKey: 'u2' }),
    ).rejects.toThrow(/token_exchange_failed/);
    expect(getConnection('u2', 'whoop')).toBeUndefined();
  });
});
