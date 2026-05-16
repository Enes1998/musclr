import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

// ── Types (mirror frontend/src/lib/exercises.ts) ─────────────────────────────

type WorkoutEntry = { name: string; sets: number; reps: number; weight: number };
type WeekData = Record<string, WorkoutEntry[]>;

const MUSCLE_LABELS: Record<string, string> = {
  chest:      'Chest',
  back:       'Back / Lats',
  shoulders:  'Shoulders',
  biceps:     'Biceps',
  triceps:    'Triceps',
  forearms:   'Forearms',
  core:       'Core',
  quads:      'Quads',
  hamstrings: 'Hamstrings',
  glutes:     'Glutes',
  calves:     'Calves',
};

const MUSCLE_IDS = Object.keys(MUSCLE_LABELS);
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_NAMES  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ── AI provider abstraction ───────────────────────────────────────────────────

const lmClient = new OpenAI({
  baseURL: 'http://localhost:1234/v1',
  apiKey: 'lm-studio',
});

async function callAI(prompt: string): Promise<string> {
  if (process.env.AI_PROVIDER === 'gemini') {
    const ai = new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1',
    });
    const result = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
      contents: prompt,
    });
    return result.text ?? '';
  }
  // LM Studio (default)
  const completion = await lmClient.chat.completions.create({
    model: process.env.LM_MODEL ?? 'local-model',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });
  return completion.choices[0]?.message?.content ?? '{}';
}

