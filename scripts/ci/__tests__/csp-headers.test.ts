import { describe, it, expect } from 'vitest';
import { headersFromVercel } from '../../../tests/e2e/serve-with-csp.mjs';
import { fileURLToPath } from 'node:url';

const vercelPath = fileURLToPath(new URL('../../../vercel.json', import.meta.url));

describe('CSP single-source parse + strictness (D2)', () => {
  const h = headersFromVercel(vercelPath);
  const csp = h['Content-Security-Policy'] as string;

  it('extracts the CSP from vercel.json (the single source of truth)', () => {
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("worker-src 'self'");
  });

  it('script-src is strict — no unsafe-inline, no unsafe-eval, no wasm-unsafe-eval', () => {
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src')) ?? '';
    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).not.toContain('unsafe-inline');
    expect(scriptSrc).not.toContain('unsafe-eval');
    expect(csp).not.toContain('wasm-unsafe-eval');
  });

  it('carries the hardened headers (HSTS without preload, X-XSS-Protection 0)', () => {
    expect(h['Strict-Transport-Security']).toContain('includeSubDomains');
    expect(h['Strict-Transport-Security']).not.toContain('preload'); // D11
    expect(h['X-XSS-Protection']).toBe('0');
  });
});
