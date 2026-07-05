import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { initTheme } from '@/shell/ThemeController';
// Self-hosted Inter (variable) — bundled woff2 served same-origin, so it satisfies the strict CSP font-src 'self'.
import '@fontsource-variable/inter';
import './index.css';

// P2-A16: stamp the theme BEFORE React renders (script-src 'self' forbids an inline theme script, so this
// runs from the same-origin module; prefers-color-scheme covers the pre-JS frame).
initTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
