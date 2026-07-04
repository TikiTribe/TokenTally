// Agent (single) workload: a tool loop of N steps per run, each step re-sending the cached tool-schema
// prefix plus linearly accumulating observations (super-linear re-sent context; no clean-quadratic claim).
// Monthly cost maps to one bursty WarmScenario (D6): burstsPerMonth = runs/K (per-prefix cold onsets,
// P1-A10), activeFraction from the step gap (P1-A6). The step profile reconciles to the headline for a
// cache-null model (P1-A11: step 1 prefix cold-write, steps 2+ warm-read, per-step tier base) and is capped
// + downsampled so a hostile stepsPerRun cannot build a giant array (P1-A12). Owner: engine. Version: Phase 1.
import { SECONDS_PER_MONTH } from '@/engine/caching/policy';
import { effectiveInputRate, effectiveOutputRate, effectiveCacheRates } from '@/engine/cost/rates';
import { meanAccumulated, bounded } from '@/workloads/accumulate';
import { accuracyNoteFor, disabledForecast } from '@/workloads/note';
import { assembleForecast } from '@/workloads/forecast';
import type { AgentConfig, StepProfile, WorkloadForecast } from '@/types/workload';

const PER_MILLION = 1_000_000;
const DEFAULT_STEP_GAP_SECONDS = 5; // tool steps are seconds apart; within-run warmth driver (A6)
// P1-A12: the chart array is bounded; the monthly cost stays exact (closed-form via meanAccumulated).
export const MAX_PLOTTED_STEPS = 512;

// The 1-indexed step numbers to plot: every step up to the cap, else 512 evenly-spaced (incl. first + last).
function plottedStepNumbers(steps: number): number[] {
  if (steps <= MAX_PLOTTED_STEPS) {
    return Array.from({ length: steps }, (_, i) => i + 1);
  }
  const out = new Set<number>();
  for (let i = 0; i < MAX_PLOTTED_STEPS; i++) {
    out.add(1 + Math.round((i * (steps - 1)) / (MAX_PLOTTED_STEPS - 1)));
  }
  return [...out].sort((a, b) => a - b);
}

// Per-step cost. P1-A11: step 1 bills the prefix at the cold WRITE rate, steps 2+ at the warm READ rate;
// each step's rate tier is selected from its OWN accumulated tokens (not a frozen base). For a cache-null
// model write=read=input, so Σ(step)·runs foots exactly to the monthly total. C2 review fix: each step's
// input is clamped to the context-window cap so the chart never displays tokens the model cannot hold.
function stepProfile(cfg: AgentConfig, prefixTokens: number, steps: number, cap: number): StepProfile[] {
  const reasonRate = cfg.model.reasoningPerMToken ?? 0;
  const reasoning = cfg.reasoningTokensPerStep ?? 0;
  return plottedStepNumbers(steps).map((k) => {
    const input = Math.min(bounded(cfg.perStepUserSeedTokens + cfg.observationGrowthPerStep * (k - 1)), cap);
    const tierTokens = prefixTokens + input;
    const inRate = effectiveInputRate(cfg.model, tierTokens);
    const outRate = effectiveOutputRate(cfg.model, tierTokens) ?? 0;
    const { read, write } = effectiveCacheRates(cfg.model, tierTokens);
    const prefixRate = k === 1 ? (write ?? inRate) : (read ?? inRate);
    const cost =
      (prefixTokens * prefixRate + input * inRate + cfg.actionOutputTokens * outRate + reasoning * reasonRate) /
      PER_MILLION;
    return { step: k, inputTokens: input, outputTokens: cfg.actionOutputTokens, reasoningTokens: reasoning, cost };
  });
}

export function agentForecast(cfg: AgentConfig): WorkloadForecast {
  if (cfg.enabled === false) return disabledForecast('agent');

  // F-1 review fix: bound counts + token inputs against hostile magnitudes.
  const steps = Math.floor(bounded(cfg.stepsPerRun));
  const runs = bounded(cfg.runsPerMonth);
  const arrivals = bounded(runs * steps);
  const prefixTokens = Math.max(0, cfg.toolSchemaTokens) + Math.max(0, cfg.systemTokens);
  const k = Math.max(1, Math.floor(cfg.distinctPrefixes ?? 1));
  const gap = Math.max(0, cfg.avgStepGapSeconds ?? DEFAULT_STEP_GAP_SECONDS);
  const activeFraction = Math.min(1, (arrivals * gap) / (SECONDS_PER_MONTH * k));

  const base = bounded(cfg.perStepUserSeedTokens);
  const growth = bounded(cfg.observationGrowthPerStep);
  const rawPerArrivalInput = base + meanAccumulated(0, growth, steps);
  const cap = cfg.model.contextWindow !== null ? Math.max(0, cfg.model.contextWindow - prefixTokens) : Infinity;
  const perArrivalInput = bounded(Math.min(rawPerArrivalInput, cap));
  const contextTruncated = rawPerArrivalInput > cap;

  const forecast = assembleForecast({
    kind: 'agent',
    scenario: {
      model: cfg.model,
      prefixTokens,
      perArrivalInputTokens: perArrivalInput,
      perArrivalOutputTokens: cfg.actionOutputTokens,
      perArrivalReasoningTokens: cfg.reasoningTokensPerStep ?? 0,
      arrivalsPerMonth: arrivals,
      distinctPrefixes: k,
      ttl: cfg.ttl ?? 'min5',
      profile: 'bursty',
      activeFraction,
      burstsPerMonth: runs / k, // A10: per-prefix cold onsets
      tokenizerBand: cfg.tokenizerBand ?? null,
    },
    accum: { base, growth, units: steps, arrivalsPerCycle: runs },
    accuracyNote: accuracyNoteFor(cfg.model, cfg.tokenizerBand ?? null, cfg.assumptionsSource),
    snapshotVersion: cfg.snapshotVersion ?? 'unknown',
    formula: 'agent: bursty warm-cache tool-schema prefix + per-step accumulated observations + action output',
    contextTruncated,
    steps: null,
  });
  return { ...forecast, steps: stepProfile(cfg, prefixTokens, steps, cap) };
}
