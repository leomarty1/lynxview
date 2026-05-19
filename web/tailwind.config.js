/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "Segoe UI",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Cascadia Code",
          "Consolas",
          "monospace",
        ],
      },
      colors: {
        // Palette Lynxter discrète, dark-first.
        lx: {
          bg: "#0e1117",
          panel: "#161b22",
          border: "#30363d",
          text: "#e6edf3",
          muted: "#8b949e",
          accent: "#58a6ff",
          ok: "#3fb950",
          warn: "#d29922",
          err: "#f85149",
        },
      },
    },
  },
  plugins: [],
};
