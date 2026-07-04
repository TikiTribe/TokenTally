// P2-A8: register @testing-library/jest-dom's matcher augmentation of vitest's `expect` for the
// type-checker (the runtime registration lives in vitest.setup.ts). Picked up by tsconfig.tests.json.
import '@testing-library/jest-dom/vitest';
