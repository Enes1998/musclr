// @musclr/tokens — the single source of truth for the design system, shared by the Next.js web
// app (Tailwind) and the Expo mobile app (NativeWind). Ported from the prototype's
// frontend/src/styles/{tokens,globals}.css. Share TOKENS, not components.

export const colors = {
  // Backgrounds / surfaces (dark theme)
  bg: '#0a0a0c',
  bg2: '#101015',
  surface: '#14141a',
  surface2: '#1c1c24',
  surface3: '#24242e',
  // Borders
  border: '#26262f',
  border2: '#34343f',
  // Text
  text: '#f5f5f7',
  text2: '#8a8a95',
  text3: '#52525c',
  // Brand
  accent: '#f97316',
  // Muscle-load heatmap / status (must match scoring.scoreToColor gradient endpoints)
  load: {
    under: '#4caf50', // green — undertrained
    balanced: '#ffc107', // yellow
    over: '#f44336', // red — overtrained
  },
} as const;

export const fonts = {
  display: 'Inter Tight',
  ui: 'Inter',
  mono: 'JetBrains Mono',
} as const;

export const fontSize = {
  xs: 11,
  base: 14,
  lg: 16,
  '2xl': 24,
  '4xl': 36,
  '5xl': 48,
} as const;

export const lineHeight = {
  tight: 1.2,
  base: 1.5,
  loose: 1.65,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const radius = {
  sm: 6,
  base: 10,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const tokens = { colors, fonts, fontSize, lineHeight, space, radius } as const;
export type Tokens = typeof tokens;

/** Flat hex map for the muscle-load scale, mirroring scoring.scoreToColor's anchors. */
export const LOAD_SCALE = [colors.load.under, colors.load.balanced, colors.load.over] as const;
