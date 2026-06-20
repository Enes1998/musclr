// Cloud wearable OAuth registry + URL/request builders. Pure + testable (no network here): the
// route layer wires these to fetch + token storage. Each provider needs a registered developer app
// (see docs/WEARABLES.md); some are gated (Whoop 10-user cap until approval; Garmin partner-only).

export type CloudProvider = 'whoop' | 'fitbit' | 'oura' | 'garmin' | 'polar';

export interface ProviderConfig {
  id: CloudProvider;
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  usesPkce: boolean;
  /** Notes on availability / gating, surfaced to the user. */
  note?: string;
}

export const CLOUD_PROVIDERS: Record<CloudProvider, ProviderConfig> = {
  whoop: {
    id: 'whoop',
    label: 'WHOOP',
    authorizeUrl: 'https://api.prod.whoop.com/oauth/oauth2/auth',
    tokenUrl: 'https://api.prod.whoop.com/oauth/oauth2/token',
    scopes: ['read:recovery', 'read:cycles', 'read:sleep', 'read:workout', 'offline'],
    usesPkce: false,
    note: '10-user cap until app approval — apply early.',
  },
  fitbit: {
    id: 'fitbit',
    label: 'Fitbit',
    authorizeUrl: 'https://www.fitbit.com/oauth2/authorize',
    tokenUrl: 'https://api.fitbit.com/oauth2/token',
    scopes: ['activity', 'heartrate', 'sleep', 'weight', 'profile'],
    usesPkce: true,
  },
  oura: {
    id: 'oura',
    label: 'Oura',
    authorizeUrl: 'https://cloud.ouraring.com/oauth/authorize',
    tokenUrl: 'https://api.ouraring.com/oauth/token',
    scopes: ['daily', 'heartrate', 'workout', 'session'],
    usesPkce: false,
  },
  garmin: {
    id: 'garmin',
    label: 'Garmin',
    authorizeUrl: 'https://connect.garmin.com/oauth2Confirm',
    tokenUrl: 'https://diauth.garmin.com/di-oauth2-service/oauth/token',
    scopes: ['health_read'],
    usesPkce: true,
    note: 'Partner-approval gated — apply and use the sandbox first.',
  },
  polar: {
    id: 'polar',
    label: 'Polar',
    authorizeUrl: 'https://flow.polar.com/oauth2/authorization',
    tokenUrl: 'https://polarremote.com/v2/oauth2/token',
    scopes: ['accesslink.read_all'],
    usesPkce: false,
  },
};

export function isCloudProvider(x: string): x is CloudProvider {
  return x in CLOUD_PROVIDERS;
}

export interface AuthorizeParams {
  clientId: string;
  redirectUri: string;
  state: string;
  /** PKCE S256 challenge (required when the provider usesPkce). */
  codeChallenge?: string;
}

/** Build the provider's OAuth authorize URL the client should be sent to. */
export function buildAuthorizeUrl(provider: CloudProvider, p: AuthorizeParams): string {
  const cfg = CLOUD_PROVIDERS[provider];
  const url = new URL(cfg.authorizeUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', p.clientId);
  url.searchParams.set('redirect_uri', p.redirectUri);
  url.searchParams.set('scope', cfg.scopes.join(' '));
  url.searchParams.set('state', p.state);
  if (cfg.usesPkce) {
    if (!p.codeChallenge) throw new Error(`${provider} requires a PKCE code_challenge`);
    url.searchParams.set('code_challenge', p.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
  }
  return url.toString();
}

export interface TokenExchange {
  url: string;
  body: URLSearchParams;
}

/** Build the token-exchange request (auth-code → tokens). The route adds the auth header + fetches. */
export function buildTokenExchange(
  provider: CloudProvider,
  p: { code: string; redirectUri: string; clientId: string; codeVerifier?: string },
): TokenExchange {
  const cfg = CLOUD_PROVIDERS[provider];
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: p.code,
    redirect_uri: p.redirectUri,
    client_id: p.clientId,
  });
  if (cfg.usesPkce) {
    if (!p.codeVerifier) throw new Error(`${provider} requires a PKCE code_verifier`);
    body.set('code_verifier', p.codeVerifier);
  }
  return { url: cfg.tokenUrl, body };
}
