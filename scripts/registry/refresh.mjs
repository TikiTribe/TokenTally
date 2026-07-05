#!/usr/bin/env node
// Pricing-catalog refresh. Fetches the newest LiteLLM commit of the prices file, re-vendors it, re-pins the
// commit + sha256 in buildRegistry.ts, regenerates the committed artifact, and prints a diff summary. Opens
// NOTHING and commits NOTHING itself; the caller (refresh-pricing.yml, or a human) reviews + PRs the result.
// Idempotent: if already on the latest commit it exits without changes. `--dry-run` fetches + reports only.
// Owner: TokenTally engine. Version: refresh-1.
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const DRY = process.argv.includes('--dry-run');
const OWNER = 'BerriAI';
const REPO = 'litellm';
const FILE = 'model_prices_and_context_window.json';
const BUILD = 'scripts/registry/buildRegistry.ts';
const ARTIFACT = 'src/config/registry.generated.json';
const ANCHORS = ['gpt-4o|openai', 'gpt-4o-mini|openai']; // the E2E math oracles hard-code these prices

const authHeaders = process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};

async function getJson(url) {
  const r = await fetch(url, { headers: { accept: 'application/vnd.github+json', 'user-agent': 'tokentally-refresh', ...authHeaders } });
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
  return r.json();
}
function setOutput(k, v) {
  if (process.env.GITHUB_OUTPUT) writeFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`, { flag: 'a' });
}
// Fingerprint every field the hand-computed E2E oracles depend on (input, output, cache read, context window,
// max output), not just input/output, so an oracle-breaking change is actually flagged.
const anchorPrices = (models) =>
  Object.fromEntries(ANCHORS.map((k) => {
    const [c, d] = k.split('|');
    const m = models.find((x) => x.canonicalId === c && x.deployment === d);
    return [k, m ? `in ${m.inputPrice} out ${m.outputPrice} cacheRead ${m.cache?.cacheReadPerMToken ?? null} ctx ${m.contextWindow} maxOut ${m.maxOutput}` : 'MISSING'];
  }));

const build = readFileSync(BUILD, 'utf8');
const curMatch = build.match(/PINNED_COMMIT = '([0-9a-f]{40})'/);
if (!curMatch) throw new Error(`Could not find PINNED_COMMIT in ${BUILD} (unexpected formatting?)`);
const curSha = curMatch[1];

const commits = await getJson(`https://api.github.com/repos/${OWNER}/${REPO}/commits?path=${FILE}&per_page=1`);
if (!Array.isArray(commits) || !commits[0]?.sha || !commits[0]?.commit?.author?.date) {
  throw new Error(`Unexpected GitHub commits API response for ${FILE}: ${JSON.stringify(commits).slice(0, 200)}`);
}
const sha = commits[0].sha;
const date = commits[0].commit.author.date.slice(0, 10);
// Harden the values that flow into GITHUB_OUTPUT -> the workflow's branch/title/commit (defense in depth
// against a hostile upstream commit; the workflow also env-binds + quotes them).
if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error(`upstream sha is not 40-hex: ${JSON.stringify(sha)}`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`upstream date is not ISO yyyy-mm-dd: ${JSON.stringify(date)}`);

if (sha === curSha) {
  console.log(`Already current: LiteLLM @ ${sha.slice(0, 8)} (${date}). No refresh needed.`);
  setOutput('changed', 'false');
  process.exit(0);
}

// Fetch the exact-commit body (never `main`, so the pin is reproducible) and validate it. The build still
// hash-verifies this body against EXPECTED_SNAPSHOT_SHA256, so a tampered fetch is caught at build time.
const rawRes = await fetch(`https://raw.githubusercontent.com/${OWNER}/${REPO}/${sha}/${FILE}`, { headers: { 'user-agent': 'tokentally-refresh' } });
if (!rawRes.ok) throw new Error(`raw fetch of ${FILE}@${sha.slice(0, 8)} -> HTTP ${rawRes.status}`);
const raw = await rawRes.text();
JSON.parse(raw); // must be valid JSON before we vendor it
const hash = createHash('sha256').update(raw).digest('hex');

const oldSnap = JSON.parse(readFileSync(ARTIFACT, 'utf8'));
const oldKeys = new Set(oldSnap.models.map((m) => `${m.canonicalId}|${m.deployment}`));
const oldAnchors = anchorPrices(oldSnap.models);

if (DRY) {
  console.log(`[dry-run] Update available: ${curSha.slice(0, 8)} -> ${sha.slice(0, 8)} (${date}). sha256 ${hash.slice(0, 12)}…`);
  setOutput('changed', 'true');
  process.exit(0);
}

// Vendor the new body, re-pin, drop the old vendor file, regenerate the artifact at the commit's date.
const vendorNew = `scripts/registry/vendor/model_prices.${sha.slice(0, 8)}.json`;
const vendorOld = `scripts/registry/vendor/model_prices.${curSha.slice(0, 8)}.json`;
writeFileSync(vendorNew, raw);
writeFileSync(BUILD, build
  .replace(/PINNED_COMMIT = '[0-9a-f]{40}'/, `PINNED_COMMIT = '${sha}'`)
  .replace(/EXPECTED_SNAPSHOT_SHA256 = '[0-9a-f]{64}'/, `EXPECTED_SNAPSHOT_SHA256 = '${hash}'`));
if (existsSync(vendorOld) && vendorOld !== vendorNew) unlinkSync(vendorOld);
execFileSync('npx', ['tsx', 'scripts/registry/buildRegistry.ts'], { env: { ...process.env, SNAPSHOT_DATE: date }, stdio: 'inherit' });

// Diff for the PR body.
const newSnap = JSON.parse(readFileSync(ARTIFACT, 'utf8'));
const newKeys = new Set(newSnap.models.map((m) => `${m.canonicalId}|${m.deployment}`));
const added = [...newKeys].filter((k) => !oldKeys.has(k)).sort();
const removed = [...oldKeys].filter((k) => !newKeys.has(k)).sort();
const newAnchors = anchorPrices(newSnap.models);
const anchorChanged = ANCHORS.filter((k) => oldAnchors[k] !== newAnchors[k]);

const headline = `Refreshed to LiteLLM @ \`${sha.slice(0, 8)}\` (${date}). ${newSnap.models.length} models (${oldSnap.models.length} before): ${added.length} added, ${removed.length} removed.`;
const anchorLine = anchorChanged.length
  ? `WARNING: anchor price changed for ${anchorChanged.join(', ')}. The hand-computed E2E math oracles (chatbot $143.75, etc.) will FAIL and must be updated by hand before merge. old ${JSON.stringify(oldAnchors)} new ${JSON.stringify(newAnchors)}`
  : `Anchor prices unchanged (${ANCHORS.join(', ')}), so the E2E math oracles still hold.`;
const list = (arr) => (arr.length ? arr.slice(0, 300).map((k) => `- ${k}`).join('\n') + (arr.length > 300 ? `\n…and ${arr.length - 300} more` : '') : '_none_');
const body = `${headline}\n\n${anchorLine}\n\n<details><summary>${added.length} added</summary>\n\n${list(added)}\n</details>\n\n<details><summary>${removed.length} removed</summary>\n\n${list(removed)}\n</details>\n\nAuto-generated by the monthly \`refresh-pricing\` workflow. Review the model/price deltas above. Merge ONLY once CI is green — the full \`ci\` run (not the pre-PR quick gate) is what runs the hand-computed E2E math oracles, so it is the gate that catches a broken anchor price. CI runs automatically only if the \`REFRESH_PAT\` secret is set; otherwise push an empty commit to this branch to trigger it.`;

console.log(headline);
console.log(anchorLine);
const bodyPath = process.env.REFRESH_BODY_PATH ?? '.refresh-pr-body.md';
writeFileSync(bodyPath, body);
setOutput('changed', 'true');
setOutput('sha', sha);
setOutput('short', sha.slice(0, 8));
setOutput('date', date);
setOutput('anchor_changed', anchorChanged.length ? 'true' : 'false');
