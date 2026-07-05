// Resolved chart colors for recharts. recharts sets stroke/fill as SVG presentation ATTRIBUTES, which do not
// resolve CSS var() the way a style property would, so we read the concrete values from the theme's CSS custom
// properties at call time and hand recharts real colors. Callers re-read this whenever the store theme flips
// (subscribe to `theme`) so light/dark stays correct. Palette is colorblind-safe and pinned to tokens already
// proven >=3:1 in both themes (the P2-A21 contrast test), never hue-only. Owner: TokenTally UI.
import type { CSSProperties } from 'react';

function tok(name: string, fallback: string): string {
  // getComputedStyle on the root resolves the active theme's value (light default or [data-theme] override).
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export interface ChartTheme {
  central: string;
  conservative: string;
  band: string;
  marker: string;
  truncated: string;
  axis: string;
  grid: string;
  series: string[];
  tooltip: CSSProperties;
}

export function chartTheme(): ChartTheme {
  const central = tok('--primary', '#1d4ed8');
  const marker = tok('--brand-2', '#7c3aed');
  const exact = tok('--badge-exact', '#16a34a');
  const approx = tok('--badge-approx', '#d97706');
  return {
    central,
    conservative: tok('--text-muted', '#64748b'),
    band: tok('--surface-2', '#f1f5f9'),
    marker,
    truncated: approx,
    axis: tok('--text-muted', '#64748b'),
    grid: tok('--border', '#e2e8f0'),
    series: [central, marker, exact, approx],
    tooltip: {
      background: tok('--surface', '#ffffff'),
      border: `1px solid ${tok('--border', '#e2e8f0')}`,
      color: tok('--text', '#0f172a'),
      borderRadius: '8px',
      fontSize: '0.8rem',
      boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
    },
  };
}
