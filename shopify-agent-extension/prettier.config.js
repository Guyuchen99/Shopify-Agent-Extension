export default {
  plugins: ["@shopify/prettier-plugin-liquid", "prettier-plugin-tailwindcss"],
  overrides: [
    {
      files: ["*.liquid"],
      options: {
        parser: "liquid-html", // ensure .liquid is parsed as HTML
      },
    },
  ],
  tailwindConfig: "./tailwind.config.js",
};
