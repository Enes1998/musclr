// NativeWind v4 + Tailwind v3. Tokens come from @musclr/tokens' JSON entry (Tailwind's jiti
// loader cannot resolve a raw cross-package .ts import). Keep this file CommonJS (.js).
const tokens = require('@musclr/tokens/json');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: tokens.colors.bg,
        'bg-2': tokens.colors.bg2,
        surface: tokens.colors.surface,
        'surface-2': tokens.colors.surface2,
        'surface-3': tokens.colors.surface3,
        line: tokens.colors.border,
        'line-2': tokens.colors.border2,
        ink: tokens.colors.text,
        'ink-2': tokens.colors.text2,
        'ink-3': tokens.colors.text3,
        accent: tokens.colors.accent,
        'load-under': tokens.colors.load.under,
        'load-balanced': tokens.colors.load.balanced,
        'load-over': tokens.colors.load.over,
      },
      fontFamily: {
        sans: ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-bold': ['Inter_700Bold'],
        display: ['InterTight_600SemiBold'],
        mono: ['JetBrainsMono_400Regular'],
      },
    },
  },
  plugins: [],
};
