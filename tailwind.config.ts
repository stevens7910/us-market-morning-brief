import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ft: {
          paper: '#FFF1E5',
          surface: '#FFF7F0',
          card: '#FFFFFF',
          border: '#E6D9CE',
          rule: '#1A1A1A',
          ink: '#1A1A1A',
          muted: '#5C554F',
          claret: '#990F3D',
          'claret-dark': '#7A0B30',
          'claret-tint': '#F9E6EC',
          positive: '#0D7680',
          'positive-tint': '#E6F2F3',
          negative: '#CC0000',
          'negative-tint': '#FCE8E8',
          amber: '#9A5B13',
          'amber-tint': '#FBF0E1',
          wheat: '#F2DFCE',
        },
      },
      fontFamily: {
        serif: ['"Newsreader"', 'Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      maxWidth: {
        editorial: '1280px',
      },
    },
  },
  plugins: [],
};

export default config;
