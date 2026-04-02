import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  /** Кэш пребандла вне node_modules — меньше шума в .git и иногда меньше конфликтов с инструментами */
  cacheDir: ".vite",
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "@mantine/core",
      "@mantine/hooks",
      "@mantine/notifications",
      "@mantine/modals",
    ],
  },
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  server: {
    host: true,
    allowedHosts: true,
  },
});
