// @musclr/tokens — the single source of truth for the design system, shared by the Next.js web
// app (Tailwind), the Expo mobile app (NativeWind), and any RN/DOM code. Values live in
// tokens.json so Node-side toolchains (Tailwind/jiti, which cannot resolve a raw cross-package
// .ts import) can `require('@musclr/tokens/json')` directly, while apps import the typed module.

import raw from './tokens.json';

export const colors = raw.colors;
export const fonts = raw.fonts;
export const fontSize = raw.fontSize;
export const lineHeight = raw.lineHeight;
export const space = raw.space;
export const radius = raw.radius;

export const tokens = raw;
export type Tokens = typeof raw;

/** Flat hex map for the muscle-load scale, mirroring scoring.scoreToColor's anchors. */
export const LOAD_SCALE = [colors.load.under, colors.load.balanced, colors.load.over] as const;
