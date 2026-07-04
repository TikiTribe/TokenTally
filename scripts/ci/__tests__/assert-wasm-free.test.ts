import { describe, it, expect } from 'vitest';
import { scanContent } from '../assert-wasm-free.mjs';

const buf = (s: string): Buffer => Buffer.from(s, 'utf8');

describe('assert-wasm-free scanner (D4)', () => {
  it('does NOT false-positive on the bare substring wasm (React wasMultiple)', () => {
    expect(scanContent('x.js', buf('const wasMultiple = arr.length > 1; // was previously set'))).toEqual([]);
    expect(scanContent('x.js', buf('if (typeof WebAssembly !== "undefined") {}'))).toEqual([]); // feature-detect only
  });

  it('flags a real .wasm asset reference', () => {
    expect(scanContent('x.js', buf('import init from "./onnx-runtime.wasm";')).length).toBeGreaterThan(0);
  });

  it('flags a real WASM construction call', () => {
    expect(scanContent('x.js', buf('WebAssembly.instantiate(bytes)')).length).toBeGreaterThan(0);
    expect(scanContent('x.js', buf('new WebAssembly.Module(b)')).length).toBeGreaterThan(0);
  });

  it('flags the raw WASM magic bytes and a base64-embedded blob', () => {
    expect(scanContent('a.bin', Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01])).length).toBeGreaterThan(0);
    expect(scanContent('b.js', buf('const w = "AGFzbAEA...";')).length).toBeGreaterThan(0); // base64 of \0asm
  });

  it('flags the wasm-unsafe-eval CSP token', () => {
    expect(scanContent('csp.txt', buf("script-src 'self' 'wasm-unsafe-eval'")).length).toBeGreaterThan(0);
  });
});
