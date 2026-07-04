// P2-A7: prove the first-paint gate actually fires on a leak (the old identifier-grep silently passed on
// minified output). Unit-tests the detector against realistic rollup module-id paths.
import { describe, it, expect } from 'vitest';
import { findEngineLeaks } from '../assert-first-paint-lean.mjs';

const ROOT = '/Users/dev/TokenTally';

describe('first-paint-lean detector (P2-A7)', () => {
  it('passes a clean shell entry (no engine modules)', () => {
    const clean = [
      `${ROOT}/src/main.tsx`,
      `${ROOT}/src/App.tsx`,
      `${ROOT}/src/store/useAppStore.ts`,
      `${ROOT}/src/shell/ModeNav.tsx`,
      `${ROOT}/node_modules/zustand/esm/index.mjs`,
      `${ROOT}/node_modules/react/index.js`,
    ];
    expect(findEngineLeaks(clean)).toEqual([]);
  });

  it('FIRES on a deliberate engine leak into the entry chunk', () => {
    const leaking = [
      `${ROOT}/src/main.tsx`,
      `${ROOT}/src/optimization/denialOfWallet.ts`, // <- leaked
      `${ROOT}/src/workloads/chatbot.ts`, // <- leaked
      `${ROOT}/node_modules/react/index.js`,
    ];
    const leaks = findEngineLeaks(leaking);
    expect(leaks).toHaveLength(2);
    expect(leaks.some((l) => l.includes('denialOfWallet'))).toBe(true);
  });

  it('FIRES on the generated registry JSON in the entry chunk (and on Windows-style paths)', () => {
    expect(findEngineLeaks([`${ROOT}/src/config/registry.generated.json`])).toHaveLength(1);
    expect(findEngineLeaks(['C:\\dev\\TokenTally\\src\\engine\\index.ts'])).toHaveLength(1);
    expect(findEngineLeaks([`${ROOT}/src/registry/index.ts`])).toHaveLength(1);
  });
});
