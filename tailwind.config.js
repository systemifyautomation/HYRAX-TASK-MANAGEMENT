export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  safelist: [
    // Buyer colors - backgrounds (light + dark)
    { pattern: /^bg-(red|orange|amber|lime|green|emerald|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate)-(50|100|200|600|700|800|900)$/, variants: ['dark', 'hover', 'dark:hover'] },
    // Buyer colors - text
    { pattern: /^text-(red|orange|amber|lime|green|emerald|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate)-(100|200|700|900)$/, variants: ['dark'] },
    // Buyer colors - borders
    { pattern: /^border-(red|orange|amber|lime|green|emerald|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate)-(200|300|500|600)$/, variants: ['dark', 'hover', 'dark:hover'] },
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fee2e2',
          100: '#fecaca',
          200: '#fca5a5',
          300: '#f87171',
          400: '#ef4444',
          500: '#dc2626',
          600: '#b91c1c',
          700: '#991b1b',
          800: '#7f1d1d',
          900: '#450a0a',
        },
      },
      backgroundColor: {
        'dark-elevation-1': '#1f2937',
        'dark-elevation-2': '#374151',
        'dark-elevation-3': '#4b5563',
      },
    },
  },
};
