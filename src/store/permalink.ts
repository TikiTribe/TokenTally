// §5.8 permalink: encode CONFIG/STRUCTURAL state only (mode, selection, numeric/enum inputs) - NEVER prompt
// text (systemPromptText/promptText are stripped; sharing text is out of scope). Decode is DEFENSIVE: strict
// size cap, JSON parse, then EXPLICIT per-field extraction with type guards + clamps - it never spreads the
// untrusted object into state, so a __proto__/constructor key or a hostile value cannot pollute the prototype
// or reach the store (F-SEC-3). Decoded strings are charset-validated so they render safely as text nodes.
// Owner: TokenTally UI. Version: Phase 3.
import { MODES, type Mode, type ModelSelection, type ModeInputs, type ContextStrategy } from '@/store/types';

const MAX_HASH_LEN = 4096;
const ID_PATTERN = /^[A-Za-z0-9._:@/-]+$/; // mirrors the registry A7 filter - safe as a text node

const str = (v: unknown, max = 128): string => (typeof v === 'string' && v.length <= max && ID_PATTERN.test(v) ? v : '');
const num = (v: unknown, def = 0): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(v, 1e12) : def);
// NOTE: no bool() helper - the only booleans in scope were the DoW consent gates, and those are now forced
// off on decode (appsec F1) rather than read from the untrusted payload.
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], def: T): T => (typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : def);

export interface DecodedPermalink {
  mode: Mode;
  selection: ModelSelection;
  inputs: Partial<ModeInputs[Mode]>;
}

// The numeric fields we round-trip per mode (text fields are intentionally omitted).
const NUM_FIELDS: Record<Mode, string[]> = {
  chatbot: ['avgUserMessageTokens', 'avgResponseTokens', 'turnsPerConversation', 'conversationsPerMonth'],
  prompt: ['responseTokens', 'callsPerMonth', 'turnsPerCall', 'sharedSystemPromptTokens'],
  agent: ['runsPerMonth', 'stepsPerRun', 'toolSchemaTokens', 'observationGrowthPerStep', 'actionOutputTokens'],
  crew: ['memberCount', 'runsPerMonth', 'stepsPerMember', 'sharedTranscriptGrowthPerStep'],
  denial_of_wallet: ['attackerRequestsPerMonth', 'retryCeiling', 'fallbackInputTokens', 'fallbackOutputTokens'],
};

function b64urlEncode(s: string): string {
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad)));
}

export function encodePermalink(mode: Mode, selection: Record<Mode, ModelSelection>, inputs: ModeInputs): string {
  // Copy only structural fields; drop prompt/system text.
  const safeInputs: Record<string, Record<string, unknown>> = {};
  for (const m of MODES) {
    const src = inputs[m] as unknown as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const f of NUM_FIELDS[m]) out[f] = src[f];
    if (m === 'chatbot') { out['contextStrategy'] = src['contextStrategy']; out['ttl'] = src['ttl']; }
    if (m === 'prompt') out['ttl'] = src['ttl'];
    if (m === 'agent') out['preset'] = src['preset'];
    // F-SEC (appsec F1): the DoW dual-use consent gates (enabled + acknowledgedAuthorizedUse) are NEVER
    // encoded. A shared link must not pre-affirm "I am authorized to test this" on the recipient's behalf or
    // auto-render the exposure figure - the recipient re-checks both boxes themselves. Structural DoW inputs
    // (request counts, ceilings) still round-trip; only the consent affirmation is withheld.
    safeInputs[m] = out;
  }
  return b64urlEncode(JSON.stringify({ v: 1, mode, selection, inputs: safeInputs }));
}

export function decodePermalink(hash: string): DecodedPermalink | null {
  if (!hash || hash.length > MAX_HASH_LEN) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(b64urlDecode(hash));
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const p = parsed as Record<string, unknown>;
  if (p['v'] !== 1) return null;
  const mode = oneOf(p['mode'], MODES, 'chatbot');

  const selObj = (typeof p['selection'] === 'object' && p['selection'] !== null ? p['selection'] : {}) as Record<string, unknown>;
  const sel = (selObj[mode] ?? {}) as Record<string, unknown>;
  const selection: ModelSelection = { canonicalId: str(sel['canonicalId']), deployment: str(sel['deployment']) };
  if (!selection.canonicalId) return null; // nothing usable

  const inObj = (typeof p['inputs'] === 'object' && p['inputs'] !== null ? p['inputs'] : {}) as Record<string, unknown>;
  const src = (inObj[mode] ?? {}) as Record<string, unknown>;
  const inputs: Record<string, unknown> = {};
  for (const f of NUM_FIELDS[mode]) inputs[f] = num(src[f]);
  if (mode === 'chatbot') { inputs['contextStrategy'] = oneOf<ContextStrategy>(src['contextStrategy'], ['minimal', 'moderate', 'full'], 'moderate'); inputs['ttl'] = oneOf(src['ttl'], ['min5', 'hr1'] as const, 'min5'); }
  if (mode === 'prompt') inputs['ttl'] = oneOf(src['ttl'], ['min5', 'hr1'] as const, 'min5');
  if (mode === 'agent') inputs['preset'] = oneOf(src['preset'], ['langchain', 'crewai', 'autogen', 'llamaindex', 'custom'] as const, 'custom');
  // F-SEC (appsec F1): force both DoW consent gates OFF on decode regardless of link contents, so a crafted
  // link can never land the recipient on a pre-armed exposure figure. They must affirm authorization locally.
  if (mode === 'denial_of_wallet') { inputs['enabled'] = false; inputs['acknowledgedAuthorizedUse'] = false; }

  return { mode, selection, inputs: inputs as Partial<ModeInputs[Mode]> };
}
