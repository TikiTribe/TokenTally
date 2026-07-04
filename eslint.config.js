// ESLint flat config (eslint 9). Security floor on all linted code; strict TS rules on the new engine.
// The old MVP (src/components|utils|store, App/main, config data) is rewritten in Phase 2 — it is linted
// for the security floor + no-danger but not style/console, so `--max-warnings 0` is satisfiable without
// refactoring throwaway code. Owner: TokenTally harness. Version: 0D.
import js from '@eslint/js';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import security from 'eslint-plugin-security';
import react from 'eslint-plugin-react';

// P2: the new UI is strictly linted (the old MVP island was deleted in Phase 2A).
const UI_GLOBS = ['src/store/**/*.{ts,tsx}', 'src/shell/**/*.{ts,tsx}', 'src/modes/**/*.{ts,tsx}', 'src/ui/**/*.{ts,tsx}', 'src/viz/**/*.{ts,tsx}', 'src/hooks/**/*.{ts,tsx}', 'src/App.tsx', 'src/main.tsx'];

export default [
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', '**/*.d.ts', 'test-*.ts', 'investigate-*.ts', 'test-calculations.ts', 'test-execution.ts'] },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mjs,js}'],
    languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: 2022, sourceType: 'module' }, globals: { ...globals.browser, ...globals.node } },
    plugins: { '@typescript-eslint': tsPlugin, security },
    rules: {
      ...security.configs.recommended.rules,
      // detect-object-injection is famously low-signal (flags every obj[var]); the real proto-pollution
      // defense is the A7 id sanitizer + Map-keyed lookups. Off with rationale; other security rules stay error.
      'security/detect-object-injection': 'off',
      'no-eval': 'error', 'no-implied-eval': 'error', 'no-new-func': 'error', 'no-script-url': 'error',
      'no-undef': 'off', // tsc handles undefined identifiers; no-undef false-positives on TS types
      'no-redeclare': 'off', // tsc + @typescript-eslint handle redeclaration (type+value same-name is legal)
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  // react/no-danger is the no-innerHTML security tripwire (full react linting lands with the Phase-2 UI).
  { files: ['**/*.{tsx,jsx}'], plugins: { react }, settings: { react: { version: 'detect' } }, rules: { 'react/no-danger': 'error' } },
  // Strict TS rules on the new engine + UI code.
  { files: ['src/engine/**/*.ts', 'src/registry/**/*.ts', 'src/tokenizer/**/*.ts', 'src/types/**/*.ts', 'src/workloads/**/*.ts', 'src/optimization/**/*.ts', ...UI_GLOBS], rules: { ...tsPlugin.configs.recommended.rules, '@typescript-eslint/no-explicit-any': 'error', 'no-unused-vars': 'off', '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }] } },
  // P2-A15: forbid raw DOM HTML sinks in the UI (belt-and-suspenders beyond react/no-danger). Token/registry
  // strings must render as text nodes only.
  { files: UI_GLOBS, rules: { 'no-restricted-properties': ['error', { property: 'innerHTML', message: 'DOM text nodes only — use textContent' }, { property: 'outerHTML', message: 'no outerHTML sink' }, { property: 'insertAdjacentHTML', message: 'no insertAdjacentHTML sink' }] } },
  // Build scripts + test/E2E infra log to stdout legitimately; their fs reads/writes are build-time (no attacker path).
  { files: ['scripts/**/*.{ts,mjs}', 'tests/**/*.{ts,mjs}', 'src/**/*.test.{ts,tsx}', '**/*.config.{ts,js}'], rules: { 'no-console': 'off', 'security/detect-non-literal-fs-filename': 'off' } },
  // Legacy CSV-pricing scripts, superseded by src/registry/buildRegistry (slated for removal): security floor only.
  { files: ['scripts/scrape-pricing.ts', 'scripts/update-pricing-from-csv.ts', 'scripts/utils/**'], rules: { '@typescript-eslint/no-unused-vars': 'off' } },
];
