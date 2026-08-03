#!/usr/bin/env node
// Pricing-catalog refresh. Fetches the newest LiteLLM commit of the prices file, re-vendors it, re-pins the
// commit + sha256 in buildRegistry.ts, regenerates the committed artifact, and prints a diff summary. Opens
// NOTHING and commits NOTHING itself; the caller (refresh-pricing.yml, or a human) PRs + merges the result.
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

// Tier deltas are invisible to the anchor fingerprint (neither gpt-4o nor gpt-4o-mini has a tier), yet a
// changed above-threshold rate reprices a long-context forecast by up to 2x. Since the refresh now
// auto-merges and auto-deploys, any tier change on a model we already shipped, or any newly unreadable
// threshold key, has to stop the unattended path and wait for a human. Models that are NEW this refresh are
// not flagged: they are already listed in the added section and were never priced before.
const tierFingerprint = (snap) =>
  new Map(snap.models.map((m) => [`${m.canonicalId}|${m.deployment}`, JSON.stringify(m.tiers ?? [])]));
const oldTiers = tierFingerprint(oldSnap);
const newTiers = tierFingerprint(newSnap);
const tierChanged = [...newTiers.entries()]
  .filter(([k, v]) => oldTiers.has(k) && oldTiers.get(k) !== v)
  .map(([k]) => k)
  .sort();
// PRICE-DELTA BUDGET (security scan F1/F2/F3). The sha256 pin is TAUTOLOGICAL at refresh time: it is
// computed from the same bytes it verifies, so it proves reproducibility, not authenticity. buildRegistry.ts
// named "human review of the refresh PR" as the compensating control, and auto-merge removed it. The path
// allowlist plus two gpt-4o anchors do not replace it: neither anchor has a tier, and no anchor covers the
// other 2,384 models, so an upstream edit halving a Claude rate would have shipped unattended.
//
// This is the replacement control, and it is deterministic rather than a human gate, so a routine refresh
// still ships unattended as intended. Thresholds are calibrated against the real 2026-07-31 refresh
// (8bb4e624 -> bf1a8fe4), which moved 2 models, max single move 46%, and dropped 24 deprecated models.
const MAX_REL_MOVE = 0.5;      // any single shipped rate moving >50% (legit observed max: 46%)
const MAX_CHANGED_MODELS = 25; // mass-edit tripwire (legit observed: 2)
const MAX_REMOVED_MODELS = 100; // upstream deprecates in batches (legit observed: 24)

const ratesOf = (m) => ({
  input: m.inputPrice,
  output: m.outputPrice,
  cacheRead: m.cache?.cacheReadPerMToken ?? null,
  cacheWrite: m.cache?.cacheWritePerMToken ?? null,
});
const oldByKey = new Map(oldSnap.models.map((m) => [`${m.canonicalId}|${m.deployment}`, m]));
const newByKey = new Map(newSnap.models.map((m) => [`${m.canonicalId}|${m.deployment}`, m]));
const suspiciousMoves = [];
let changedModelCount = 0;
let removedModelCount = 0;
for (const [k, om] of oldByKey) {
  const nm = newByKey.get(k);
  if (nm === undefined) { removedModelCount += 1; continue; }
  const a = ratesOf(om);
  const b = ratesOf(nm);
  let changed = false;
  for (const field of ['input', 'output', 'cacheRead', 'cacheWrite']) {
    const x = a[field];
    const y = b[field];
    if (x === null && y === null) continue;
    if (x === y) continue;
    changed = true;
    // A rate appearing, vanishing, or hitting zero is the poisoning shape (a "free" model reads as $0),
    // and has no meaningful relative delta. Always hold.
    if (x === null || y === null || x === 0 || y === 0) {
      suspiciousMoves.push(`${k} ${field}: ${x} -> ${y}`);
      continue;
    }
    const rel = Math.abs(y - x) / x;
    if (rel > MAX_REL_MOVE) suspiciousMoves.push(`${k} ${field}: ${x} -> ${y} (${Math.round(rel * 100)}%)`);
  }
  if (changed) changedModelCount += 1;
}
const priceReview =
  suspiciousMoves.length > 0 ||
  changedModelCount > MAX_CHANGED_MODELS ||
  removedModelCount > MAX_REMOVED_MODELS;

