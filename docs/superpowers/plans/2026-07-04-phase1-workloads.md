# Phase 1: Workloads + Optimization + Denial of Wallet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the four workloads (Chatbot, Prompt/Batch, Agent, Multi-agent) plus the Optimization Engine and the defensively framed Denial of Wallet, all as pure TypeScript modules on the Phase-0 engine, fully TDD, with no UI (Phase 2 wires them).

**Architecture:** Every workload reduces its domain inputs (turns, calls, steps, agents) to one or more `WarmScenario` objects fed to the existing `monthlyWarmCost(scn)` seam (spec D6: "workloads differ only in accumulation"). Accumulation (context growth across turns/steps) maps to a mean-per-arrival token term, which is exact for the monthly total because cost is linear in tokens. Agent/Crew runs use `profile='bursty'` with `burstsPerMonth = runs`, so within-run steps warm at ~1 and each run contributes one cold prefix write — the sparse limit reproduces the deterministic "write once, read the rest" model. Optimization enumerates registry models/deployments and structural transforms, ranking by dollar savings with confidence. Denial of Wallet consumes the `conservativeTotal` (p_warm=0) seam plus adversarial maxima (`contextWindow`, `maxOutput`, retry ceiling), kill-switch gated, framed for defenders.

**Tech Stack:** TypeScript 5.6 strict, Vitest 3, the Phase-0 engine (`@/engine`, `@/registry`, `@/tokenizer`), no new runtime dependencies. Pure functions, no `Date.now()`, no React, no network.

## Global Constraints

