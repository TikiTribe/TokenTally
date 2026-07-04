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
    sourcemap: true,
    // D3: never inline an asset (font/glyph) as a data: URI in CSS — font-src 'self' has no data: and
    // would silently drop it. Keep every asset a same-origin file the strict CSP admits.
    assetsInlineLimit: 0,
  },
});
