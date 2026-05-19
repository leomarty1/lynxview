import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// vite.config.js — base path "./" pour pouvoir ouvrir le build via file://
// ou héberger sur GitHub Pages sous /lynxter-control/ sans casser.
export default defineConfig({
  plugins: [react()],
  base: "./",
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
});
