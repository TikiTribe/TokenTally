// Candidate transforms for the optimizer. Each takes the workload base and yields zero or more altered
// configs plus a label/rationale; optimize() prices each and keeps the ones that strictly save. Pure — no
// global registry read (deployments are passed in, P1-A21). Dynamic field writes go through an allowlist +
// dangerous-key guard (P1-A28) so a future Phase-3 import path cannot drive a __proto__/constructor write.
// Crew is intentionally excluded (P1-A22: optimizing a crew = optimizing each member, composed in Phase 2).
// Owner: TokenTally engine. Version: Phase 1.
import type { ModelRecord } from '@/types/registry';
import type { ChatbotConfig, PromptConfig, AgentConfig } from '@/types/workload';

export type WorkloadConfig = ChatbotConfig | PromptConfig | AgentConfig;
export type OptKind = 'switch_model' | 'switch_deployment' | 'enable_caching' | 'trim_prefix' | 'adjust_context';
export type OptWorkloadKind = 'chatbot' | 'prompt' | 'agent';

export interface OptimizationBase {
  kind: OptWorkloadKind;
  config: WorkloadConfig;
  candidateModels: ModelRecord[];
  candidateDeployments?: ModelRecord[]; // P1-A21: caller supplies getDeployments(canonicalId); no global read
}

export interface Candidate {
  id: string;
  optKind: OptKind;
  label: string;
  rationale: string;
  config: WorkloadConfig;
}

// P1-A28: keys that must never be written via a computed-key path.
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// The numeric config fields each workload allows a transform / sensitivity sweep to touch (P1-A28).
export const NUMERIC_FIELDS: Record<OptWorkloadKind, readonly string[]> = {
  chatbot: ['systemPromptTokens', 'avgUserMessageTokens', 'avgResponseTokens', 'avgReasoningTokens',
    'turnsPerConversation', 'contextGrowthPerTurn', 'conversationsPerMonth', 'distinctSystemPrompts', 'avgTurnGapSeconds'],
  agent: ['toolSchemaTokens', 'systemTokens', 'perStepUserSeedTokens', 'observationGrowthPerStep',
    'actionOutputTokens', 'reasoningTokensPerStep', 'stepsPerRun', 'runsPerMonth', 'distinctPrefixes', 'avgStepGapSeconds'],
  prompt: ['promptTokens', 'responseTokens', 'reasoningTokens', 'callsPerMonth', 'sharedSystemPromptTokens',
    'turnsPerCall', 'contextGrowthPerTurn'],
};

export function isAllowedNumericField(kind: OptWorkloadKind, field: string): boolean {
  return !DANGEROUS_KEYS.has(field) && NUMERIC_FIELDS[kind].includes(field);
}

// P1-A3: read a numeric config field without an unsafe `as Record<string, number>` cast (config carries a
// non-number `model`, so that assertion fails tsc). Bridge through unknown and validate at runtime.
export function numField(config: WorkloadConfig, field: string): number {
  const v = (config as unknown as Record<string, unknown>)[field];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

// P1-A28: proto-safe computed-key write. Returns the config unchanged if the field is not an allowed numeric
// field (so a hostile field name can neither pollute the prototype nor silently alter an unexpected key).
function setNumeric(kind: OptWorkloadKind, config: WorkloadConfig, field: string, value: number): WorkloadConfig {
  if (!isAllowedNumericField(kind, field)) return config;
  return { ...config, [field]: value } as WorkloadConfig;
}

function withModel(config: WorkloadConfig, model: ModelRecord): WorkloadConfig {
  return { ...config, model } as WorkloadConfig;
}

const prefixField: Record<OptWorkloadKind, string> = {
  chatbot: 'systemPromptTokens', agent: 'toolSchemaTokens', prompt: 'sharedSystemPromptTokens',
};
const growthField: Record<OptWorkloadKind, string> = {
  chatbot: 'contextGrowthPerTurn', agent: 'observationGrowthPerStep', prompt: 'contextGrowthPerTurn',
};

export function candidates(base: OptimizationBase): Candidate[] {
  const out: Candidate[] = [];
  const cur = base.config.model;

  // switch-model: like-for-like candidates that are not the current (canonicalId, deployment).
  for (const m of base.candidateModels) {
    if (m.canonicalId === cur.canonicalId && m.deployment === cur.deployment) continue;
    if (m.mode !== cur.mode || m.billingUnit !== cur.billingUnit) continue;
    out.push({
      id: `switch_model:${m.canonicalId}:${m.deployment}`, optKind: 'switch_model',
      label: `Switch to ${m.displayName} (${m.deployment})`,
      rationale: `Different model at $${m.inputPrice}/$${m.outputPrice ?? 0} per Mtok`,
      config: withModel(base.config, m),
    });
  }

  // switch-deployment: other deployments of the SAME canonical model (gov-cloud/OpenRouter price divergence).
  for (const m of base.candidateDeployments ?? []) {
    if (m.deployment === cur.deployment || m.canonicalId !== cur.canonicalId) continue;
    out.push({
      id: `switch_deployment:${m.deployment}`, optKind: 'switch_deployment',
      label: `Route ${m.displayName} via ${m.deployment}`,
      rationale: `Same model, different deployment pricing`,
      config: withModel(base.config, m),
    });
  }

  // enable-caching (P1-A20): for a cache-capable model, try the other TTL (5-min <-> 1-hour write/read tradeoff).
  if (cur.cache !== null) {
    const curTtl = base.config.ttl ?? 'min5';
    const otherTtl = curTtl === 'hr1' ? 'min5' : 'hr1';
    out.push({
      id: `enable_caching:${otherTtl}`, optKind: 'enable_caching',
      label: `Use ${otherTtl === 'hr1' ? '1-hour' : '5-minute'} cache TTL`,
      rationale: `Re-price at the ${otherTtl} cache TTL (write vs read tradeoff)`,
      config: { ...base.config, ttl: otherTtl } as WorkloadConfig,
    });
  }

  // trim-prefix: cut the stable prefix 30% (tool schema / system prompt pruning).
  const pf = prefixField[base.kind];
  const curPrefix = numField(base.config, pf);
  if (curPrefix > 0) {
    out.push({
      id: 'trim_prefix', optKind: 'trim_prefix', label: `Trim ${pf} by 30%`,
      rationale: `Smaller stable prefix lowers write + read tokens`,
      config: setNumeric(base.kind, base.config, pf, Math.round(curPrefix * 0.7)),
    });
  }

  // adjust-context: cut per-turn/per-step growth 30% (tighter context strategy).
  const gf = growthField[base.kind];
  const curGrowth = numField(base.config, gf);
  if (curGrowth > 0) {
    out.push({
      id: 'adjust_context', optKind: 'adjust_context', label: `Cut ${gf} by 30%`,
      rationale: `Trimming accumulated context lowers per-arrival input`,
      config: setNumeric(base.kind, base.config, gf, Math.round(curGrowth * 0.7)),
    });
  }
  return out;
}
