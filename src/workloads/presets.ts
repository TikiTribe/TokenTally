// Framework presets: tunable default seeds for the Agent workload, one per common framework. Each is a
// documented round-number STARTING POINT (framework docs / typical community values), explicitly NOT a
// measured benchmark. applyPreset stamps `assumptionsSource` onto the produced config (P1-A17) so the
// forecast's accuracyNote says the inputs are unvalidated seeds regardless of the tokenizer tier. The
// `custom` fallback is a standalone const (P1-A4) so the lookup never dereferences a possibly-undefined
// array element. Owner: engine. Version: Phase 1.
import type { AgentConfig } from '@/types/workload';
import type { ModelRecord } from '@/types/registry';

export type PresetName = 'langchain' | 'crewai' | 'autogen' | 'llamaindex' | 'custom';

export interface AgentPreset {
  name: PresetName;
  label: string;
  source: string; // provenance note: why these seeds (never "measured")
  seed: Omit<AgentConfig, 'model'>;
}

const CUSTOM_SEED: Omit<AgentConfig, 'model'> = {
  toolSchemaTokens: 1500, systemTokens: 400, perStepUserSeedTokens: 100, observationGrowthPerStep: 350,
  actionOutputTokens: 150, stepsPerRun: 6, runsPerMonth: 1000, distinctPrefixes: 1, ttl: 'min5',
};

export const CUSTOM_PRESET: AgentPreset = {
  name: 'custom', label: 'Custom', source: 'default seed: tune every field', seed: CUSTOM_SEED,
};

export const AGENT_PRESETS: AgentPreset[] = [
  { name: 'langchain', label: 'LangChain / LangGraph',
    source: 'seed: typical ReAct tool loop, larger tool-schema prefix',
    seed: { ...CUSTOM_SEED, toolSchemaTokens: 2500, stepsPerRun: 8, observationGrowthPerStep: 450 } },
  { name: 'crewai', label: 'CrewAI',
    source: 'seed: role-prompt heavy, moderate steps per member',
    seed: { ...CUSTOM_SEED, systemTokens: 900, stepsPerRun: 5, observationGrowthPerStep: 300 } },
  { name: 'autogen', label: 'AutoGen',
    source: 'seed: conversational group-chat turns, higher output',
    seed: { ...CUSTOM_SEED, stepsPerRun: 10, actionOutputTokens: 220, observationGrowthPerStep: 400 } },
  { name: 'llamaindex', label: 'LlamaIndex',
    source: 'seed: RAG query engine, large retrieved-context growth',
    seed: { ...CUSTOM_SEED, observationGrowthPerStep: 800, stepsPerRun: 4, actionOutputTokens: 180 } },
  CUSTOM_PRESET,
];

export function applyPreset(name: PresetName, model: ModelRecord, over: Partial<AgentConfig> = {}): AgentConfig {
  const preset = AGENT_PRESETS.find((p) => p.name === name) ?? CUSTOM_PRESET;
  // P1-A17: mark the inputs as unvalidated seed defaults (unless the caller overrides the provenance).
  return { model, ...preset.seed, assumptionsSource: `${preset.name} preset seed defaults`, ...over };
}
