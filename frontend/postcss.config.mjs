// Tailwind v4 PostCSS pipeline. The v4 plugin handles vendor-prefixing itself, so
// autoprefixer is no longer needed. Build-time only — produces a single static CSS file
// bundled into the export (no runtime/CDN requests; the demo stays airplane-mode clean).
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
