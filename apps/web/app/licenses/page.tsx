import {
  DATA_ATTRIBUTIONS,
  SOFTWARE_ATTRIBUTIONS,
  MODEL_CREDIT,
  type Attribution,
} from '@musclr/core';

export const metadata = { title: 'Licenses & credits — musclr' };

function List({ items }: { items: Attribution[] }) {
  return (
    <ul className="space-y-3">
      {items.map((a) => (
        <li key={a.name} className="rounded-xl border border-line bg-surface p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-medium">
              {a.url ? (
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                  {a.name}
                </a>
              ) : (
                a.name
              )}
            </span>
            <span className="font-mono text-xs text-ink-3">{a.license}</span>
          </div>
          {a.note && <p className="mt-1 text-sm text-ink-2">{a.note}</p>}
        </li>
      ))}
    </ul>
  );
}

export default function LicensesPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-2 font-display text-2xl font-semibold">Licenses &amp; credits</h1>
      <p className="mb-6 text-sm text-ink-2">
        musclr is built on open data and open-source software. Thank you to these projects.
      </p>

      <section className="mb-6">
        <h2 className="mb-3 font-display text-lg font-semibold">3D model</h2>
        <p className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-2">{MODEL_CREDIT}</p>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 font-display text-lg font-semibold">Data sources</h2>
        <List items={DATA_ATTRIBUTIONS} />
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Software</h2>
        <List items={SOFTWARE_ATTRIBUTIONS} />
      </section>
    </main>
  );
}
