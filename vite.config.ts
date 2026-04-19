import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // Keep React core in its own chunk so it's cached aggressively
            if (id.includes("/react-dom/") || id.includes("/scheduler/") || id.includes("/react/")) return "react";
            if (id.includes("react-router")) return "router";
            if (id.includes("@tanstack")) return "query";
            if (id.includes("@supabase")) return "supabase";
            if (id.includes("framer-motion")) return "motion";
            if (id.includes("sonner") || id.includes("@radix-ui/react-toast")) return "toast";
            if (id.includes("@radix-ui")) return "radix";
            if (id.includes("@tiptap") || id.includes("prosemirror")) return "editor";
            // Let Rollup keep charting libs together with their import graph.
            // Splitting recharts/d3 into a forced manual chunk can produce runtime
            // initialization-order errors in the published bundle.
            if (id.includes("lucide")) return "icons";
            if (id.includes("date-fns")) return "date";
            if (id.includes("zod") || id.includes("react-hook-form")) return "forms";
          }
        },
        chunkFileNames: "assets/[name]-[hash].js",
      },
    },
    target: "es2020",
    cssMinify: true,
    minify: "esbuild",
    sourcemap: false,
    chunkSizeWarningLimit: 600,
  },
}));
