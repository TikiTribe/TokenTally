// Prompt/Batch workload: independent calls (optionally multi-turn), each a batch item. With no shared
// prefix, each call is its own distinct prefix (K = arrivals) so there is no cross-call reuse; a shared
// cacheable system prompt collapses to K=1 and the warm-cache engine credits the reads. Batch items are
// independent -> steady profile (no burst onsets). P1-A9 context clamp, P1-A13 magnitude clamp applied.
// Owner: TokenTally engine. Version: Phase 1.
import { meanAccumulated, bounded } from '@/workloads/accumulate';
import { accuracyNoteFor, disabledForecast } from '@/workloads/note';
import { assembleForecast } from '@/workloads/forecast';
import type { PromptConfig, WorkloadForecast } from '@/types/workload';

export function promptForecast(cfg: PromptConfig): WorkloadForecast {
  if (cfg.enabled === false) return disabledForecast('prompt');

  const turns = Math.max(1, Math.floor(cfg.turnsPerCall ?? 1));
  const calls = bounded(cfg.callsPerMonth);
  const arrivals = bounded(calls * turns);
  const shared = Math.max(0, cfg.sharedSystemPromptTokens ?? 0);

  const rawPerArrivalInput = cfg.promptTokens + meanAccumulated(0, cfg.contextGrowthPerTurn ?? 0, turns);
  const cap = cfg.model.contextWindow !== null ? Math.max(0, cfg.model.contextWindow - shared) : Infinity;
  const perArrivalInput = Math.min(rawPerArrivalInput, cap);
  const contextTruncated = rawPerArrivalInput > cap;

  return assembleForecast({
    kind: 'prompt',
    scenario: {
      model: cfg.model,
      prefixTokens: shared,
      perArrivalInputTokens: perArrivalInput,
      perArrivalOutputTokens: cfg.responseTokens,
      perArrivalReasoningTokens: cfg.reasoningTokens ?? 0,
      arrivalsPerMonth: arrivals,
      // no shared prefix -> every call is a unique prefix (no reuse); shared -> one hot prefix.
      distinctPrefixes: shared > 0 ? 1 : Math.max(1, arrivals),
      ttl: cfg.ttl ?? 'min5',
      profile: 'steady',
      tokenizerBand: cfg.tokenizerBand ?? null,
    },
    accum: { base: cfg.promptTokens, growth: cfg.contextGrowthPerTurn ?? 0, units: turns, arrivalsPerCycle: calls },
    accuracyNote: accuracyNoteFor(cfg.model, cfg.tokenizerBand ?? null, cfg.assumptionsSource),
    snapshotVersion: cfg.snapshotVersion ?? 'unknown',
    formula: 'prompt: per-call input + output (shared-prefix warm-cache when present)',
    contextTruncated,
    steps: null,
  });
}
