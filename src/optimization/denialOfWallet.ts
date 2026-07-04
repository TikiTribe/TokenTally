// Denial of Wallet (DEFENSIVE). Bounds the worst-case monthly spend an adversary can force by filling the
// context window, maxing output AND reasoning (P1-A14: reasoning models bill reasoning separately, up to
// ~5.83x output), and forcing retries, under the worst cache posture (p_warm=0: every request pays cold,
// never a warm read — the conservativeTotal seam, C12). Shipped with a confidence range and an honest tier
// note, never false-precise. Framed for defenders: each mitigation (output cap, retry ceiling, per-user rate
// limit, context cap) shows the dollars it removes. Opt-in (enabled defaults FALSE; above the launch cut
// line) and kill-switch gated. The dual-use disclaimer + a REAL VDP link travel INSIDE the result (P1-A1 /
// F-SEC-2). Non-per_token billing is never a silent $0 (P1-A15). Pure. Owner: engine. Version: Phase 1.
import { monthlyWarmCost } from '@/engine';
import { bounded } from '@/workloads/accumulate';
import type { ModelRecord } from '@/types/registry';
import type { ConfidenceRange } from '@/types/engine';

export const DOW_DISCLAIMER =
  'Defensive planning only. This bounds your own worst-case spend so you can set budget, output, retry, ' +
  'and rate-limit controls. Do not use it to plan abuse of a third party; test only systems you are ' +
  'authorized to test.';
// P1-A1: a real, always-reachable disclosure channel (no served asset needed; satisfies QC.1 VDP).
export const DOW_VDP_URL = 'https://github.com/TikiTribe/TokenTally/security/advisories/new';

export interface DenialOfWalletConfig {
  model: ModelRecord;
  attackerRequestsPerMonth: number;
  retryCeiling?: number; // forced-retry multiplier the attacker can trigger; default 1
  enabled?: boolean; // kill switch; default FALSE (opt-in)
  fallbackInputTokens?: number; // used when contextWindow is null
  fallbackOutputTokens?: number; // used when maxOutput is null
  fallbackReasoningTokens?: number; // reasoning ceiling when the model reasons; default maxOutput
  perUserRequestCap?: number; // for the rate-limit mitigation illustration
}

export interface Mitigation {
  control: string;
  reducedMonthly: number; // worst case AFTER applying this single control
  savedMonthly: number; // worstCaseMonthly - reducedMonthly
}

export interface DenialOfWalletResult {
  enabled: boolean;
  worstCaseMonthly: number;
  confidence: ConfidenceRange;
  mitigations: Mitigation[];
  note: string;
  disclaimer: string; // F-SEC-2: guardrail travels with the number
  vdpUrl: string;
}

const inert = (note: string): DenialOfWalletResult => ({
  enabled: false,
  worstCaseMonthly: 0,
  confidence: { low: 0, mid: 0, high: 0, unmodeled: true },
  mitigations: [],
  note,
  disclaimer: DOW_DISCLAIMER,
  vdpUrl: DOW_VDP_URL,
});

// Price a worst-case posture: p_warm=0 (conservativeTotal), K = requests (no reuse), all cold.
function worstCase(
  model: ModelRecord,
  requests: number,
  inputTokens: number,
  outputTokens: number,
  reasoningTokens: number,
): { cost: number; conf: ConfidenceRange } {
  const r = monthlyWarmCost({
    model,
    prefixTokens: 0, // fold everything into per-arrival input so no warm-prefix discount applies
    perArrivalInputTokens: inputTokens,
    perArrivalOutputTokens: outputTokens,
    perArrivalReasoningTokens: reasoningTokens,
    arrivalsPerMonth: bounded(requests),
    distinctPrefixes: Math.max(1, bounded(requests)), // no reuse
    ttl: 'min5',
    profile: 'steady',
    tokenizerBand: null,
  });
  return { cost: r.conservativeTotal, conf: r.confidence };
}

