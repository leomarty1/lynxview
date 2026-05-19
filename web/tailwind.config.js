/** @type {import('tailwindcss').Config} */
//
// Charte graphique Lynxter v3.1 (Connaissance/01_Entreprise/LYNXTER_CharteGraphique_3.1.pdf)
//
//   Couleurs officielles :
//     - Gris foncé   #403e3d (RVB 64/62/61)  — couleur principale du logotype et du texte
//     - Jaune        #fdb913 (RVB 253/185/19) — couleur principale, accents larges (≥20pt)
//     - Bleu         #2d4ea2 (RVB 45/78/162)  — accents petits / aplats caractéristiques machine
//
//   Règles non-négociables :
//     - Logo sur fond blanc impérativement → light theme
//     - Jaune INTERDIT pour texte/titre <20pt et pour fond avec texte blanc
//     - Alignement à gauche systématique
//
//   Typographies :
//     - Titres    : GT America Expanded Regular (commercial) → fallback Outfit Regular caps
//     - Sous-titres : GT America Expanded Light → fallback Outfit Light
//     - Texte     : Roboto Light/Regular
//     - Machines  : Outfit ExtraBold caps, letter-spacing 0.09em (règle CSS officielle p.16)
//     - Baseline  : "MAKE IT SMARTER" en jaune, Outfit ExtraBold

export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Roboto", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["Outfit", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Cascadia Code", "Consolas", "monospace"],
      },
      colors: {
        // Palette officielle Lynxter
        lx: {
          // Backgrounds (light)
          bg: "#ffffff",
          panel: "#fafaf9",
          soft: "#f4f2ef",
          deep: "#403e3d",

          // Text
          text: "#403e3d",
          muted: "#807d7b",
          subtle: "#a8a4a1",

          // Borders
          border: "#e8e6e3",
          "border-strong": "#403e3d",

          // Couleurs principales charte
          yellow: "#fdb913",
          "yellow-dim": "#e8a811",
          blue: "#2d4ea2",
          "blue-soft": "#e8edf6",

          // États (non-charte, sobres)
          ok: "#3a9d5d",
          "ok-soft": "#e9f5ed",
          warn: "#fdb913", // = jaune Lynxter, OK pour pastilles/icônes >20pt
          err: "#b03a2e",
          "err-soft": "#f7e6e3",
        },
      },
      letterSpacing: {
        machine: "0.09em", // règle officielle Outfit ExtraBold pour machines (p.16)
      },
      boxShadow: {
        panel: "0 1px 0 rgba(64, 62, 61, 0.04), 0 1px 3px rgba(64, 62, 61, 0.06)",
        focus: "0 0 0 3px rgba(253, 185, 19, 0.25)",
      },
    },
  },
  plugins: [],
};
