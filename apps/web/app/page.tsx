import {
  SAMPLE_WEEK,
  MUSCLE_GROUPS,
  computeMuscleLoad,
  scoreLabel,
  scoreToColor,
  ALL_EXERCISES,
  EXERCISE_CATALOG,
  EVIDENCE_MODULE,
} from '@musclr/core';

export default function Home() {
  // Server-rendered proof that the Next.js web app consumes the shared @musclr/core engine.
  const loads = computeMuscleLoad(SAMPLE_WEEK, ALL_EXERCISES);
  const groups = MUSCLE_GROUPS.map((g) => {
    const score = loads[g.id];
    return { ...g, score, label: scoreLabel(score), color: scoreToColor(score) };
  }).sort((a, b) => b.score - a.score);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">musclr</p>
        <h1 className="mt-3 font-display text-4xl font-bold leading-tight">
          Evidence-based training, visualized.
        </h1>
        <p className="mt-3 max-w-xl text-ink-2">
          Track your lifts and see which muscles are undertrained or overtrained — then get
          coaching grounded only in sports science, plus macro &amp; micro nutrition guidance.
        </p>
      </header>

      <section className="rounded-2xl border border-line bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">This week&apos;s muscle load</h2>
          <span className="font-mono text-xs text-ink-3">
            {EXERCISE_CATALOG.length} exercises · {EVIDENCE_MODULE.principles.length} cited principles
          </span>
        </div>

        <ul className="space-y-2">
          {groups.map((g) => (
            <li key={g.id} className="flex items-center gap-3">
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: g.color }}
                aria-hidden
              />
              <span className="w-28 shrink-0 text-sm">{g.label}</span>
              <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                <span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${g.score}%`, backgroundColor: g.color }}
                />
              </span>
              <span className="w-12 shrink-0 text-right font-mono text-xs text-ink-2">{g.score}</span>
              <span className="w-28 shrink-0 text-right font-mono text-xs text-ink-3">{g.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6 font-mono text-xs text-ink-3">
        Shared engine: <span className="text-ink-2">@musclr/core</span> · evidence module v
        {EVIDENCE_MODULE.moduleVersion} · scoring math frozen &amp; parity-tested.
      </p>
    </main>
  );
}
