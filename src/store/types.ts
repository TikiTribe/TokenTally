// Phase 2 UI store types. These are the UI-SHAPED inputs (distinct from the engine's @/types/workload
// configs); a pure mapper (src/store/modeMapping.ts, 2C) turns them + a resolved ModelRecord + token counts
// into engine configs. Model selection is a (canonicalId, deployment) KEY, never a resolved ModelRecord, so
// the store carries zero registry runtime dependency (first-paint boundary, P2-A7). Owner: TokenTally UI.
// Version: Phase 2A.
import type { PresetName } from '@/workloads'; // type-only: erased at build, no runtime edge

export type Mode = 'chatbot' | 'prompt' | 'agent' | 'crew' | 'denial_of_wallet';
export const MODES: readonly Mode[] = ['chatbot', 'prompt', 'agent', 'crew', 'denial_of_wallet'];

export type ThemeMode = 'light' | 'dark' | 'system';
export type RegistryStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ModelSelection {
  canonicalId: string;
  deployment: string;
}

export interface SnapshotMeta {
  snapshotVersion: string;
  snapshotDate: string;
  droppedCount: number;
}

export type ContextStrategy = 'minimal' | 'moderate' | 'full';

export interface ChatbotInputs {
  systemPromptText: string; // tokenized live in the worker (2B)
  avgUserMessageTokens: number;
  avgResponseTokens: number;
  turnsPerConversation: number;
  contextStrategy: ContextStrategy;
  conversationsPerMonth: number;
  ttl: 'min5' | 'hr1';
}

export interface PromptInputs {
  promptText: string; // tokenized live in the worker (2B)
  responseTokens: number;
  callsPerMonth: number;
  turnsPerCall: number;
  sharedSystemPromptTokens: number;
}

export interface AgentInputs {
  preset: PresetName;
  runsPerMonth: number;
  stepsPerRun: number;
  toolSchemaTokens: number;
  observationGrowthPerStep: number;
  actionOutputTokens: number;
}

export interface CrewInputs {
  memberCount: number;
  runsPerMonth: number;
  stepsPerMember: number;
  sharedTranscriptGrowthPerStep: number;
}

export interface DowInputs {
  enabled: boolean; // opt-in kill switch (default false)
  acknowledgedAuthorizedUse: boolean; // gate before any figure renders
  attackerRequestsPerMonth: number;
  retryCeiling: number;
  // P2-A9: caps the UI supplies when the model exposes no contextWindow/maxOutput (never pass 0).
  fallbackInputTokens: number;
  fallbackOutputTokens: number;
}

// A worker-derived token count for a tokenizable field (chatbot system prompt, prompt text). `badge` is the
// runtime TokenCount.badge (P2-A10) - the honest fidelity of THIS count, not the model's static tier.
export interface FieldTokenCount {
  count: number;
  badge: string;
  errorBand: { relLow: number; relHigh: number } | null;
  truncated: boolean;
}

export interface ModeInputs {
  chatbot: ChatbotInputs;
  prompt: PromptInputs;
  agent: AgentInputs;
  crew: CrewInputs;
  denial_of_wallet: DowInputs;
}
