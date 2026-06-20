import { describe, it, expect } from 'vitest';
import {
  CLOUD_PROVIDERS,
  isCloudProvider,
  buildAuthorizeUrl,
  buildTokenExchange,
} from '../src/health/oauth';

describe('wearable OAuth registry', () => {
  it('knows the five cloud providers', () => {
    expect(Object.keys(CLOUD_PROVIDERS).sort()).toEqual(['fitbit', 'garmin', 'oura', 'polar', 'whoop']);
    expect(isCloudProvider('fitbit')).toBe(true);
    expect(isCloudProvider('nope')).toBe(false);
  });

  it('builds a non-PKCE authorize URL (whoop) with scopes + state', () => {
    const url = new URL(buildAuthorizeUrl('whoop', { clientId: 'cid', redirectUri: 'https://app/cb', state: 'xyz' }));
    expect(url.origin + url.pathname).toBe('https://api.prod.whoop.com/oauth/oauth2/auth');
    expect(url.searchParams.get('client_id')).toBe('cid');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('state')).toBe('xyz');
    expect(url.searchParams.get('scope')).toContain('offline');
    expect(url.searchParams.get('code_challenge')).toBeNull();
  });

  it('requires + includes a PKCE challenge for Fitbit', () => {
    expect(() => buildAuthorizeUrl('fitbit', { clientId: 'c', redirectUri: 'r', state: 's' })).toThrow(/PKCE/);
    const url = new URL(
      buildAuthorizeUrl('fitbit', { clientId: 'c', redirectUri: 'r', state: 's', codeChallenge: 'chal' }),
    );
    expect(url.searchParams.get('code_challenge')).toBe('chal');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  });

  it('builds a token-exchange request, requiring the verifier for PKCE providers', () => {
    const ex = buildTokenExchange('whoop', { code: 'abc', redirectUri: 'r', clientId: 'c' });
    expect(ex.url).toBe('https://api.prod.whoop.com/oauth/oauth2/token');
    expect(ex.body.get('grant_type')).toBe('authorization_code');
    expect(ex.body.get('code')).toBe('abc');
    expect(() => buildTokenExchange('fitbit', { code: 'a', redirectUri: 'r', clientId: 'c' })).toThrow(/verifier/);
    const fit = buildTokenExchange('fitbit', { code: 'a', redirectUri: 'r', clientId: 'c', codeVerifier: 'v' });
    expect(fit.body.get('code_verifier')).toBe('v');
  });
});
