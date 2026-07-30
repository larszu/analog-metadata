/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative base so the built bundle also works inside Tauri / Capacitor
  // webviews where it is loaded from a file:// or app:// origin.
  base: "./",
  build: {
    outDir: "dist",
    target: "es2021",
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
