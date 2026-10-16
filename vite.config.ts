import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages hosts this project at /DisjointGridsSudoku/ rather than the domain root.
// Local Vite development keeps root-relative asset paths.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/DisjointGridsSudoku/" : "/",
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
