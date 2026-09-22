import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 5173,
    // Dev-server-only proxy to scripts/local-api-server.mts — this option
    // has no effect on `vite build` output, only `vite dev`. See
    // docs/LOCAL_DEVELOPMENT.md for the full local pilot-journey setup.
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${process.env.LOCAL_API_PORT ?? 3001}`,
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/react-router-dom")) {
            return "react-vendor";
          }
          if (id.includes("node_modules/firebase")) {
            return "firebase-vendor";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "icons";
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
