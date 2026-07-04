import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
  build: {
    outDir: 'dist',
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
