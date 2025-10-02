/** @type {import('tailwindcss').Config} */
export default {
  content: ["./extensions/**/*.{js,jsx,ts,tsx,css,liquid,html}"],
  safelist: [
    {
      pattern:
        /(bg|text|border)-(red|orange|lime|green|teal|cyan|blue|indigo|violet|purple|fuchsia|pink)-(100|200|300|400|500|600|700|800)/,
      variants: ["hover", "focus"],
    },
    {
      pattern:
        /bg-(red|orange|lime|green|teal|cyan|blue|indigo|violet|purple|fuchsia|pink)-500/,
      variants: ["before"],
    },
    {
      pattern:
        /(from|via)-(red|orange|lime|green|teal|cyan|blue|indigo|violet|purple|fuchsia|pink)-(200|600)/,
    },
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
