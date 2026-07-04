// Workload contract shared by every adapter (chatbot/prompt/agent/crew) and the optimizer. A workload
// reduces its domain inputs to a WarmScenario (spec D6: workloads differ only in accumulation) and returns
// a WorkloadForecast: the engine cost result, the monthly dollar figure, the arrival count it derived, an
// honest accuracy note, the pricing snapshotVersion + a formula trace (§6/§12 auditability, P1-A16), the
// tier-straddle / context-truncation flags (P1-A7/A9), and (agent/crew only) the per-unit step profile the
// accumulation chart plots. Owner: TokenTally engine. Version: Phase 1.
//
// SECURITY (P1-A29): the string fields returned here (accuracyNote, formula, and the optimizer/DoW label /
// rationale / note / control strings) are DATA. A Phase-2 UI must render them as DOM text nodes only, never
// via innerHTML/dangerouslySetInnerHTML. Any interpolated registry field (displayName/deployment) is already
// A7-sanitized at the registry source; keep that invariant if new fields are interpolated.
import type { WarmCostResult } from '@/types/engine';
import type { ModelRecord } from '@/types/registry';

export const WORKLOAD_KINDS = ['chatbot', 'prompt', 'agent', 'crew', 'denial_of_wallet'] as const;
export type WorkloadKind = (typeof WORKLOAD_KINDS)[number];

// Per-step (agent) or per-turn accumulation point the chart plots. `cost` reconciles to the headline for a
// cache-null model (P1-A11): step 1 bills the prefix at the cold write rate, steps 2+ at the warm read rate.
export interface StepProfile {
  step: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cost: number;
}

export interface WorkloadForecast {
  kind: WorkloadKind;
  monthlyCost: number; // === cost.centralTotal for a single-scenario workload; summed for crew
  cost: WarmCostResult;
  arrivalsPerMonth: number;
  accuracyNote: string; // honest tier note, e.g. "estimate: token counts are heuristic (±band)"
  snapshotVersion: string; // pricing snapshot that priced this forecast (P1-A16); 'unknown' if not supplied
  formula: string; // stable derivation trace (mapping name + ordered waterfall labels) (P1-A16)
  tierStraddle: boolean; // P1-A7: accumulation crossed a 128k/200k price tier -> per-band pricing used
  contextTruncated: boolean; // P1-A9: per-arrival input was clamped to the model context window
  steps: StepProfile[] | null; // accumulation profile for agent/crew; null for chatbot/prompt
}

// Optional systematic tokenizer bias band threaded from the 0B tokenizer (countTokens().errorBand).
export type TokenizerBand = { relLow: number; relHigh: number } | null;

// ---- Per-workload configs (token counts are inputs; the UI derives them via countTokens in Phase 2) ----
//
// Common optional fields on every config:
//   snapshotVersion?: the pricing snapshot id (P1-A16); the caller passes getSnapshotMeta().snapshotVersion.
//   assumptionsSource?: provenance of the inputs (P1-A17); applyPreset stamps "preset:<name> (seed defaults)".
//   enabled?: kill switch (spec §9). Workloads default ON; Denial of Wallet defaults OFF (opt-in).

export interface ChatbotConfig {
  model: ModelRecord;
  systemPromptTokens: number; // the cached stable prefix
  avgUserMessageTokens: number;
  avgResponseTokens: number;
  avgReasoningTokens?: number; // reasoning models only; default 0
  turnsPerConversation: number;
  contextGrowthPerTurn: number; // 50 minimal / 150 moderate / 300 full (tokens added each turn)
  conversationsPerMonth: number;
  distinctSystemPrompts?: number; // K, default 1
  ttl?: 'min5' | 'hr1'; // default 'min5'
  avgTurnGapSeconds?: number; // P1-A6: seconds between turns -> within-burst warmth; default 45
  tokenizerBand?: TokenizerBand;
  snapshotVersion?: string;
  assumptionsSource?: string;
  enabled?: boolean;
}

export interface PromptConfig {
  model: ModelRecord;
  promptTokens: number;
  responseTokens: number;
  reasoningTokens?: number;
  callsPerMonth: number;
  sharedSystemPromptTokens?: number; // a stable prefix reused across calls (cacheable); default 0
  turnsPerCall?: number; // multi-turn batch item, default 1
  contextGrowthPerTurn?: number; // default 0
  ttl?: 'min5' | 'hr1';
  tokenizerBand?: TokenizerBand;
  snapshotVersion?: string;
  assumptionsSource?: string;
  enabled?: boolean;
}

export interface AgentConfig {
  model: ModelRecord;
  toolSchemaTokens: number; // stable cached prefix (tool schemas)
  systemTokens: number; // additional stable prefix
  perStepUserSeedTokens: number; // non-accumulating per-step input (the task/turn instruction)
  observationGrowthPerStep: number; // tokens of tool-observation added to context each step
  actionOutputTokens: number; // per-step action/answer output
  reasoningTokensPerStep?: number; // reasoning models only; default 0
  stepsPerRun: number;
  runsPerMonth: number;
  distinctPrefixes?: number; // K, default 1
  ttl?: 'min5' | 'hr1';
  avgStepGapSeconds?: number; // P1-A6: seconds between steps -> within-run warmth; default 5
  tokenizerBand?: TokenizerBand;
  snapshotVersion?: string;
  assumptionsSource?: string;
  enabled?: boolean;
}

export interface CrewConfig {
  agents: AgentConfig[]; // each crew member is an agent workload
  orchestrator?: AgentConfig; // the coordinator's own runs (optional)
  sharedTranscriptGrowthPerStep: number; // tokens each member re-reads as the transcript grows
  runsPerMonth: number; // crew runs; overrides each member's runsPerMonth
  snapshotVersion?: string;
  enabled?: boolean;
}
