/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: '#e0e0e0',
        background: '#ffffff',
        foreground: '#161616',
        primary: {
          DEFAULT: '#0f62fe',
          foreground: '#ffffff',
          hover: '#0043ce',
          pressed: '#002d9c',
          light: '#edf5ff',
        },
        ink: {
          DEFAULT: '#161616',
          muted: '#525252',
          subtle: '#8c8c8c',
        },
        surface: {
          0: '#ffffff',
          1: '#f4f4f4',
          2: '#e0e0e0',
        },
        hairline: {
          DEFAULT: '#e0e0e0',
          strong: '#161616',
        },
        inverse: {
          canvas: '#161616',
          surface: '#262626',
          ink: '#ffffff',
          'ink-muted': '#c6c6c6',
        },
        semantic: {
          success: '#24a148',
          warning: '#f1c21b',
          error: '#da1e28',
          info: '#0f62fe',
        },
        muted: {
          DEFAULT: '#f4f4f4',
          foreground: '#525252',
        },
        card: {
          DEFAULT: '#ffffff',
          foreground: '#161616',
        },
        sidebar: {
          bg: '#161616',
          fg: '#c6c6c6',
          hover: '#262626',
          active: '#0f62fe',
          border: '#262626',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      letterSpacing: {
        carbon: '0.16px',
      },
      borderRadius: {
        none: '0px',
        xs: '2px',
        sm: '4px',
      },
    },
  },
  plugins: [],
};
