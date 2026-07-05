// P2-A8: shared Vitest setup. jest-dom matchers extend `expect` (harmless in node). Component tests run in
// jsdom (see vite.config.ts test.environmentMatchGlobs); cleanup unmounts after each so tests don't leak DOM.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// recharts' ResponsiveContainer observes its box via ResizeObserver, which jsdom does not implement. A no-op
// stub lets the chart components mount in unit tests (they render 0x0, but the VizFigure a11y table - the thing
// the tests assert on - renders regardless). Only defined in jsdom component tests.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

afterEach(() => {
  // Guard: node-environment tests have no document; cleanup only applies to jsdom component tests.
  if (typeof document !== 'undefined') cleanup();
});
