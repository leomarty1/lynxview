/** @type {import('tailwindcss').Config} */
//
// Charte graphique Lynxter v3.1 — palette officielle.
// Pour les composants Atelier, les couleurs sont aussi exposées comme
// CSS variables dans atelier.css (`var(--lx-yellow)`, etc.).
// Tailwind reste utile pour les utility (flex, grid, spacing).

export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Roboto", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["Outfit", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "Cascadia Code", "Consolas", "monospace"],
      },
      colors: {
        lx: {
          // Palette officielle Lynxter v3.1
          anthracite: "#403E3D",
          "anthracite-2": "#3C3635",
          yellow: "#FDB913",
          "yellow-soft": "#FFE7A1",
          blue: "#2D4EA2",
          red: "#F13E3F",
          green: "#149911",
          "gray-100": "#ECECEC",
          "gray-300": "#CFCFCF",
          "gray-600": "#706E6E",
          "gray-800": "#3C3635",

          // Alias legacy (rétrocompat v0.2/v0.3, peuvent être nettoyés plus tard)
          bg: "#ffffff",
          panel: "#fafaf9",
          soft: "#f4f2ef",
          deep: "#403E3D",
          text: "#403E3D",
          muted: "#807d7b",
          subtle: "#a8a4a1",
          border: "#e8e6e3",
          "border-strong": "#403E3D",
          ok: "#149911",
          "ok-soft": "#e9f5ed",
          warn: "#FDB913",
          err: "#F13E3F",
          "err-soft": "#fde6e6",
          "blue-soft": "#e8edf6",
          "yellow-dim": "#e8a811",
        },
      },
      letterSpacing: {
        machine: "0.09em",
        outfit: "0.02em",
      },
    },
  },
  plugins: [],
};
