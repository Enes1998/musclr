'use client';

import { useState } from 'react';
import { useSettingsStore, toAiSettings } from '../../lib/settingsStore';
import { useHasHydrated } from '../../lib/store';
import { requestPlan, type PlanProvider } from '../../lib/api';
import { LOCALES, LOCALE_LABELS } from '@musclr/core';
import { AccountSection } from '../../components/AccountSection';

const PROVIDERS: { id: PlanProvider; label: string; note: string }[] = [
  { id: 'mock', label: 'Built-in (no key)', note: 'Deterministic, evidence-grounded plans. Works offline, no account.' },
  { id: 'hosted', label: 'Hosted (Gemini/Vertex)', note: 'Default cloud coach via the backend (requires the server-side Vertex project).' },
  { id: 'openai', label: 'OpenAI (your key)', note: 'Bring your own OpenAI API key.' },
  { id: 'anthropic', label: 'Anthropic Claude (your key)', note: 'Bring your own Anthropic API key.' },
  { id: 'google', label: 'Google Gemini (your key)', note: 'Bring your own Google AI Studio key.' },
  { id: 'local', label: 'Local (Ollama / LM Studio)', note: 'Runs on your machine; only reachable when the backend is local (dev/desktop).' },
];

const NEEDS_KEY: PlanProvider[] = ['openai', 'anthropic', 'google'];

export default function SettingsPage() {
  const hydrated = useHasHydrated();
  const s = useSettingsStore();
  const [test, setTest] = useState<{ status: 'idle' | 'testing' | 'ok' | 'error'; msg?: string }>({
    status: 'idle',
  });

  async function testConnection() {
    setTest({ status: 'testing' });
    try {
      const res = await requestPlan({
        goal: 'general',
        loads: { chest: 50, back: 50 },
        ai: toAiSettings(s),
      });
      setTest({ status: 'ok', msg: `${res.meta.provider} · ${res.meta.model} · ${res.meta.durationMs}ms` });
    } catch (e) {
      setTest({ status: 'error', msg: e instanceof Error ? e.message : String(e) });
    }
  }

  if (!hydrated) {
    return <main className="mx-auto max-w-3xl px-6 py-10 text-ink-3">Loading…</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 font-display text-2xl font-semibold">Settings</h1>

      <section className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="mb-1 font-display text-lg font-semibold">AI coach provider</h2>
        <p className="mb-4 text-xs text-ink-3">
          The coach is always grounded in the same evidence module. Choose who runs the model.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => s.setProvider(p.id)}
              className={`rounded-xl border p-3 text-left ${
                s.provider === p.id ? 'border-accent bg-surface-2' : 'border-line hover:border-ink-3'
              }`}
            >
              <p className="text-sm font-medium">{p.label}</p>
              <p className="mt-0.5 text-xs text-ink-3">{p.note}</p>
            </button>
          ))}
        </div>

        {NEEDS_KEY.includes(s.provider) && (
          <div className="mt-4">
            <label className="font-mono text-xs uppercase tracking-wider text-ink-3">API key</label>
            <input
              type="password"
              value={s.byoKey}
              onChange={(e) => s.setByoKey(e.target.value)}
              placeholder="sk-…"
              className="mt-1 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm"
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-ink-3">
              Stored only in this browser and sent to the relay per request (never saved on our
              servers). For shared devices, clear it when done.
            </p>
          </div>
        )}

        {s.provider === 'local' && (
          <div className="mt-4">
            <label className="font-mono text-xs uppercase tracking-wider text-ink-3">Local base URL</label>
            <input
              value={s.localBaseUrl}
              onChange={(e) => s.setLocalBaseUrl(e.target.value)}
              placeholder="http://localhost:11434/v1"
              className="mt-1 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm"
            />
          </div>
        )}

        {s.provider !== 'mock' && (
          <div className="mt-4">
            <label className="font-mono text-xs uppercase tracking-wider text-ink-3">
              Model (optional)
            </label>
            <input
              value={s.model}
              onChange={(e) => s.setModel(e.target.value)}
              placeholder="leave blank for the recommended default"
              className="mt-1 w-full rounded-lg border border-line bg-bg-2 px-3 py-2 text-sm"
            />
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={testConnection}
            disabled={test.status === 'testing'}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg disabled:opacity-50"
          >
            {test.status === 'testing' ? 'Testing…' : 'Test connection'}
          </button>
          {test.status === 'ok' && <span className="text-sm text-load-under">✓ {test.msg}</span>}
          {test.status === 'error' && <span className="text-sm text-load-over">⚠ {test.msg}</span>}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Display &amp; accessibility</h2>

        <div className="mb-4">
          <p className="mb-1 font-mono text-xs uppercase tracking-wider text-ink-3">Heatmap palette</p>
          <div className="flex gap-2">
            {(['default', 'cvd'] as const).map((p) => (
              <button
                key={p}
                onClick={() => s.setPalette(p)}
                className={`rounded-md px-3 py-1.5 text-sm ${s.palette === p ? 'bg-accent text-bg' : 'bg-surface-2 text-ink-2'}`}
              >
                {p === 'default' ? 'Default (green→red)' : 'Colorblind-safe (blue→orange)'}
              </button>
            ))}
          </div>
        </div>

        <label className="mb-4 flex items-center justify-between">
          <span className="text-sm">
            Reduce motion
            <span className="block text-xs text-ink-3">Stops the 3D model from auto-rotating.</span>
          </span>
          <input
            type="checkbox"
            checked={s.reducedMotion}
            onChange={(e) => s.setReducedMotion(e.target.checked)}
            className="h-5 w-5 accent-[var(--tw-accent,#f97316)]"
          />
        </label>

        <div className="mb-4">
          <p className="mb-1 font-mono text-xs uppercase tracking-wider text-ink-3">Weight unit</p>
          <div className="flex gap-2">
            {(['kg', 'lb'] as const).map((u) => (
              <button
                key={u}
                onClick={() => s.setWeightUnit(u)}
                className={`rounded-md px-3 py-1.5 text-sm ${s.weightUnit === u ? 'bg-accent text-bg' : 'bg-surface-2 text-ink-2'}`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 font-mono text-xs uppercase tracking-wider text-ink-3">Language</p>
          <div className="flex gap-2">
            {LOCALES.map((l) => (
              <button
                key={l}
                onClick={() => s.setLocale(l)}
                className={`rounded-md px-3 py-1.5 text-sm ${s.locale === l ? 'bg-accent text-bg' : 'bg-surface-2 text-ink-2'}`}
              >
                {LOCALE_LABELS[l]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <AccountSection />

      <p className="mt-6 font-mono text-xs text-ink-3">
        Need keys? See <span className="text-ink">docs/CREDENTIALS.md</span>. ·{' '}
        <a href="/licenses" className="text-accent underline">
          Licenses &amp; credits
        </a>
      </p>
    </main>
  );
}
