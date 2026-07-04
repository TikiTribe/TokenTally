/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// P2-A7: emit the entry chunk's REAL (pre-minification) module ids so assert-first-paint-lean.mjs can gate
// on them — the identifier grep it replaces is blind to esbuild minification. Non-throwing: writes the
// report; the CI script is the gate (so a leak fails a dedicated step with a clear message, not an opaque
// build throw).
function firstPaintLeanGuard(): Plugin {
  return {
    name: 'first-paint-lean-guard',
    generateBundle(_options, bundle) {
      const entry = Object.values(bundle).find((c) => c.type === 'chunk' && c.isEntry);
      const moduleIds = entry && entry.type === 'chunk' ? Object.keys(entry.modules) : [];
      // emitFile lets Rollup write it into outDir regardless of whether dist/ exists yet.
      this.emitFile({ type: 'asset', fileName: '.first-paint-entry-modules.json', source: JSON.stringify(moduleIds) });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), firstPaintLeanGuard()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@config': path.resolve(__dirname, './src/config'),
      '@types': path.resolve(__dirname, './src/types'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@store': path.resolve(__dirname, './src/store'),
    },
  },
  server: {
    port: 5173,
  },
  // (Vitest config lives in vitest.config.ts — it takes precedence over any test block here.)
  build: {
    outDir: 'dist',
    // Keep the two heaviest assets out of the entry chunk: React in a stable 'vendor' chunk, recharts (added
    // in 2D) in its own lazy 'charts' chunk. The engine/registry stay lazy via dynamic import().
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
    // Do NOT ship source maps to production (security-venue launch): sourcemap:true published .js.map with
    // full sourcesContent (the entire annotated original TS source) as immutable-cached, publicly-served
    // assets, and let an unqualified claim in a source comment survive in the map after minification stripped
    // it from the .js. Off for the shipped build. [0D review]
    sourcemap: false,
    // D3: never inline an asset (font/glyph) as a data: URI in CSS — font-src 'self' has no data: and
    // would silently drop it. Keep every asset a same-origin file the strict CSP admits.
    assetsInlineLimit: 0,
  },
});
