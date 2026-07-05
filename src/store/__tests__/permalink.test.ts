// §5.8 permalink: round-trips config, STRIPS prompt text, and DEFENSIVELY rejects hostile decode input
// (proto-pollution, bad types, oversized) - never spreads untrusted data into state.
import { describe, it, expect } from 'vitest';
import { encodePermalink, decodePermalink } from '@/store/permalink';
import type { ModeInputs, ModelSelection, Mode } from '@/store/types';

const selection: Record<Mode, ModelSelection> = {
  chatbot: { canonicalId: 'gpt-4o', deployment: 'openai' }, prompt: { canonicalId: 'gpt-4o', deployment: 'openai' },
  agent: { canonicalId: 'gpt-4o', deployment: 'openai' }, crew: { canonicalId: 'gpt-4o', deployment: 'openai' },
  denial_of_wallet: { canonicalId: 'gpt-4o', deployment: 'openai' },
};
const inputs: ModeInputs = {
  chatbot: { systemPromptText: 'SECRET PROMPT', avgUserMessageTokens: 50, avgResponseTokens: 200, turnsPerConversation: 5, contextStrategy: 'full', conversationsPerMonth: 42000, ttl: 'hr1' },
  prompt: { promptText: 'SECRET', responseTokens: 300, callsPerMonth: 100000, turnsPerCall: 1, sharedSystemPromptTokens: 0 },
  agent: { preset: 'langchain', runsPerMonth: 1000, stepsPerRun: 6, toolSchemaTokens: 1500, observationGrowthPerStep: 350, actionOutputTokens: 150 },
  crew: { memberCount: 3, runsPerMonth: 500, stepsPerMember: 5, sharedTranscriptGrowthPerStep: 200 },
  denial_of_wallet: { enabled: false, acknowledgedAuthorizedUse: false, attackerRequestsPerMonth: 1000000, retryCeiling: 1, fallbackInputTokens: 8000, fallbackOutputTokens: 4000 },
};

describe('permalink (§5.8)', () => {
  it('round-trips config but NEVER encodes prompt/system text', () => {
    const hash = encodePermalink('chatbot', selection, inputs);
    expect(atob(hash.replace(/-/g, '+').replace(/_/g, '/'))).not.toContain('SECRET');
    const d = decodePermalink(hash);
    expect(d?.mode).toBe('chatbot');
    expect(d?.selection).toEqual({ canonicalId: 'gpt-4o', deployment: 'openai' });
    expect((d?.inputs as Record<string, unknown>)['conversationsPerMonth']).toBe(42000);
    expect((d?.inputs as Record<string, unknown>)['contextStrategy']).toBe('full');
    expect((d?.inputs as Record<string, unknown>)['systemPromptText']).toBeUndefined(); // text not carried
  });

  it('never round-trips the DoW consent gates, even from a link that pre-affirms them (appsec F1)', () => {
    // a crafted link asserting BOTH consent gates true...
    const hostile = btoa(JSON.stringify({
      v: 1, mode: 'denial_of_wallet',
      selection: { denial_of_wallet: { canonicalId: 'gpt-4o', deployment: 'openai' } },
      inputs: { denial_of_wallet: { enabled: true, acknowledgedAuthorizedUse: true, attackerRequestsPerMonth: 5000000 } },
    })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const d = decodePermalink(hostile);
    const di = d?.inputs as Record<string, unknown>;
    // ...decodes to consent OFF (recipient must re-affirm), while structural inputs still carry.
    expect(di['enabled']).toBe(false);
    expect(di['acknowledgedAuthorizedUse']).toBe(false);
    expect(di['attackerRequestsPerMonth']).toBe(5000000);
    // and the encoder never emits the consent flags in the first place
    const enc = encodePermalink('denial_of_wallet', selection, { ...inputs, denial_of_wallet: { ...inputs.denial_of_wallet, enabled: true, acknowledgedAuthorizedUse: true } });
    const decoded = atob(enc.replace(/-/g, '+').replace(/_/g, '/'));
    expect(decoded).not.toContain('acknowledgedAuthorizedUse');
    expect(decoded).not.toContain('enabled');
  });

  it('rejects garbage / oversized / wrong-version hashes', () => {
    expect(decodePermalink('')).toBeNull();
    expect(decodePermalink('not-base64!!!')).toBeNull();
    expect(decodePermalink('x'.repeat(5000))).toBeNull();
    expect(decodePermalink(btoa(JSON.stringify({ v: 2, mode: 'chatbot' })))).toBeNull();
  });

  it('does not pollute Object.prototype from a hostile payload', () => {
    const hostile = btoa(JSON.stringify({ v: 1, mode: 'chatbot', selection: { chatbot: { canonicalId: 'gpt-4o', deployment: 'openai', __proto__: { polluted: true } } }, inputs: { chatbot: { __proto__: { polluted: true }, conversationsPerMonth: 5 } } }));
    decodePermalink(hostile);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(({} as any).polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(false);
  });

  it('clamps hostile numeric values and rejects a bad model id charset', () => {
    const hostile = btoa(JSON.stringify({ v: 1, mode: 'chatbot', selection: { chatbot: { canonicalId: '<script>', deployment: 'openai' } }, inputs: { chatbot: { conversationsPerMonth: 1e300 } } }));
    const d = decodePermalink(hostile);
    // bad canonicalId charset -> str() returns '' -> decode returns null (no usable model)
    expect(d).toBeNull();
  });
});
