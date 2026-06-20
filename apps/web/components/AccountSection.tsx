'use client';

import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { backupToCloud, restoreFromCloud } from '../lib/sync';

export function AccountSection() {
  const { configured, user, error, signInWithPassword, signUp, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!configured) {
    return (
      <section className="mt-6 rounded-2xl border border-line bg-surface p-6">
        <h2 className="mb-1 font-display text-lg font-semibold">Account &amp; sync</h2>
        <p className="text-sm text-ink-2">
          Running in <span className="text-ink">local-only</span> mode — your data is saved on this
          device. Configure Supabase (see <span className="text-ink">docs/CREDENTIALS.md</span>) to
          enable accounts and multi-device sync.
        </p>
      </section>
    );
  }

  async function run(fn: () => Promise<void>, ok: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg(ok);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-line bg-surface p-6">
      <h2 className="mb-3 font-display text-lg font-semibold">Account &amp; sync</h2>

      {user ? (
        <>
          <p className="text-sm text-ink-2">
            Signed in as <span className="text-ink">{user.email ?? user.id}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => run(() => backupToCloud(user.id), 'Backed up to the cloud.')}
              disabled={busy}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg disabled:opacity-50"
            >
              Back up now
            </button>
            <button
              onClick={() => run(() => restoreFromCloud(user.id), 'Restored from the cloud.')}
              disabled={busy}
              className="rounded-md bg-surface-2 px-3 py-1.5 text-sm hover:bg-surface-3"
            >
              Restore on this device
            </button>
            <button onClick={() => void signOut()} className="rounded-md px-3 py-1.5 text-sm text-ink-3 hover:text-ink">
              Sign out
            </button>
          </div>
          <p className="mt-2 text-xs text-ink-3">
            Changes auto-back-up while signed in. “Restore” pulls your cloud data onto this device.
          </p>
        </>
      ) : (
        <>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mb-2 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            className="mb-3 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm"
            autoComplete="current-password"
          />
          <div className="flex gap-2">
            <button
              onClick={() => run(() => signInWithPassword(email, password), 'Signed in.')}
              disabled={busy}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg disabled:opacity-50"
            >
              Sign in
            </button>
            <button
              onClick={() => run(() => signUp(email, password), 'Check your email to confirm.')}
              disabled={busy}
              className="rounded-md bg-surface-2 px-3 py-1.5 text-sm hover:bg-surface-3"
            >
              Create account
            </button>
          </div>
        </>
      )}

      {(msg || error) && <p className="mt-3 text-sm text-ink-2">{msg ?? error}</p>}
    </section>
  );
}
