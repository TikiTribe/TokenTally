// Asserts the built bundle is WASM-free (D4): precise token/magic-byte scan, NOT a naive `wasm` grep
// (which false-positives on React's `wasMultiple`). This is a TRIPWIRE; the authoritative WASM-free proof
// is the runtime Playwright assertion once the Transformers.js adapter is registered (Task 8/Phase 2).
// Owner: TokenTally CI. Version: 0D.
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const WASM_MAGIC = Buffer.from([0x00, 0x61, 0x73, 0x6d]); // "\0asm" — the WebAssembly module preamble
const TEXT_PATTERNS = [
  /\.wasm(['")/\\?#]|$)/, //          a .wasm asset reference (not the bare substring 'wasm')
  /\bWebAssembly\s*\.\s*(instantiate|compile|Module|Instance|Memory|Table)/, // real WASM construction
  /wasm-unsafe-eval/, //              the CSP token we deliberately omit
  /application\/wasm/, //             a wasm MIME
  /AGFzb/, //                         base64 of the WASM magic bytes -> catches an embedded/data: wasm blob
];

export function scanContent(name, buf) {
  const hits = [];
  if (buf.includes(WASM_MAGIC)) hits.push(`${name}: raw WASM magic bytes (\\0asm)`);
  const text = buf.toString('latin1');
  for (const re of TEXT_PATTERNS) {
    if (re.test(text)) hits.push(`${name}: matches ${re}`);
  }
  return hits;
}

export function scanDir(dir) {
  const offenders = [];
  const walk = (d) => {
    for (const entry of readdirSync(d)) {
      const p = join(d, entry);
      if (statSync(p).isDirectory()) walk(p);
      else offenders.push(...scanContent(p, readFileSync(p)));
    }
  };
  walk(dir);
  return offenders;
}

// Only run as a CLI, not when imported by a test.
if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2] ?? 'dist';
  const offenders = scanDir(dir);
  if (offenders.length > 0) {
    console.error(`WASM-free assertion FAILED for ${dir}:`);
    for (const o of offenders) console.error('  ' + o);
    process.exit(1);
  }
  console.log(`WASM-free: ${dir} is clean (no .wasm refs, WASM construction, magic bytes, or wasm-unsafe-eval).`);
}
