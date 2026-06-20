// Open-source / open-data attributions for the in-app Licenses & Credits screen (store compliance).
// The 3D muscle model is FIRST-PARTY (procedurally generated in-repo) — no third-party model
// license applies. Data sources and key libraries are credited below.

export interface Attribution {
  name: string;
  license: string;
  url?: string;
  note?: string;
}

export const DATA_ATTRIBUTIONS: Attribution[] = [
  {
    name: 'USDA FoodData Central',
    license: 'Public Domain (CC0)',
    url: 'https://fdc.nal.usda.gov/',
    note: 'Primary food & micronutrient data.',
  },
  {
    name: 'Open Food Facts',
    license: 'Open Database License (ODbL)',
    url: 'https://world.openfoodfacts.org/',
    note: 'Barcode product lookups. We query the API and do not redistribute a merged dataset.',
  },
  {
    name: 'free-exercise-db (yuhonas)',
    license: 'The Unlicense (public domain)',
    url: 'https://github.com/yuhonas/free-exercise-db',
    note: 'Source for the 865-exercise catalog, mapped onto the musclr muscle taxonomy.',
  },
  {
    name: 'Sports-science evidence module',
    license: 'Cited peer-reviewed literature & position stands',
    note: 'ACSM 2009; Schoenfeld (volume/load/rest/frequency); Helms RIR; Robinson 2024; ISSN protein 2017; NSCA Essentials; Renaissance Periodization. DOIs in the in-app evidence module.',
  },
];

export const SOFTWARE_ATTRIBUTIONS: Attribution[] = [
  { name: 'three.js', license: 'MIT', url: 'https://threejs.org/' },
  { name: 'React / React Native', license: 'MIT' },
  { name: 'Next.js', license: 'MIT' },
  { name: 'Expo', license: 'MIT' },
  { name: 'NativeWind / Tailwind CSS', license: 'MIT' },
  { name: 'Zustand', license: 'MIT' },
  { name: 'Zod', license: 'MIT' },
  { name: 'Hono', license: 'MIT' },
  { name: 'Vercel AI SDK', license: 'Apache-2.0' },
  { name: 'ZXing (@zxing/browser)', license: 'MIT / Apache-2.0' },
];

/** The 3D model provenance note for the Licenses screen. */
export const MODEL_CREDIT =
  'The anatomical 3D muscle model is generated procedurally in-repo (scripts/build-muscle-model.mjs) ' +
  'from the musclr muscle taxonomy — original first-party geometry, no third-party model license.';
