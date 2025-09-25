/** @type {import('tailwindcss').Config} */
export default {
  content: ["./extensions/**/*.{js,jsx,ts,tsx,css,liquid,html}"],
  safelist: [
    {
      pattern:
        /(bg|text|border)-(red|orange|lime|green|teal|cyan|blue|indigo|violet|purple|fuchsia|pink)-(100|200|300|400|500|600|700|800)/,
      variants: ["hover", "focus"],
    },
  ],
  important: true,
  theme: {
    extend: {},
  },
  plugins: [],
};
