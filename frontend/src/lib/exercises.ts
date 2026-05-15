// Domain types and data — ported verbatim from prototype data.js

export type MuscleId =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms'
  | 'core' | 'quads' | 'hamstrings' | 'glutes' | 'calves';

export interface MuscleGroup {
  id: MuscleId;
  label: string;
}

export interface Exercise {
  name: string;
  primary: Partial<Record<MuscleId, number>>;
  secondary?: Partial<Record<MuscleId, number>>;
}

export interface WorkoutEntry {
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

export type DayId = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface DayInfo {
  id: DayId;
  label: string;
  date: string;
}

export type WeekData = Record<DayId, WorkoutEntry[]>;

export const MUSCLE_GROUPS: MuscleGroup[] = [
  { id: 'chest',      label: 'Chest' },
  { id: 'back',       label: 'Back / Lats' },
  { id: 'shoulders',  label: 'Shoulders' },
  { id: 'biceps',     label: 'Biceps' },
  { id: 'triceps',    label: 'Triceps' },
  { id: 'forearms',   label: 'Forearms' },
  { id: 'core',       label: 'Core' },
  { id: 'quads',      label: 'Quads' },
  { id: 'hamstrings', label: 'Hamstrings' },
  { id: 'glutes',     label: 'Glutes' },
  { id: 'calves',     label: 'Calves' },
];

export const EXERCISES: Exercise[] = [
  { name: 'Back Squat',         primary: { quads: 1.0, glutes: 0.8 }, secondary: { hamstrings: 0.5, core: 0.3 } },
  { name: 'Front Squat',        primary: { quads: 1.0, core: 0.6 },   secondary: { glutes: 0.5 } },
  { name: 'Deadlift',           primary: { back: 1.0, hamstrings: 0.9, glutes: 0.8 }, secondary: { core: 0.4 } },
  { name: 'Romanian Deadlift',  primary: { hamstrings: 1.0, glutes: 0.8 }, secondary: { back: 0.4 } },
  { name: 'Bench Press',        primary: { chest: 1.0, triceps: 0.6 }, secondary: { shoulders: 0.4 } },
  { name: 'Incline Bench Press',primary: { chest: 0.9, shoulders: 0.6 }, secondary: { triceps: 0.5 } },
  { name: 'Overhead Press',     primary: { shoulders: 1.0, triceps: 0.6 }, secondary: { core: 0.3 } },
  { name: 'Pull-Up',            primary: { back: 1.0, biceps: 0.6 },   secondary: { core: 0.3 } },
  { name: 'Lat Pulldown',       primary: { back: 0.9, biceps: 0.5 } },
  { name: 'Barbell Row',        primary: { back: 1.0, biceps: 0.5 },   secondary: { core: 0.3 } },
  { name: 'Seated Cable Row',   primary: { back: 0.8, biceps: 0.4 } },
  { name: 'Dumbbell Curl',      primary: { biceps: 1.0 }, secondary: { forearms: 0.4 } },
  { name: 'Hammer Curl',        primary: { biceps: 0.9, forearms: 0.6 } },
  { name: 'Wrist Curl',         primary: { forearms: 1.0 } },
  { name: 'Reverse Curl',       primary: { forearms: 0.9, biceps: 0.4 } },
  { name: 'Farmer Carry',       primary: { forearms: 1.0 }, secondary: { core: 0.5, back: 0.3 } },
  { name: 'Tricep Pushdown',    primary: { triceps: 1.0 } },
  { name: 'Skull Crusher',      primary: { triceps: 1.0 } },
  { name: 'Lateral Raise',      primary: { shoulders: 0.9 } },
  { name: 'Face Pull',          primary: { shoulders: 0.7, back: 0.4 } },
  { name: 'Leg Press',          primary: { quads: 0.9, glutes: 0.6 }, secondary: { hamstrings: 0.3 } },
  { name: 'Leg Extension',      primary: { quads: 1.0 } },
  { name: 'Leg Curl',           primary: { hamstrings: 1.0 } },
  { name: 'Hip Thrust',         primary: { glutes: 1.0, hamstrings: 0.4 } },
  { name: 'Walking Lunge',      primary: { quads: 0.8, glutes: 0.7 }, secondary: { hamstrings: 0.4 } },
  { name: 'Calf Raise',         primary: { calves: 1.0 } },
  { name: 'Plank',              primary: { core: 1.0 } },
  { name: 'Hanging Leg Raise',  primary: { core: 1.0 } },
  { name: 'Cable Crunch',       primary: { core: 0.9 } },
  { name: 'Russian Twist',      primary: { core: 0.8 } },
  { name: 'Dip',                primary: { chest: 0.7, triceps: 0.8 }, secondary: { shoulders: 0.3 } },
  { name: 'Push-Up',            primary: { chest: 0.8, triceps: 0.5 }, secondary: { core: 0.3 } },
  { name: 'Chin-Up',            primary: { back: 0.9, biceps: 0.8 } },
];

export const DAYS: DayInfo[] = [
  { id: 'mon', label: 'Mon', date: 'May 5'  },
  { id: 'tue', label: 'Tue', date: 'May 6'  },
  { id: 'wed', label: 'Wed', date: 'May 7'  },
  { id: 'thu', label: 'Thu', date: 'May 8'  },
  { id: 'fri', label: 'Fri', date: 'May 9'  },
  { id: 'sat', label: 'Sat', date: 'May 10' },
  { id: 'sun', label: 'Sun', date: 'May 11' },
];

// Pre-seeded sample week so the prototype has data immediately
export const SAMPLE_WEEK: WeekData = {
  mon: [
    { name: 'Bench Press',         sets: 4, reps: 6,  weight: 90 },
    { name: 'Incline Bench Press', sets: 3, reps: 8,  weight: 70 },
    { name: 'Tricep Pushdown',     sets: 4, reps: 12, weight: 30 },
    { name: 'Lateral Raise',       sets: 3, reps: 15, weight: 10 },
  ],
  tue: [
    { name: 'Back Squat',          sets: 5, reps: 5,  weight: 130 },
    { name: 'Romanian Deadlift',   sets: 3, reps: 8,  weight: 100 },
    { name: 'Leg Press',           sets: 3, reps: 12, weight: 200 },
    { name: 'Calf Raise',          sets: 4, reps: 15, weight: 60 },
  ],
  wed: [],
  thu: [
    { name: 'Pull-Up',             sets: 4, reps: 8,  weight: 0  },
    { name: 'Barbell Row',         sets: 4, reps: 8,  weight: 80 },
    { name: 'Dumbbell Curl',       sets: 3, reps: 12, weight: 16 },
    { name: 'Face Pull',           sets: 3, reps: 15, weight: 20 },
  ],
  fri: [
    { name: 'Overhead Press',      sets: 4, reps: 6,  weight: 55 },
    { name: 'Bench Press',         sets: 3, reps: 8,  weight: 80 },
    { name: 'Lateral Raise',       sets: 4, reps: 15, weight: 12 },
    { name: 'Skull Crusher',       sets: 3, reps: 10, weight: 35 },
  ],
  sat: [
    { name: 'Deadlift',            sets: 4, reps: 5,  weight: 150 },
    { name: 'Hip Thrust',          sets: 3, reps: 10, weight: 120 },
    { name: 'Plank',               sets: 3, reps: 1,  weight: 0  },
  ],
  sun: [],
};
