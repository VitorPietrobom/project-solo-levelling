/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--bg-primary)',
        secondary: 'var(--bg-secondary)',
        card: 'var(--bg-card)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'accent-primary': 'var(--accent-primary)',
        'accent-secondary': 'var(--accent-secondary)',
        'accent-warning': 'var(--accent-warning)',
        'accent-success': 'var(--accent-success)',
        'accent-info': 'var(--accent-info)',
        border: 'var(--border-color)',
        'heatmap-0': 'var(--heatmap-0)',
        'heatmap-25': 'var(--heatmap-25)',
        'heatmap-50': 'var(--heatmap-50)',
        'heatmap-75': 'var(--heatmap-75)',
        'heatmap-100': 'var(--heatmap-100)',
      },
    },
  },
  plugins: [],
};
