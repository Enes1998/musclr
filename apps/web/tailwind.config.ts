import type { Config } from 'tailwindcss';
import { colors, fonts } from '@musclr/tokens';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: colors.bg,
        'bg-2': colors.bg2,
        surface: colors.surface,
        'surface-2': colors.surface2,
        'surface-3': colors.surface3,
        line: colors.border,
        'line-2': colors.border2,
        ink: colors.text,
        'ink-2': colors.text2,
        'ink-3': colors.text3,
        accent: colors.accent,
        'load-under': colors.load.under,
        'load-balanced': colors.load.balanced,
        'load-over': colors.load.over,
      },
      fontFamily: {
        display: [fonts.display, 'system-ui', 'sans-serif'],
        ui: [fonts.ui, 'system-ui', 'sans-serif'],
        mono: [fonts.mono, 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