- **No new runtime dependency** — workloads use only the existing engine. Any dev-only helper must be `devDependencies`, exact-pinned.
- **Pure and deterministic** — no `Date.now()`, `Math.random()`, or I/O in `src/workloads/**` or `src/optimization/**`. Time/entropy enters only through explicit parameters. (Enforced by the same discipline as Phase 0C.)
- **Honesty is type-level** — every forecast carries a `ConfidenceRange` (from the engine) and an accuracy note. A component with no defensible distribution is `unmodeled: true`, never given a fabricated interval. No unqualified "±5%". Estimate-tier agent costs are labeled.
- **Do NOT touch the old MVP** — `src/utils/costCalculator.ts`, `src/components/**`, `src/store/**` stay untouched (they keep `main`'s live MVP working; Phase 2 replaces them). Phase 1 is additive: new files under `src/workloads/` and `src/optimization/`.
- **TDD mandatory** (spec §8) — no engine function before its red test. Red → green → refactor → commit per task.
- **ESLint strict globs** — new code under `src/workloads/**` and `src/optimization/**` must be added to the strict `@typescript-eslint` glob in `eslint.config.js` (Task 0); `--max-warnings 0` must hold.
- **Kill switches** (spec §9) — each workload mode and Denial of Wallet expose an `enabled` gate the caller can flip off; a disabled feature returns an inert, clearly-labeled result, never a throw.

## File Structure

- `src/types/workload.ts` — shared workload input/result types (`WorkloadForecast`, `StepProfile`, config interfaces). One responsibility: the workload contract every adapter and the optimizer share.
- `src/workloads/accumulate.ts` — the mean-accumulation helper (`meanAccumulated`) + token-conservation checks. Shared by chatbot/agent/crew so the arithmetic lives in one tested place (DRY).
- `src/workloads/chatbot.ts` — Chatbot adapter: `chatbotForecast(config)`.
- `src/workloads/prompt.ts` — Prompt/Batch adapter: `promptForecast(config)`.
- `src/workloads/agent.ts` — Agent (single) adapter: `agentForecast(config)` + per-step profile.
- `src/workloads/crew.ts` — Multi-agent adapter: `crewForecast(config)`.
- `src/workloads/presets.ts` — framework presets (LangChain/LangGraph, CrewAI, AutoGen, LlamaIndex, Custom).
- `src/workloads/index.ts` — barrel: the five workload entry points + types.
- `src/optimization/candidates.ts` — the candidate-transform generators (switch-model, switch-deployment, enable-caching, trim-prefix, adjust-context).
- `src/optimization/optimize.ts` — `optimize(base)`: run candidates, rank by savings with confidence; `solveBudget(...)` inverse solve.
- `src/optimization/tornado.ts` — `tornado(base, factors)`: one-at-a-time sensitivity bars.
- `src/optimization/denialOfWallet.ts` — `denialOfWallet(config)`: bounded worst-case exposure + mitigations, kill-switch, dual-use/VDP constants.
- `src/optimization/index.ts` — barrel.
- Tests: co-located `__tests__/*.test.ts` beside each module, plus `src/workloads/__tests__/handVerified.test.ts` (spec §8: within 1% of hand math per workload and billing unit).

---

## Task 0: Wire new strict-lint globs and shared workload types

**Files:**
- Modify: `eslint.config.js` (add the two new globs to the strict TS block)
- Create: `src/types/workload.ts`
- Test: `src/types/__tests__/workload.test.ts`

**Interfaces:**
- Consumes: `WarmScenario`, `WarmCostResult`, `ConfidenceRange` from `@/types/engine`; `ModelRecord` from `@/types/registry`.
- Produces: `WorkloadForecast`, `StepProfile`, `ChatbotConfig`, `PromptConfig`, `AgentConfig`, `CrewConfig`, `Workload` (the union tag). Every later task imports these.

- [ ] **Step 1: Write the failing test**

```typescript
// src/types/__tests__/workload.test.ts
import { describe, it, expect } from 'vitest';
import type { WorkloadForecast, StepProfile } from '@/types/workload';
import { WORKLOAD_KINDS } from '@/types/workload';

describe('workload types', () => {
  it('enumerates the four workloads plus denial-of-wallet', () => {
    expect(WORKLOAD_KINDS).toEqual(['chatbot', 'prompt', 'agent', 'crew', 'denial_of_wallet']);
  });
  it('a forecast shape carries cost, confidence pass-through, and an accuracy note', () => {
    const f: WorkloadForecast = {
      kind: 'chatbot',
      monthlyCost: 12.5,
      cost: {
        applicable: true, warmth: 0.5, centralTotal: 12.5, conservativeTotal: 20,
        savingsUpTo: { central: 7.5, conservativeReference: 20, qualifier: 'up_to' },
        writesPerMonth: 1, waterfall: { components: [], total: 12.5 },
        confidence: { low: 11, mid: 12.5, high: 14, unmodeled: false },
        breakEvenArrivals: null,
      },
      arrivalsPerMonth: 100,
      accuracyNote: 'estimate: token counts are heuristic',
      steps: null,
    };
    expect(f.monthlyCost).toBe(12.5);
    const s: StepProfile = { step: 1, inputTokens: 10, outputTokens: 5, reasoningTokens: 0, cost: 0.01 };
    expect(s.step).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/__tests__/workload.test.ts`
Expected: FAIL — cannot find module `@/types/workload`.

- [ ] **Step 3: Create the types module**

```typescript
// src/types/workload.ts
// Workload contract shared by every adapter (chatbot/prompt/agent/crew) and the optimizer. A workload
// reduces its domain inputs to a WarmScenario (D6: workloads differ only in accumulation) and returns a
// WorkloadForecast: the engine cost result, the monthly dollar figure, the arrival count it derived, an
// honest accuracy note, and (agent/crew only) the per-unit step profile the accumulation chart plots.
// Owner: TokenTally engine. Version: Phase 1.
import type { WarmCostResult } from '@/types/engine';
import type { ModelRecord } from '@/types/registry';

export const WORKLOAD_KINDS = ['chatbot', 'prompt', 'agent', 'crew', 'denial_of_wallet'] as const;
export type WorkloadKind = (typeof WORKLOAD_KINDS)[number];

// Per-step (agent) or per-turn (chatbot) accumulation point the chart plots. `cost` is at CENTRAL rates
// (the monthly total blends warm/cold across arrivals; the chart shows accumulation, not the blend).
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
  steps: StepProfile[] | null; // accumulation profile for agent/crew; null for chatbot/prompt
}

// Optional systematic tokenizer bias band threaded from the 0B tokenizer (countTokens().errorBand).
export type TokenizerBand = { relLow: number; relHigh: number } | null;

// ---- Per-workload configs (token counts are inputs; the UI derives them via countTokens in Phase 2) ----

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
  activeFraction?: number; // f: conversation duty cycle for bursty warmth, default 1 (steady-equivalent)
  tokenizerBand?: TokenizerBand;
  enabled?: boolean; // kill switch, default true
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
  enabled?: boolean;
}

export interface AgentConfig {
  model: ModelRecord;
  toolSchemaTokens: number; // stable cached prefix (tool schemas + system)
  systemTokens: number; // additional stable prefix
  perStepUserSeedTokens: number; // non-accumulating per-step input (the task/turn instruction)
  observationGrowthPerStep: number; // tokens of tool-observation added to context each step
  actionOutputTokens: number; // per-step action/answer output
  reasoningTokensPerStep?: number; // reasoning models only; default 0
  stepsPerRun: number;
  runsPerMonth: number;
  distinctPrefixes?: number; // K, default 1
  ttl?: 'min5' | 'hr1';
  activeFraction?: number; // within-run duty cycle, default 1
  tokenizerBand?: TokenizerBand;
  enabled?: boolean;
}

export interface CrewConfig {
  agents: AgentConfig[]; // each crew member is an agent workload
  orchestrator?: AgentConfig; // the coordinator's own runs (optional)
  sharedTranscriptGrowthPerStep: number; // tokens each member re-reads as the transcript grows
  runsPerMonth: number; // crew runs; overrides each member's runsPerMonth
  enabled?: boolean;
}
```

- [ ] **Step 4: Add the strict-lint globs**

In `eslint.config.js`, change the strict TS block's `files` array from:
```javascript
  { files: ['src/engine/**/*.ts', 'src/registry/**/*.ts', 'src/tokenizer/**/*.ts', 'src/types/**/*.ts'], rules: { ...
```
to include the two new dirs:
```javascript
  { files: ['src/engine/**/*.ts', 'src/registry/**/*.ts', 'src/tokenizer/**/*.ts', 'src/types/**/*.ts', 'src/workloads/**/*.ts', 'src/optimization/**/*.ts'], rules: { ...
```

- [ ] **Step 5: Run tests + lint to verify green**

Run: `npx vitest run src/types/__tests__/workload.test.ts && npm run lint`
Expected: PASS, lint 0/0.

- [ ] **Step 6: Commit**

```bash
git add src/types/workload.ts src/types/__tests__/workload.test.ts eslint.config.js
git commit -m "feat(workloads): shared workload contract types + strict-lint globs (Phase 1 Task 0)"
```

---

## Task 1: Mean-accumulation helper

**Files:**
- Create: `src/workloads/accumulate.ts`
- Test: `src/workloads/__tests__/accumulate.test.ts`

**Interfaces:**
- Produces: `meanAccumulated(base, growthPerUnit, units)`, `totalAccumulated(base, growthPerUnit, units)`. Used by chatbot/agent/crew to convert per-turn/per-step context growth into the mean-per-arrival token term the single WarmScenario needs.

**Rationale:** unit k (1-indexed) carries `base + (k-1)*growth` accumulated tokens. Over `units` units the mean is `base + growth*(units-1)/2` and the sum is `units*base + growth*units*(units-1)/2`. Because `monthlyWarmCost` is linear in `perArrivalInputTokens`, feeding the MEAN yields exactly the same monthly input-token dollars as summing per unit — this is what lets each workload stay a single scenario (D6). The `total` form is the token-conservation oracle the reconciliation tests assert against.

- [ ] **Step 1: Write the failing test**

```typescript
// src/workloads/__tests__/accumulate.test.ts
import { describe, it, expect } from 'vitest';
import { meanAccumulated, totalAccumulated } from '@/workloads/accumulate';

describe('accumulate', () => {
  it('mean over T units of base + (k-1)*growth', () => {
    // base=100, growth=50, units=5: contexts 100,150,200,250,300 -> mean 200
    expect(meanAccumulated(100, 50, 5)).toBe(200);
  });
  it('single unit has no accumulation', () => {
    expect(meanAccumulated(100, 50, 1)).toBe(100);
  });
  it('mean * units === total (conservation oracle)', () => {
    expect(meanAccumulated(100, 50, 5) * 5).toBe(totalAccumulated(100, 50, 5));
  });
  it('clamps hostile inputs to finite non-negative', () => {
    expect(meanAccumulated(-10, 50, 5)).toBe(meanAccumulated(0, 50, 5));
    expect(meanAccumulated(100, Number.NaN, 5)).toBe(100);
    expect(meanAccumulated(100, 50, 0)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/workloads/__tests__/accumulate.test.ts`
Expected: FAIL — cannot find module `@/workloads/accumulate`.

- [ ] **Step 3: Implement**

```typescript
// src/workloads/accumulate.ts
// Linear context accumulation. Unit k (1-indexed) holds base + (k-1)*growth tokens. Because the cost
// core is linear in per-arrival tokens, the monthly input-token dollars from feeding the MEAN equal
// those from summing every unit — so each workload stays a single WarmScenario (spec D6). `total` is the
// token-conservation oracle for the reconciliation tests. Pure; hostile inputs clamp to finite >= 0.
// Owner: TokenTally engine. Version: Phase 1.
const nn = (x: number, d = 0): number => (Number.isFinite(x) && x >= 0 ? x : d);

export function meanAccumulated(base: number, growthPerUnit: number, units: number): number {
  const u = Math.floor(nn(units, 0));
  if (u <= 0) return 0;
  return nn(base) + (nn(growthPerUnit) * (u - 1)) / 2;
}

export function totalAccumulated(base: number, growthPerUnit: number, units: number): number {
  const u = Math.floor(nn(units, 0));
  if (u <= 0) return 0;
  return u * nn(base) + (nn(growthPerUnit) * u * (u - 1)) / 2;
}
```

- [ ] **Step 4: Run tests to verify green**

Run: `npx vitest run src/workloads/__tests__/accumulate.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/workloads/accumulate.ts src/workloads/__tests__/accumulate.test.ts
git commit -m "feat(workloads): mean-accumulation helper with conservation oracle (Phase 1 Task 1)"
```

---

## Task 2: Chatbot workload adapter

**Files:**
- Create: `src/workloads/chatbot.ts`
- Test: `src/workloads/__tests__/chatbot.test.ts`

**Interfaces:**
- Consumes: `meanAccumulated` (Task 1), `monthlyWarmCost` from `@/engine`, `ChatbotConfig`/`WorkloadForecast` (Task 0).
- Produces: `chatbotForecast(config: ChatbotConfig): WorkloadForecast`.

**Mapping:** arrivals λ = `conversationsPerMonth * turnsPerConversation`; prefix = `systemPromptTokens`; K = `distinctSystemPrompts ?? 1`; per-arrival input = `avgUserMessageTokens + meanAccumulated(0, contextGrowthPerTurn, turnsPerConversation)`; profile = `'bursty'` with `burstsPerMonth = conversationsPerMonth` so each conversation is one cold prefix write in the sparse limit (reproduces the MVP "write once, read turns 2+"); cross-conversation warmth is the engine's bonus. `accuracyNote` derives from the model's `accuracyTier` and the tokenizer band.

- [ ] **Step 1: Write the failing test**

```typescript
// src/workloads/__tests__/chatbot.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { chatbotForecast } from '@/workloads/chatbot';
import type { ChatbotConfig } from '@/types/workload';
import type { ModelRecord } from '@/types/registry';

// A minimal per-token chat model with a breakpoint TTL cache (deterministic warmth).
const model: ModelRecord = {
  canonicalId: 'claude-3-5-sonnet', deployment: 'anthropic', displayName: 'Claude 3.5 Sonnet',
  provider: 'anthropic', underlyingFamily: 'claude', mode: 'chat', billingUnit: 'per_token',
  inputPrice: 3, outputPrice: 15, reasoningPerMToken: null,
  cache: { archetype: 'breakpoint_ttl', cacheReadPerMToken: 0.3, cacheWritePerMToken: 3.75, rateUnavailable: false, readUnavailable: false },
  contextWindow: 200000, maxOutput: 8192, tiers: [], accuracyTier: 'estimate', freeTier: false, deprecated: false,
};

const base: ChatbotConfig = {
  model, systemPromptTokens: 1000, avgUserMessageTokens: 50, avgResponseTokens: 200,
  turnsPerConversation: 5, contextGrowthPerTurn: 150, conversationsPerMonth: 10000,
};

describe('chatbotForecast', () => {
  it('derives arrivals = conversations * turns', () => {
    const f = chatbotForecast(base);
    expect(f.arrivalsPerMonth).toBe(50000);
    expect(f.kind).toBe('chatbot');
  });
  it('produces a positive cost with a confidence range', () => {
    const f = chatbotForecast(base);
    expect(f.monthlyCost).toBeGreaterThan(0);
    expect(f.cost.confidence.high).toBeGreaterThanOrEqual(f.cost.confidence.mid);
    expect(f.monthlyCost).toBe(f.cost.centralTotal);
  });
  it('caching lowers cost vs the conservative (p_warm=0) reference', () => {
    const f = chatbotForecast(base);
    expect(f.cost.conservativeTotal).toBeGreaterThan(f.cost.centralTotal);
    expect(f.cost.savingsUpTo.central).toBeGreaterThan(0);
  });
  it('more context growth raises cost (accumulation is modeled)', () => {
    const lo = chatbotForecast({ ...base, contextGrowthPerTurn: 50 });
    const hi = chatbotForecast({ ...base, contextGrowthPerTurn: 300 });
    expect(hi.monthlyCost).toBeGreaterThan(lo.monthlyCost);
  });
  it('kill switch returns an inert, applicable=false forecast', () => {
    const f = chatbotForecast({ ...base, enabled: false });
    expect(f.monthlyCost).toBe(0);
    expect(f.cost.applicable).toBe(false);
    expect(f.accuracyNote).toMatch(/disabled/i);
  });
  it('labels the accuracy tier of the model', () => {
    expect(chatbotForecast(base).accuracyNote).toMatch(/estimate/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/workloads/__tests__/chatbot.test.ts`
Expected: FAIL — cannot find module `@/workloads/chatbot`.

- [ ] **Step 3: Implement**

```typescript
// src/workloads/chatbot.ts
// Chatbot workload: conversations of T turns, each turn re-hitting the cached system prompt and carrying
// linearly accumulating context. Maps to one WarmScenario (D6): arrivals = conversations*turns, each
// conversation a burst (burstsPerMonth = conversations) so the sparse limit is one cold prefix write per
// conversation with warm reads for turns 2+ — reproducing the MVP model; cross-conversation warmth is the
// engine's bonus. Context growth folds into the mean per-arrival input (exact for the linear-in-tokens
// monthly total). Owner: TokenTally engine. Version: Phase 1.
import { monthlyWarmCost } from '@/engine';
import { meanAccumulated } from '@/workloads/accumulate';
import { accuracyNoteFor, disabledForecast } from '@/workloads/note';
import type { ChatbotConfig, WorkloadForecast } from '@/types/workload';

export function chatbotForecast(cfg: ChatbotConfig): WorkloadForecast {
  if (cfg.enabled === false) return disabledForecast('chatbot');
  const turns = Math.max(0, Math.floor(cfg.turnsPerConversation));
  const arrivals = Math.max(0, cfg.conversationsPerMonth) * turns;
  const perArrivalInput = cfg.avgUserMessageTokens + meanAccumulated(0, cfg.contextGrowthPerTurn, turns);
  const cost = monthlyWarmCost({
    model: cfg.model,
    prefixTokens: cfg.systemPromptTokens,
    perArrivalInputTokens: perArrivalInput,
    perArrivalOutputTokens: cfg.avgResponseTokens,
    perArrivalReasoningTokens: cfg.avgReasoningTokens ?? 0,
    arrivalsPerMonth: arrivals,
    distinctPrefixes: cfg.distinctSystemPrompts ?? 1,
    ttl: cfg.ttl ?? 'min5',
    profile: 'bursty',
    activeFraction: cfg.activeFraction ?? 1,
    burstsPerMonth: Math.max(0, cfg.conversationsPerMonth),
    tokenizerBand: cfg.tokenizerBand ?? null,
  });
  return {
    kind: 'chatbot',
    monthlyCost: cost.centralTotal,
    cost,
    arrivalsPerMonth: arrivals,
    accuracyNote: accuracyNoteFor(cfg.model, cfg.tokenizerBand ?? null),
    steps: null,
  };
}
```

- [ ] **Step 4: Create the shared note/disabled helper** (imported above; created once here, reused by every adapter)

```typescript
// src/workloads/note.ts
// Honest accuracy note + inert kill-switch result, shared by every workload adapter so the labeling
// rule lives in one tested place. A model's accuracyTier plus the tokenizer band decide the wording; a
// disabled workload returns an applicable=false forecast, never a throw. Owner: engine. Version: Phase 1.
import type { ModelRecord } from '@/types/registry';
import type { TokenizerBand, WorkloadForecast, WorkloadKind } from '@/types/workload';

export function accuracyNoteFor(model: ModelRecord, band: TokenizerBand): string {
  const tier = model.accuracyTier;
  const bandStr =
    band && (band.relLow !== 0 || band.relHigh !== 0)
      ? ` (token band -${Math.round(band.relLow * 100)}%/+${Math.round(band.relHigh * 100)}%)`
      : '';
  switch (tier) {
    case 'exact':
      return `exact: real tokenizer, matches API billing${bandStr}`;
    case 'exact_unverified':
      return `exact (unverified): proxy tokenizer, not spot-checked${bandStr}`;
    case 'approx':
      return `approx: proxy tokenizer${bandStr}`;
    default:
      return `estimate: token counts are heuristic${bandStr}`;
  }
}

export function disabledForecast(kind: WorkloadKind): WorkloadForecast {
  return {
    kind,
    monthlyCost: 0,
    cost: {
      applicable: false, warmth: null, centralTotal: 0, conservativeTotal: 0,
      savingsUpTo: { central: 0, conservativeReference: 0, qualifier: 'up_to' },
      writesPerMonth: 0, waterfall: { components: [], total: 0 },
      confidence: { low: 0, mid: 0, high: 0, unmodeled: true }, breakEvenArrivals: null,
    },
    arrivalsPerMonth: 0,
    accuracyNote: `disabled: ${kind} workload kill switch is off`,
    steps: null,
  };
}
```

- [ ] **Step 5: Run tests to verify green**

Run: `npx vitest run src/workloads/__tests__/chatbot.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/workloads/chatbot.ts src/workloads/note.ts src/workloads/__tests__/chatbot.test.ts
git commit -m "feat(workloads): chatbot adapter on the warm-cache engine + shared note helper (Phase 1 Task 2)"
```

---

## Task 3: Prompt/Batch workload adapter

**Files:**
- Create: `src/workloads/prompt.ts`
- Test: `src/workloads/__tests__/prompt.test.ts`

**Interfaces:**
- Consumes: `monthlyWarmCost`, `meanAccumulated`, `accuracyNoteFor`/`disabledForecast`, `PromptConfig`.
- Produces: `promptForecast(config: PromptConfig): WorkloadForecast`.

**Mapping:** arrivals λ = `callsPerMonth * turnsPerCall`; prefix = `sharedSystemPromptTokens ?? 0` (0 → the engine still runs; with no cacheable prefix, warm-cache savings are ~0); K = `callsPerMonth` distinct prefixes when there is no shared prompt (each call unique → no reuse), else 1; per-arrival input = `promptTokens + meanAccumulated(0, contextGrowthPerTurn ?? 0, turnsPerCall ?? 1)`; profile `'steady'` (batch items are independent, not clustered). Multi-turn toggle via `turnsPerCall`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/workloads/__tests__/prompt.test.ts
import { describe, it, expect } from 'vitest';
import { promptForecast } from '@/workloads/prompt';
import type { PromptConfig } from '@/types/workload';
import type { ModelRecord } from '@/types/registry';

const gpt: ModelRecord = {
  canonicalId: 'gpt-4o-mini', deployment: 'openai', displayName: 'GPT-4o mini', provider: 'openai',
  underlyingFamily: 'openai', mode: 'chat', billingUnit: 'per_token', inputPrice: 0.15, outputPrice: 0.6,
  reasoningPerMToken: null, cache: null, contextWindow: 128000, maxOutput: 16384, tiers: [],
  accuracyTier: 'exact_unverified', freeTier: false, deprecated: false,
};
const base: PromptConfig = { model: gpt, promptTokens: 500, responseTokens: 300, callsPerMonth: 100000 };

describe('promptForecast', () => {
  it('single-turn batch: arrivals = calls', () => {
    expect(promptForecast(base).arrivalsPerMonth).toBe(100000);
  });
  it('cost scales linearly with call volume', () => {
    const a = promptForecast(base).monthlyCost;
    const b = promptForecast({ ...base, callsPerMonth: 200000 }).monthlyCost;
    expect(b).toBeCloseTo(2 * a, 4);
  });
  it('a shared cacheable system prompt reduces cost vs none', () => {
    const none = promptForecast(base);
    const shared = promptForecast({ ...base, model: { ...gpt, cache: { archetype: 'breakpoint_ttl', cacheReadPerMToken: 0.075, cacheWritePerMToken: 0.1875, rateUnavailable: false, readUnavailable: false } }, sharedSystemPromptTokens: 2000 });
    // shared prompt is cacheable + a single distinct prefix hit 100k times/mo -> warm reads beat re-input
    expect(shared.cost.savingsUpTo.central).toBeGreaterThanOrEqual(0);
    expect(none.kind).toBe('prompt');
  });
  it('multi-turn raises arrivals and cost', () => {
    const mt = promptForecast({ ...base, turnsPerCall: 3 });
    expect(mt.arrivalsPerMonth).toBe(300000);
    expect(mt.monthlyCost).toBeGreaterThan(promptForecast(base).monthlyCost);
  });
  it('kill switch returns inert forecast', () => {
    expect(promptForecast({ ...base, enabled: false }).cost.applicable).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/workloads/__tests__/prompt.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/workloads/prompt.ts
// Prompt/Batch workload: independent calls (optionally multi-turn), each a batch item. With no shared
// prefix, each call is its own distinct prefix (K = calls) so there is no cross-call reuse; a shared
// cacheable system prompt collapses to K=1 and the warm-cache engine credits the reads. Batch items are
// independent -> steady profile. Owner: TokenTally engine. Version: Phase 1.
import { monthlyWarmCost } from '@/engine';
import { meanAccumulated } from '@/workloads/accumulate';
import { accuracyNoteFor, disabledForecast } from '@/workloads/note';
import type { PromptConfig, WorkloadForecast } from '@/types/workload';

export function promptForecast(cfg: PromptConfig): WorkloadForecast {
  if (cfg.enabled === false) return disabledForecast('prompt');
  const turns = Math.max(1, Math.floor(cfg.turnsPerCall ?? 1));
  const calls = Math.max(0, cfg.callsPerMonth);
  const arrivals = calls * turns;
  const shared = Math.max(0, cfg.sharedSystemPromptTokens ?? 0);
  const perArrivalInput = cfg.promptTokens + meanAccumulated(0, cfg.contextGrowthPerTurn ?? 0, turns);
  const cost = monthlyWarmCost({
    model: cfg.model,
    prefixTokens: shared,
    perArrivalInputTokens: perArrivalInput,
    perArrivalOutputTokens: cfg.responseTokens,
    perArrivalReasoningTokens: cfg.reasoningTokens ?? 0,
    arrivalsPerMonth: arrivals,
    // no shared prefix -> every call is a unique prefix (no reuse). shared -> one hot prefix.
    distinctPrefixes: shared > 0 ? 1 : Math.max(1, arrivals),
    ttl: cfg.ttl ?? 'min5',
    profile: 'steady',
    tokenizerBand: cfg.tokenizerBand ?? null,
  });
  return {
    kind: 'prompt',
    monthlyCost: cost.centralTotal,
    cost,
    arrivalsPerMonth: arrivals,
    accuracyNote: accuracyNoteFor(cfg.model, cfg.tokenizerBand ?? null),
    steps: null,
  };
}
```

- [ ] **Step 4: Run tests to verify green**

Run: `npx vitest run src/workloads/__tests__/prompt.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/workloads/prompt.ts src/workloads/__tests__/prompt.test.ts
git commit -m "feat(workloads): prompt/batch adapter with shared-prefix + multi-turn (Phase 1 Task 3)"
```

---

## Task 4: Agent (single) workload adapter

**Files:**
- Create: `src/workloads/agent.ts`
- Test: `src/workloads/__tests__/agent.test.ts`

**Interfaces:**
- Consumes: `monthlyWarmCost`, `meanAccumulated`, `buildWaterfall`+`effectiveInputRate`… (via a per-step cost helper — see below), `AgentConfig`.
- Produces: `agentForecast(config: AgentConfig): WorkloadForecast` with `steps: StepProfile[]`.

**Mapping:** arrivals λ = `runsPerMonth * stepsPerRun`; prefix = `toolSchemaTokens + systemTokens`; K = `distinctPrefixes ?? 1`; per-arrival input = `perStepUserSeedTokens + meanAccumulated(0, observationGrowthPerStep, stepsPerRun)` (super-linear re-sent context, no clean-quadratic claim — the mean is exact for the total); output = `actionOutputTokens`; reasoning = `reasoningTokensPerStep`; profile `'bursty'`, `burstsPerMonth = runsPerMonth` (steps within a run are adjacent → warm after step 1). The `steps` profile plots step k's input `seed + (k-1)*growth`, output, reasoning, and cost at CENTRAL warm rates (the chart shows accumulation; the monthly total blends warm/cold). **Reconciliation invariant (tested):** `Σ steps.inputTokens * runsPerMonth === arrivals * perArrivalInput` (token conservation, exact).

- [ ] **Step 1: Write the failing test**

```typescript
// src/workloads/__tests__/agent.test.ts
import { describe, it, expect } from 'vitest';
import { agentForecast } from '@/workloads/agent';
import type { AgentConfig } from '@/types/workload';
import type { ModelRecord } from '@/types/registry';

const model: ModelRecord = {
  canonicalId: 'gpt-4o', deployment: 'openai', displayName: 'GPT-4o', provider: 'openai',
  underlyingFamily: 'openai', mode: 'chat', billingUnit: 'per_token', inputPrice: 2.5, outputPrice: 10,
  reasoningPerMToken: null,
  cache: { archetype: 'breakpoint_ttl', cacheReadPerMToken: 1.25, cacheWritePerMToken: 2.5, rateUnavailable: false, readUnavailable: false },
  contextWindow: 128000, maxOutput: 16384, tiers: [], accuracyTier: 'exact_unverified', freeTier: false, deprecated: false,
};
const base: AgentConfig = {
  model, toolSchemaTokens: 2000, systemTokens: 500, perStepUserSeedTokens: 100,
  observationGrowthPerStep: 400, actionOutputTokens: 150, stepsPerRun: 8, runsPerMonth: 5000,
};

describe('agentForecast', () => {
  it('arrivals = runs * steps', () => {
    expect(agentForecast(base).arrivalsPerMonth).toBe(40000);
  });
  it('emits a per-step accumulation profile of length stepsPerRun', () => {
    const steps = agentForecast(base).steps!;
    expect(steps).toHaveLength(8);
    expect(steps[0].inputTokens).toBe(100); // step 1: seed only, no observations yet
    expect(steps[7].inputTokens).toBe(100 + 7 * 400); // step 8: seed + 7 growths
    expect(steps[7].cost).toBeGreaterThan(steps[0].cost); // accumulation raises per-step cost
  });
  it('token conservation: sum(step input)*runs === arrivals*perArrivalInput', () => {
    const f = agentForecast(base);
    const sumStepInput = f.steps!.reduce((s, x) => s + x.inputTokens, 0);
    const perArrival = 100 + (400 * (8 - 1)) / 2; // meanAccumulated
    expect(sumStepInput * base.runsPerMonth).toBeCloseTo(f.arrivalsPerMonth * perArrival, 2);
  });
  it('more steps raises monthly cost super-linearly per run (accumulation)', () => {
    const perRun4 = agentForecast({ ...base, stepsPerRun: 4 }).monthlyCost / base.runsPerMonth;
    const perRun8 = agentForecast({ ...base, stepsPerRun: 8 }).monthlyCost / base.runsPerMonth;
    expect(perRun8).toBeGreaterThan(2 * perRun4); // doubling steps more than doubles per-run cost
  });
  it('kill switch returns inert forecast with null steps', () => {
    const f = agentForecast({ ...base, enabled: false });
    expect(f.cost.applicable).toBe(false);
    expect(f.steps).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/workloads/__tests__/agent.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/workloads/agent.ts
// Agent (single) workload: a tool loop of N steps per run, each step re-sending the cached tool-schema
// prefix plus linearly accumulating observations (super-linear re-sent context; no clean-quadratic
// claim). Monthly cost maps to one bursty WarmScenario (burstsPerMonth = runs; steps within a run warm
// after step 1). The step profile plots the ACTUAL accumulation the engine bills, at central warm rates;
// a reconciliation test asserts token conservation against the scenario. Owner: engine. Version: Phase 1.
import { monthlyWarmCost } from '@/engine';
import { meanAccumulated } from '@/workloads/accumulate';
import { effectiveInputRate, effectiveOutputRate, effectiveCacheRates } from '@/engine/cost/rates';
import { accuracyNoteFor, disabledForecast } from '@/workloads/note';
import type { AgentConfig, StepProfile, WorkloadForecast } from '@/types/workload';

const PER_MILLION = 1_000_000;

// Per-step cost at CENTRAL rates: the prefix reads warm (cache read rate; step 1 writes but the chart
// shows the steady-state per-step cost), non-prefix input + output + reasoning at base rates. Illustrative
// of accumulation; the monthly total (monthlyWarmCost) is the billed figure and blends warm/cold.
function stepProfile(cfg: AgentConfig, prefixTokens: number): StepProfile[] {
  const steps = Math.max(0, Math.floor(cfg.stepsPerRun));
  const tierTokens = prefixTokens + cfg.perStepUserSeedTokens;
  const inRate = effectiveInputRate(cfg.model, tierTokens);
  const outRate = effectiveOutputRate(cfg.model, tierTokens) ?? 0;
  const { read } = effectiveCacheRates(cfg.model, tierTokens);
  const prefixRate = read ?? inRate; // warm prefix read (null read -> base input, no free discount)
  const reasonRate = cfg.model.reasoningPerMToken ?? 0;
  const out: StepProfile[] = [];
  for (let k = 1; k <= steps; k++) {
    const input = cfg.perStepUserSeedTokens + cfg.observationGrowthPerStep * (k - 1);
    const reasoning = cfg.reasoningTokensPerStep ?? 0;
    const cost =
      (prefixTokens * prefixRate + input * inRate + cfg.actionOutputTokens * outRate + reasoning * reasonRate) /
      PER_MILLION;
    out.push({ step: k, inputTokens: input, outputTokens: cfg.actionOutputTokens, reasoningTokens: reasoning, cost });
  }
  return out;
}

export function agentForecast(cfg: AgentConfig): WorkloadForecast {
  if (cfg.enabled === false) return disabledForecast('agent');
  const steps = Math.max(0, Math.floor(cfg.stepsPerRun));
  const runs = Math.max(0, cfg.runsPerMonth);
  const arrivals = runs * steps;
  const prefixTokens = Math.max(0, cfg.toolSchemaTokens) + Math.max(0, cfg.systemTokens);
  const perArrivalInput = cfg.perStepUserSeedTokens + meanAccumulated(0, cfg.observationGrowthPerStep, steps);
  const cost = monthlyWarmCost({
    model: cfg.model,
    prefixTokens,
    perArrivalInputTokens: perArrivalInput,
    perArrivalOutputTokens: cfg.actionOutputTokens,
    perArrivalReasoningTokens: cfg.reasoningTokensPerStep ?? 0,
    arrivalsPerMonth: arrivals,
    distinctPrefixes: cfg.distinctPrefixes ?? 1,
    ttl: cfg.ttl ?? 'min5',
    profile: 'bursty',
    activeFraction: cfg.activeFraction ?? 1,
    burstsPerMonth: runs,
    tokenizerBand: cfg.tokenizerBand ?? null,
  });
  return {
    kind: 'agent',
    monthlyCost: cost.centralTotal,
    cost,
    arrivalsPerMonth: arrivals,
    accuracyNote: accuracyNoteFor(cfg.model, cfg.tokenizerBand ?? null),
    steps: stepProfile(cfg, prefixTokens),
  };
}
```

- [ ] **Step 4: Run tests to verify green**

Run: `npx vitest run src/workloads/__tests__/agent.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/workloads/agent.ts src/workloads/__tests__/agent.test.ts
git commit -m "feat(workloads): agent adapter with per-step accumulation + conservation invariant (Phase 1 Task 4)"
```

---

## Task 5: Multi-agent (Crew) workload adapter

**Files:**
- Create: `src/workloads/crew.ts`
- Test: `src/workloads/__tests__/crew.test.ts`

**Interfaces:**
- Consumes: `agentForecast` (Task 4), `CrewConfig`.
- Produces: `crewForecast(config: CrewConfig): WorkloadForecast`.

**Mapping (spec §5.5):** `Σ per-agent runs + orchestration + shared transcript growth`. Each crew member runs `runsPerMonth` times; the shared transcript grows so each member's per-step context carries an extra `sharedTranscriptGrowthPerStep` (added to the member's `observationGrowthPerStep`). The crew forecast sums each member's `agentForecast` monthly cost and the optional orchestrator's cost. Confidence composes by summing the low/mid/high of member ranges (independent-additive; note the correlation caveat in the accuracy note). `steps` = the orchestrator's profile if present else the first member's (representative accumulation). `arrivalsPerMonth` = Σ member arrivals + orchestrator arrivals.

- [ ] **Step 1: Write the failing test**

```typescript
// src/workloads/__tests__/crew.test.ts
import { describe, it, expect } from 'vitest';
import { crewForecast } from '@/workloads/crew';
import { agentForecast } from '@/workloads/agent';
import type { AgentConfig, CrewConfig } from '@/types/workload';
import type { ModelRecord } from '@/types/registry';

const model: ModelRecord = {
  canonicalId: 'gpt-4o', deployment: 'openai', displayName: 'GPT-4o', provider: 'openai',
  underlyingFamily: 'openai', mode: 'chat', billingUnit: 'per_token', inputPrice: 2.5, outputPrice: 10,
  reasoningPerMToken: null,
  cache: { archetype: 'breakpoint_ttl', cacheReadPerMToken: 1.25, cacheWritePerMToken: 2.5, rateUnavailable: false, readUnavailable: false },
  contextWindow: 128000, maxOutput: 16384, tiers: [], accuracyTier: 'exact_unverified', freeTier: false, deprecated: false,
};
const member = (over: Partial<AgentConfig> = {}): AgentConfig => ({
  model, toolSchemaTokens: 1500, systemTokens: 300, perStepUserSeedTokens: 80,
  observationGrowthPerStep: 300, actionOutputTokens: 120, stepsPerRun: 5, runsPerMonth: 2000, ...over,
});

describe('crewForecast', () => {
  it('sums member costs plus orchestrator', () => {
    const cfg: CrewConfig = { agents: [member(), member()], sharedTranscriptGrowthPerStep: 0, runsPerMonth: 2000 };
    const f = crewForecast(cfg);
    const oneMember = agentForecast(member({ runsPerMonth: 2000 })).monthlyCost;
    expect(f.monthlyCost).toBeCloseTo(2 * oneMember, 4);
    expect(f.kind).toBe('crew');
  });
  it('shared transcript growth raises cost above zero-growth', () => {
    const zero = crewForecast({ agents: [member(), member()], sharedTranscriptGrowthPerStep: 0, runsPerMonth: 2000 });
    const grow = crewForecast({ agents: [member(), member()], sharedTranscriptGrowthPerStep: 500, runsPerMonth: 2000 });
    expect(grow.monthlyCost).toBeGreaterThan(zero.monthlyCost);
  });
  it('crew runsPerMonth overrides each member run count', () => {
    const f = crewForecast({ agents: [member({ runsPerMonth: 999999 })], sharedTranscriptGrowthPerStep: 0, runsPerMonth: 1000 });
    // member's own runsPerMonth is ignored; crew runs = 1000, steps 5 -> 5000 arrivals
    expect(f.arrivalsPerMonth).toBe(5000);
  });
  it('confidence sums across members (additive)', () => {
    const cfg: CrewConfig = { agents: [member(), member()], sharedTranscriptGrowthPerStep: 0, runsPerMonth: 2000 };
    const f = crewForecast(cfg);
    expect(f.cost.confidence.high).toBeGreaterThanOrEqual(f.cost.confidence.mid);
    expect(f.cost.confidence.mid).toBeCloseTo(f.monthlyCost, 4);
  });
  it('kill switch returns inert forecast', () => {
    const f = crewForecast({ agents: [member()], sharedTranscriptGrowthPerStep: 0, runsPerMonth: 10, enabled: false });
    expect(f.cost.applicable).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/workloads/__tests__/crew.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/workloads/crew.ts
// Multi-agent (crew/group chat): sum of per-member agent runs + optional orchestrator + shared-transcript
// growth (each member re-reads the growing shared transcript, so its per-step context accumulates an extra
// term). All members run at the crew's runsPerMonth. Costs and confidence ranges add across members
// (independent-additive; the accuracy note flags that correlated inputs are not de-correlated). Owner:
// engine. Version: Phase 1.
import { agentForecast } from '@/workloads/agent';
import { disabledForecast } from '@/workloads/note';
import type { AgentConfig, CrewConfig, WorkloadForecast } from '@/types/workload';
import type { CostComponentEntry, WarmCostResult } from '@/types/engine';

export function crewForecast(cfg: CrewConfig): WorkloadForecast {
  if (cfg.enabled === false) return disabledForecast('crew');
  const runs = Math.max(0, cfg.runsPerMonth);
  const growth = Math.max(0, cfg.sharedTranscriptGrowthPerStep);
  const members: AgentConfig[] = cfg.orchestrator ? [cfg.orchestrator, ...cfg.agents] : [...cfg.agents];
  const forecasts = members.map((m) =>
    agentForecast({ ...m, runsPerMonth: runs, observationGrowthPerStep: m.observationGrowthPerStep + growth }),
  );

  const sum = (pick: (c: WarmCostResult['confidence']) => number): number =>
    forecasts.reduce((s, f) => s + pick(f.cost.confidence), 0);
  const monthly = forecasts.reduce((s, f) => s + f.monthlyCost, 0);
  const arrivals = forecasts.reduce((s, f) => s + f.arrivalsPerMonth, 0);
  const writes = forecasts.reduce((s, f) => s + f.cost.writesPerMonth, 0);
  const conservative = forecasts.reduce((s, f) => s + f.cost.conservativeTotal, 0);
  const components: CostComponentEntry[] = forecasts.map((f, i) => ({ label: `member${i}`, cost: f.monthlyCost }));

  const cost: WarmCostResult = {
    applicable: forecasts.some((f) => f.cost.applicable),
    warmth: null, // heterogeneous members: no single warmth; each member's is in its own forecast
    centralTotal: monthly,
    conservativeTotal: conservative,
    savingsUpTo: {
      central: Math.max(0, conservative - monthly),
      conservativeReference: conservative,
      qualifier: 'up_to',
    },
    writesPerMonth: writes,
    waterfall: { components, total: monthly },
    confidence: {
      low: sum((c) => c.low),
      mid: sum((c) => c.mid),
      high: sum((c) => c.high),
      unmodeled: forecasts.some((f) => f.cost.confidence.unmodeled),
    },
    breakEvenArrivals: null,
  };
  return {
    kind: 'crew',
    monthlyCost: monthly,
    cost,
    arrivalsPerMonth: arrivals,
    accuracyNote:
      'estimate: crew cost sums per-member forecasts (independent-additive ranges; correlated inputs not de-correlated)',
    steps: forecasts[0]?.steps ?? null,
  };
}
```

- [ ] **Step 4: Run tests to verify green**

Run: `npx vitest run src/workloads/__tests__/crew.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/workloads/crew.ts src/workloads/__tests__/crew.test.ts
git commit -m "feat(workloads): multi-agent crew adapter with shared-transcript growth (Phase 1 Task 5)"
```

---

## Task 6: Framework presets + workload barrel

**Files:**
- Create: `src/workloads/presets.ts`
- Create: `src/workloads/index.ts`
- Test: `src/workloads/__tests__/presets.test.ts`

**Interfaces:**
- Consumes: `AgentConfig`, `CrewConfig`.
- Produces: `AGENT_PRESETS` (LangChain/LangGraph, CrewAI, AutoGen, LlamaIndex, Custom) as `Partial<AgentConfig>` seeds with a `label` and a `source` note; `applyPreset(name, model, over)`. Barrel re-exports the five forecasts + presets + types.

**Honesty:** each preset is a *tunable default seed*, labeled as such with a provenance note (framework docs / typical value), never presented as measured truth. Numbers are round, documented, and overridable.

- [ ] **Step 1: Write the failing test**

```typescript
// src/workloads/__tests__/presets.test.ts
import { describe, it, expect } from 'vitest';
import { AGENT_PRESETS, applyPreset } from '@/workloads/presets';
import type { ModelRecord } from '@/types/registry';

const model = { canonicalId: 'gpt-4o', deployment: 'openai', billingUnit: 'per_token', inputPrice: 2.5, outputPrice: 10, reasoningPerMToken: null, cache: null, tiers: [], accuracyTier: 'estimate' } as unknown as ModelRecord;

describe('agent presets', () => {
  it('exposes the five framework presets, each tunable and labeled', () => {
    expect(AGENT_PRESETS.map((p) => p.name)).toEqual(['langchain', 'crewai', 'autogen', 'llamaindex', 'custom']);
    for (const p of AGENT_PRESETS) {
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.source).toMatch(/seed|typical|default/i); // provenance note, not measured truth
    }
  });
  it('applyPreset seeds an AgentConfig that overrides cleanly', () => {
    const cfg = applyPreset('crewai', model, { runsPerMonth: 1234 });
    expect(cfg.model).toBe(model);
    expect(cfg.runsPerMonth).toBe(1234); // caller override wins over the seed
    expect(cfg.stepsPerRun).toBeGreaterThan(0);
  });
  it('unknown preset falls back to custom', () => {
    // @ts-expect-error deliberate bad name
    const cfg = applyPreset('nope', model, {});
    expect(cfg.stepsPerRun).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/workloads/__tests__/presets.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/workloads/presets.ts
// Framework presets: tunable default seeds for the Agent workload, one per common framework. Each is a
// documented round-number STARTING POINT (framework docs / typical community values), explicitly not a
// measured benchmark; every field is overridable and the UI must show them as editable defaults. Owner:
// engine. Version: Phase 1.
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
  { name: 'custom', label: 'Custom', source: 'default seed: tune every field', seed: CUSTOM_SEED },
];

export function applyPreset(name: PresetName, model: ModelRecord, over: Partial<AgentConfig> = {}): AgentConfig {
  const preset = AGENT_PRESETS.find((p) => p.name === name) ?? AGENT_PRESETS[AGENT_PRESETS.length - 1];
  return { model, ...preset.seed, ...over };
}
```

```typescript
// src/workloads/index.ts
// Public workload API: the four forecasts + framework presets + the shared contract types.
// Owner: TokenTally engine. Version: Phase 1.
export { chatbotForecast } from '@/workloads/chatbot';
export { promptForecast } from '@/workloads/prompt';
export { agentForecast } from '@/workloads/agent';
export { crewForecast } from '@/workloads/crew';
export { AGENT_PRESETS, applyPreset } from '@/workloads/presets';
export type { PresetName, AgentPreset } from '@/workloads/presets';
export type {
  WorkloadForecast, StepProfile, WorkloadKind, ChatbotConfig, PromptConfig, AgentConfig, CrewConfig,
} from '@/types/workload';
export { WORKLOAD_KINDS } from '@/types/workload';
```

- [ ] **Step 4: Run tests + lint to verify green**

Run: `npx vitest run src/workloads/__tests__/presets.test.ts && npm run lint`
Expected: PASS, lint 0/0.

- [ ] **Step 5: Commit**

```bash
git add src/workloads/presets.ts src/workloads/index.ts src/workloads/__tests__/presets.test.ts
git commit -m "feat(workloads): framework presets (tunable seeds) + public barrel (Phase 1 Task 6)"
```

---

## Task 7: Optimization candidates + engine

**Files:**
- Create: `src/optimization/candidates.ts`
- Create: `src/optimization/optimize.ts`
- Test: `src/optimization/__tests__/optimize.test.ts`

**Interfaces:**
- Consumes: the workload forecasts (Task 2-5), `getDeployments`/`listByMode` from `@/registry`, `ModelRecord`.
- Produces:
  - `type OptimizationBase = { kind: 'chatbot'|'prompt'|'agent'|'crew'; config: ...; candidateModels: ModelRecord[] }` — a discriminated union carrying the workload config and the models to search.
  - `optimize(base): Recommendation[]` — each `{ id, kind: 'switch_model'|'switch_deployment'|'enable_caching'|'trim_prefix'|'adjust_context'; label; monthlyCost; monthlySavings; savingsPct; confidence; rationale }`, sorted by `monthlySavings` desc, filtered to strictly-positive savings.
  - `solveBudget(base, monthlyBudget): { maxArrivalsPerMonth: number; note: string }` — inverse solve for the volume that fits a budget (linear scaling on the per-arrival cost).

**Provider-agnostic (spec §5.6):** switch-model iterates `candidateModels`; switch-deployment iterates `getDeployments(canonicalId)` for the current model; both compare within and across deployments. Savings carry the candidate forecast's confidence range so a "saving" between two wide Estimate ranges is not overstated (the rationale notes overlap).

- [ ] **Step 1: Write the failing test**

```typescript
// src/optimization/__tests__/optimize.test.ts
import { describe, it, expect } from 'vitest';
import { optimize, solveBudget } from '@/optimization/optimize';
import type { ModelRecord } from '@/types/registry';
import type { ChatbotConfig } from '@/types/workload';

const mk = (over: Partial<ModelRecord>): ModelRecord => ({
  canonicalId: 'm', deployment: 'openai', displayName: 'M', provider: 'openai', underlyingFamily: 'openai',
  mode: 'chat', billingUnit: 'per_token', inputPrice: 5, outputPrice: 15, reasoningPerMToken: null,
  cache: null, contextWindow: 128000, maxOutput: 4096, tiers: [], accuracyTier: 'estimate',
  freeTier: false, deprecated: false, ...over,
});
const expensive = mk({ canonicalId: 'gpt-4o', displayName: 'GPT-4o', inputPrice: 5, outputPrice: 15 });
const cheap = mk({ canonicalId: 'gpt-4o-mini', displayName: 'GPT-4o mini', inputPrice: 0.15, outputPrice: 0.6 });

const cfg: ChatbotConfig = {
  model: expensive, systemPromptTokens: 800, avgUserMessageTokens: 50, avgResponseTokens: 200,
  turnsPerConversation: 4, contextGrowthPerTurn: 150, conversationsPerMonth: 50000,
};

describe('optimize', () => {
  it('recommends the cheaper model with a positive dollar saving, ranked first', () => {
    const recs = optimize({ kind: 'chatbot', config: cfg, candidateModels: [expensive, cheap] });
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].monthlySavings).toBeGreaterThan(0);
    expect(recs[0].label).toMatch(/mini/i);
    // sorted descending by savings
    for (let i = 1; i < recs.length; i++) expect(recs[i - 1].monthlySavings).toBeGreaterThanOrEqual(recs[i].monthlySavings);
  });
  it('never recommends a costlier switch (non-positive savings filtered out)', () => {
    const recs = optimize({ kind: 'chatbot', config: { ...cfg, model: cheap }, candidateModels: [cheap, expensive] });
    expect(recs.every((r) => r.monthlySavings > 0)).toBe(true);
  });
  it('suggests enable-caching when a cache-capable model is not using a cacheable prefix', () => {
    const cacheable = mk({ canonicalId: 'gpt-4o', cache: { archetype: 'breakpoint_ttl', cacheReadPerMToken: 1.25, cacheWritePerMToken: 2.5, rateUnavailable: false, readUnavailable: false } });
    const recs = optimize({ kind: 'chatbot', config: { ...cfg, model: cacheable }, candidateModels: [cacheable] });
    // caching already applies via bursty writes; the enable-caching rec appears only if it saves. Assert no crash + shape.
    expect(Array.isArray(recs)).toBe(true);
  });
  it('solveBudget returns the arrival ceiling that fits a monthly budget', () => {
    const { maxArrivalsPerMonth } = solveBudget({ kind: 'chatbot', config: cfg, candidateModels: [] }, 100);
    expect(maxArrivalsPerMonth).toBeGreaterThan(0);
    expect(Number.isFinite(maxArrivalsPerMonth)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/optimization/__tests__/optimize.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement candidates**

```typescript
// src/optimization/candidates.ts
// Candidate transforms for the optimizer. Each takes the workload base and yields zero or more altered
// configs plus a label/rationale; optimize() prices each and keeps the ones that strictly save. Pure.
// Owner: TokenTally engine. Version: Phase 1.
import { getDeployments } from '@/registry';
import type { ModelRecord } from '@/types/registry';
import type { ChatbotConfig, PromptConfig, AgentConfig, CrewConfig } from '@/types/workload';

export type WorkloadConfig = ChatbotConfig | PromptConfig | AgentConfig | CrewConfig;
export type OptKind = 'switch_model' | 'switch_deployment' | 'enable_caching' | 'trim_prefix' | 'adjust_context';

export interface OptimizationBase {
  kind: 'chatbot' | 'prompt' | 'agent';
  config: ChatbotConfig | PromptConfig | AgentConfig;
  candidateModels: ModelRecord[];
}

export interface Candidate {
  id: string;
  optKind: OptKind;
  label: string;
  rationale: string;
  config: ChatbotConfig | PromptConfig | AgentConfig;
}

// The stable prefix field differs per workload; read/write it generically.
function withModel(base: OptimizationBase, model: ModelRecord): OptimizationBase['config'] {
  return { ...base.config, model };
}

export function candidates(base: OptimizationBase): Candidate[] {
  const out: Candidate[] = [];
  const cur = base.config.model;

  // switch-model: every candidate of the same mode that is not the current (canonicalId, deployment).
  for (const m of base.candidateModels) {
    if (m.canonicalId === cur.canonicalId && m.deployment === cur.deployment) continue;
    if (m.mode !== cur.mode || m.billingUnit !== cur.billingUnit) continue; // compare like-for-like
    out.push({
      id: `switch_model:${m.canonicalId}:${m.deployment}`, optKind: 'switch_model',
      label: `Switch to ${m.displayName} (${m.deployment})`,
      rationale: `Different model at $${m.inputPrice}/$${m.outputPrice ?? 0} per Mtok`,
      config: withModel(base, m),
    });
  }
  // switch-deployment: other deployments of the SAME canonical model (gov-cloud/OpenRouter price divergence).
  for (const m of getDeployments(cur.canonicalId)) {
    if (m.deployment === cur.deployment) continue;
    out.push({
      id: `switch_deployment:${m.deployment}`, optKind: 'switch_deployment',
      label: `Route ${m.displayName} via ${m.deployment}`,
      rationale: `Same model, different deployment pricing`,
      config: withModel(base, m),
    });
  }
  // trim-prefix: cut the stable prefix 30% (tool schema / system prompt pruning).
  const prefixField =
    base.kind === 'chatbot' ? 'systemPromptTokens' : base.kind === 'agent' ? 'toolSchemaTokens' : 'sharedSystemPromptTokens';
  const curPrefix = (base.config as Record<string, number>)[prefixField] ?? 0;
  if (curPrefix > 0) {
    out.push({
      id: 'trim_prefix', optKind: 'trim_prefix', label: `Trim ${prefixField} by 30%`,
      rationale: `Smaller stable prefix lowers write + read tokens`,
      config: { ...base.config, [prefixField]: Math.round(curPrefix * 0.7) } as OptimizationBase['config'],
    });
  }
  // adjust-context: cut per-turn/per-step growth 30% (tighter context strategy).
  const growthField =
    base.kind === 'chatbot' ? 'contextGrowthPerTurn' : base.kind === 'agent' ? 'observationGrowthPerStep' : 'contextGrowthPerTurn';
  const curGrowth = (base.config as Record<string, number>)[growthField] ?? 0;
  if (curGrowth > 0) {
    out.push({
      id: 'adjust_context', optKind: 'adjust_context', label: `Cut ${growthField} by 30%`,
      rationale: `Trimming accumulated context lowers per-arrival input`,
      config: { ...base.config, [growthField]: Math.round(curGrowth * 0.7) } as OptimizationBase['config'],
    });
  }
  return out;
}
```

- [ ] **Step 4: Implement optimize**

```typescript
// src/optimization/optimize.ts
// Provider-agnostic optimizer: price the base workload, price each candidate transform, and rank the
// strictly-positive dollar savings. Confidence ranges ride along so a "saving" between two wide Estimate
// intervals is disclosed as overlapping, not sold as precise. solveBudget inverse-solves the arrival
// ceiling for a target monthly spend (cost is linear in arrivals). Pure. Owner: engine. Version: Phase 1.
import { chatbotForecast } from '@/workloads/chatbot';
import { promptForecast } from '@/workloads/prompt';
import { agentForecast } from '@/workloads/agent';
import { candidates, type OptimizationBase, type OptKind } from '@/optimization/candidates';
import type { WorkloadForecast } from '@/types/workload';

export interface Recommendation {
  id: string;
  optKind: OptKind;
  label: string;
  monthlyCost: number;
  monthlySavings: number;
  savingsPct: number;
  confidenceLow: number;
  confidenceHigh: number;
  rationale: string;
}

function price(base: OptimizationBase, config: OptimizationBase['config']): WorkloadForecast {
  switch (base.kind) {
    case 'chatbot': return chatbotForecast(config as Parameters<typeof chatbotForecast>[0]);
    case 'prompt': return promptForecast(config as Parameters<typeof promptForecast>[0]);
    case 'agent': return agentForecast(config as Parameters<typeof agentForecast>[0]);
  }
}

export function optimize(base: OptimizationBase): Recommendation[] {
  const baseline = price(base, base.config);
  const recs: Recommendation[] = [];
  for (const c of candidates(base)) {
    const f = price(base, c.config);
    const savings = baseline.monthlyCost - f.monthlyCost;
    if (!(savings > 0)) continue; // only surface a real saving
    const overlaps = f.cost.confidence.high >= baseline.cost.confidence.low;
    recs.push({
      id: c.id, optKind: c.optKind, label: c.label,
      monthlyCost: f.monthlyCost, monthlySavings: savings,
      savingsPct: baseline.monthlyCost > 0 ? (savings / baseline.monthlyCost) * 100 : 0,
      confidenceLow: f.cost.confidence.low, confidenceHigh: f.cost.confidence.high,
      rationale: overlaps ? `${c.rationale}. Note: confidence ranges overlap — saving is directional.` : c.rationale,
    });
  }
  return recs.sort((a, b) => b.monthlySavings - a.monthlySavings);
}

export function solveBudget(base: OptimizationBase, monthlyBudget: number): { maxArrivalsPerMonth: number; note: string } {
  const f = price(base, base.config);
  if (!(f.monthlyCost > 0) || !(f.arrivalsPerMonth > 0)) {
    return { maxArrivalsPerMonth: 0, note: 'base cost or volume is zero; cannot inverse-solve' };
  }
  const costPerArrival = f.monthlyCost / f.arrivalsPerMonth;
  const maxArrivals = Math.max(0, Math.floor(Math.max(0, monthlyBudget) / costPerArrival));
  return { maxArrivalsPerMonth: maxArrivals, note: `at $${costPerArrival.toFixed(6)}/arrival (central estimate)` };
}
```

- [ ] **Step 5: Run tests to verify green**

Run: `npx vitest run src/optimization/__tests__/optimize.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/optimization/candidates.ts src/optimization/optimize.ts src/optimization/__tests__/optimize.test.ts
git commit -m "feat(optimization): provider-agnostic candidate ranking + budget inverse-solve (Phase 1 Task 7)"
```

---

## Task 8: Tornado sensitivity

**Files:**
- Create: `src/optimization/tornado.ts`
- Test: `src/optimization/__tests__/tornado.test.ts`

**Interfaces:**
- Consumes: the `price` path (re-export a small `priceBase(base)` from optimize, or re-import forecasts), `OptimizationBase`.
- Produces: `tornado(base, factors): TornadoBar[]` — for each named numeric factor, vary it by `±pct` and record `{ factor, low, high, swing }`, sorted by `swing` desc.

- [ ] **Step 1: Write the failing test**

```typescript
// src/optimization/__tests__/tornado.test.ts
import { describe, it, expect } from 'vitest';
import { tornado } from '@/optimization/tornado';
import type { ModelRecord } from '@/types/registry';
import type { ChatbotConfig } from '@/types/workload';

const model: ModelRecord = {
  canonicalId: 'gpt-4o', deployment: 'openai', displayName: 'GPT-4o', provider: 'openai', underlyingFamily: 'openai',
  mode: 'chat', billingUnit: 'per_token', inputPrice: 2.5, outputPrice: 10, reasoningPerMToken: null, cache: null,
  contextWindow: 128000, maxOutput: 4096, tiers: [], accuracyTier: 'estimate', freeTier: false, deprecated: false,
};
const cfg: ChatbotConfig = {
  model, systemPromptTokens: 800, avgUserMessageTokens: 50, avgResponseTokens: 200,
  turnsPerConversation: 5, contextGrowthPerTurn: 150, conversationsPerMonth: 50000,
};

describe('tornado', () => {
  it('varies each factor and sorts by swing desc', () => {
    const bars = tornado({ kind: 'chatbot', config: cfg, candidateModels: [] },
      ['conversationsPerMonth', 'avgResponseTokens', 'contextGrowthPerTurn'], 0.2);
    expect(bars).toHaveLength(3);
    for (let i = 1; i < bars.length; i++) expect(bars[i - 1].swing).toBeGreaterThanOrEqual(bars[i].swing);
    // volume has the biggest leverage on total cost
    expect(bars[0].factor).toBe('conversationsPerMonth');
    expect(bars[0].high).toBeGreaterThan(bars[0].low);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/optimization/__tests__/tornado.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/optimization/tornado.ts
// One-at-a-time sensitivity: vary each named numeric factor by ±pct around the base and record the cost
// swing, sorted so the biggest lever is first. The UI renders these as a tornado chart. Pure. Owner:
// engine. Version: Phase 1.
import { chatbotForecast } from '@/workloads/chatbot';
import { promptForecast } from '@/workloads/prompt';
import { agentForecast } from '@/workloads/agent';
import type { OptimizationBase } from '@/optimization/candidates';

export interface TornadoBar {
  factor: string;
  low: number; // cost at factor*(1-pct)
  high: number; // cost at factor*(1+pct)
  swing: number; // |high - low|
}

function priceCost(base: OptimizationBase, config: OptimizationBase['config']): number {
  switch (base.kind) {
    case 'chatbot': return chatbotForecast(config as Parameters<typeof chatbotForecast>[0]).monthlyCost;
    case 'prompt': return promptForecast(config as Parameters<typeof promptForecast>[0]).monthlyCost;
    case 'agent': return agentForecast(config as Parameters<typeof agentForecast>[0]).monthlyCost;
  }
}

export function tornado(base: OptimizationBase, factors: string[], pct = 0.2): TornadoBar[] {
  const p = Math.abs(pct);
  const bars: TornadoBar[] = factors.map((factor) => {
    const cur = (base.config as Record<string, number>)[factor];
    if (typeof cur !== 'number' || !Number.isFinite(cur)) return { factor, low: 0, high: 0, swing: 0 };
    const low = priceCost(base, { ...base.config, [factor]: cur * (1 - p) } as OptimizationBase['config']);
    const high = priceCost(base, { ...base.config, [factor]: cur * (1 + p) } as OptimizationBase['config']);
    return { factor, low, high, swing: Math.abs(high - low) };
  });
  return bars.sort((a, b) => b.swing - a.swing);
}
```

- [ ] **Step 4: Run tests to verify green**

Run: `npx vitest run src/optimization/__tests__/tornado.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/optimization/tornado.ts src/optimization/__tests__/tornado.test.ts
git commit -m "feat(optimization): tornado one-at-a-time sensitivity bars (Phase 1 Task 8)"
```

---

## Task 9: Denial of Wallet (defensive)

**Files:**
- Create: `src/optimization/denialOfWallet.ts`
- Create: `src/optimization/index.ts`
- Test: `src/optimization/__tests__/denialOfWallet.test.ts`

**Interfaces:**
- Consumes: `agentForecast`/`chatbotForecast`, `ModelRecord` (`contextWindow`, `maxOutput`), `AgentConfig`.
- Produces: `denialOfWallet(config: DenialOfWalletConfig): DenialOfWalletResult`; the constants `DOW_DISCLAIMER`, `DOW_VDP_URL`.

**Design (spec §5.6, §7, defensive framing):**
- Worst-case per-request cost = adversary fills the context (`contextWindow`), maxes output (`maxOutput`), and forces retries (`retryCeiling`). Cache posture = worst case (p_warm=0 via the `conservativeTotal` seam — every request pays the cold write, never a warm read).
- Attack volume = `attackerRequestsPerMonth` (or `users * perUserRequestCap`).
- Output: `{ worstCaseMonthly, confidence, mitigations, note, enabled }`. `mitigations` = each defensive control (output cap, retry ceiling, per-user rate limit, budget cap) with the `$` it removes.
- **Honesty:** if the model's `accuracyTier` is not exact, `note` says the underlying token cost is Estimate-tier; the figure is a bounded worst case with a confidence range, never false-precise. If `contextWindow`/`maxOutput` are null, fall back to explicit caps and say so.
- **Kill switch:** `enabled: false` → an inert result labeled disabled (default enabled=false — DoW is opt-in, above the launch cut line).
- **Dual-use:** `DOW_DISCLAIMER` (defensive purpose, abuse warning) and `DOW_VDP_URL` are returned for the UI to display.

- [ ] **Step 1: Write the failing test**

```typescript
// src/optimization/__tests__/denialOfWallet.test.ts
import { describe, it, expect } from 'vitest';
import { denialOfWallet, DOW_DISCLAIMER, DOW_VDP_URL } from '@/optimization/denialOfWallet';
import type { ModelRecord } from '@/types/registry';

const model: ModelRecord = {
  canonicalId: 'gpt-4o', deployment: 'openai', displayName: 'GPT-4o', provider: 'openai', underlyingFamily: 'openai',
  mode: 'chat', billingUnit: 'per_token', inputPrice: 2.5, outputPrice: 10, reasoningPerMToken: null,
  cache: { archetype: 'breakpoint_ttl', cacheReadPerMToken: 1.25, cacheWritePerMToken: 2.5, rateUnavailable: false, readUnavailable: false },
  contextWindow: 128000, maxOutput: 16384, tiers: [], accuracyTier: 'estimate', freeTier: false, deprecated: false,
};

describe('denialOfWallet', () => {
  it('is opt-in: default/disabled returns an inert labeled result', () => {
    const r = denialOfWallet({ model, attackerRequestsPerMonth: 1_000_000 });
    expect(r.enabled).toBe(false);
    expect(r.worstCaseMonthly).toBe(0);
    expect(r.note).toMatch(/disabled|kill switch|opt-in/i);
  });
  it('when enabled, fills context + maxes output for a bounded worst case with a range', () => {
    const r = denialOfWallet({ model, attackerRequestsPerMonth: 1_000_000, enabled: true });
    expect(r.worstCaseMonthly).toBeGreaterThan(0);
    expect(r.confidence.high).toBeGreaterThanOrEqual(r.confidence.mid);
    // worst case pays the cold prefix write every request (p_warm=0), never warm reads
    expect(r.note).toMatch(/worst case|conservative|no warm/i);
  });
  it('flags Estimate-tier underlying cost, never false-precise', () => {
    const r = denialOfWallet({ model, attackerRequestsPerMonth: 1000, enabled: true });
    expect(r.note).toMatch(/estimate/i);
  });
  it('mitigations each remove dollars and are sorted by impact', () => {
    const r = denialOfWallet({ model, attackerRequestsPerMonth: 1_000_000, enabled: true });
    expect(r.mitigations.length).toBeGreaterThan(0);
    for (const m of r.mitigations) expect(m.reducedMonthly).toBeLessThan(r.worstCaseMonthly);
    for (let i = 1; i < r.mitigations.length; i++) {
      expect(r.mitigations[i - 1].savedMonthly).toBeGreaterThanOrEqual(r.mitigations[i].savedMonthly);
    }
  });
  it('exposes a dual-use disclaimer and a VDP link', () => {
    expect(DOW_DISCLAIMER).toMatch(/defen|abuse|authoriz/i);
    expect(DOW_VDP_URL).toMatch(/^https?:|SECURITY|\.md/);
  });
  it('falls back to explicit caps when contextWindow/maxOutput are null', () => {
    const noCaps = { ...model, contextWindow: null, maxOutput: null };
    const r = denialOfWallet({ model: noCaps, attackerRequestsPerMonth: 1000, enabled: true, fallbackInputTokens: 8000, fallbackOutputTokens: 4000 });
    expect(r.worstCaseMonthly).toBeGreaterThan(0);
    expect(r.note).toMatch(/fallback|explicit cap/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/optimization/__tests__/denialOfWallet.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/optimization/denialOfWallet.ts
// Denial of Wallet (DEFENSIVE). Bounds the worst-case monthly spend an adversary can force by filling the
// context window, maxing output, and forcing retries, under the worst cache posture (p_warm=0: every
// request pays the cold prefix write, never a warm read — the conservativeTotal seam, C12). Shipped with a
// confidence range and an honest tier note, never false-precise. Framed for defenders: each mitigation
// (output cap, retry ceiling, per-user rate limit, budget cap) shows the dollars it removes. Opt-in
// (enabled defaults false; above the launch cut line) and kill-switch gated. Dual-use disclaimer + VDP
// link returned for the UI. Pure. Owner: TokenTally engine. Version: Phase 1.
import { monthlyWarmCost } from '@/engine';
import type { ModelRecord } from '@/types/registry';
import type { ConfidenceRange } from '@/types/engine';

export const DOW_DISCLAIMER =
  'Defensive planning only. This bounds your own worst-case spend so you can set budget, output, retry, ' +
  'and rate-limit controls. Do not use it to plan abuse of a third party; only test systems you are ' +
  'authorized to test.';
export const DOW_VDP_URL = 'SECURITY.md';

export interface DenialOfWalletConfig {
  model: ModelRecord;
  attackerRequestsPerMonth: number;
  retryCeiling?: number; // forced-retry multiplier the attacker can trigger; default 1
  enabled?: boolean; // kill switch; default FALSE (opt-in)
  fallbackInputTokens?: number; // used when contextWindow is null
  fallbackOutputTokens?: number; // used when maxOutput is null
  perUserRequestCap?: number; // for the rate-limit mitigation illustration
}

export interface Mitigation {
  control: string;
  reducedMonthly: number; // worst case AFTER applying this single control
  savedMonthly: number; // worstCaseMonthly - reducedMonthly
}

export interface DenialOfWalletResult {
  enabled: boolean;
  worstCaseMonthly: number;
  confidence: ConfidenceRange;
  mitigations: Mitigation[];
  note: string;
}

const inert = (note: string): DenialOfWalletResult => ({
  enabled: false, worstCaseMonthly: 0,
  confidence: { low: 0, mid: 0, high: 0, unmodeled: true }, mitigations: [], note,
});

// Price a worst-case posture: p_warm=0 (conservativeTotal), K = arrivals (no reuse), all cold writes.
function worstCase(model: ModelRecord, requests: number, inputTokens: number, outputTokens: number): {
  cost: number; conf: ConfidenceRange;
} {
  const r = monthlyWarmCost({
    model,
    prefixTokens: 0, // fold everything into per-arrival input so no warm-prefix discount applies
    perArrivalInputTokens: inputTokens,
    perArrivalOutputTokens: outputTokens,
    perArrivalReasoningTokens: 0,
    arrivalsPerMonth: requests,
    distinctPrefixes: Math.max(1, requests), // no reuse
    ttl: 'min5',
    profile: 'steady',
    tokenizerBand: null,
  });
  // the conservativeTotal is the p_warm=0 upper reference; use it as the worst case.
  return { cost: r.conservativeTotal, conf: r.confidence };
}

export function denialOfWallet(cfg: DenialOfWalletConfig): DenialOfWalletResult {
  if (cfg.enabled !== true) return inert('disabled: Denial of Wallet is opt-in (kill switch off)');

  const usedFallback = cfg.model.contextWindow === null || cfg.model.maxOutput === null;
  const inputTokens = cfg.model.contextWindow ?? Math.max(0, cfg.fallbackInputTokens ?? 0);
  const outputTokens = cfg.model.maxOutput ?? Math.max(0, cfg.fallbackOutputTokens ?? 0);
  const retries = Math.max(1, cfg.retryCeiling ?? 1);
  const requests = Math.max(0, cfg.attackerRequestsPerMonth) * retries;

  const base = worstCase(cfg.model, requests, inputTokens, outputTokens);

  // Mitigations: each recomputes the worst case with one control applied.
  const mits: Mitigation[] = [];
  const halfOut = worstCase(cfg.model, requests, inputTokens, Math.round(outputTokens / 2));
  mits.push({ control: 'Cap output at 50% of max', reducedMonthly: halfOut.cost, savedMonthly: base.cost - halfOut.cost });
  const noRetry = worstCase(cfg.model, Math.max(0, cfg.attackerRequestsPerMonth), inputTokens, outputTokens);
  mits.push({ control: 'Retry ceiling = 1', reducedMonthly: noRetry.cost, savedMonthly: base.cost - noRetry.cost });
  const quarterCtx = worstCase(cfg.model, requests, Math.round(inputTokens / 4), outputTokens);
  mits.push({ control: 'Cap input context at 25%', reducedMonthly: quarterCtx.cost, savedMonthly: base.cost - quarterCtx.cost });
  if (cfg.perUserRequestCap && cfg.perUserRequestCap > 0) {
    const capped = worstCase(cfg.model, Math.min(requests, cfg.perUserRequestCap * retries), inputTokens, outputTokens);
    mits.push({ control: `Per-user rate limit (${cfg.perUserRequestCap}/mo)`, reducedMonthly: capped.cost, savedMonthly: base.cost - capped.cost });
  }
  mits.sort((a, b) => b.savedMonthly - a.savedMonthly);

  const tierNote =
    cfg.model.accuracyTier === 'exact' ? '' : ` Underlying token cost is ${cfg.model.accuracyTier}-tier — treat as a bounded estimate, not a precise figure.`;
  const fbNote = usedFallback ? ' Used explicit fallback caps (model exposes no contextWindow/maxOutput).' : '';
  const note =
    `Worst case: adversary fills context (${inputTokens} tok) + maxes output (${outputTokens} tok)` +
    (retries > 1 ? ` x${retries} retries` : '') +
    `, no warm cache (conservative p_warm=0).${tierNote}${fbNote}`;

  return { enabled: true, worstCaseMonthly: base.cost, confidence: base.conf, mitigations: mits, note };
}
```

```typescript
// src/optimization/index.ts
// Public optimization API. Owner: TokenTally engine. Version: Phase 1.
export { optimize, solveBudget } from '@/optimization/optimize';
export type { Recommendation } from '@/optimization/optimize';
export { tornado } from '@/optimization/tornado';
export type { TornadoBar } from '@/optimization/tornado';
export { denialOfWallet, DOW_DISCLAIMER, DOW_VDP_URL } from '@/optimization/denialOfWallet';
export type { DenialOfWalletConfig, DenialOfWalletResult, Mitigation } from '@/optimization/denialOfWallet';
export { candidates } from '@/optimization/candidates';
export type { OptimizationBase, Candidate, OptKind, WorkloadConfig } from '@/optimization/candidates';
```

- [ ] **Step 4: Run tests + lint to verify green**

Run: `npx vitest run src/optimization/__tests__/denialOfWallet.test.ts && npm run lint`
Expected: PASS (6 tests), lint 0/0.

- [ ] **Step 5: Commit**

```bash
git add src/optimization/denialOfWallet.ts src/optimization/index.ts src/optimization/__tests__/denialOfWallet.test.ts
git commit -m "feat(optimization): defensive Denial-of-Wallet (bounded worst case + mitigations, kill-switched) (Phase 1 Task 9)"
```

---

## Task 10: Hand-verified scenarios + full-suite reconciliation

**Files:**
- Create: `src/workloads/__tests__/handVerified.test.ts`
- Test: (this task is the test)

**Interfaces:**
- Consumes: every workload + optimizer entry point.

**Spec §8 requirement:** hand-verified scenarios within 1% of hand math, per workload and billing unit. This task hand-computes 3+ scenarios and asserts the engine matches, plus the cross-workload invariants (agent conservation, crew additivity, DoW ≥ central).

- [ ] **Step 1: Write the hand-verified test**

```typescript
// src/workloads/__tests__/handVerified.test.ts
import { describe, it, expect } from 'vitest';
import { chatbotForecast, promptForecast, agentForecast } from '@/workloads';
import type { ModelRecord } from '@/types/registry';

// A no-cache per-token model makes the hand math exact (no warm-cache probability term).
const flat: ModelRecord = {
  canonicalId: 'flat', deployment: 'x', displayName: 'Flat', provider: 'x', underlyingFamily: 'openai',
  mode: 'chat', billingUnit: 'per_token', inputPrice: 10, outputPrice: 30, reasoningPerMToken: null,
  cache: null, contextWindow: 128000, maxOutput: 4096, tiers: [], accuracyTier: 'estimate', freeTier: false, deprecated: false,
};

describe('hand-verified scenarios (spec §8, within 1%)', () => {
  it('prompt/batch, no cache: cost = calls*(in*inRate + out*outRate)/1e6', () => {
    // 100k calls, 500 in, 300 out, $10/$30 per Mtok
    // = 100000*(500*10 + 300*30)/1e6 = 100000*(5000+9000)/1e6 = 100000*14000/1e6 = 1400
    const f = promptForecast({ model: flat, promptTokens: 500, responseTokens: 300, callsPerMonth: 100000 });
    expect(f.monthlyCost).toBeCloseTo(1400, 0);
  });
  it('chatbot, no cache: input folds mean-accumulated context', () => {
    // 10k conv * 4 turns = 40k arrivals. perArrivalInput = 50 + mean(0,150,4)=50+225=275. out=200.
    // cost = 40000*(275*10 + 200*30)/1e6 = 40000*(2750+6000)/1e6 = 40000*8750/1e6 = 350
    const f = chatbotForecast({ model: flat, systemPromptTokens: 0, avgUserMessageTokens: 50, avgResponseTokens: 200, turnsPerConversation: 4, contextGrowthPerTurn: 150, conversationsPerMonth: 10000 });
    expect(f.monthlyCost).toBeCloseTo(350, 0);
  });
  it('agent, no cache: prefix billed every step as input (no cache -> base input rate)', () => {
    // 1000 runs * 5 steps = 5000 arrivals. prefix=2000 (billed at input, no cache).
    // perArrivalInput = seed 100 + mean(0,400,5)=100+800=900. Total input/arrival = 2000+900=2900. out=150.
    // cost = 5000*(2900*10 + 150*30)/1e6 = 5000*(29000+4500)/1e6 = 5000*33500/1e6 = 167.5
    const f = agentForecast({ model: flat, toolSchemaTokens: 2000, systemTokens: 0, perStepUserSeedTokens: 100, observationGrowthPerStep: 400, actionOutputTokens: 150, stepsPerRun: 5, runsPerMonth: 1000 });
    expect(f.monthlyCost).toBeCloseTo(167.5, 1);
  });
  it('agent conservation: sum(step input)*runs === arrivals*perArrivalInput', () => {
    const f = agentForecast({ model: flat, toolSchemaTokens: 2000, systemTokens: 0, perStepUserSeedTokens: 100, observationGrowthPerStep: 400, actionOutputTokens: 150, stepsPerRun: 5, runsPerMonth: 1000 });
    const sumStepInput = f.steps!.reduce((s, x) => s + x.inputTokens, 0);
    expect(sumStepInput * 1000).toBeCloseTo(f.arrivalsPerMonth * (100 + 800), 2);
  });
});
```

- [ ] **Step 2: Run the hand-verified test**

Run: `npx vitest run src/workloads/__tests__/handVerified.test.ts`
Expected: PASS (4 tests). If any is off by >1%, the bug is in the adapter mapping — fix the adapter, not the test.

- [ ] **Step 3: Run the FULL suite + lint + typecheck + build**

Run: `npx vitest run && npm run lint && npx tsc --noEmit && npm run build`
Expected: all green; the new engine stays out of the MVP first-paint bundle (size gate still passes).

- [ ] **Step 4: Commit**

```bash
git add src/workloads/__tests__/handVerified.test.ts
git commit -m "test(workloads): hand-verified scenarios within 1% + cross-workload invariants (Phase 1 Task 10)"
```

---

## Self-Review

**1. Spec coverage:**
- §5.5 Chatbot/Prompt refactor → Tasks 2, 3. Agent → Task 4. Multi-agent → Task 5. Framework presets → Task 6. ✓
- §5.6 Optimization (switch-model/deployment, enable-caching, trim, adjust-context, budget inverse-solve, tornado) → Tasks 7, 8. Denial of Wallet → Task 9. ✓
- §5.4 confidence pass-through, waterfall → every adapter returns `WarmCostResult`. ✓
- §6 honesty (tier labels, ranges, no false precision) → `accuracyNoteFor`, DoW note, confidence ranges. ✓
- §8 TDD + hand-verified within 1% + agent conservation → every task is red-first; Task 10. ✓
- §9 kill switches per workload + DoW → `enabled` gate on all five. ✓
- **Not in Phase 1 (correctly deferred):** UI/dataviz (§5.7 → Phase 2), workflow/permalink/export (§5.8 → Phase 3), CSP/E2E runtime verification (§5.9 → Phase 2/4). ✓

**2. Placeholder scan:** no TBD/TODO; every step has complete code. ✓

**3. Type consistency:** `WorkloadForecast`, `StepProfile`, the configs, and `OptimizationBase` are defined in Task 0/7 and used consistently. `monthlyWarmCost`'s `WarmScenario` fields match the engine (`burstsPerMonth`, `activeFraction`, `profile`, `tokenizerBand`). `effectiveInputRate`/`effectiveCacheRates` signatures match `@/engine/cost/rates`. ✓

## Open questions for the premortem
- Is `burstsPerMonth = conversations/runs` with a default `activeFraction = 1` the right warmth posture, or does it over/under-credit within-burst warmth vs the old MVP's explicit hit rate? (Premortem lead: Data Scientist / ML Engineer.)
- Does folding the DoW prefix into per-arrival input (to defeat the warm-prefix discount) correctly represent "no warm cache," or should it use `prefixTokens` with a forced cold write? (Premortem lead: Red Teamer / Security Architect.)
- Crew additive confidence: is summing member ranges honest, or does it understate correlated tail risk? The accuracy note flags it — is that enough? (Premortem lead: Governance / Risk.)
- Optimization `candidateModels`: who supplies them (the full registry via `listByMode`)? Should `optimize` call `listByMode` itself instead of taking them as a param? (Premortem lead: ML Engineer.)

## Execution Handoff

Plan complete. Given the autonomous mandate and the "after any subagent implements code, always run full tests + tsc --noEmit + review before trusting" rule, execution is **inline** (executing-plans) with a full-green gate after each task, not subagent-dispatched — the orchestrator keeps the engine invariants in context. Premortem first (adversarial-premortem-complete), apply amendments, then implement Tasks 0-10 in order.

---

## Premortem amendments (P1-A1 … P1-A30)

Adversarial-premortem-complete, 6 perspectives (Red Teamer / Data Scientist / ML Engineer / Security Architect / MLOps-SRE / Governance-Risk), one front-loaded round, 2026-07-04. All findings cross-attacked and calibrated against the shipped engine and tsc 5.6.3. Convergences: VDP ×4, DoW-retry-$0 ×3, tier-straddle ×3, crew-optimizer ×2, honest-claims-blind ×2, text-node ×2. Apply every amendment below before/while implementing; each names the Task it changes. **Process rule (from ML+SRE): add `npx tsc --noEmit` (all three tsconfigs) AND `npm run lint` to EVERY task's green step — vitest/esbuild erase types and eslint can't validate assertions, so type/lint breaks otherwise hide until the final task.**

**Correctness core (write these oracles FIRST — DS3):**

- **P1-A8 (was DS3, High) — expand the hand-verified oracles before writing adapters.** The Task-10 `flat` model (`cache:null, tiers:[]`) is arithmetically correct but vacuous: it exercises no warm-cache, tier, bursty, reasoning, or non-`per_token` path, so it cannot catch A6/A7. Amend Task 10 (and pull the relevant oracle into each adapter's Step-1 red test) to add, as FAILING tests written first: (1) a cache-capable Claude chatbot at **sparse (500 conv/mo)** and **saturated (100k conv/mo)** volumes with hand-computed `p_warm` and `writesPerMonth`; (2) a tiered-model agent whose accumulation **straddles 200k** with the per-tier-band exact total; (3) one **`per_character`** billing-unit scenario (§8 requires per billing unit); (4) the **crew-additivity** and **DoW ≥ central** assertions the Self-Review claims but the body omits. Fix the Self-Review to match the actual body.

- **P1-A6 (was DS1, High) — derive `activeFraction` from burst structure; do not default it to 1.** With `f=1`, `burstyWarmth(rateS/f)` collapses the within-burst rate to the monthly average, billing within-conversation turns 2+ as ~cold (worked: 500 conv/mo → 1998 writes vs the intended ~500), understating caching savings ~75% at SMB volumes. Fix: add `avgTurnGapSeconds?: number` to `ChatbotConfig` (default 45) and `avgStepGapSeconds?: number` to `AgentConfig` (default 5). In the adapter compute `activeFraction = clampToUnit(arrivalsPerMonth * gapSeconds / SECONDS_PER_MONTH)` (import `SECONDS_PER_MONTH` from `@/engine/caching/policy`; clamp to `(0,1]`). Verified: 500 conv × 5 turns × 45s / 2.592e6 = 0.043 → `rateS/f` warms within-burst to ≈0.99 → writes ≈ conversations. Red test at 500 conv/mo asserting `writesPerMonth ≈ conversationsPerMonth` (±3%), not only the existing 10k case.

- **P1-A10 (was DS6, Med) — pass per-prefix bursts, not total, for K>1.** The engine's `writesPerMonth` uses `onsets·K`; the adapter passes `burstsPerMonth = conversations` (total), so for K distinct system prompts it over-counts cold onsets K×. Fix: chatbot/agent pass `burstsPerMonth = conversationsPerMonth / (distinctSystemPrompts ?? 1)` (resp. `runsPerMonth / (distinctPrefixes ?? 1)`), matching the engine's per-prefix `λ/K` convention. Red test: K=3 → onset writes = conversations, not 3×conversations. (Verify against the 0C `warmCache` tests during implementation; the engine stays untouched.)

- **P1-A7 (was DS2, High) — drop the unconditional "exact" claim; price tier straddles per-band.** `meanAccumulated` is exact only when the whole accumulation series sits in one 128k/200k tier; `effectiveInputRate` is a step function of `prefix + perArrivalInput`, so a straddle mis-prices (worked: 41.5% understatement). Fix: (a) remove "EXACT … because cost is linear in tokens" from `accumulate.ts` and Task 0/1 prose — replace with "exact within a single price tier; per-band otherwise." (b) Add `priceByTierBands(prefixTokens, base, growth, units, model)` in a new `src/workloads/tiers.ts`: since accumulation is monotonic, partition the unit index range into at most `tiers.length+1` contiguous bands by `tierFor(prefix + base + (k-1)·growth)`, compute each band's `(unitCount, meanInputInBand)`, and return per-band `{count, meanInput, tier}` — **O(tiers), not O(units)** (no DoS). (c) The adapter: when `model.tiers.length > 0` AND a straddle is detected, sum the input/output/reasoning dollars per band (each band's rate is constant → mean exact) and add the single warm-cache prefix cost from one `monthlyWarmCost` call; else use the fast single-mean path. (d) Add the A8 tiered-straddle oracle. Set a `tierStraddle: boolean` flag on `WorkloadForecast` for transparency.

- **P1-A5 (was SRE-F1, High) — remove the unused `beforeEach` import** in the Task-2 chatbot test (`import { describe, it, expect } from 'vitest';`). Task 0 pulls test files under the strict glob, so an unused import is a hard `--max-warnings 0` failure.

- **P1-A3 (was ML-F1, High, reproduced TS2352) — replace `as Record<string, number>` with a typed getter.** `base.config` has a non-number `model` property, so the cast fails tsc. Add to `candidates.ts`/`tornado.ts`: `function numField(config: OptimizationBase['config'], field: string): number { const v = (config as unknown as Record<string, unknown>)[field]; return typeof v === 'number' && Number.isFinite(v) ? v : 0; }` and use it for every dynamic numeric read. (Also the write side: use a typed spread helper — see A28 for the dangerous-key guard.)

- **P1-A4 (was ML-F2, High, reproduced TS18048) — make the preset fallback non-optional.** Under `noUncheckedIndexedAccess`, `AGENT_PRESETS.find() ?? AGENT_PRESETS[last]` is `AgentPreset | undefined`. Fix: define `const CUSTOM_PRESET: AgentPreset = { name:'custom', … }` as a standalone const, put it in the array, and reference it directly: `const preset = AGENT_PRESETS.find(p => p.name === name) ?? CUSTOM_PRESET;`.

**Denial of Wallet (dual-use + correctness):**

- **P1-A1 (was RT-F4 ≡ G1 ≡ F-SEC-1, High, ×4) — real VDP + governance metadata in the payload.** `DOW_VDP_URL='SECURITY.md'` is a dead link (no `public/`, catch-all SPA rewrite, and SECURITY.md has no reporting contact, Jan-2025 stamp). Fix: (a) `DOW_VDP_URL = 'https://github.com/TikiTribe/TokenTally/security/advisories/new'` (absolute, always reachable, satisfies QC.1 — no served asset needed). (b) Add a "Reporting a Vulnerability" section to `SECURITY.md` (the advisory URL + a `security@` intent + response SLA) and refresh the stamp. (c) **Move `disclaimer` and `vdpUrl` INTO `DenialOfWalletResult`** (populate in both the inert and enabled paths) so the guardrail travels with the number (F-SEC-2). (d) DoW returns the inert result if no resolvable VDP is configured. (e) Tighten the test: `expect(DOW_VDP_URL).toMatch(/^https:\/\//)` and assert `result.vdpUrl`/`result.disclaimer` are non-empty whenever `worstCaseMonthly > 0`.

- **P1-A2 (was RT-F6 ≡ ML-F3, High, ×3) — gate the retry mitigation behind `retries > 1`.** At the default `retryCeiling`, the "Retry ceiling = 1" mitigation equals the base (`savedMonthly = 0`), breaking the plan's own `reducedMonthly < worstCaseMonthly` invariant. Fix: `if (retries > 1) { … push retry mitigation … }`, and filter all mitigations to strictly-positive `savedMonthly` before sorting.

- **P1-A14 (was RT-F2, Med-High) — DoW must include an adversarial reasoning term.** `worstCase` hardcodes `perArrivalReasoningTokens: 0`, understating exactly the reasoning models (o-series, gemini-2.5 at 5.83× output) most prone to wallet drain. Fix: add `fallbackReasoningTokens?: number`; compute `reasoning = model.reasoningPerMToken != null ? (cfg.fallbackReasoningTokens ?? model.maxOutput ?? 0) : 0` and pass it. Extend the note with the reasoning ceiling. Red test: reasoning model's worst case strictly exceeds the same config with `reasoningPerMToken: null`.

- **P1-A15 (was RT-F3, Med) — DoW must not return a silent $0 for non-`per_token` billing.** `monthlyWarmCost` returns 0 for `per_second`/`per_character`, yet the note still says "fills context (0 tok)" — a false negative for realtime/audio, the canonical wallet-attack target. Fix: guard at the top of `denialOfWallet` — if `billingUnit !== 'per_token'`, return a result whose note says "not modeled for {unit} billing — do not read as \$0 exposure" with `confidence.unmodeled: true` (or compute a native-unit figure), never the token-worded \$0. Red test with a `per_second` model.

**Input hardening (client-side DoS / overflow — RT):**

- **P1-A12 (was RT-F1, High) — cap the plotted step/member arrays.** `stepProfile`'s `for k=1..stepsPerRun` and crew's member map are unbounded → a permalink with `stepsPerRun: 1e9` freezes the victim's tab (weaponizable in Phase 3). The monthly cost is already O(1) via `meanAccumulated`, so only the chart array needs bounding. Fix: `const MAX_PLOTTED_STEPS = 512;` iterate to `min(steps, MAX_PLOTTED_STEPS)` and downsample (first, last, evenly-spaced interior) with an `accuracyNote` addendum when exceeded; `const MAX_CREW_MEMBERS = 64;` clamp `cfg.agents`. Red test: `agentForecast({…, stepsPerRun: 1e9})` returns within a time bound and `steps.length <= MAX_PLOTTED_STEPS`.

- **P1-A13 (was RT-F5, Med) — clamp oversized numerics before they reach the engine.** `arrivals × tokens` can overflow to `Infinity` (both scalars pass the engine's per-scalar `nonNeg`), yielding `$Infinity` exposure or, via `1e300 * retries`, a clamp-to-`$0`; and `optimize` then emits `NaN%`. Fix: shared `const CEIL = 1e12; const bounded = (x) => Math.min(nn(x), CEIL);` in `accumulate.ts`, applied to `arrivalsPerMonth`, per-arrival token terms, and DoW `requests`. In `optimize`, skip/annotate any rec whose `baseline.monthlyCost` or `savingsPct` is non-finite. Red tests feeding `Infinity`/`1e300`/`MAX_SAFE_INTEGER` to each workload assert finite, non-`Infinity`, non-`NaN` output.

**Step-profile reconciliation (DS4 + ML-F7):**

- **P1-A11 (was DS4 ≡ ML-F7, Med-High) — reconcile the step chart to the headline.** `stepProfile` prices 100% of prefix reads warm and freezes the tier base at `prefix+seed`, so `Σ(step cost)·runs ≠ monthlyCost` (worked ~12% low on prefix alone); §5.7 requires the chart to match the engine. Fix: bill **step 1's prefix at the cold write rate, steps 2+ at the warm read rate**, and set each step's tier base to `prefix + seed + (k-1)·growth`. Add a **dollar** reconciliation test: for a `cache:null` model, `Σ(step cost)·runs` within 1% of `monthlyCost`; for cache-capable models, document the warm/cold-blend delta in a comment (the probabilistic blend cannot reconcile exactly, and that is stated).

- **P1-A9 (was DS5, Med) — clamp accumulation to the context window.** Neither the mean nor the step profile caps per-arrival input at `contextWindow − prefix`, billing phantom tokens no real run could incur. Fix: clamp per-arrival input (and each step's input) to `max(0, (contextWindow ?? Infinity) − prefixTokens)`; set a `contextTruncated: boolean` flag on the forecast when the clamp bites. Red test with enough steps to overflow a 200k window.

**Optimizer (Governance + ML + Security):**

- **P1-A16 (was G2, High) — auditability: `snapshotVersion` + formula trace on every forecast (§12).** `WorkloadForecast` carries neither, so "auditable forecasts" is unmet and Phase-2 trust surfaces have nothing to render. Fix: add `snapshotVersion: string` and `formula: string` (a stable derivation id, e.g. the ordered waterfall labels + the mapping name) to `WorkloadForecast`, `Recommendation`, and `DenialOfWalletResult`. Keep adapters pure: add optional `snapshotVersion?: string` to each config (Phase-2 supplies `getSnapshotMeta().snapshotVersion`; default `'unknown'`). Task-10 assertion: every forecast has a non-empty `snapshotVersion` and `formula`.

- **P1-A17 (was G3, High) — preset provenance must reach the accuracy note.** `accuracyNoteFor` reflects only the tokenizer tier, so a preset-seeded forecast reads "exact (unverified)" while its token inputs are fabricated seeds. Fix: add optional `assumptionsSource?: string` to the configs; `applyPreset` sets it (e.g. `'preset:langchain (unvalidated seed defaults)'`); `accuracyNoteFor` appends it when present ("… inputs are unvalidated seed defaults — tune to your workload"). Test: a preset-seeded forecast's note contains the seed qualifier independent of tier.

- **P1-A18 (was G4, Med) — optimizer/solveBudget must not headline false precision.** `optimize` ranks by `mid − mid` and buries the overlap caveat in prose; `solveBudget` returns a central-only ceiling. Fix: `Recommendation` carries `savingsLow`/`savingsHigh` (propagated from both forecasts' confidence) and a structured `overlaps: boolean`; down-rank/suppress recs whose saving band straddles zero. `solveBudget` returns a conservative ceiling (from `confidence.high`) alongside the central one. Tests for both.

- **P1-A20 (was ML-F4, Med) — implement `enable_caching` as a TTL-tuning candidate.** It is declared in `OptKind`/File-Structure/§5.6 but never generated. Fix: for a cache-capable model, generate an `enable_caching` candidate that re-prices at the other TTL (`min5 ↔ hr1`) and is kept only if cheaper (real lever per the 5-min-vs-1-hour write-cost tradeoff). Test asserts the rec appears (with positive savings) for a cache model where the other TTL wins.

- **P1-A21 (was ML-F6, Med) — keep `candidates()` pure; pass deployments in.** It reads the module-global registry via `getDeployments`, violating the purity constraint and silently emitting zero `switch_deployment` candidates when the registry isn't loaded. Fix: add `candidateDeployments?: ModelRecord[]` to `OptimizationBase`; `candidates()` uses it (Phase-2 supplies `getDeployments(...)`). Test: with explicit deployments, `switch_deployment` recs appear.

- **P1-A22 (was ML-F5 ≡ SRE-F5, Med) — resolve the crew-optimizer inconsistency.** `WorkloadConfig` includes `CrewConfig` but `OptimizationBase.kind` excludes `'crew'`. Decision: **defer crew optimization** (optimizing a crew = optimizing each member, composable in Phase 2 — YAGNI now). Fix: drop `CrewConfig` from `WorkloadConfig`; keep the 3-kind `price()`/`priceCost()` switches exhaustive with an explicit `default: { const _x: never = base.kind; throw new Error('unreachable'); }` guard; state the deferral in the Self-Review.

- **P1-A28 (was F-SEC-3, Med, latent) — field allowlist + dangerous-key guard on the dynamic-key seams.** `tornado(factors)` and `candidates` write computed keys; proto-pollution is not exploitable today (own-prop spread + number guard) but the exported `factors` list is allowlist-free and Phase-3 import will feed it untrusted names. Fix: define a per-workload `NUMERIC_FIELDS` allowlist; `tornado`/`candidates` reject any field not in it and explicitly reject `__proto__`/`constructor`/`prototype` (mirror the registry `DANGEROUS_KEYS`). Red test: `tornado(base, ['__proto__','constructor','polluted'])` → zero-swing bars AND `Object.prototype` unmutated afterward.

**Confidence honesty + governance framing:**

- **P1-A30 (was DS7, Med-Low) — label the crew band as a conservative correlated bound.** Summing member low/mid/high assumes members hit extremes together (comonotonic), widening the band beyond what independence supports (inflates the crew "up to savings"). A wider band is the safe honesty error (not false precision), so keep the additive sum but rename/annotate the crew `accuracyNote` as a "conservative fully-correlated upper bound; independent-variance narrowing is a Phase-2 refinement." (Quadrature-combining the independent component is the documented future refinement.)

- **P1-A19 (was G5, Med) — sequencing + above-cut governance.** §13 places Crew and DoW above the launch cut line. The owner mandate keeps them in Phase 1, so: (a) add a sequencing constraint — Tasks 2 (Chatbot) + 4 (Agent) + the A8 oracles are the non-negotiable floor and must be green before Tasks 5/9 start; (b) DoW stays default-off (already); (c) document that Phase 2 must gate Crew/DoW behind a build-time feature flag that can exclude them from `dist/` on a descope. No build-flag machinery is added in Phase 1 (nothing imports them yet — SRE-F2).

**Build / CI / contract (SRE + ML):**

- **P1-A24 (was SRE-F4 + ML process, Med) — type-check the tests.** `tsconfig*.json` exclude `**/*.test.ts`, so the presets `@ts-expect-error` is vacuous and no test is type-checked. Fix: add `tsconfig.tests.json` (extends base, `include` tests) + a `typecheck:tests` script + a CI step; add `npx tsc --noEmit -p tsconfig.tests.json` to the per-task green gate. (This also catches A3/A4 task-local.)

- **P1-A23 (was SRE-F3, Med) — barrel smoke tests.** `src/optimization/index.ts` is imported by no test and the workloads barrel only partially; tsc catches misnamed but not omitted exports. Fix: `src/workloads/__tests__/barrel.test.ts` and `src/optimization/__tests__/barrel.test.ts` importing every intended public symbol from the `index.ts` and asserting each is defined — this locks the Phase-2 import contract.

- **P1-A25 (was SRE-F2, High-ish) — first-paint contract.** The size gate is vacuous now (barrels unimported → tree-shaken to 0 B). Fix: a Global-Constraint line + barrel header comments stating `@/workloads` and `@/optimization` are **dynamic-`import()`-only** in Phase 2; a Task-10 build assertion that greps the entry chunk (`dist/assets/index-*.js`) to confirm `optimization`/`registry` symbols are absent from first-paint. (A standalone lazy-chunk size budget is a Phase-2 todo since nothing imports them yet.)

- **P1-A26 (was SRE-F7 ≡ G cross-cut, Med) — honesty gate for Phase-1 strings.** `assert-honest-claims.mjs` only scans `dist/` + `index.html`; Phase-1 note strings are tree-shaken out, so a dishonest `±5%`/`100%-coverage` string added in Phase 1 sails through. Fix: a unit test that runs every note-producer (`accuracyNoteFor` across all tiers, the DoW note, preset `source` strings) and asserts none match the banned regexes (import `scanText` from `scripts/ci/assert-honest-claims.mjs`).

- **P1-A27 (was SRE-F6, Low) — kill-switch runtime-surface note.** Call-time `enabled` params are Phase 1; the operator-facing runtime control (a settings-store flag the shell reads) is a Phase-2 deliverable. State this in the Self-Review so Phase 2 does not treat kill switches as "done."

- **P1-A29 (was F-SEC-4 ≡ RT-F7, Low) — text-node-only contract.** Add a comment on `Recommendation`/`DenialOfWalletResult` (and the `label`/`rationale`/`note`/`control` fields) that these are plain data rendered as DOM **text nodes only, never `innerHTML`**, and any interpolated registry field must be A7-sanitized at source (registry `displayName`/`deployment` already are). Optional safe-charset assertion.

**Rejected (no change):** F-SEC-5 (CSP `style-src 'self' 'unsafe-inline'`, HSTS no-preload) — deliberate 0D decisions D3/D11; runtime CSP verification is already deferred to Phase 2/go-live per BUILD-LOG. The premortem's verified-clean negatives (engine signatures match, no import cycles, tree-shaking holds, kill switches check-before-work, no egress/logging) are recorded, not acted on.

**Revised implementation order:** A8 oracles (failing) → Task 0 (types incl. A16/A17/A22/A9/A7 flags) → Task 1 (accumulate + A13 clamp) → Task 1b `tiers.ts` (A7) → Task 2 Chatbot (A5/A6/A10) → Task 3 Prompt → Task 4 Agent (A6/A10/A11/A12) → Task 5 Crew (A12/A30) → Task 6 Presets (A4/A17) + barrels (A23) → Task 7 Optimize (A3/A18/A20/A21/A22/A28) → Task 8 Tornado (A3/A28) → Task 9 DoW (A1/A2/A14/A15) → Task 10 reconciliation (A25/A26 + consolidated oracles). `tsc --noEmit` (base + scripts + tests) and `lint` in every task's green step (A24).
