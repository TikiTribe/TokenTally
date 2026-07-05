// Inline stroke icons for the landing page. Rendered as DOM SVG (not external assets), so they satisfy the
// strict CSP (no img-src fetch). currentColor lets them inherit the surrounding text/brand color. 24x24 grid.
// Owner: TokenTally UI. Version: landing-1.
import type { SVGProps } from 'react';

const base: SVGProps<SVGSVGElement> = {
  width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
};

export const IconChat = (p: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...base} {...p}><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" /></svg>
);
export const IconBatch = (p: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...base} {...p}><path d="M12 3 2 8l10 5 10-5-10-5z" /><path d="M2 16l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
);
export const IconAgent = (p: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...base} {...p}><rect x="4" y="7" width="16" height="12" rx="3" /><path d="M12 7V4" /><circle cx="9" cy="13" r="1.2" /><circle cx="15" cy="13" r="1.2" /><path d="M2 12h2M20 12h2" /></svg>
);
export const IconCrew = (p: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...base} {...p}><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><circle cx="17" cy="9" r="2.4" /><path d="M15.5 20a5.5 5.5 0 0 1 6.5-4.7" /></svg>
);
export const IconShield = (p: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...base} {...p}><path d="M12 3l7 3v5c0 4.4-3 7.8-7 9-4-1.2-7-4.6-7-9V6l7-3z" /><path d="M9.5 12l1.8 1.8L15 10" /></svg>
);
export const IconTarget = (p: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></svg>
);
export const IconSliders = (p: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...base} {...p}><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" /><path d="M2 14h4M10 8h4M18 16h4" /></svg>
);
export const IconChart = (p: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...base} {...p}><path d="M3 3v18h18" /><path d="M7 15l3-4 3 3 4-6" /></svg>
);
export const IconBadge = (p: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...base} {...p}><path d="M12 3l2.3 1.6 2.8-.2 1 2.6 2.3 1.6-.8 2.7.8 2.7-2.3 1.6-1 2.6-2.8-.2L12 21l-2.3-1.6-2.8.2-1-2.6L3.6 15l.8-2.7-.8-2.7 2.3-1.6 1-2.6 2.8.2L12 3z" /><path d="M9.5 12l1.8 1.8L15 10" /></svg>
);
export const IconBolt = (p: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...base} {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" /></svg>
);
export const IconLock = (p: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...base} {...p}><rect x="4" y="10" width="16" height="10" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
);
export const IconDownload = (p: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...base} {...p}><path d="M12 3v12" /><path d="M7 11l5 5 5-5" /><path d="M4 21h16" /></svg>
);
export const IconLink = (p: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...base} {...p}><path d="M9 15l6-6" /><path d="M11 5l1-1a4 4 0 0 1 6 6l-2 2" /><path d="M13 19l-1 1a4 4 0 0 1-6-6l2-2" /></svg>
);
export const IconArrow = (p: SVGProps<SVGSVGElement>): JSX.Element => (
  <svg {...base} width={18} height={18} {...p}><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
);