const unparsedBefore = oldSnap.unparsedTierKeyCount ?? 0;
const unparsedNow = newSnap.unparsedTierKeyCount ?? 0;
// Latching, not edge-triggered. Gating on an INCREASE meant that once any unreadable key merged, every
// later refresh would auto-merge again while the snapshot still carried keys we cannot price. The
// invariant is "zero unreadable threshold keys", so any non-zero count holds the PR for a human.
const unparsedUp = unparsedNow > 0;
const tierReview = tierChanged.length > 0 || unparsedUp;
const holdForHuman = tierReview || priceReview;

const headline = `Refreshed to LiteLLM @ \`${sha.slice(0, 8)}\` (${date}). ${newSnap.models.length} models (${oldSnap.models.length} before): ${added.length} added, ${removed.length} removed.`;
const anchorLine = anchorChanged.length
  ? `WARNING: anchor price changed for ${anchorChanged.join(', ')}. The hand-computed E2E math oracles (chatbot $143.75, etc.) will FAIL and must be updated by hand before merge. old ${JSON.stringify(oldAnchors)} new ${JSON.stringify(newAnchors)}`
  : `Anchor prices unchanged (${ANCHORS.join(', ')}), so the E2E math oracles still hold.`;
const priceLine = priceReview
  ? `PRICE REVIEW REQUIRED: ${suspiciousMoves.length} rate move(s) beyond the delta budget, ${changedModelCount} model(s) changed price, ${removedModelCount} removed. The sha256 pin cannot detect a hostile upstream edit (it is derived from the same fetch), so this budget is the control. Check these before merging:\n${suspiciousMoves.slice(0, 40).map((m) => `- ${m}`).join('\n')}${suspiciousMoves.length > 40 ? `\n...and ${suspiciousMoves.length - 40} more` : ''}`
  : `Price deltas inside budget: ${changedModelCount} model(s) changed price (limit ${MAX_CHANGED_MODELS}), ${removedModelCount} removed (limit ${MAX_REMOVED_MODELS}), no single rate moved more than ${MAX_REL_MOVE * 100}%.`;
const tierLine = tierReview
  ? `REVIEW REQUIRED: ${tierChanged.length} already-shipped model(s) changed their price-tier structure${unparsedUp ? `, and the snapshot carries ${unparsedNow} unreadable threshold key(s) (was ${unparsedBefore}) that may be pricing a model flat above a real cliff` : ''}. Auto-merge is disabled for this PR because a tier change silently reprices long-context forecasts. Check these before merging:\n${tierChanged.slice(0, 40).map((k) => `- ${k}`).join('\n')}${tierChanged.length > 40 ? `\n...and ${tierChanged.length - 40} more` : ''}`
  : `No tier changes on already-shipped models, and no unreadable threshold keys (${unparsedNow}).`;
const list = (arr) => (arr.length ? arr.slice(0, 300).map((k) => `- ${k}`).join('\n') + (arr.length > 300 ? `\n…and ${arr.length - 300} more` : '') : '_none_');
const body = `${headline}\n\n${anchorLine}\n\n${priceLine}\n\n${tierLine}\n\n<details><summary>${added.length} added</summary>\n\n${list(added)}\n</details>\n\n<details><summary>${removed.length} removed</summary>\n\n${list(removed)}\n</details>\n\nAuto-generated by the weekly \`refresh-pricing\` workflow, which waits for this PR's \`ci\` run and then **merges it automatically once that run is green** — the full run, not the pre-PR quick gate, is what executes the hand-computed E2E math oracles, so it is the gate that catches a broken anchor price. Auto-merge is skipped and this PR waits for a human if the diff touches anything outside the pricing artifact allowlist, if an anchor price changed, or if \`ci\` is red.`;

console.log(headline);
console.log(anchorLine);
console.log(tierLine);
console.log(priceLine);
const bodyPath = process.env.REFRESH_BODY_PATH ?? '.refresh-pr-body.md';
writeFileSync(bodyPath, body);
setOutput('changed', 'true');
setOutput('sha', sha);
setOutput('short', sha.slice(0, 8));
setOutput('date', date);
setOutput('anchor_changed', anchorChanged.length ? 'true' : 'false');
setOutput('tier_review', holdForHuman ? 'true' : 'false');
