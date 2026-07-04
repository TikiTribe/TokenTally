// Review #1: the store must hydrate its theme from localStorage so a reload keeps the user's choice.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getStoredTheme, applyTheme } from '@/shell/ThemeController';

describe('ThemeController + store hydration (review #1)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.resetModules();
  });

  it('getStoredTheme returns the validated stored value, or system as fallback', () => {
    expect(getStoredTheme()).toBe('system'); // nothing stored
    localStorage.setItem('tokentally-theme', 'dark');
    expect(getStoredTheme()).toBe('dark');
    localStorage.setItem('tokentally-theme', 'garbage');
    expect(getStoredTheme()).toBe('system'); // invalid -> system (no injection)
  });

  it('applyTheme stamps an explicit theme and clears it for system', () => {
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    applyTheme('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('a freshly-created store hydrates theme from localStorage (survives reload)', async () => {
    localStorage.setItem('tokentally-theme', 'dark');
    vi.resetModules();
    const { useAppStore } = await import('@/store/useAppStore');
    expect(useAppStore.getState().theme).toBe('dark');
  });
});
