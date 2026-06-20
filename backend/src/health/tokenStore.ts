// At-rest encryption + storage for wearable OAuth tokens. Tokens are NEVER stored in plaintext:
// AES-256-GCM with a master key from HEALTH_TOKEN_MASTER_KEY (kept in Secret Manager in prod).
// In production the encrypted blob is persisted to Supabase `health_connections` (RLS-guarded) and
// the master key can be a Cloud KMS-wrapped DEK; this module provides the working software envelope
// + a dev in-memory store behind the same interface.

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';

const RAW_KEY = process.env.HEALTH_TOKEN_MASTER_KEY ?? '';
export const isTokenKeyConfigured = RAW_KEY.length > 0;

function key(): Buffer {
  // 32-byte AES key derived from the configured master secret (or a clearly-insecure dev default).
  return createHash('sha256').update(RAW_KEY || 'musclr-dev-insecure-token-key').digest();
}

export interface SealedToken {
  iv: string;
  ct: string;
  tag: string;
}

export function seal(plaintext: string): SealedToken {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return { iv: iv.toString('base64'), ct: ct.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
}

export function open(sealed: SealedToken): string {
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(sealed.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(sealed.tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(sealed.ct, 'base64')), decipher.final()]).toString('utf8');
}

// Dev/in-memory store. Production swaps this for Supabase `health_connections` (same interface).
const mem = new Map<string, SealedToken>();
const k = (userKey: string, provider: string) => `${userKey}:${provider}`;

export function storeConnection(userKey: string, provider: string, sealed: SealedToken): void {
  mem.set(k(userKey, provider), sealed);
}
export function getConnection(userKey: string, provider: string): SealedToken | undefined {
  return mem.get(k(userKey, provider));
}
export function removeConnection(userKey: string, provider: string): boolean {
  return mem.delete(k(userKey, provider));
}
