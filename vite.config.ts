// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";
import { loadEnv } from "vite";
import { enumeratePublicPages, validateRenderedPage } from "./scripts/publicPrerender";

// Carried over from the pre-migration config: a stable build ID emitted to
// /version.json so already-open tabs can detect a new deploy and self-heal
// (see the stale-chunk reload guard in src/routes/__root.tsx).
const BUILD_ID = String(Date.now());

const emitVersionJson = (): Plugin => ({
  name: "emit-version-json",
  apply: "build",
  generateBundle() {
    this.emitFile({
      type: "asset",
      fileName: "version.json",
      source: JSON.stringify({ buildId: BUILD_ID }),
    });
  },
});

// Workers have no import.meta.url for bundled server chunks, so a bare
// createRequire(import.meta.url) crashes every published request. Nitro's own
// guard runs after minification and misses renamed code, so patch each chunk
// before minify, independent of the builder package version.
const guardCreateRequire = (): Plugin => ({
  name: "mbacompass-guard-create-require",
  apply: "build",
  renderChunk(code) {
    if (!code.includes("createRequire(import.meta.url)")) return null;
    return {
      code: code.replace(/createRequire\(import\.meta\.url\)/g, 'createRequire(import.meta.url || "file:///")'),
      map: null,
    };
  },
});

export default async (env: { command: "build" | "serve"; mode: string }) => {
  const publicEnv = loadEnv(env.mode, process.cwd(), "VITE_");
  const pages = env.command === "build" ? await enumeratePublicPages(publicEnv.VITE_SUPABASE_URL, publicEnv.VITE_SUPABASE_PUBLISHABLE_KEY) : [];
  return defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    pages,
    prerender: { enabled: env.command === "build", autoStaticPathsDiscovery: false, crawlLinks: false, concurrency: 4, failOnError: true, retryCount: 0, onSuccess: validateRenderedPage },
  },
  vite: {
    server: {
      allowedHosts: ["dashboard.mbacompass.in"],
    },
    define: {
      __BUILD_ID__: JSON.stringify(BUILD_ID),
    },
    plugins: [emitVersionJson(), guardCreateRequire()],
  },
  })(env);
};
