// Chatbot workload: conversations of T turns, each turn re-hitting the cached system prompt and carrying
// linearly accumulating context. Maps to one bursty WarmScenario (spec D6): arrivals = conversations*turns.
// P1-A6: the within-burst warmth needs a real activeFraction derived from the burst structure
// (arrivals*avgTurnGap / month) - defaulting it to 1 collapses the within-burst rate to the monthly average
// and bills turns 2+ as cold (~4x too many writes at SMB volumes). P1-A10: cold onsets are per-prefix, so
// burstsPerMonth = conversations / K (the engine multiplies by K). P1-A9: per-arrival input is clamped to
// the context window. Owner: engine. Version: Phase 1.
import { SECONDS_PER_MONTH } from '@/engine/caching/policy';
import { meanAccumulated, bounded } from '@/workloads/accumulate';
import { accuracyNoteFor, disabledForecast } from '@/workloads/note';
import { assembleForecast } from '@/workloads/forecast';
import type { ChatbotConfig, WorkloadForecast } from '@/types/workload';

const DEFAULT_TURN_GAP_SECONDS = 45; // typical human reply cadence; within-burst warmth driver (A6)

export function chatbotForecast(cfg: ChatbotConfig): WorkloadForecast {
  if (cfg.enabled === false) return disabledForecast('chatbot');

  // F-1 review fix: bound the count + token inputs (turns/growth/base) so a hostile magnitude can never
  // overflow the per-arrival input to Infinity (which the engine would clamp to $0) or overflow the banded
  // straddle math to $Infinity.
  const turns = Math.floor(bounded(cfg.turnsPerConversation));
  const conversations = bounded(cfg.conversationsPerMonth);
  const arrivals = bounded(conversations * turns);
  const k = Math.max(1, Math.floor(cfg.distinctSystemPrompts ?? 1));
  const gap = Math.max(0, cfg.avgTurnGapSeconds ?? DEFAULT_TURN_GAP_SECONDS);

  // A6: fraction of wall-clock time a GIVEN prefix is "busy" (in a conversation) - sets the within-burst
  // rate. Divide by K: each of K distinct prefixes is active only 1/K of the total busy time, so the
  // within-conversation warmth (turns gap-seconds apart) stays K-independent, as physics demands.
  const activeFraction = Math.min(1, (arrivals * gap) / (SECONDS_PER_MONTH * k));

  // A9: clamp accumulated per-arrival input to what the context window can hold beyond the prefix.
  const base = bounded(cfg.avgUserMessageTokens);
  const growth = bounded(cfg.contextGrowthPerTurn);
  const rawPerArrivalInput = base + meanAccumulated(0, growth, turns);
  const cap = cfg.model.contextWindow !== null ? Math.max(0, cfg.model.contextWindow - cfg.systemPromptTokens) : Infinity;
  const perArrivalInput = bounded(Math.min(rawPerArrivalInput, cap));
  const contextTruncated = rawPerArrivalInput > cap;

  return assembleForecast({
    kind: 'chatbot',
    scenario: {
      model: cfg.model,
      prefixTokens: cfg.systemPromptTokens,
      perArrivalInputTokens: perArrivalInput,
      perArrivalOutputTokens: cfg.avgResponseTokens,
      perArrivalReasoningTokens: cfg.avgReasoningTokens ?? 0,
      arrivalsPerMonth: arrivals,
      distinctPrefixes: k,
      ttl: cfg.ttl ?? 'min5',
      profile: 'bursty',
      activeFraction,
      burstsPerMonth: conversations / k, // A10: per-prefix cold onsets
      tokenizerBand: cfg.tokenizerBand ?? null,
    },
    accum: { base, growth, units: turns, arrivalsPerCycle: conversations },
    accuracyNote: accuracyNoteFor(cfg.model, cfg.tokenizerBand ?? null, cfg.assumptionsSource),
    snapshotVersion: cfg.snapshotVersion ?? 'unknown',
    formula: 'chatbot: bursty warm-cache (≈1 cold write/conversation) + accumulated input + output',
    contextTruncated,
    steps: null,
  });
}
