/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // DhronAI green — primary CTAs, active states, highlights.
        primary: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Teal/cyan accent — AI gradient partner color.
        accent: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        // Dark surface palette used by the sidebar and inverted components.
        ink: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        soft:    '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.05)',
        card:    '0 2px 8px -2px rgb(15 23 42 / 0.06), 0 8px 24px -12px rgb(15 23 42 / 0.12)',
        lift:    '0 10px 32px -12px rgb(15 23 42 / 0.18)',
        glow:    '0 0 0 4px rgb(34 197 94 / 0.15)',
        'glow-lg': '0 8px 32px -8px rgb(20 184 166 / 0.35)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #22c55e 0%, #14b8a6 100%)',
        'brand-radial':   'radial-gradient(circle at 20% 0%, rgba(34,197,94,0.15), transparent 50%), radial-gradient(circle at 80% 100%, rgba(20,184,166,0.18), transparent 55%)',
        'sidebar-glow':   'linear-gradient(180deg, rgba(34,197,94,0.06) 0%, rgba(20,184,166,0) 60%)',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'pulse-glow': {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(34,197,94,0.45)' },
          '50%':     { boxShadow: '0 0 0 8px rgba(34,197,94,0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
