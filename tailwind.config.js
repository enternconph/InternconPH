function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${variableName}), ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
}

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
        'vibrant-orange': withOpacity('--vibrant-orange-rgb'),
        'deep-orange': withOpacity('--deep-orange-rgb'),
        'orange-tint': 'var(--orange-tint)',
        'pinoy-green': '#00875A',
        'green-tint': '#E3FCEF',
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
        'tertiary-fixed': '#E3FCEF',
        'tertiary': '#00875A',
        'error': '#DE350B',
        'error-container': '#FFEBE6',
        'primary-container': withOpacity('--primary-container-rgb')
      },
      fontFamily: {
        headline: ['Work Sans', 'sans-serif'],
        body: ['Work Sans', 'sans-serif']
      }
    },
  },
  plugins: [],
}
