import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        accent: '#0561e2',
        surface: '#f7f8fa',
        border: '#e4e4e7',
        muted: '#71717a',
      },
    },
  },
} satisfies Config
