// P2-A8: shared Vitest setup. jest-dom matchers extend `expect` (harmless in node). Component tests run in
// jsdom (see vite.config.ts test.environmentMatchGlobs); cleanup unmounts after each so tests don't leak DOM.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  // Guard: node-environment tests have no document; cleanup only applies to jsdom component tests.
  if (typeof document !== 'undefined') cleanup();
});
