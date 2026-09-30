/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ibm: {
          blue: '#0f62fe',
          blue60: '#0043ce',
          blue80: '#002d9c',
          blueHover: '#0050e6',
          ink: '#161616',
          inkMuted: '#525252',
          inkSubtle: '#8c8c8c',
          canvas: '#ffffff',
          surface1: '#f4f4f4',
          surface2: '#e0e0e0',
          inverseCanvas: '#161616',
          inverseSurface1: '#262626',
          inverseSurface2: '#393939',
          inverseInk: '#ffffff',
          inverseInkMuted: '#c6c6c6',
          hairline: '#e0e0e0',
          hairlineDark: '#393939',
          success: '#24a148',
          warning: '#f1c21b',
          error: '#da1e28',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'Menlo', 'monospace'],
      },
      borderRadius: {
        none: '0px',
        xs: '0px',
        sm: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px',
        full: '0px',
      },
      letterSpacing: {
        carbon: '0.16px',
        'carbon-caption': '0.32px',
      },
    },
  },
  plugins: [],
}
