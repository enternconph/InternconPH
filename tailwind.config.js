function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${variableName}), ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
}

/**
 * InternConPH design tokens.
 *
 * Source of truth: Stitch project "InternConPH Internship Portal"
 *   - Light  -> design system "InternconPH Mobile"  (sand canvas, charcoal ink, mint + amber)
 *   - Dark   -> design system "InternconPH Dark Mode" (bio-slate planes, teal + amber)
 *
 * Legacy token names (vibrant-orange, orange-tint, surface-container-*, ...) are kept so every
 * existing page keeps working; only their VALUES changed. New pages/components should prefer the
 * semantic names introduced below (brand-*, accent-*, shadow-soft, rounded-card).
 * Actual color values live in CSS variables (see src/index.css) so light/dark switch at runtime.
 */
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // --- Accent (amber). Used for FILLS: primary buttons, active nav, badges. ---
        'vibrant-orange': withOpacity('--vibrant-orange-rgb'),
        'deep-orange': withOpacity('--deep-orange-rgb'),
        'orange-tint': 'var(--orange-tint)',
        'accent-ink': withOpacity('--accent-ink-rgb'),
        'accent-text': withOpacity('--accent-text-rgb'),

        // --- Brand palette ---
        'brand-teal': withOpacity('--brand-teal-rgb'),
        'brand-mint': withOpacity('--brand-mint-rgb'),

        // --- Status ---
        'pinoy-green': '#0F7A5F',
        'green-tint': 'var(--success-tint)',
        'tertiary-fixed': 'var(--success-tint)',
        'tertiary': '#0F7A5F',
        'error': withOpacity('--error-rgb'),
        'error-container': withOpacity('--error-container-rgb'),

        // --- Surfaces / content ---
        'surface': withOpacity('--surface-rgb'),
        'surface-container-lowest': withOpacity('--surface-container-lowest-rgb'),
        'surface-container-low': withOpacity('--surface-container-low-rgb'),
        'surface-container': withOpacity('--surface-container-rgb'),
        'surface-container-high': withOpacity('--surface-container-high-rgb'),
        'surface-container-highest': withOpacity('--surface-container-highest-rgb'),
        'on-surface': withOpacity('--on-surface-rgb'),
        'on-surface-variant': withOpacity('--on-surface-variant-rgb'),
        'outline-variant': withOpacity('--outline-variant-rgb'),
        'outline': withOpacity('--outline-rgb'),
        'primary-container': withOpacity('--primary-container-rgb'),
      },
      // Amber is a poor TEXT color on light surfaces, so text-* utilities for the accent
      // resolve to the readable accent-text tone (deep teal in light, mint in dark).
      textColor: {
        'vibrant-orange': withOpacity('--accent-text-rgb'),
        'deep-orange': withOpacity('--accent-text-rgb'),
        'primary-container': withOpacity('--accent-text-rgb'),
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        headline: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '1.5rem',
        sheet: '1.75rem',
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        float: 'var(--shadow-float)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.03)',
        overlay: 'var(--shadow-overlay)',
      },
      keyframes: {
        'drawer-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'sheet-in-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-up': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'drawer-in-right': 'drawer-in-right 0.28s cubic-bezier(0.22, 1, 0.36, 1) both',
        'sheet-in-up': 'sheet-in-up 0.28s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.2s ease-out both',
        'rise-in': 'rise-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
        'scale-up': 'scale-up 0.22s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
}
