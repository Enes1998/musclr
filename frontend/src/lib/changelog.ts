export type ChangeTag = 'new' | 'fix' | 'imp';

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: { tag: ChangeTag; text: string }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v0.4.0',
    date: 'May 15 2026',
    changes: [
      { tag: 'new', text: 'Quick-duplicate row via button or Ctrl+D' },
      { tag: 'new', text: 'Full keyboard navigation — arrow keys, Enter, and logical Tab order in exercise table' },
      { tag: 'new', text: 'Load heatmap legend and per-muscle hover tooltips on Summary' },
      { tag: 'new', text: 'Named week save/load via localStorage profiles' },
      { tag: 'new', text: 'Multi-week comparison — delta bars and ▲/▼ per muscle' },
      { tag: 'imp', text: 'Accessible focus rings and ARIA labels on all interactive controls' },
      { tag: 'new', text: 'Changelog drawer' },
    ],
  },
  {
    version: 'v0.3.1',
    date: 'May 15 2026',
    changes: [
      { tag: 'new', text: 'Top-nav smooth-scroll with active section highlighting' },
      { tag: 'new', text: 'Science section — scoring explainer and non-medical disclaimer' },
      { tag: 'new', text: 'Changelog section on landing page' },
    ],
  },
  {
    version: 'v0.3.0',
    date: 'May 14 2026',
    changes: [
      { tag: 'new', text: 'Initial production React + TypeScript + Vite build' },
      { tag: 'new', text: '3D body heatmap with @react-three/fiber' },
      { tag: 'new', text: 'Deterministic Gemini insight stub wired to live load scores' },
    ],
  },
  {
    version: 'v0.2.0',
    date: 'May 13 2026',
    changes: [
      { tag: 'fix', text: 'Muscle load normalization baseline tuned from 20 → 30' },
      { tag: 'fix', text: 'Score-to-color lerp corrected at 50-point boundary' },
      { tag: 'new', text: 'SAMPLE_WEEK seed data so heatmap is meaningful on first load' },
    ],
  },
  {
    version: 'v0.1.0',
    date: 'May 12 2026',
    changes: [
      { tag: 'new', text: 'Workout entry table, muscle load engine, Zustand store' },
      { tag: 'new', text: 'Exercise combobox with grouped search' },
      { tag: 'new', text: 'Color gradient scoring: green → yellow → red' },
    ],
  },
];