export function denialOfWallet(cfg: DenialOfWalletConfig): DenialOfWalletResult {
  if (cfg.enabled !== true) return inert('disabled: Denial of Wallet is opt-in (kill switch off)');

  // P1-A15: non-per_token billing is not modeled by the token cost core — never present a silent $0.
  if (cfg.model.billingUnit !== 'per_token') {
    return {
      enabled: true,
      worstCaseMonthly: 0,
      confidence: { low: 0, mid: 0, high: 0, unmodeled: true },
      mitigations: [],
      note:
        `not modeled for ${cfg.model.billingUnit} billing — do not read as $0 exposure. ` +
        `A ${cfg.model.billingUnit} SKU (e.g. realtime audio) accrues cost per unit held; size it in that unit.`,
      disclaimer: DOW_DISCLAIMER,
      vdpUrl: DOW_VDP_URL,
    };
  }

  const usedFallback = cfg.model.contextWindow === null || cfg.model.maxOutput === null;
  const inputTokens = cfg.model.contextWindow ?? Math.max(0, cfg.fallbackInputTokens ?? 0);
  const outputTokens = cfg.model.maxOutput ?? Math.max(0, cfg.fallbackOutputTokens ?? 0);
  // P1-A14: an adversary can force a large reasoning budget on a reasoning model.
  const reasoningTokens =
    cfg.model.reasoningPerMToken !== null ? (cfg.fallbackReasoningTokens ?? cfg.model.maxOutput ?? outputTokens) : 0;
  const retries = Math.max(1, cfg.retryCeiling ?? 1);
  const requests = bounded(bounded(cfg.attackerRequestsPerMonth) * retries);

  const base = worstCase(cfg.model, requests, inputTokens, outputTokens, reasoningTokens);

  // Mitigations: each recomputes the worst case with one control applied. Only strictly-positive savings ship.
  const candidates: Mitigation[] = [];
  const halfOut = worstCase(cfg.model, requests, inputTokens, Math.round(outputTokens / 2), reasoningTokens);
  candidates.push({ control: 'Cap output at 50% of max', reducedMonthly: halfOut.cost, savedMonthly: base.cost - halfOut.cost });
  const quarterCtx = worstCase(cfg.model, requests, Math.round(inputTokens / 4), outputTokens, reasoningTokens);
  candidates.push({ control: 'Cap input context at 25%', reducedMonthly: quarterCtx.cost, savedMonthly: base.cost - quarterCtx.cost });
  // P1-A2: only offer the retry mitigation when retries can actually be reduced (>1), else it saves $0.
  if (retries > 1) {
    const noRetry = worstCase(cfg.model, bounded(cfg.attackerRequestsPerMonth), inputTokens, outputTokens, reasoningTokens);
    candidates.push({ control: 'Retry ceiling = 1', reducedMonthly: noRetry.cost, savedMonthly: base.cost - noRetry.cost });
  }
  if (cfg.perUserRequestCap && cfg.perUserRequestCap > 0) {
    const capped = worstCase(cfg.model, Math.min(requests, cfg.perUserRequestCap * retries), inputTokens, outputTokens, reasoningTokens);
    candidates.push({ control: `Per-user rate limit (${cfg.perUserRequestCap}/mo)`, reducedMonthly: capped.cost, savedMonthly: base.cost - capped.cost });
  }
  const mitigations = candidates.filter((m) => m.savedMonthly > 0).sort((a, b) => b.savedMonthly - a.savedMonthly);

  const tierNote =
    cfg.model.accuracyTier === 'exact'
      ? ''
      : ` Underlying token cost is ${cfg.model.accuracyTier}-tier — a bounded estimate, not a precise figure.`;
  const reasonNote = reasoningTokens > 0 ? ` + ${reasoningTokens} reasoning tok` : '';
  const fbNote = usedFallback ? ' Used explicit fallback caps (model exposes no contextWindow/maxOutput).' : '';
  const note =
    `Worst case: adversary fills context (${inputTokens} tok) + maxes output (${outputTokens} tok)${reasonNote}` +
    (retries > 1 ? ` x${retries} retries` : '') +
    `, no warm cache (conservative p_warm=0).${tierNote}${fbNote}`;

  return {
    enabled: true,
    worstCaseMonthly: base.cost,
    confidence: base.conf,
    mitigations,
    note,
    disclaimer: DOW_DISCLAIMER,
    vdpUrl: DOW_VDP_URL,
  };
}
