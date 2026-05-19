import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// vite.config.js
//
// `base` est sensible au contexte :
//   - dev (`npm run web`)           → `/`   (Vite dev server à la racine)
//   - prod GitHub Pages (sous-path) → `/lynxview/` (par défaut)
//   - prod servi en file:// local   → override via env LYNXVIEW_BASE="./"
//
// La config GitHub Pages standard sert le repo sous `/<repo-name>/`.
// Override possible : `LYNXVIEW_BASE=/ vite build` pour racine, ou
// `LYNXVIEW_BASE=./ vite build` pour ouverture file://.
export default defineConfig(({ command }) => {
  const isProd = command === "build";
  const base =
    process.env.LYNXVIEW_BASE ||
    process.env.LYNXTER_BASE ||
    (isProd ? "/lynxview/" : "/");

  return {
    plugins: [react()],
    base,
    server: {
      port: 5173,
      strictPort: true,
      host: "127.0.0.1",
    },
    preview: {
      port: 4173,
      strictPort: true,
      host: "127.0.0.1",
    },
    build: {
      outDir: "dist",
      sourcemap: false,
    },
  };
});
