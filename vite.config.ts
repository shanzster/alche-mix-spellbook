// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// MindAR's prebuilt Three bundle imports `sRGBEncoding`, which three removed in
// r152 (we're on r185). It's used only as `renderer.outputEncoding = …`, a no-op
// in r185, so rewriting it to the still-exported `SRGBColorSpace` keeps the import
// valid without changing behaviour. Done at build time so it survives reinstalls.
const mindarThreeCompat = {
  name: "mindar-three-r152-compat",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    if (id.includes("mindar-image-three.prod.js")) {
      return { code: code.replace(/\bsRGBEncoding\b/g, "SRGBColorSpace"), map: null };
    }
  },
};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // MindAR's prebundled AR runtime (bundles TensorFlow.js) is large and browser-only;
  // let Vite load it as-is instead of trying to pre-optimize/SSR it.
  vite: {
    plugins: [mindarThreeCompat],
    optimizeDeps: { exclude: ["mind-ar"] },
    ssr: { noExternal: [], external: ["mind-ar"] },
  },
});
