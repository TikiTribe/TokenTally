import { describe, it, expect } from 'vitest';
import { mapChatbot, mapDow, mapAgent, mapCrew } from '@/store/modeMapping';
import type { ModelRecord } from '@/types/registry';
import type { ChatbotInputs, DowInputs, AgentInputs, CrewInputs, FieldTokenCount } from '@/store/types';

const model = { canonicalId: 'm', deployment: 'x', billingUnit: 'per_token', contextWindow: 128000, maxOutput: 4096, reasoningPerMToken: null } as unknown as ModelRecord;

describe('modeMapping (2C)', () => {
  it('chatbot: contextStrategy -> growth, token count -> systemPromptTokens, band threaded', () => {
    const i: ChatbotInputs = { systemPromptText: 'x', avgUserMessageTokens: 50, avgResponseTokens: 200, turnsPerConversation: 5, contextStrategy: 'moderate', conversationsPerMonth: 10000, ttl: 'min5' };
    const tc: FieldTokenCount = { count: 1234, badge: 'exact', errorBand: { relLow: -0.05, relHigh: 0.05 }, truncated: false, segments: null };
    const cfg = mapChatbot(i, model, tc, 'snap1');
    expect(cfg.contextGrowthPerTurn).toBe(150);
    expect(cfg.systemPromptTokens).toBe(1234);
    expect(cfg.tokenizerBand).toEqual({ relLow: -0.05, relHigh: 0.05 });
    expect(cfg.snapshotVersion).toBe('snap1');
  });

  it('chatbot: missing token count -> 0 prefix, null band (never crashes)', () => {
    const i: ChatbotInputs = { systemPromptText: '', avgUserMessageTokens: 50, avgResponseTokens: 200, turnsPerConversation: 5, contextStrategy: 'minimal', conversationsPerMonth: 100, ttl: 'min5' };
    const cfg = mapChatbot(i, model, undefined, 'snap1');
    expect(cfg.systemPromptTokens).toBe(0);
    expect(cfg.contextGrowthPerTurn).toBe(50);
    expect(cfg.tokenizerBand).toBeNull();
  });

  it('dow: enabled only when BOTH kill switch AND acknowledgement are on; fallback caps passed (P2-A9)', () => {
    const base: DowInputs = { enabled: true, acknowledgedAuthorizedUse: false, attackerRequestsPerMonth: 1000, retryCeiling: 2, fallbackInputTokens: 8000, fallbackOutputTokens: 4000 };
    expect(mapDow(base, model, 's').enabled).toBe(false); // ack off
    expect(mapDow({ ...base, acknowledgedAuthorizedUse: true }, model, 's').enabled).toBe(true);
    expect(mapDow({ ...base, enabled: false, acknowledgedAuthorizedUse: true }, model, 's').enabled).toBe(false); // kill switch off
    const cfg = mapDow({ ...base, acknowledgedAuthorizedUse: true }, model, 's');
    expect(cfg.fallbackInputTokens).toBe(8000);
    expect(cfg.fallbackOutputTokens).toBe(4000);
  });

  it('agent: stamps the preset provenance', () => {
    const i: AgentInputs = { preset: 'langchain', runsPerMonth: 1000, stepsPerRun: 8, toolSchemaTokens: 2000, observationGrowthPerStep: 400, actionOutputTokens: 150 };
    expect(mapAgent(i, model, 's').assumptionsSource).toMatch(/langchain/);
  });

  it('crew: memberCount produces that many members', () => {
    const i: CrewInputs = { memberCount: 4, runsPerMonth: 500, stepsPerMember: 5, sharedTranscriptGrowthPerStep: 200 };
    expect(mapCrew(i, model, 's').agents).toHaveLength(4);
  });

  it('crew: a hostile memberCount is clamped to the engine cap BEFORE allocation (review #3)', () => {
    const huge: CrewInputs = { memberCount: 1e9, runsPerMonth: 1, stepsPerMember: 1, sharedTranscriptGrowthPerStep: 0 };
    const t0 = performance.now();
    const cfg = mapCrew(huge, model, 's');
    expect(cfg.agents.length).toBeLessThanOrEqual(64); // MAX_CREW_MEMBERS - never allocates 1e9 objects
    expect(performance.now() - t0).toBeLessThan(200);
  });

  it('crew: 0 / negative memberCount coerces to 1 (never a 0-length crew)', () => {
    expect(mapCrew({ memberCount: 0, runsPerMonth: 1, stepsPerMember: 1, sharedTranscriptGrowthPerStep: 0 }, model, 's').agents).toHaveLength(1);
    expect(mapCrew({ memberCount: -5, runsPerMonth: 1, stepsPerMember: 1, sharedTranscriptGrowthPerStep: 0 }, model, 's').agents).toHaveLength(1);
  });
});
