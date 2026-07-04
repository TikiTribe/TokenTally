// P2 pure mappers: UI inputs + resolved ModelRecord + worker token counts -> engine configs. Type-only
// imports (no engine runtime), so this stays first-paint-safe and unit-testable. contextStrategy ->
// contextGrowthPerTurn (50/150/300). The live-tokenized fields (system prompt, prompt text) supply their
// token count + errorBand (the tokenizer confidence band). DoW enables only when BOTH the kill switch and
// the authorized-use acknowledgement are on, and always supplies fallback caps (P2-A9, never 0-by-omission).
// Owner: TokenTally UI. Version: Phase 2C.
import type { ModelRecord } from '@/types/registry';
import type { ChatbotConfig, PromptConfig, AgentConfig, CrewConfig } from '@/types/workload';
import type { DenialOfWalletConfig } from '@/optimization';
import type {
  ChatbotInputs, PromptInputs, AgentInputs, CrewInputs, DowInputs, FieldTokenCount, ContextStrategy,
} from '@/store/types';

const CONTEXT_GROWTH: Record<ContextStrategy, number> = { minimal: 50, moderate: 150, full: 300 };

function band(tc: FieldTokenCount | undefined): { relLow: number; relHigh: number } | null {
  return tc?.errorBand ?? null;
}

export function mapChatbot(i: ChatbotInputs, model: ModelRecord, promptTc: FieldTokenCount | undefined, snapshotVersion: string): ChatbotConfig {
  return {
    model,
    systemPromptTokens: promptTc?.count ?? 0,
    avgUserMessageTokens: i.avgUserMessageTokens,
    avgResponseTokens: i.avgResponseTokens,
    turnsPerConversation: i.turnsPerConversation,
    contextGrowthPerTurn: CONTEXT_GROWTH[i.contextStrategy],
    conversationsPerMonth: i.conversationsPerMonth,
    ttl: i.ttl,
    tokenizerBand: band(promptTc),
    snapshotVersion,
  };
}

export function mapPrompt(i: PromptInputs, model: ModelRecord, promptTc: FieldTokenCount | undefined, snapshotVersion: string): PromptConfig {
  return {
    model,
    promptTokens: promptTc?.count ?? 0,
    responseTokens: i.responseTokens,
    callsPerMonth: i.callsPerMonth,
    turnsPerCall: i.turnsPerCall,
    sharedSystemPromptTokens: i.sharedSystemPromptTokens,
    tokenizerBand: band(promptTc),
    snapshotVersion,
  };
}

export function mapAgent(i: AgentInputs, model: ModelRecord, snapshotVersion: string): AgentConfig {
  return {
    model,
    toolSchemaTokens: i.toolSchemaTokens,
    systemTokens: 0,
    perStepUserSeedTokens: 100,
    observationGrowthPerStep: i.observationGrowthPerStep,
    actionOutputTokens: i.actionOutputTokens,
    stepsPerRun: i.stepsPerRun,
    runsPerMonth: i.runsPerMonth,
    assumptionsSource: `${i.preset} preset seed defaults`,
    snapshotVersion,
  };
}

export function mapCrew(i: CrewInputs, model: ModelRecord, snapshotVersion: string): CrewConfig {
  const member: AgentConfig = {
    model, toolSchemaTokens: 1000, systemTokens: 300, perStepUserSeedTokens: 80,
    observationGrowthPerStep: 300, actionOutputTokens: 120, stepsPerRun: i.stepsPerMember,
    runsPerMonth: i.runsPerMonth, snapshotVersion,
  };
  return {
    agents: Array.from({ length: Math.max(1, Math.floor(i.memberCount)) }, () => ({ ...member })),
    sharedTranscriptGrowthPerStep: i.sharedTranscriptGrowthPerStep,
    runsPerMonth: i.runsPerMonth,
    snapshotVersion,
  };
}

export function mapDow(i: DowInputs, model: ModelRecord, snapshotVersion: string): DenialOfWalletConfig {
  return {
    model,
    attackerRequestsPerMonth: i.attackerRequestsPerMonth,
    retryCeiling: i.retryCeiling,
    // P2-A9: gate on BOTH the kill switch AND the authorized-use acknowledgement.
    enabled: i.enabled && i.acknowledgedAuthorizedUse,
    fallbackInputTokens: i.fallbackInputTokens,
    fallbackOutputTokens: i.fallbackOutputTokens,
    snapshotVersion,
  };
}
