import type { Config } from 'tailwindcss';

/**
 * Tokens come from ui_images/image copy 4.png and .claude/docs/12-design-system.md.
 * Where the two disagree, the image wins.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EEF1F8',
          100: '#C9D2E8',
          300: '#8496C4',
          500: '#3B4E86',
          700: '#243766',
          900: '#16255A',
        },
        secondary: {
          100: '#F7DFB8',
          300: '#F2C376',
          500: '#E9A13B',
          700: '#B97A1F',
        },
        tertiary: {
          100: '#F5D4CF',
          300: '#E29187',
          500: '#C24A3C',
          700: '#93342A',
        },
        neutral: {
          50: '#F4F6F2',
          100: '#E9ECE6',
          300: '#C7CCD8',
          500: '#6B7280',
          700: '#3F4451',
          900: '#1B1D22',
        },
        /**
         * The heat scale of 12-design-system.md, low to high. Named by level
         * rather than by colour so a cell asks for `bg-heat-2` and never has to
         * know that level 2 happens to be amber — the ramp can be retuned in
         * one place.
         */
        heat: {
          0: '#EDEFF3',
          1: '#C7CCD8',
          2: '#F7DFB8',
          3: '#E9A13B',
          4: '#0E7A55',
        },
        surface: '#FFFFFF',
        hairline: '#E4E6E0',
        muted: '#6B7280',
        mastered: '#0E7A55',
        cold: '#C7CCD8',
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-sans-serif', 'sans-serif'],
        sans: ['var(--font-body)', 'ui-sans-serif', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        bengali: ['var(--font-bengali)', 'var(--font-body)', 'sans-serif'],
      },
      fontSize: {
        label: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.08em' }],
        base: ['0.8125rem', { lineHeight: '1.25rem' }],
      },
      borderRadius: { card: '6px', control: '4px', chip: '2px' },
      spacing: { rail: '56px', sidebar: '232px', topbar: '48px', rule: '32px' },
      maxWidth: { content: '1280px' },
      backgroundImage: {
        // The ruled-paper surface: 32px horizontal rules plus one margin rule.
        paper:
          'repeating-linear-gradient(to bottom, transparent 0, transparent 31px, #E4E6E0 31px, #E4E6E0 32px)',
      },
    },
  },
  plugins: [],
};

export default config;
