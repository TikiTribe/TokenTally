// D2: serve dist/ with the EXACT security headers parsed from vercel.json - single source of truth, so
// the Playwright CSP test can never drift from what production ships. Used by the CSP/egress specs and as
// the go-live pre-flight target. Owner: TokenTally CI. Version: 0D.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname } from 'node:path';

// Extract the security headers from the vercel.json "/(.*)" block (the header set applied to every route).
export function headersFromVercel(vercelPath) {
  const cfg = JSON.parse(readFileSync(vercelPath, 'utf8'));
  const block = (cfg.headers ?? []).find((h) => h.source === '/(.*)');
  if (block === undefined) throw new Error('vercel.json has no "/(.*)" header block');
  const out = {};
  for (const { key, value } of block.headers) out[key] = value;
  if (out['Content-Security-Policy'] === undefined) throw new Error('vercel.json has no Content-Security-Policy');
  return out;
}

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.map': 'application/json', '.ico': 'image/x-icon',
};

// Static server that applies the vercel headers and SPA-rewrites unknown routes to index.html (mirrors prod).
export function createCspServer(distDir, headers) {
  return createServer((req, res) => {
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
    const urlPath = (req.url ?? '/').split('?')[0];
    let file = join(distDir, urlPath === '/' ? 'index.html' : urlPath);
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(distDir, 'index.html'); // SPA rewrite
    res.setHeader('Content-Type', MIME[extname(file)] ?? 'application/octet-stream');
    res.end(readFileSync(file));
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 4173);
  const headers = headersFromVercel(new URL('../../vercel.json', import.meta.url).pathname);
  createCspServer(new URL('../../dist', import.meta.url).pathname, headers).listen(port, () => {
    console.log(`serving dist/ with the vercel.json CSP on http://localhost:${port}`);
  });
}