function extractJSON(raw: string): unknown {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON object in model response: ${raw.slice(0, 200)}`);
  return JSON.parse(match[0]);
}

// ── Prompt builders ───────────────────────────────────────────────────────────

function loadLabel(score: number): string {
  if (score >= 70) return 'OVERTRAINED';
  if (score >= 30) return 'balanced';
  return 'undertrained';
}

function muscleBlock(loads: Record<string, number>): string {
  return MUSCLE_IDS.map((id) => {
    const score = Math.round(loads[id] ?? 0);
    return `  ${MUSCLE_LABELS[id]!.padEnd(16)} ${String(score).padStart(3)} — ${loadLabel(score)}`;
  }).join('\n');
}

function weekBlock(week: WeekData): string {
  const lines = DAY_ORDER
    .filter((d) => (week[d]?.length ?? 0) > 0)
    .map((d) => {
      const rows = (week[d] ?? [])
        .filter((e) => e.name)
        .map((e) => {
          const w = e.weight === 0 ? 'bodyweight' : `${e.weight}kg`;
          return `    • ${e.name}: ${e.sets}×${e.reps} @ ${w}`;
        })
        .join('\n');
      return `  ${d.charAt(0).toUpperCase() + d.slice(1)}:\n${rows}`;
    })
    .join('\n\n');
  return lines || '  (none logged)';
}

function buildInsightPrompt(loads: Record<string, number>, week: WeekData): string {
  return `You are an expert strength and conditioning coach. Analyze this athlete's training week and design a structured 2-week follow-up program.

CURRENT MUSCLE LOAD SCORES (0–100 — overtrained ≥70, undertrained <30):
${muscleBlock(loads)}

EXERCISES LOGGED THIS WEEK:
${weekBlock(week)}

Tasks:
1. Write a 3–4 sentence coaching summary identifying overloaded and neglected muscle groups.
2. Design a 2-week program that addresses the imbalances with sensible push/pull/legs or upper/lower splits, at least 1–2 rest days per week, and 3–5 exercises per training day.

Respond ONLY with valid JSON — no markdown, no extra text:
{
  "summary": "<3-4 sentence coaching paragraph>",
  "week1": [
    { "day": "Monday",    "label": "<split e.g. Upper Push>", "rest": false, "exercises": [{ "name": "<exercise>", "sets": <n>, "reps": <n>, "weight": "<bodyweight|light|moderate|heavy>", "target": "<muscle_id>" }] },
    { "day": "Tuesday",   "label": "Rest", "rest": true,  "exercises": [] },
    { "day": "Wednesday", "label": "<split>", "rest": false, "exercises": [...] },
    { "day": "Thursday",  "label": "<split>", "rest": false, "exercises": [...] },
    { "day": "Friday",    "label": "<split>", "rest": false, "exercises": [...] },
    { "day": "Saturday",  "label": "<split>", "rest": false, "exercises": [...] },
    { "day": "Sunday",    "label": "Rest", "rest": true,  "exercises": [] }
  ],
  "week2": [
    <same 7-entry structure, with progressive overload or variation from week1>
  ]
}

Valid muscle_id values: ${MUSCLE_IDS.join(', ')}.
Valid weight values: bodyweight, light, moderate, heavy.
week1 and week2 must each contain exactly 7 entries (Monday through Sunday).`;
}

function buildProgramPrompt(loads: Record<string, number>, week: WeekData): string {
  return `You are an expert strength and conditioning coach. Based on this athlete's current training week, design a structured 2-week workout program.

CURRENT MUSCLE LOAD SCORES (0–100 — overtrained ≥70, undertrained <30):
${muscleBlock(loads)}

EXERCISES LOGGED THIS WEEK:
${weekBlock(week)}

Design a 2-week program that:
- Addresses overtrained muscles with deload or rest
- Prioritises undertrained muscles with progressive overload
- Follows sensible split logic (e.g. push/pull/legs or upper/lower)
- Includes rest days (at least 1–2 per week)
- Provides 3–5 exercises per training day

Respond ONLY with valid JSON — no markdown, no extra text:
{
  "rationale": "<2-3 sentences explaining the program logic and how it addresses the athlete's imbalances>",
  "week1": [
    { "day": "Monday",   "label": "<split name e.g. Upper Push>", "rest": false, "exercises": [{ "name": "<exercise>", "sets": <n>, "reps": <n>, "weight": "<bodyweight|light|moderate|heavy>", "target": "<muscle_id>" }] },
    { "day": "Tuesday",  "label": "Rest", "rest": true, "exercises": [] },
    { "day": "Wednesday","label": "<split name>", "rest": false, "exercises": [...] },
    { "day": "Thursday", "label": "<split name>", "rest": false, "exercises": [...] },
    { "day": "Friday",   "label": "<split name>", "rest": false, "exercises": [...] },
    { "day": "Saturday", "label": "<split name>", "rest": false, "exercises": [...] },
    { "day": "Sunday",   "label": "Rest", "rest": true, "exercises": [] }
  ],
  "week2": [
    <same 7-entry structure as week1, with progressive overload or variation>
  ]
}

Valid muscle_id values: ${MUSCLE_IDS.join(', ')}.
Valid weight values: bodyweight, light, moderate, heavy.
week1 and week2 must each contain exactly 7 entries (Monday through Sunday).`;
}

// ── Express app ───────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/gemini', async (req, res) => {
  const { loads, week } = req.body as { loads?: Record<string, number>; week?: WeekData };
  if (!loads || !week) {
    res.status(400).json({ error: 'Missing loads or week in request body' });
    return;
  }
  try {
    const raw = await callAI(buildInsightPrompt(loads, week));
    res.json(extractJSON(raw));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[insight error]', msg);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/program', async (req, res) => {
  const { loads, week } = req.body as { loads?: Record<string, number>; week?: WeekData };
  if (!loads || !week) {
    res.status(400).json({ error: 'Missing loads or week in request body' });
    return;
  }
  try {
    const raw = await callAI(buildProgramPrompt(loads, week));
    res.json(extractJSON(raw));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[program error]', msg);
    res.status(500).json({ error: msg });
  }
});

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  const provider = process.env.AI_PROVIDER === 'gemini' ? 'Gemini cloud' : 'LM Studio @ localhost:1234';
  console.log(`musclr API listening on http://localhost:${PORT}`);
  console.log(`AI provider: ${provider}`);
});
