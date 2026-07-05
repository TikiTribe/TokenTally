// Phase 2A theme controller. Pure DOM/localStorage utilities (no engine deps). `initTheme` runs in main.tsx
// BEFORE React renders so `data-theme` is stamped ahead of first paint (script-src 'self' forbids an inline
// theme <script>, so this runs from the same-origin module bundle; the prefers-color-scheme CSS default
// covers the pre-JS frame). Owner: TokenTally UI. Version: Phase 2A.
import type { ThemeMode } from '@/store/types';

const KEY = 'tokentally-theme';

export function getStoredTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    // localStorage blocked (private mode / disabled) - fall through to system.
  }
  return 'system';
}

export function persistTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // best-effort; not persisting is acceptable.
  }
}

// 'system' removes the attribute so the prefers-color-scheme media query in index.css wins; 'light'/'dark'
// stamp an explicit override.
export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  if (mode === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
}

export function initTheme(): ThemeMode {
  const mode = getStoredTheme();
  applyTheme(mode);
  return mode;
}
